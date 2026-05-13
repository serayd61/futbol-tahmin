import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { AuthProvider } from '../lib/AuthContext';
import { BasketProvider } from '../lib/BasketContext';
import { registerForPushNotifications } from '../lib/notifications';
import { getOnboarded } from '../lib/preferences';

function RootStack() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [bootChecked, setBootChecked] = useState(false);

  // Push notification kayıt (uygulamayı ilk açılışta izin iste + token kaydet)
  useEffect(() => {
    registerForPushNotifications().catch(e => console.error('[push] init error:', e));
  }, []);

  // Onboarding kontrol — ilk açılışsa onboarding'e yönlendir
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const seen = await getOnboarded();
        if (cancelled) return;
        const current = segments[0];
        // Sadece root'taysa veya tabs'taysa yönlendir, başka bir derin ekranda değilken
        if (!seen && current !== 'onboarding') {
          router.replace('/onboarding');
        }
      } finally {
        if (!cancelled) setBootChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // segments değiştikçe yeniden değerlendirmek istemiyoruz — sadece ilk açılışta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTitleStyle: { color: colors.text },
          headerTintColor: colors.primary,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="match/[id]"
          options={{
            title: 'Maç Detay',
            headerBackTitle: 'Geri',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="league/[id]"
          options={{
            // title dynamic — league detail screen kendi set ediyor
            headerBackTitle: 'Geri',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="basket"
          options={{
            title: 'Tahmin Sepeti',
            headerBackTitle: 'Geri',
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="my-baskets"
          options={{
            title: 'Sepetlerim',
            headerBackTitle: 'Geri',
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="about/model"
          options={{
            title: 'Tahmin Modeli',
            headerBackTitle: 'Geri',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <BasketProvider>
            <RootStack />
          </BasketProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
