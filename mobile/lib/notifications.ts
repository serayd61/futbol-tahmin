import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { getFavoriteTeams } from './preferences';

// Foreground'da bile bildirimleri göster
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Push notification için izin ister, token alır, Supabase'e upsert eder.
 * Geri dönüş: Expo Push Token veya null (izin verilmediyse).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('[push] not a physical device, skipping');
    return null;
  }

  // Android channel (cross-platform uyumluluğu için)
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // İzin
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') {
    console.log('[push] permission denied');
    return null;
  }

  // Expo push token (eas projectId otomatik resolve)
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  let tokenData;
  try {
    tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
  } catch (e) {
    console.error('[push] getExpoPushTokenAsync error:', e);
    return null;
  }

  const token = tokenData.data;
  if (!token) return null;

  const favorites = await getFavoriteTeams();
  const { error } = await supabase
    .from('push_tokens')
    .upsert(
      {
        token,
        favorite_teams: favorites,
        enabled: true,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );
  if (error) console.error('[push] upsert error:', error);

  return token;
}

/**
 * Settings'te favoriler değiştiğinde çağrılır — Supabase'deki kayıt güncellensin.
 */
export async function syncFavoritesToServer(): Promise<void> {
  if (!Device.isDevice) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    if (!token) return;
    const favorites = await getFavoriteTeams();
    await supabase
      .from('push_tokens')
      .update({
        favorite_teams: favorites,
        updated_at: new Date().toISOString(),
      })
      .eq('token', token);
  } catch (e) {
    console.error('[push] syncFavoritesToServer error:', e);
  }
}

/**
 * Bildirim aç/kapa
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  if (!Device.isDevice) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    if (!token) return;
    await supabase
      .from('push_tokens')
      .update({ enabled, updated_at: new Date().toISOString() })
      .eq('token', token);
  } catch (e) {
    console.error('[push] setEnabled error:', e);
  }
}
