import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { formatMatchDate } from '../lib/format';
import type { OutcomeRow as OutcomeRowType } from '../lib/types';

interface Props { row: OutcomeRowType; }

export default function OutcomeRow({ row }: Props) {
  const { colors } = useTheme();
  const home = row.home_team_name || '—';
  const away = row.away_team_name || '—';
  const actual = `${row.home_goals}-${row.away_goals}`;
  const hit = row.hit_1x2 === 1;
  const exact = row.hit_score === 1;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.league, { color: colors.textDim }]} numberOfLines={1}>
          {row.league_name || ''} · {formatMatchDate(row.utc_date)}
        </Text>
        <View style={[styles.badge, { backgroundColor: hit ? colors.high : colors.away }]}>
          <Text style={styles.badgeText}>{hit ? '✓' : '✗'} 1X2</Text>
        </View>
      </View>

      <View style={styles.scoreRow}>
        <Text style={[styles.team, { color: colors.text }]} numberOfLines={1}>{home}</Text>
        <View style={styles.scoreBox}>
          <Text style={[styles.scoreLabel, { color: colors.textDim }]}>tahmin</Text>
          <Text style={[styles.predicted, { color: colors.textDim }]}>{row.predicted_score}</Text>
          <Text style={[styles.scoreLabel, { color: colors.textDim }]}>gerçek</Text>
          <Text style={[styles.actual, { color: exact ? colors.high : colors.text }]}>{actual}</Text>
        </View>
        <Text style={[styles.team, styles.teamRight, { color: colors.text }]} numberOfLines={1}>{away}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginVertical: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  league: { fontSize: 11, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  team: { fontSize: 14, fontWeight: '600', flex: 1 },
  teamRight: { textAlign: 'right' },
  scoreBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  scoreLabel: { fontSize: 9, marginHorizontal: 3 },
  predicted: { fontSize: 13, fontWeight: '600' },
  actual: { fontSize: 13, fontWeight: '700', marginLeft: 4 },
});
