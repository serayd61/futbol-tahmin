import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { RecentMatch } from '../lib/types';

interface Props {
  matches: RecentMatch[];
  teamName?: string;
}

export default function FormBadges({ matches, teamName }: Props) {
  const { colors } = useTheme();
  if (!matches.length) {
    return (
      <View style={styles.empty}>
        <Text style={[styles.emptyText, { color: colors.textDim }]}>Son maç verisi yok</Text>
      </View>
    );
  }
  const ordered = [...matches].reverse();
  const resultColor = (r: string) => r === 'W' ? colors.high : r === 'D' ? colors.medium : colors.away;
  return (
    <View style={styles.container}>
      {teamName ? <Text style={[styles.team, { color: colors.text }]}>{teamName}</Text> : null}
      <View style={styles.row}>
        {ordered.map(m => (
          <View key={m.fixture_id} style={styles.badgeWrap}>
            <View style={[styles.badge, { backgroundColor: resultColor(m.result) }]}>
              <Text style={styles.badgeText}>{m.result}</Text>
            </View>
            <Text style={[styles.score, { color: colors.text }]}>
              {m.is_home ? `${m.team_goals}-${m.opp_goals}` : `${m.opp_goals}-${m.team_goals}`}
            </Text>
            <Text style={[styles.opp, { color: colors.textDim }]} numberOfLines={1}>
              {m.is_home ? '' : '@ '}{m.opp_name || '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 6 },
  team: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  badgeWrap: { flex: 1, alignItems: 'center', marginHorizontal: 2 },
  badge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  score: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  opp: { fontSize: 9, marginTop: 1, textAlign: 'center' },
  empty: { padding: 12, alignItems: 'center' },
  emptyText: { fontSize: 12 },
});
