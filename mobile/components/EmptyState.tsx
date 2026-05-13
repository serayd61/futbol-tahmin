import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';

interface Props {
  /** Büyük ikon (emoji veya unicode sembol — örn. "⚽" "📅" "★") */
  icon?: string;
  title: string;
  subtitle?: string;
  /** İsteğe bağlı CTA butonu */
  cta?: {
    label: string;
    onPress: () => void;
  };
}

export default function EmptyState({ icon, title, subtitle, cta }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.box}>
      {icon ? (
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.cardElev, borderColor: colors.border },
          ]}
        >
          <Text style={styles.icon}>{icon}</Text>
        </View>
      ) : null}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sub, { color: colors.textDim }]}>{subtitle}</Text>
      ) : null}
      {cta ? (
        <Pressable
          onPress={cta.onPress}
          accessibilityRole="button"
          accessibilityLabel={cta.label}
          style={({ pressed }) => [
            styles.cta,
            {
              backgroundColor: pressed ? colors.primaryDim : colors.primary,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <Text style={styles.ctaText}>{cta.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    paddingHorizontal: 32,
    paddingVertical: 56,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
  },
  icon: { fontSize: 28 },
  title: {
    ...typography.h3,
    marginBottom: 6,
    textAlign: 'center',
  },
  sub: {
    ...typography.bodyDim,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  cta: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,   // V3: 44pt min touch target
    borderRadius: 10,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.3,
  },
});
