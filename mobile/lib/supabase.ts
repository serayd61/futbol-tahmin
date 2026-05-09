import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const SUPABASE_URL = extra.supabaseUrl as string;
const SUPABASE_ANON_KEY = extra.supabaseAnonKey as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Dev'de daha kolay yakalanması için console'a basıyoruz
  console.error('[supabase] Missing url/anonKey in app.json -> expo.extra');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
