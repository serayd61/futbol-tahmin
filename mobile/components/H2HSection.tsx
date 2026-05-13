import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatMatchDate } from '../lib/format';
import type { H2HMatch } from '../lib/types';

interface Props {
  matches: H2HMatch[];
  teamAId: number;
}

export default function H2HSection({ matches, teamAId }: Props) {
  const { colors } = useTheme();
  if (!matches.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textDim, marginBottom: 4 }]}>
          İki takım arası geçmiş maç verisi yetersiz
        </Text>
        <Text style={[styles.emptySubText, { color: colors.textDim }]}>
          Bu özellik genişletilmiş veri kaynaklarıyla (paid API)
          daha güçlü hale getirilecek.
        </Text>
      </View>
    );
  }

  let wins = 0, draws = 0, losses = 0;
  for (const m of matches) {
    const isAHome = m.home_team_id === teamAId;
    const aGoals = isAHome ? m.home_goals : m.away_goals;
    const bGoals = isAHome ? m.away_goals : m.home_goals;
    if (aGoals > bGoals) wins++;
    else if (aGoals < bGoals) losses++;
    else draws++;
  }

  return (
    <View>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { borderColor: colors.high, backgroundColor: colors.cardElev }]}>
          <Text style={[styles.summaryNum, { color: colors.high }]}>{wins}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textDim }]}>Galibiyet</Text>
        </View>
        <View style={[styles.summaryBox, { borderColor: colors.medium, backgroundColor: colors.cardElev }]}>
          <Text style={[styles.summaryNum, { color: colors.medium }]}>{draws}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textDim }]}>Beraberlik</Text>
        </View>
        <View style={[styles.summaryBox, { borderColor: colors.away, backgroundColor: colors.cardElev }]}>
          <Text style={[styles.summaryNum, { color: colors.away }]}>{losses}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textDim }]}>Yenilgi</Text>
        </View>
      </View>

      <View style={{ marginTop: 12 }}>
        {matches.slice(0, 6).map(m => {
          const isAHome = m.home_team_id === teamAId;
          const aGoals = isAHome ? m.home_goals : m.away_goals;
          const bGoals = isAHome ? m.away_goals : m.home_goals;
          const result: 'W'|'D'|'L' = aGoals > bGoals ? 'W' : aGoals < bGoals ? 'L' : 'D';
          const dotColor = result === 'W' ? colors.high : result === 'D' ? colors.medium : colors.away;
          return (
            <View key={m.fixture_id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
              <Text style={[styles.date, { color: colors.textDim }]}>{formatMatchDate(m.utc_date)}</Text>
              <Text style={[styles.score, { color: colors.text }]}>
                {m.home_name || '—'} {m.home_goals}-{m.away_goals} {m.away_name || '—'}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryBox: { flex: 1, marginHorizontal: 4, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: 'center' },
  summaryNum: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 11, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  date: { fontSize: 11, width: 78 },
  score: { fontSize: 12, flex: 1 },
  empty: { padding: 12, alignItems: 'center' },
  emptyText: { fontSize: 13, fontWeight: '600' },
  emptySubText: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
