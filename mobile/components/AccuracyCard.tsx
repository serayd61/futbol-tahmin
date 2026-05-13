import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  title: string;
  pct: number;
  hit: number;
  total: number;
}

export default function AccuracyCard({ title, pct, hit, total }: Props) {
  const { colors } = useTheme();
  const barColor = pct >= 60 ? colors.high : pct >= 45 ? colors.medium : colors.low;
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.pct, { color: barColor }]}>{pct.toFixed(1)}%</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.cardElev }]}>
        <View style={[styles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: barColor }]} />
      </View>
      <Text style={[styles.detail, { color: colors.textDim }]}>{hit} / {total} isabet</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '600' },
  pct: { fontSize: 22, fontWeight: '800' },
  barTrack: { height: 8, borderRadius: 4, marginTop: 10, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  detail: { fontSize: 12, marginTop: 6 },
});
