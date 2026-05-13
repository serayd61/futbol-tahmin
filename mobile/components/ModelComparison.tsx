// V3 — Model versiyonları yan yana karşılaştırma kartı
// model_brier view'ından gelen veri: dc-v1 vs poisson-v2 vs poisson-v1
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import type { ModelBrierRow } from '../lib/queries';

interface Props {
  rows: ModelBrierRow[];
  /** Production'da aktif model (default dc-v1) */
  activeModel?: string;
}

const MODEL_LABELS: Record<string, string> = {
  'dc-v1':      'Dixon-Coles v1',
  'poisson-v2': 'Poisson v2',
  'poisson-v1': 'Poisson v1',
};

export default function ModelComparison({ rows, activeModel = 'dc-v1' }: Props) {
  const { colors } = useTheme();

  if (!rows || rows.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Model Karşılaştırması</Text>
        <Text style={[styles.subtitle, { color: colors.textDim }]}>
          Brier skoru düşük olan daha iyi kalibre — 0.50 altı çok iyi
        </Text>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.colLabel, { color: colors.textFaint, flex: 2 }]}>Model</Text>
        <Text style={[styles.colLabel, { color: colors.textFaint, flex: 1, textAlign: 'right' }]}>Maç</Text>
        <Text style={[styles.colLabel, { color: colors.textFaint, flex: 1.2, textAlign: 'right' }]}>1X2 İsabet</Text>
        <Text style={[styles.colLabel, { color: colors.textFaint, flex: 1, textAlign: 'right' }]}>Brier</Text>
      </View>

      {rows.map((row) => {
        const isActive = row.model_version === activeModel;
        const acc = (row.accuracy_1x2 * 100).toFixed(1);
        const brier = row.brier_1x2?.toFixed(3) || '—';
        const accColor = row.accuracy_1x2 >= 0.6 ? colors.high
          : row.accuracy_1x2 >= 0.45 ? colors.medium
          : colors.low;
        const brierColor = row.brier_1x2 <= 0.50 ? colors.high
          : row.brier_1x2 <= 0.60 ? colors.medium
          : colors.low;

        return (
          <View
            key={row.model_version}
            style={[
              styles.row,
              {
                borderTopColor: colors.border,
                backgroundColor: isActive ? colors.primaryBg : 'transparent',
              },
            ]}
          >
            <View style={[styles.modelCell, { flex: 2 }]}>
              {isActive ? (
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginRight: 5 }} />
              ) : null}
              <Text style={[styles.modelText, { color: isActive ? colors.primary : colors.text }]}>
                {MODEL_LABELS[row.model_version] || row.model_version}
              </Text>
            </View>
            <Text style={[styles.numCell, { color: colors.text, flex: 1 }]}>{row.total}</Text>
            <Text style={[styles.numCell, { color: accColor, flex: 1.2, fontWeight: '700' }]}>%{acc}</Text>
            <Text style={[styles.numCell, { color: brierColor, flex: 1, fontWeight: '700' }]}>{brier}</Text>
          </View>
        );
      })}

      <Text style={[styles.disclaimer, { color: colors.textFaint }]}>
        {rows.find(r => r.model_version === 'dc-v1') && rows.find(r => r.model_version === 'poisson-v2')
          ? (() => {
              const dc = rows.find(r => r.model_version === 'dc-v1')!;
              const v2 = rows.find(r => r.model_version === 'poisson-v2')!;
              if (dc.total < 10) return 'dc-v1 yeterli veri toplandığında karşılaştırma anlamlı olur (≥10 maç).';
              const dcBetter = dc.brier_1x2 < v2.brier_1x2;
              const diff = Math.abs(dc.brier_1x2 - v2.brier_1x2).toFixed(3);
              return dcBetter
                ? `dc-v1 daha iyi kalibre (Brier farkı: -${diff}). Aktif model.`
                : `poisson-v2 hâlâ daha iyi (Brier farkı: -${diff}). dc-v1 olgunlaşıyor.`;
            })()
          : 'Model versiyonları zamanla karşılaştırılır — gece çalıştıkça veri birikir.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, borderWidth: 1, marginVertical: 8 },
  header: { marginBottom: 12 },
  title:    { ...typography.h3, fontSize: 16 },
  subtitle: { ...typography.caption, fontSize: 11, marginTop: 2 },

  tableHeader: {
    flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4,
  },
  colLabel: { ...typography.labelSmall, fontSize: 9 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 4,
    borderTopWidth: 1,
  },
  modelCell: { flexDirection: 'row', alignItems: 'center' },
  modelText: { ...typography.bodySmall, fontSize: 13, fontWeight: '600' },
  numCell:   { ...typography.numSmall, fontSize: 12, textAlign: 'right', fontVariant: ['tabular-nums'] },

  disclaimer: { ...typography.caption, fontSize: 10, marginTop: 12, lineHeight: 14, fontStyle: 'italic' },
});
