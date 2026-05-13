// V3 — Üst header sepet sayacı.
// Sepete pick varsa rozetli badge gösterir; basınca /basket'a gider.
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { useBasket, BASKET_MAX_PICKS } from '../lib/BasketContext';

export default function BasketBadge() {
  const { colors } = useTheme();
  const { count } = useBasket();
  const isFull = count >= BASKET_MAX_PICKS;

  return (
    <Link href="/basket" asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tahmin sepeti, ${count} pick`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={({ pressed }) => [
          styles.wrap,
          {
            backgroundColor: count > 0 ? colors.primary : 'transparent',
            borderColor: count > 0 ? colors.primary : colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <Ionicons
          name={count > 0 ? 'basket' : 'basket-outline'}
          size={16}
          color={count > 0 ? '#FFFFFF' : colors.text}
        />
        {count > 0 ? (
          <View style={[styles.countBadge, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>
              {count}{isFull ? '!' : ''}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 12,
    gap: 4,
    minHeight: 30,
    minWidth: 34,
    borderWidth: 1,
  },
  countBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { ...typography.labelSmall, fontSize: 10, fontWeight: '800' },
});
