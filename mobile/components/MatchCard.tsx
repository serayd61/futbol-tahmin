import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { colors } from '../theme/colors';
import { formatMatchDate, formatScore } from '../lib/format';
import PredictionBar from './PredictionBar';
import type { FixtureWithDetails } from '../lib/types';

interface Props {
  fixture: FixtureWithDetails;
}

const confStyle = (c: string) => ({
  color:        c === 'high' ? colors.high : c === 'medium' ? colors.medium : colors.low,
  borderColor:  c === 'high' ? colors.high : c === 'medium' ? colors.medium : colors.low,
});

export default function MatchCard({ fixture }: Props) {
  const home = fixture.home_team?.short_name || fixture.home_team?.name || '—';
  const away = fixture.away_team?.short_name || fixture.away_team?.name || '—';
  const league = fixture.league?.name || '';
  const time = formatMatchDate(fixture.utc_date);
  const isFinished = fixture.status === 'FINISHED';
  const score = isFinished ? formatScore(fixture.home_goals, fixture.away_goals) : null;
  const p = fixture.prediction;

  return (
    <Link href={`/match/${fixture.id}`} asChild>
      <Pressable style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.league} numberOfLines={1}>{league}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>

        <View style={styles.teamsRow}>
          <Text style={styles.team} numberOfLines={1}>{home}</Text>
          <Text style={styles.vs}>{score || 'vs'}</Text>
          <Text style={[styles.team, styles.teamRight]} numberOfLines={1}>{away}</Text>
        </View>

        {p && !isFinished && (
          <View style={styles.predictionBlock}>
            <View style={styles.predictionRow}>
              <Text style={styles.predLabel}>Tahmin</Text>
              <Text style={styles.predScore}>{p.predicted_score}</Text>
              <Text style={[styles.confBadge, confStyle(p.confidence)]}>{p.confidence}</Text>
            </View>
            <PredictionBar
              pHome={p.prob_home_win}
              pDraw={p.prob_draw}
              pAway={p.prob_away_win}
            />
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  league: { color: colors.textDim, fontSize: 12, fontWeight: '500', flex: 1, marginRight: 8 },
  time: { color: colors.textDim, fontSize: 12 },
  teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  team: { color: colors.text, fontSize: 16, fontWeight: '600', flex: 1 },
  teamRight: { textAlign: 'right' },
  vs: { color: colors.textDim, marginHorizontal: 12, fontSize: 14, fontWeight: '700' },
  predictionBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  predictionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  predLabel: { color: colors.textDim, fontSize: 12, flex: 1 },
  predScore: { color: colors.text, fontSize: 14, fontWeight: '700', marginRight: 8 },
  confBadge: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
});
