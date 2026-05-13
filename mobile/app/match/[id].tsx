import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import PredictionBar from '../../components/PredictionBar';
import FormBadges from '../../components/FormBadges';
import H2HSection from '../../components/H2HSection';
import ScoreHeatmap from '../../components/ScoreHeatmap';
import FactorAttribution from '../../components/FactorAttribution';
import { getFixtureById, getTeamRecentForm, getH2H } from '../../lib/queries';
import { formatMatchDate, formatScore, pct } from '../../lib/format';
import { confidenceLabels, confidenceDescriptions } from '../../theme/colors';
import type { FixtureWithDetails, RecentMatch, H2HMatch } from '../../lib/types';

export default function MatchDetail() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [fixture, setFixture] = useState<FixtureWithDetails | null>(null);
  const [homeForm, setHomeForm] = useState<RecentMatch[]>([]);
  const [awayForm, setAwayForm] = useState<RecentMatch[]>([]);
  const [h2h, setH2h] = useState<H2HMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const f = await getFixtureById(Number(id));
        setFixture(f);
        if (f && f.home_team_id && f.away_team_id) {
          const [hf, af, h2hList] = await Promise.all([
            getTeamRecentForm(f.home_team_id, 5),
            getTeamRecentForm(f.away_team_id, 5),
            getH2H(f.home_team_id, f.away_team_id, 10),
          ]);
          setHomeForm(hf);
          setAwayForm(af);
          setH2h(h2hList);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <Loading />;
  if (!fixture)
    return (
      <EmptyState
        icon="🔍"
        title="Maç bulunamadı"
        subtitle="Bu maç silinmiş veya henüz veritabanına gelmemiş olabilir"
      />
    );

  const home   = fixture.home_team?.name || '—';
  const away   = fixture.away_team?.name || '—';
  const league = fixture.league?.name || '';
  const time   = formatMatchDate(fixture.utc_date);
  const p      = fixture.prediction;
  const confTone =
    p?.confidence === 'high'
      ? { color: colors.high, bg: colors.highBg }
      : p?.confidence === 'medium'
      ? { color: colors.medium, bg: colors.mediumBg }
      : { color: colors.low, bg: colors.lowBg };
  const showScore = p && p.confidence !== 'low';
  const confidenceText = p ? confidenceLabels[p.confidence] : null;
  const confidenceDesc = p ? confidenceDescriptions[p.confidence] : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
      <Text style={[styles.league, { color: colors.textDim }]}>{league}</Text>
      <Text style={[styles.time, { color: colors.textDim }]}>{time}</Text>

      <View style={styles.teamsBlock}>
        <Text style={[styles.team, { color: colors.text }]}>{home}</Text>
        <Text style={[styles.score, { color: colors.textDim }]}>
          {fixture.status === 'FINISHED'
            ? formatScore(fixture.home_goals, fixture.away_goals)
            : 'vs'}
        </Text>
        <Text style={[styles.team, { color: colors.text }]}>{away}</Text>
      </View>

      {p ? (
        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 32 }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tahmin</Text>

          <View style={styles.bigScoreRow}>
            {showScore ? (
              <Text style={[styles.bigScore, { color: colors.text }]}>{p.predicted_score}</Text>
            ) : (
              <Text style={[styles.bigScoreDim, { color: colors.textFaint }]}>Skor belirsiz</Text>
            )}
            <View
              style={[
                styles.confPill,
                { backgroundColor: confTone.bg, borderColor: `${confTone.color}55` },
              ]}
            >
              <View style={[styles.confDot, { backgroundColor: confTone.color }]} />
              <Text style={[styles.confPillText, { color: confTone.color }]}>{confidenceText}</Text>
            </View>
          </View>
          {confidenceDesc ? (
            <Text style={[styles.confDesc, { color: colors.textDim }]}>{confidenceDesc}</Text>
          ) : null}

          <View style={styles.barRow}>
            <PredictionBar pHome={p.prob_home_win} pDraw={p.prob_draw} pAway={p.prob_away_win} />
          </View>

          <View style={styles.metricGrid}>
            <Metric label="Beklenen gol (ev)"  value={Number(p.expected_goals_home).toFixed(2)} />
            <Metric label="Beklenen gol (dep)" value={Number(p.expected_goals_away).toFixed(2)} />
            <Metric label="Üst 2.5"            value={pct(p.prob_over_25)} />
            <Metric label="Alt 2.5"            value={pct(p.prob_under_25)} />
          </View>

          <Text style={[styles.modelNote, { color: colors.textDim }]}>Model: {p.model_version}</Text>
        </View>
      ) : (
        <Text style={[styles.noPred, { color: colors.textDim }]}>Bu maç için tahmin henüz hesaplanmadı.</Text>
      )}

      {/* V3 — Dixon-Coles modelinin "açık kutusu": 7x7 skor olasılık heatmap'i.
          Sadece dc-v1 model_version'da score_matrix dolu olur. */}
      {p?.score_matrix && Array.isArray(p.score_matrix) && p.score_matrix.length > 0 ? (
        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Skor Dağılımı</Text>
          <Text style={[styles.whySubtitle, { color: colors.textDim }]}>
            Modelin her olası skora atadığı olasılık
          </Text>
          <ScoreHeatmap
            matrix={p.score_matrix}
            homeShort={fixture.home_team?.short_name || home}
            awayShort={fixture.away_team?.short_name || away}
          />
        </View>
      ) : null}

      {/* Tahminin Sebebi (Why this prediction) */}
      {p ? (
        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tahminin Sebebi</Text>
          <Text style={[styles.whySubtitle, { color: colors.textDim }]}>
            Modelin bu sonuca nasıl ulaştığı
          </Text>
          {/* V3 — Modelden gelen gerçek katkı yüzdeleri (dc-v1 factors jsonb) */}
          {p.factors ? (
            <View style={{ marginBottom: 14 }}>
              <FactorAttribution factors={p.factors} />
            </View>
          ) : null}
          {(() => {
            const reasons: string[] = [];
            const top = Math.max(p.prob_home_win, p.prob_draw, p.prob_away_win);
            const winner =
              p.prob_home_win === top ? home : p.prob_away_win === top ? away : 'Beraberlik';
            reasons.push(`Olası sonuç: ${winner} (%${Math.round(top * 100)} ihtimal)`);
            reasons.push(
              `Beklenen gol: ${home} ${p.expected_goals_home.toFixed(2)} — ${away} ${p.expected_goals_away.toFixed(2)}`
            );
            if (p.prob_over_25 >= 0.6) {
              reasons.push(`Yüksek skorlu maç bekleniyor (Üst 2.5: %${Math.round(p.prob_over_25 * 100)})`);
            } else if (p.prob_under_25 >= 0.6) {
              reasons.push(`Düşük skorlu maç bekleniyor (Alt 2.5: %${Math.round(p.prob_under_25 * 100)})`);
            }
            // Form delta
            if (homeForm.length > 0 && awayForm.length > 0) {
              const wPts = (m: RecentMatch) => (m.result === 'W' ? 3 : m.result === 'D' ? 1 : 0);
              const hPts = homeForm.reduce((s, m) => s + wPts(m), 0);
              const aPts = awayForm.reduce((s, m) => s + wPts(m), 0);
              if (hPts > aPts + 3) reasons.push(`${home} son 5 maçta daha iyi formda (${hPts} - ${aPts} puan)`);
              else if (aPts > hPts + 3) reasons.push(`${away} son 5 maçta daha iyi formda (${aPts} - ${hPts} puan)`);
            }
            // H2H signal
            if (h2h.length >= 3) {
              const homeWins = h2h.filter(
                m => (m.home_team_id === fixture.home_team_id && m.home_goals > m.away_goals) ||
                     (m.away_team_id === fixture.home_team_id && m.away_goals > m.home_goals)
              ).length;
              const awayWins = h2h.filter(
                m => (m.home_team_id === fixture.away_team_id && m.home_goals > m.away_goals) ||
                     (m.away_team_id === fixture.away_team_id && m.away_goals > m.home_goals)
              ).length;
              if (homeWins > awayWins) reasons.push(`H2H'da ${home} üstün (${homeWins}/${h2h.length})`);
              else if (awayWins > homeWins) reasons.push(`H2H'da ${away} üstün (${awayWins}/${h2h.length})`);
            }
            return reasons.map((r, i) => (
              <View key={i} style={styles.whyRow}>
                <View style={[styles.whyDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.whyText, { color: colors.text }]}>{r}</Text>
              </View>
            ));
          })()}
          <Text style={[styles.whyDisclaimer, { color: colors.textFaint }]}>
            ⚠️ İstatistiksel analiz — kesin sonuç garantisi değil
          </Text>
        </View>
      ) : null}

      {/* AI Yorum (varsa) */}
      {p?.ai_comment ? (
        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.aiHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              ✨ AI Yorumu
            </Text>
            <Text style={[styles.aiSource, { color: colors.textDim }]}>Gemini Flash</Text>
          </View>
          <Text style={[styles.aiText, { color: colors.text }]}>{p.ai_comment}</Text>
        </View>
      ) : null}

      {(homeForm.length > 0 || awayForm.length > 0) && (
        <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Son 5 Maç Formu</Text>
          <FormBadges matches={homeForm} teamName={home} />
          <View style={{ height: 8 }} />
          <FormBadges matches={awayForm} teamName={away} />
        </View>
      )}

      <View style={[styles.block, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Karşılaşma Geçmişi (H2H)</Text>
        <Text style={[styles.h2hSubtitle, { color: colors.textDim }]}>{home} perspektifinden</Text>
        <H2HSection matches={h2h} teamAId={fixture.home_team_id} />
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.metricBox}>
      <Text style={[styles.metricLabel, { color: colors.textDim }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  league: { fontSize: 13, fontWeight: '600' },
  time: { fontSize: 12, marginTop: 4 },
  teamsBlock: { marginTop: 24, alignItems: 'center' },
  team: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  score: { fontSize: 18, fontWeight: '600', marginVertical: 8 },
  block: { marginTop: 20, borderRadius: 12, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  h2hSubtitle: { fontSize: 11, marginTop: -8, marginBottom: 12 },
  bigScoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  bigScore: { fontSize: 40, fontWeight: '800', marginRight: 12, letterSpacing: 1 },
  bigScoreDim: {
    fontSize: 22,
    fontWeight: '700',
    fontStyle: 'italic',
    marginRight: 12,
  },
  confBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  confPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    gap: 7,
  },
  confDot: { width: 7, height: 7, borderRadius: 4 },
  confPillText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  confDesc: { fontSize: 12, marginBottom: 14, fontStyle: 'italic' },
  barRow: { marginBottom: 20 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  metricBox: { width: '50%', paddingHorizontal: 4, paddingVertical: 8 },
  metricLabel: { fontSize: 12 },
  metricValue: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  modelNote: { fontSize: 11, marginTop: 12, textAlign: 'right' },
  noPred: { marginTop: 40, fontSize: 14, textAlign: 'center' },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  aiSource: { fontSize: 10, fontWeight: '600' },
  aiText: { fontSize: 14, lineHeight: 20 },
  whySubtitle: { fontSize: 12, marginTop: -8, marginBottom: 14 },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  whyDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  whyText: { fontSize: 14, lineHeight: 20, flex: 1 },
  whyDisclaimer: { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
});
