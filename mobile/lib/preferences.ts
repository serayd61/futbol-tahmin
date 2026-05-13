import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';

// =====================================================
// Favori Takımlar
// =====================================================
const FAV_KEY = 'pref:favorite_teams';

export async function getFavoriteTeams(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(FAV_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is number => typeof x === 'number') : [];
  } catch {
    return [];
  }
}

export async function setFavoriteTeams(ids: number[]): Promise<void> {
  await AsyncStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

export async function addFavoriteTeam(id: number): Promise<number[]> {
  const cur = await getFavoriteTeams();
  if (cur.includes(id)) return cur;
  const next = [...cur, id];
  await setFavoriteTeams(next);
  // Sunucudaki push_tokens kaydını da güncelle (async, hatayı yutar)
  syncToServer().catch(() => {});
  return next;
}

export async function removeFavoriteTeam(id: number): Promise<number[]> {
  const cur = await getFavoriteTeams();
  const next = cur.filter(x => x !== id);
  await setFavoriteTeams(next);
  syncToServer().catch(() => {});
  return next;
}

// Geç-yükleme (circular import önlemi): notifications.ts'i runtime'da yükler
async function syncToServer(): Promise<void> {
  try {
    const m = await import('./notifications');
    await m.syncFavoritesToServer();
  } catch {}
}

// React hook — favori takım listesini reactive olarak verir
export function useFavoriteTeams() {
  const [favorites, setFavorites] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const list = await getFavoriteTeams();
    setFavorites(list);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const add = useCallback(async (id: number) => {
    const next = await addFavoriteTeam(id);
    setFavorites(next);
  }, []);

  const remove = useCallback(async (id: number) => {
    const next = await removeFavoriteTeam(id);
    setFavorites(next);
  }, []);

  const toggle = useCallback(async (id: number) => {
    const cur = await getFavoriteTeams();
    const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id];
    await setFavoriteTeams(next);
    setFavorites(next);
  }, []);

  return { favorites, loading, add, remove, toggle, refresh };
}

// =====================================================
// Tema tercihi (Dalga 2'de kullanılacak)
// =====================================================
const THEME_KEY = 'pref:theme_mode';
export type ThemeMode = 'auto' | 'dark' | 'light';

export async function getThemeMode(): Promise<ThemeMode> {
  try {
    const raw = await AsyncStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'auto') return raw;
  } catch {}
  return 'auto';
}

export async function setThemeMode(mode: ThemeMode): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, mode);
}

// =====================================================
// "Sadece favoriler" filter tercihi
// =====================================================
const FAV_ONLY_KEY = 'pref:favorites_only';

export async function getFavoritesOnly(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(FAV_ONLY_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setFavoritesOnly(v: boolean): Promise<void> {
  await AsyncStorage.setItem(FAV_ONLY_KEY, v ? '1' : '0');
}

// =====================================================
// Onboarding görüldü mü (V2.2 ile geldi)
// =====================================================
const ONBOARDED_KEY = 'pref:onboarded_v1';

export async function getOnboarded(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(ONBOARDED_KEY);
    return raw === '1';
  } catch {
    return false;
  }
}

export async function setOnboarded(v: boolean): Promise<void> {
  await AsyncStorage.setItem(ONBOARDED_KEY, v ? '1' : '0');
}
