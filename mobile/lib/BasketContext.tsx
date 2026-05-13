// V3 — Tahmin Sepeti global state.
// Kullanıcı pick'leri açıkça kaydedene kadar AsyncStorage'da local'de yaşar.
// Kaydet butonu → saveBasket(picks) → Supabase'e gider + state sıfırlanır.
//
// Kısıtlar:
//   • Aynı (fixture_id, market) kombinasyonu sepete bir kere eklenebilir
//   • Aynı maçtan zıt market'ler yan yana olabilir (örn. KGV ve Üst 2.5)
//     ama "1X2_HOME" ile "1X2_AWAY" birlikte mantıksız — UI engelleyebilir
//   • Maksimum 10 pick (UX karmaşası ve combined_prob underflow için)

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BasketPick, Market } from './types';

const STORAGE_KEY = '@futbol_tahmin/basket_v1';
const MAX_PICKS = 10;

interface BasketCtx {
  picks: BasketPick[];
  count: number;
  combinedProb: number;
  /** Pick ekle. Aynı (fixture, market) varsa sessizce ignore. Limit aşılırsa false döner. */
  addPick: (pick: BasketPick) => boolean;
  /** Pick çıkar */
  removePick: (fixtureId: number, market: Market) => void;
  /** Pick toggle (varsa kaldır, yoksa ekle) */
  togglePick: (pick: BasketPick) => boolean;
  /** Sepeti tamamen temizle */
  clear: () => void;
  /** Belirli (fixture, market) sepette var mı? */
  hasPick: (fixtureId: number, market: Market) => boolean;
}

const Ctx = createContext<BasketCtx>({
  picks: [],
  count: 0,
  combinedProb: 0,
  addPick: () => false,
  removePick: () => {},
  togglePick: () => false,
  clear: () => {},
  hasPick: () => false,
});

function isSamePick(a: BasketPick, b: BasketPick) {
  return a.fixture_id === b.fixture_id && a.market === b.market;
}

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const [picks, setPicks] = useState<BasketPick[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // İlk açılışta AsyncStorage'dan yükle
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setPicks(JSON.parse(raw));
      } catch (e) {
        console.warn('[basket] hydrate failed', e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Her değişiklikte persist et (debounce yok — picks küçük, sorun olmaz)
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(picks)).catch(e =>
      console.warn('[basket] persist failed', e)
    );
  }, [picks, hydrated]);

  const addPick = useCallback((pick: BasketPick): boolean => {
    let ok = true;
    setPicks(prev => {
      if (prev.length >= MAX_PICKS) { ok = false; return prev; }
      if (prev.some(p => isSamePick(p, pick))) return prev; // duplicate
      return [...prev, pick];
    });
    return ok;
  }, []);

  const removePick = useCallback((fixtureId: number, market: Market) => {
    setPicks(prev => prev.filter(p => !(p.fixture_id === fixtureId && p.market === market)));
  }, []);

  const togglePick = useCallback((pick: BasketPick): boolean => {
    let ok = true;
    setPicks(prev => {
      const exists = prev.find(p => isSamePick(p, pick));
      if (exists) {
        return prev.filter(p => !isSamePick(p, pick));
      }
      if (prev.length >= MAX_PICKS) { ok = false; return prev; }
      return [...prev, pick];
    });
    return ok;
  }, []);

  const clear = useCallback(() => setPicks([]), []);

  const hasPick = useCallback(
    (fixtureId: number, market: Market) =>
      picks.some(p => p.fixture_id === fixtureId && p.market === market),
    [picks]
  );

  const combinedProb = useMemo(
    () => picks.reduce((acc, p) => acc * (p.prob || 0), 1),
    [picks]
  );

  const value = useMemo<BasketCtx>(() => ({
    picks,
    count: picks.length,
    combinedProb,
    addPick,
    removePick,
    togglePick,
    clear,
    hasPick,
  }), [picks, combinedProb, addPick, removePick, togglePick, clear, hasPick]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useBasket = () => useContext(Ctx);

export const BASKET_MAX_PICKS = MAX_PICKS;
