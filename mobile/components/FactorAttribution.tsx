// V3 — Modelin "neden bu tahmin?" sorusunu kendi parametreleriyle yanıtlar.
// dc-v1 model_version'da factors jsonb dolu olur ve şu alanları içerir:
//   home_advantage        — log(γ_league); ev avantajının log-odds katkısı
//   team_strength_diff    — log(home_str / away_str)
//   form_diff             — formH_mult - formA_mult
//   shrinkage_pull        — az veri → lig ortalamasına çekme miktarı
//
// Her faktörü pozitif/negatif yönlü mini bar chart olarak çizer.
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import type { PredictionFactors } from '../lib/types';

interface Props {
  factors: PredictionFactors | null | undefined;
}

interface FactorRow {
  key: string;
  label: string;
  value: number;
  /** Etki büyüklüğü (mutlak değer) */
  magnitude: number;
  description: string;
}

const LABELS: Record<string, { tr: string; desc: string }> = {
  home_advantage:     { tr: 'Ev avantajı',         desc: 'Lige özgü ev sahibi gol üretkenliği' },
  team_strength_diff: { tr: 'Takım gücü farkı',    desc: 'Saldırı × savunma asimetrisi' },
  form_diff:          { tr: 'Form farkı',          desc: 'Son 5 maç W/D/L çarpanı' },
  shrinkage_pull:     { tr: 'Veri yetersizliği',   desc: 'Az maç → lig ortalamasına çekildi' },
};

export default function FactorAttribution({ factors }: Props) {
  const { colors } = useTheme();

  const rows = useMemo<FactorRow[]>(() => {
    if (!factors) return [];
    const candidates: Array<keyof PredictionFactors> = [
      'home_advantage',
      'team_strength_diff',
      'form_diff',
      'shrinkage_pull',
    ];
    return candidates
      .map((k) => {
        const v = factors[k];
        if (typeof v !== 'number' || !isFinite(v) || v === 0) return null;
        const meta = LABELS[k as string];
        return {
          key: k as string,
          label: meta?.tr || (k as string),
          description: meta?.desc || '',
          value: v,
          magnitude: Math.abs(v),
        };
      })
      .filter((x): x is FactorRow => x !== null)
      .sort((a, b) => b.magnitude - a.magnitude);
  }, [factors]);

  if (rows.length === 0) return null;

  // Bar genişlikleri için maks etkiyi referans al
  const maxMagnitude = Math.max(...rows.map((r) => r.magnitude), 0.01);

  return (
    <View>
      {rows.map((r) => {
        const isPositive = r.value > 0;
        const barColor = isPositive ? colors.primary : colors.away;
        // Yönlü bar: yarı sol = negatif, yarı sağ = pozitif
        const widthPct = Math.min(100, (r.magnitude / maxMagnitude) * 50); // max 50% (yarım çubuk)
        return (
          <View key={r.key} style={styles.row}>
            <View style={styles.labelCol}>
              <Text style={[styles.label, { color: colors.text }]}>{r.label}</Text>
              <Text style={[styles.desc, { color: colors.textFaint }]}>{r.description}</Text>
            </View>
            <View style={styles.barCol}>
              <View style={[styles.barTrack, { backgroundColor: colors.cardElev }]}>
                {/* Merkez referans çizgisi */}
                <View
                  style={[styles.barCenter, { backgroundColor: colors.border }]}
                  pointerEvents="none"
                />
                <View
                  style={[
                    styles.barFill,
                    {
                      backgroundColor: barColor,
                      width: `${widthPct}%`,
                      [isPositive ? 'left' : 'right']: '50%',
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.value, { color: barColor }]}
                accessibilityLabel={`${r.label} katkısı: ${isPositive ? 'pozitif' : 'negatif'} ${r.magnitude.toFixed(2)}`}
              >
                {isPositive ? '+' : ''}{r.value.toFixed(2)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  labelCol: {
    flex: 1,
    paddingRight: 12,
  },
  label: { ...typography.bodySmall, fontWeight: '700' },
  desc: { ...typography.caption, fontSize: 10, marginTop: 1 },
  barCol: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  barCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
  },
  barFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  value: {
    ...typography.numSmall,
    fontSize: 12,
    minWidth: 44,
    textAlign: 'right',
  },
});
