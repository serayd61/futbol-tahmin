import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions,
  type ViewToken,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { setOnboarded } from '../lib/preferences';

const { width } = Dimensions.get('window');

interface Slide {
  icon: string;
  title: string;
  body: string;
  highlight?: { color: string; text: string };
}

export default function Onboarding() {
  const { colors } = useTheme();
  const router = useRouter();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const slides: Slide[] = [
    {
      icon: '⚽',
      title: 'Futbol Tahmini',
      body:
        "Avrupa'nın major liglerinden günlük maçlar için bilimsel skor tahminleri. " +
        'Premier League, La Liga, Bundesliga, Serie A ve daha fazlası — tek bir yerde.',
    },
    {
      icon: '📊',
      title: 'Bilimsel model, garanti değil',
      body:
        'Poisson dağılımı ile takım form, gol ortalamaları ve H2H verilerinden olasılıklar hesaplanır.',
      highlight: {
        color: colors.high,
        text: 'Güçlü tahminler: %60+ olasılık · Olası: %45-60 · Belirsiz: veri yetersiz',
      },
    },
    {
      icon: '🛒',
      title: 'Tahmin Sepeti',
      body:
        'Lig odalarından maç seç, "Üst", "KGV" gibi pick\'leri sepete ekle. ' +
        'Maçlar bittikçe sepetin otomatik puanlanır — her isabet 10 puan.',
      highlight: {
        color: colors.primary,
        text: 'Modele karşı yarış, puanları topla, sıralamada yer al.',
      },
    },
    {
      icon: '🔔',
      title: 'Favori takım bildirimleri',
      body:
        'Ayarlar sekmesinden favori takımlarını ekle, maç başlamadan önce push bildirimi al. ' +
        'Hiçbir kişisel bilgi paylaşmadan.',
    },
  ];

  const handleNext = async () => {
    if (index < slides.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      await setOnboarded(true);
      router.replace('/(tabs)');
    }
  };

  const handleSkip = async () => {
    await setOnboarded(true);
    router.replace('/(tabs)');
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const viewConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <Pressable
          onPress={handleSkip}
          style={styles.skipBtn}
          accessibilityRole="button"
          accessibilityLabel="Tanıtımı atla"
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.skipText, { color: colors.textDim }]}>Atla</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewConfig}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.cardElev, borderColor: colors.border },
              ]}
            >
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            <Text style={[styles.body, { color: colors.textDim }]}>{item.body}</Text>
            {item.highlight ? (
              <View
                style={[
                  styles.highlightBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.highlightDot, { backgroundColor: item.highlight.color }]} />
                <Text style={[styles.highlightText, { color: colors.text }]}>
                  {item.highlight.text}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      />

      {/* Sayfa noktaları */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: i === index ? colors.primary : colors.border,
                width: i === index ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Devam butonu */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleNext}
          accessibilityRole="button"
          accessibilityLabel={index < slides.length - 1 ? 'Sonraki tanıtım' : 'Uygulamayı kullanmaya başla'}
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: pressed ? colors.primaryDim : colors.primary },
          ]}
        >
          <Text style={styles.ctaText}>
            {index < slides.length - 1 ? 'Devam' : "Başlayalım"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 10, minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { ...typography.body, fontSize: 14, fontWeight: '600' },
  slide: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
  },
  icon: { fontSize: 56 },
  title: {
    ...typography.h1,
    fontSize: 26,
    marginBottom: 14,
    textAlign: 'center',
  },
  body: {
    ...typography.body,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },
  highlightBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  highlightDot: { width: 8, height: 8, borderRadius: 4 },
  highlightText: { fontSize: 13, flex: 1, lineHeight: 18 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  cta: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.h3,
    color: '#FFFFFF',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
