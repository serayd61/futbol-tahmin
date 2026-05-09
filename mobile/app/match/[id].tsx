import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { colors } from '../../theme/colors';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import PredictionBar from '../../components/PredictionBar';
import { getFixtureById } from '../../lib/queries';
import { formatMatchDate, formatScore, pct } from '../../lib/format';
import type { FixtureWithDetails } from '../../lib/types';

const confStyle = (c: string) => ({
  color:        c === 'high' ? colors.high : c === 'medium' ? colors.medium : colors.low,
  borderColor:  c === 'high' ? colors.high : c === 'medium' ? colors.medium : colors.low,
});

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

export default function MatchDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fixture, setFixture] = useState<FixtureWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getFixtureById(Number(id))
      .then(f => { setFixture(f); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (!fixture) return <EmptyState title="Maç bulunamadı" />;

  const home   = fixture.home_team?.name || '—';
  const away   = fixture.away_team?.name || '—';
  const league = fixture.league?.name || '';
  const time   = formatMatchDate(fixture.utc_date);
  const p      = fixture.prediction;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.league}>{league}</Text>
      <Text style={styles.time}>{time}</Text>

      <View style={styles.teamsBlock}>
        <Text style={styles.team}>{home}</Text>
        <Text style={styles.score}>
          {fixture.status === 'FINISHED'
            ? formatScore(fixture.home_goals, fixture.away_goals)
            : 'vs'}
        </Text>
        <Text style={styles.team}>{away}</Text>
      </View>

      {p ? (
        <View style={styles.predBlock}>
          <Text style={styles.sectionTitle}>Tahmin</Text>

          <View style={styles.bigScoreRow}>
            <Text style={styles.bigScore}>{p.predicted_score}</Text>
            <Text style={[styles.confBadge, confStyle(p.confidence)]}>
              {p.confidence.toUpperCase()}
            </Text>
          </View>

          <View style={styles.barRow}>
            <PredictionBar
              pHome={p.prob_home_win}
              pDraw={p.prob_draw}
              pAway={p.prob_away_win}
            />
          </View>

          <View style={styles.metricGrid}>
            <Metric label="Beklenen gol (ev)" value={Number(p.expected_goals_home).toFixed(2)} />
            <Metric label="Beklenen gol (dep)" value={Number(p.expected_goals_away).toFixed(2)} />
            <Metric label="Üst 2.5" value={pct(p.prob_over_25)} />
            <Metric label="Alt 2.5" value={pct(p.prob_under_25)} />
          </View>

          <Text style={styles.modelNote}>Model: {p.model_version}</Text>
        </View>
      ) : (
        <Text style={styles.noPred}>Bu maç için tahmin henüz hesaplanmadı.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  league: { color: colors.textDim, fontSize: 13, fontWeight: '600' },
  time: { color: colors.textDim, fontSize: 12, marginTop: 4 },
  teamsBlock: { marginTop: 24, alignItems: 'center' },
  team: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  score: { color: colors.textDim, fontSize: 18, fontWeight: '600', marginVertical: 8 },
  predBlock: {
    marginTop: 32,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  bigScoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  bigScore: { color: colors.text, fontSize: 36, fontWeight: '800', marginRight: 12 },
  confBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  barRow: { marginBottom: 20 },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metricBox: {
    width: '50%',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  metricLabel: { color: colors.textDim, fontSize: 12 },
  metricValue: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  modelNote: { color: colors.textDim, fontSize: 11, marginTop: 12, textAlign: 'right' },
  noPred: {
    marginTop: 40,
    color: colors.textDim,
    fontSize: 14,
    textAlign: 'center',
  },
});
