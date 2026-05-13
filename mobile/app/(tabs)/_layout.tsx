// V3 — Tab bar 2.0: Ionicons (vector), BlurView arka plan, aktif çubuk indicator,
// safe area uyumlu yükseklik. Emoji ikonlar yerine native ikonografi.
//
// Gereksinim: @expo/vector-icons (Expo ile zaten gelir), expo-blur (`npx expo install expo-blur`).
import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeContext';
import BasketBadge from '../../components/BasketBadge';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
  name: IoniconName;
  focusedName?: IoniconName;
  color: string;
  focused: boolean;
}

function TabIcon({ name, focusedName, color, focused }: TabIconProps) {
  return (
    <View style={iconStyles.wrap}>
      <Ionicons
        name={focused && focusedName ? focusedName : name}
        size={22}
        color={color}
      />
    </View>
  );
}

export default function TabsLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        // Header (her tab kendi başlığını gösterir — Bugün, Fikstür, vb.)
        headerStyle: {
          backgroundColor: colors.bg,
          borderBottomColor: colors.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: { color: colors.text, fontSize: 17, fontWeight: '700' },
        headerTintColor: colors.text,
        headerShadowVisible: false,

        // Tab bar — absolute + blur background
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          backgroundColor: 'transparent',
          height: Platform.select({ ios: 84, android: 64, default: 64 }),
          paddingBottom: Platform.select({ ios: 28, android: 8, default: 8 }),
          paddingTop: 8,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={Platform.OS === 'ios' ? 60 : 90}
            tint={isDark ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFill,
              // Android'de BlurView yetersiz kalıyor — solid fallback
              Platform.OS === 'android' && { backgroundColor: colors.bg },
            ]}
          />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        // V3 — Tüm tab'larda sepet badge'i sağ üstte görünür
        headerRight: () => <BasketBadge />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bugün',
          tabBarAccessibilityLabel: 'Bugün — bugünün maçları ve tahminler',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="football-outline" focusedName="football" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="leagues"
        options={{
          title: 'Ligler',
          tabBarAccessibilityLabel: 'Ligler — lig odaları ve Tahmin Sepeti',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="trophy-outline" focusedName="trophy" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="fixtures"
        options={{
          title: 'Fikstür',
          tabBarAccessibilityLabel: 'Fikstür — yaklaşan maç listesi',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="calendar-outline" focusedName="calendar" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'İstatistik',
          tabBarAccessibilityLabel: 'İstatistik — model doğruluğu',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="bar-chart-outline" focusedName="bar-chart" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarAccessibilityLabel: 'Ayarlar — tema, favoriler ve bildirimler',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="settings-outline" focusedName="settings" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const iconStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
});
