// V3 — Kullanıcı kimliği (Apple Sign-In + Supabase Auth)
//
// Apple Sign-In, Apple App Store kuralları gereği zorunlu (3rd party auth varsa).
// Kullanıcı app'i hesapsız da kullanabilir — sepet kaydetmek istediğinde
// "Apple ile devam" akışı tetiklenir.
//
// Gereksinim: `npx expo install expo-apple-authentication`
// app.json'da: `usesAppleSignIn: true` (iOS) ekli olmalı

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// expo-apple-authentication opsiyonel — paket yoksa graceful degrade.
// Kullanıcı `npx expo install expo-apple-authentication` çalıştırınca aktif olur.
let AppleAuthentication: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  AppleAuthentication = require('expo-apple-authentication');
} catch (_e) {
  // Paket yoksa Apple Sign-In disabled olur, app yine de derlenir/çalışır.
}

interface User {
  id: string;
  email?: string | null;
  displayName?: string | null;
}

interface AuthCtx {
  user: User | null;
  isLoading: boolean;
  /** Apple Sign-In başlat (iOS only). Başarılıysa user state güncellenir. */
  signInWithApple: () => Promise<{ ok: true } | { ok: false; error: string }>;
  /** Anonim giriş — Apple yoksa hızlı alternatif. user_baskets RLS auth.uid() ile çalışır. */
  signInAnonymously: () => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
  /** Apple Sign-In bu cihazda kullanılabilir mi? (iOS 13+ ve Apple ID kurulu) */
  isAppleAvailable: boolean;
  /** Kullanıcı anonim mi (Apple ID yerine geçici hesap) */
  isAnonymous: boolean;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  isLoading: true,
  signInWithApple: async () => ({ ok: false, error: 'not_ready' }),
  signInAnonymously: async () => ({ ok: false, error: 'not_ready' }),
  signOut: async () => {},
  isAppleAvailable: false,
  isAnonymous: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isAppleAvailable, setAppleAvailable] = useState(false);
  const [isAnonymous, setAnonymous] = useState(false);

  // Supabase session'ını izle
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const anon = session.user.is_anonymous === true || !session.user.email;
        setAnonymous(anon);
        setUser({
          id: session.user.id,
          email: session.user.email,
          displayName:
            (session.user.user_metadata?.full_name as string) ||
            (session.user.email?.split('@')[0]) ||
            (anon ? 'Misafir' : null),
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        if (session?.user) {
          const anon = session.user.is_anonymous === true || !session.user.email;
          setAnonymous(anon);
          setUser({
            id: session.user.id,
            email: session.user.email,
            displayName:
              (session.user.user_metadata?.full_name as string) ||
              (session.user.email?.split('@')[0]) ||
              (anon ? 'Misafir' : null),
          });
        } else {
          setAnonymous(false);
          setUser(null);
        }
      }
    );

    // Apple availability check (iOS only, modül yüklüyse)
    if (Platform.OS === 'ios' && AppleAuthentication?.isAvailableAsync) {
      AppleAuthentication.isAvailableAsync()
        .then(setAppleAvailable)
        .catch(() => setAppleAvailable(false));
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithApple = useCallback(async (): Promise<
    { ok: true } | { ok: false; error: string }
  > => {
    if (Platform.OS !== 'ios') {
      return { ok: false, error: 'apple_signin_ios_only' };
    }
    if (!AppleAuthentication?.signInAsync) {
      return { ok: false, error: 'apple_module_missing' };
    }
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { ok: false, error: 'no_identity_token' };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        return { ok: false, error: 'cancelled' };
      }
      return { ok: false, error: e?.message || 'unknown' };
    }
  }, []);

  const signInAnonymously = useCallback(async (): Promise<
    { ok: true } | { ok: false; error: string }
  > => {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'unknown' };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthCtx>(() => ({
    user, isLoading, signInWithApple, signInAnonymously, signOut, isAppleAvailable, isAnonymous,
  }), [user, isLoading, signInWithApple, signInAnonymously, signOut, isAppleAvailable, isAnonymous]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
