import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { pct } from '../lib/format';

interface Props {
  pHome: number;
  pDraw: number;
  pAway: number;
}

export default function PredictionBar({ pHome, pDraw, pAway }: Props) {
  return (
    <View>
      <View style={styles.bar}>
        <View style={[styles.segment, { flex: pHome, backgroundColor: colors.primary }]} />
        <View style={[styles.segment, { flex: pDraw, backgroundColor: colors.draw }]} />
        <View style={[styles.segment, { flex: pAway, backgroundColor: colors.away }]} />
      </View>
      <View style={styles.labels}>
        <Text style={[styles.label, { color: colors.primary }]}>1 {pct(pHome)}</Text>
        <Text style={[styles.label, { color: colors.draw }]}>X {pct(pDraw)}</Text>
        <Text style={[styles.label, { color: colors.away }]}>2 {pct(pAway)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.cardElev,
  },
  segment: { height: '100%' },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
