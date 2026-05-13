import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { pct } from '../lib/format';

interface Props {
  pHome: number;
  pDraw: number;
  pAway: number;
}

export default function PredictionBar({ pHome, pDraw, pAway }: Props) {
  const { colors } = useTheme();
  // En yüksek olasılık → o segment vurgulanır
  const max = Math.max(pHome, pDraw, pAway);
  const isHomeMax = pHome === max;
  const isDrawMax = pDraw === max;
  const isAwayMax = pAway === max;

  return (
    <View>
      <View style={[styles.bar, { backgroundColor: colors.cardElev }]}>
        <View
          style={[
            styles.segment,
            { flex: pHome, backgroundColor: colors.primary, opacity: isHomeMax ? 1 : 0.65 },
          ]}
        />
        <View
          style={[
            styles.segment,
            { flex: pDraw, backgroundColor: colors.draw, opacity: isDrawMax ? 1 : 0.65 },
          ]}
        />
        <View
          style={[
            styles.segment,
            { flex: pAway, backgroundColor: colors.away, opacity: isAwayMax ? 1 : 0.65 },
          ]}
        />
      </View>
      <View style={styles.labels}>
        <View style={[styles.labelGroup, isHomeMax && styles.labelGroupActive]}>
          <View style={[styles.labelDot, { backgroundColor: colors.primary }]} />
          <Text
            style={[
              styles.label,
              { color: isHomeMax ? colors.primary : colors.textDim, fontWeight: isHomeMax ? '800' : '600' },
            ]}
          >
            1 · {pct(pHome)}
          </Text>
        </View>
        <View style={[styles.labelGroup, isDrawMax && styles.labelGroupActive]}>
          <View style={[styles.labelDot, { backgroundColor: colors.draw }]} />
          <Text
            style={[
              styles.label,
              { color: isDrawMax ? colors.draw : colors.textDim, fontWeight: isDrawMax ? '800' : '600' },
            ]}
          >
            X · {pct(pDraw)}
          </Text>
        </View>
        <View style={[styles.labelGroup, isAwayMax && styles.labelGroupActive]}>
          <View style={[styles.labelDot, { backgroundColor: colors.away }]} />
          <Text
            style={[
              styles.label,
              { color: isAwayMax ? colors.away : colors.textDim, fontWeight: isAwayMax ? '800' : '600' },
            ]}
          >
            2 · {pct(pAway)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  segment: { height: '100%' },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  labelGroup: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  labelGroupActive: {},
  labelDot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, letterSpacing: 0.3 },
});
