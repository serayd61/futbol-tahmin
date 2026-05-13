// V3 — Poisson skor matris heatmap'i (Dixon-Coles modelinin "açık kutusu")
// 7x7 grid: ev sahibi gol sayısı (satır) × deplasman gol sayısı (sütun).
// Her hücrenin opasitesi ortak olasılığı temsil eder; en yüksek olasılıklı
// hücre primary border ile vurgulanır. Hücreye dokununca tooltip görünür.
//
// Kullanım:
//   <ScoreHeatmap matrix={prediction.score_matrix} />
//
// Gereksinim: prediction.score_matrix dc-v1 modelinden gelir (jsonb 7x7 array).
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';

interface Props {
  matrix: number[][] | null | undefined;
  /** Ev sahibi kısa isim (default "Ev") */
  homeShort?: string;
  /** Deplasman kısa isim (default "Dep") */
  awayShort?: string;
}

export default function ScoreHeatmap({ matrix, homeShort = 'Ev', awayShort = 'Dep' }: Props) {
  const { colors } = useTheme();
  const [selected, setSelected] = useState<{ i: number; j: number } | null>(null);

  // Matrisin geçerliliğini doğrula
  if (!matrix || !Array.isArray(matrix) || matrix.length === 0 || !Array.isArray(matrix[0])) {
    return null;
  }
  const n = matrix.length;       // 7
  const cols = matrix[0].length; // 7

  // Maks değer (renk normalize için) + en olası hücre koordinatı
  const { maxP, bestI, bestJ } = useMemo(() => {
    let m = 0, bi = 0, bj = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < cols; j++) {
        const v = matrix[i][j] || 0;
        if (v > m) { m = v; bi = i; bj = j; }
      }
    }
    return { maxP: m, bestI: bi, bestJ: bj };
  }, [matrix, n, cols]);

  // primary rengini "r,g,b" formatına çıkar (alpha override için)
  const rgb = useMemo(() => {
    const hex = colors.primary.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r},${g},${b}`;
  }, [colors.primary]);

  const cellBg = (p: number) => {
    if (maxP <= 0) return 'rgba(0,0,0,0)';
    // Normalized 0..1, ama küçük olasılıkları da görünür kıl (sqrt eğri)
    const norm = Math.sqrt(Math.min(p / maxP, 1));
    const alpha = (0.08 + norm * 0.85).toFixed(3);
    return `rgba(${rgb},${alpha})`;
  };

  const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

  return (
    <View>
      {/* Sütun başlığı: deplasman gol sayıları 0..6 */}
      <View style={styles.colHeaderRow}>
        <View style={styles.rowLabelCell} />
        {Array.from({ length: cols }).map((_, j) => (
          <View key={j} style={styles.cell}>
            <Text style={[styles.headerLabel, { color: colors.textDim }]}>{j}</Text>
          </View>
        ))}
      </View>

      {matrix.map((row, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowLabelCell}>
            <Text style={[styles.headerLabel, { color: colors.textDim }]}>{i}</Text>
          </View>
          {row.map((p, j) => {
            const isBest = i === bestI && j === bestJ;
            const isSelected = selected?.i === i && selected?.j === j;
            return (
              <Pressable
                key={j}
                accessibilityRole="button"
                accessibilityLabel={`${i}-${j} skoru, ${pct(p)} olasılık`}
                onPress={() => setSelected(isSelected ? null : { i, j })}
                style={[
                  styles.cell,
                  {
                    backgroundColor: cellBg(p),
                    borderColor: isBest ? colors.primary : (isSelected ? colors.text : 'transparent'),
                    borderWidth: isBest ? 2 : (isSelected ? 1 : 0),
                  },
                ]}
              />
            );
          })}
        </View>
      ))}

      {/* Tap'lenen hücre için tooltip + eksenler için legend */}
      <View style={styles.legendRow}>
        <View style={styles.axisLabel}>
          <Text style={[styles.axisText, { color: colors.textDim }]}>
            ↓ {homeShort} gol
          </Text>
        </View>
        <View style={styles.tooltipWrap}>
          {selected ? (
            <Text style={[styles.tooltip, { color: colors.text }]}>
              <Text style={{ color: colors.textDim }}>Skor </Text>
              <Text style={{ fontWeight: '800' }}>
                {selected.i}-{selected.j}
              </Text>
              <Text style={{ color: colors.textDim }}> · olasılık </Text>
              <Text style={{ fontWeight: '800', color: colors.primary }}>
                {pct(matrix[selected.i][selected.j] || 0)}
              </Text>
            </Text>
          ) : (
            <Text style={[styles.tooltipDim, { color: colors.textFaint }]}>
              En olası: {bestI}-{bestJ} · {pct(maxP)} · hücreye dokun
            </Text>
          )}
        </View>
        <View style={styles.axisLabel}>
          <Text style={[styles.axisText, { color: colors.textDim }]}>
            {awayShort} gol →
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  colHeaderRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  rowLabelCell: {
    width: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    marginHorizontal: 1,
    borderRadius: 4,
  },
  headerLabel: {
    ...typography.label,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  axisLabel: {
    minWidth: 70,
  },
  axisText: {
    ...typography.caption,
    fontSize: 11,
  },
  tooltipWrap: {
    flex: 1,
    alignItems: 'center',
  },
  tooltip: {
    ...typography.body,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  tooltipDim: {
    ...typography.caption,
    fontSize: 11,
    fontStyle: 'italic',
  },
});
