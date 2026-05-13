import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  /** "spinner" (eski tarz) veya "skeleton" (yeni, default) */
  variant?: 'spinner' | 'skeleton';
  /** Skeleton modunda kaç MatchCard placeholder gösterelim */
  count?: number;
}

export default function Loading({ variant = 'skeleton', count = 4 }: Props) {
  const { colors } = useTheme();

  if (variant === 'spinner') {
    return (
      <View style={[styles.box, { backgroundColor: colors.bg }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 8, backgroundColor: colors.bg, flex: 1 }}>
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </View>
  );
}

function MatchCardSkeleton() {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.9, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View
      style={[
        skStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow },
      ]}
    >
      <View style={skStyles.headerRow}>
        <Animated.View
          style={[skStyles.barXs, { backgroundColor: colors.cardElev, opacity, width: 90 }]}
        />
        <Animated.View
          style={[skStyles.barXs, { backgroundColor: colors.cardElev, opacity, width: 50 }]}
        />
      </View>
      <View style={skStyles.teamsRow}>
        <Animated.View
          style={[skStyles.barTeam, { backgroundColor: colors.cardElev, opacity }]}
        />
        <Animated.View
          style={[skStyles.barCenter, { backgroundColor: colors.cardElev, opacity }]}
        />
        <Animated.View
          style={[skStyles.barTeam, { backgroundColor: colors.cardElev, opacity }]}
        />
      </View>
      <View style={[skStyles.predRow, { borderTopColor: colors.border }]}>
        <Animated.View
          style={[skStyles.barXs, { backgroundColor: colors.cardElev, opacity, width: 110 }]}
        />
        <Animated.View
          style={[skStyles.barPill, { backgroundColor: colors.cardElev, opacity }]}
        />
      </View>
      <Animated.View
        style={[skStyles.barWide, { backgroundColor: colors.cardElev, opacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 40, alignItems: 'center', justifyContent: 'center' },
});

const skStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  teamsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  barXs: { height: 10, borderRadius: 5 },
  barTeam: { flex: 1, height: 18, borderRadius: 6 },
  barCenter: { width: 56, height: 22, borderRadius: 8, marginHorizontal: 10 },
  predRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    marginBottom: 10,
  },
  barPill: { width: 70, height: 18, borderRadius: 999 },
  barWide: { height: 10, borderRadius: 5 },
});
