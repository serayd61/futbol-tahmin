import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { confidenceLabels } from '../theme/colors';
import { typography } from '../theme/typography';
import { formatMatchDate, formatScore } from '../lib/format';
import PredictionBar from './PredictionBar';
import type { FixtureWithDetails } from '../lib/types';

interface Props {
  fixture: FixtureWithDetails;
}

export default function MatchCard({ fixture }: Props) {
  const { colors } = useTheme();
  const home = fixture.home_team?.short_name || fixture.home_team?.name || '—';
  const away = fixture.away_team?.short_name || fixture.away_team?.name || '—';
  const league = fixture.league?.name || '';
  const time = formatMatchDate(fixture.utc_date);
  const isFinished = fixture.status === 'FINISHED';
  const score = isFinished ? formatScore(fixture.home_goals, fixture.away_goals) : null;
  const p = fixture.prediction;
  const isLive = fixture.status === 'LIVE';

  // Confidence sistemine göre renk + arka plan
  const confTone =
    p?.confidence === 'high'
      ? { color: colors.high, bg: colors.highBg }
      : p?.confidence === 'medium'
      ? { color: colors.medium, bg: colors.mediumBg }
      : { color: colors.low, bg: colors.lowBg };

  // LOW confidence için skor maskele (kullanıcıyı yanıltmamak için)
  const showScore = p && p.confidence !== 'low';
  const confidenceText = p ? confidenceLabels[p.confidence] : null;

  // V3 a11y: ekran okuyucu için tek özet etiket
  const a11yLabel = [
    league,
    `${home} ${isFinished ? score : 'karşı'} ${away}`,
    isLive ? 'şu an canlı' : time,
    p ? `tahmin ${p.predicted_score}, güven ${confidenceLabels[p.confidence].toLowerCase()}` : null,
  ].filter(Boolean).join(', ');

  return (
    <Link href={`/match/${fixture.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint="Maç detayını ve tüm tahmin metriklerini aç"
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: pressed ? colors.cardHover : colors.card,
            borderColor: colors.border,
            shadowColor: colors.shadow,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          },
        ]}
      >
        {/* Üst satır: lig + zaman + (varsa LIVE rozet) */}
        <View style={styles.headerRow}>
          <View style={styles.leagueWrap}>
            <Text style={[styles.league, { color: colors.textDim }]} numberOfLines={1}>
              {league}
            </Text>
          </View>
          <View style={styles.metaRight}>
            {isLive && (
              <View style={[styles.liveBadge, { backgroundColor: colors.awayBg }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.away }]} />
                <Text style={[styles.liveText, { color: colors.away }]}>CANLI</Text>
              </View>
            )}
            <View style={styles.timeWrap}>
              <Ionicons name="time-outline" size={11} color={colors.textFaint} />
              <Text style={[styles.time, { color: colors.textFaint }]}>{time}</Text>
            </View>
          </View>
        </View>

        {/* Takım satırı: ev / skor-vs / dep */}
        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            {fixture.home_team?.logo ? (
              <Image
                source={{ uri: fixture.home_team.logo }}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: colors.cardElev }]} />
            )}
            <Text style={[styles.team, { color: colors.text }]} numberOfLines={2}>
              {home}
            </Text>
          </View>
          <View style={[styles.centerCol, { backgroundColor: colors.cardElev }]}>
            <Text
              style={[
                styles.vs,
                { color: isFinished ? colors.text : colors.textDim },
                isFinished && styles.vsScore,
              ]}
            >
              {score || 'vs'}
            </Text>
          </View>
          <View style={[styles.teamCol, styles.teamColRight]}>
            {fixture.away_team?.logo ? (
              <Image
                source={{ uri: fixture.away_team.logo }}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.logoFallback, { backgroundColor: colors.cardElev }]} />
            )}
            <Text
              style={[styles.team, styles.teamRight, { color: colors.text }]}
              numberOfLines={2}
            >
              {away}
            </Text>
          </View>
        </View>

        {/* Tahmin bloku (sadece bitmemiş maçlarda) */}
        {p && !isFinished && (
          <View style={[styles.predictionBlock, { borderTopColor: colors.border }]}>
            <View style={styles.predictionRow}>
              <View style={styles.predLabelGroup}>
                <Text style={[styles.predLabel, { color: colors.textDim }]}>Tahmin</Text>
                {showScore ? (
                  <Text style={[styles.predScore, { color: colors.text }]}>
                    {p.predicted_score}
                  </Text>
                ) : (
                  <Text style={[styles.predScoreDim, { color: colors.textFaint }]}>
                    Skor belirsiz
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.confPill,
                  { backgroundColor: confTone.bg, borderColor: `${confTone.color}55` },
                ]}
              >
                <View style={[styles.confDot, { backgroundColor: confTone.color }]} />
                <Text style={[styles.confLabel, { color: confTone.color }]}>
                  {confidenceText}
                </Text>
              </View>
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
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginVertical: 6,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  leagueWrap: { flex: 1, marginRight: 12 },
  league: { ...typography.label, fontWeight: '600' },
  metaRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  time: { ...typography.caption, fontSize: 12, fontVariant: ['tabular-nums'] },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  liveText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },

  teamsRow: { flexDirection: 'row', alignItems: 'center' },
  teamCol: { flex: 1, alignItems: 'flex-start' },
  teamColRight: { alignItems: 'flex-end' },
  team: { ...typography.h3, marginTop: 6 },
  teamRight: { textAlign: 'right' },
  logo: { width: 32, height: 32, marginBottom: 2 },
  logoFallback: { width: 32, height: 32, borderRadius: 16 },
  centerCol: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vs: { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },
  vsScore: { fontSize: 16, letterSpacing: 0.5 },

  predictionBlock: { marginTop: 14, paddingTop: 12, borderTopWidth: 1 },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  predLabelGroup: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  predLabel: { ...typography.label, fontWeight: '600' },
  predScore: { ...typography.numMed, fontSize: 18 },
  predScoreDim: {
    fontSize: 13,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  confPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  confDot: { width: 6, height: 6, borderRadius: 3 },
  confLabel: { ...typography.labelSmall, fontSize: 11, letterSpacing: 0.3 },
});
