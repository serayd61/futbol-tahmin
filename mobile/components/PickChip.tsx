// V3 — Tahmin Sepeti tek pick chip'i
// Stages:
//   • normal: dim border + label + prob
//   • high confidence (≥0.60): primary border + "▲" rozeti
//   • selected: dolu yeşil + check ikon
import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';

interface Props {
  label: string;                    // "1", "X", "2", "Üst", "Alt", "KGV", "KGY"
  prob: number;                     // 0..1
  selected?: boolean;
  highConfidence?: boolean;         // ≥0.60 ise true ver
  onPress?: () => void;
  disabled?: boolean;
}

export default function PickChip({
  label, prob, selected = false, highConfidence = false, onPress, disabled = false,
}: Props) {
  const { colors } = useTheme();
  const pctText = `${Math.round(prob * 100)}%`;

  const bg = selected ? colors.primary : (highConfidence ? colors.primaryBg : colors.cardElev);
  const borderColor = selected ? colors.primary : (highConfidence ? colors.primary : colors.border);
  const textColor = selected ? '#FFFFFF' : (highConfidence ? colors.primary : colors.text);
  const probColor = selected ? 'rgba(255,255,255,0.85)' : (highConfidence ? colors.primary : colors.textDim);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${label} pick, olasılık ${pctText}${selected ? ', sepette' : ''}`}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: bg,
          borderColor,
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
      ]}
    >
      {selected ? (
        <Ionicons name="checkmark" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
      ) : highConfidence ? (
        <Ionicons name="caret-up" size={9} color={colors.primary} style={{ marginRight: 2 }} />
      ) : null}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      <Text style={[styles.prob, { color: probColor }]}>{pctText}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
    minHeight: 28,
    minWidth: 48,
    marginRight: 6,
    marginBottom: 6,
  },
  label: { ...typography.labelSmall, fontSize: 11 },
  prob:  { ...typography.numSmall, fontSize: 11, fontWeight: '700' },
});
