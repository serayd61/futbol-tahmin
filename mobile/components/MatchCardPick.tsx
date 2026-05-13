// V3 — Multi-market match card (Tahmin Sepeti için).
// MatchCard'ın genişletilmiş hali — alt kısımda pick chip'leri var.
// 1X2 satırı + Üst/Alt satırı + BTTS satırı.
// Her chip tıklanınca sepete toggle eklenir.
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { formatMatchDate } from '../lib/format';
import { useBasket } from '../lib/BasketContext';
import PickChip from './PickChip';
import type { FixtureWithDetails, Market } from '../lib/types';

interface Props {
  fixture: FixtureWithDetails;
  /** "+%80" rozeti yüksek olasılık eşiği */
  highConfidenceThreshold?: number;
}

const HIGH_CONF = 0.60;

export default function MatchCardPick({ fixture, highConfidenceThreshold = HIGH_CONF }: Props) {
  const { colors } = useTheme();
  const { togglePick, hasPick } = useBasket();

  const p = fixture.prediction;
  const home = fixture.home_team?.short_name || fixture.home_team?.name || '—';
  const away = fixture.away_team?.short_name || fixture.away_team?.name || '—';
  const time = formatMatchDate(fixture.utc_date);

  if (!p) return null; // tahmin yoksa pick yapamayız

  const handlePick = (market: Market, prob: number) => {
    togglePick({
      fixture_id: fixture.id,
      market,
      prob,
      home_team_name: home,
      away_team_name: away,
      league_name: fixture.league?.name,
      utc_date: fixture.utc_date,
    });
  };

  type MarketDef = { market: Market; label: string; prob: number };
  const market1x2: MarketDef[] = [
    { market: '1X2_HOME', label: '1', prob: p.prob_home_win },
    { market: '1X2_DRAW', label: 'X', prob: p.prob_draw },
    { market: '1X2_AWAY', label: '2', prob: p.prob_away_win },
  ];
  const marketOU: MarketDef[] = [
    { market: 'OVER_25', label: 'Üst 2.5',  prob: p.prob_over_25 },
    { market: 'UNDER_25', label: 'Alt 2.5', prob: p.prob_under_25 },
  ];
  const marketBTTS: MarketDef[] = p.prob_btts_yes != null && p.prob_btts_no != null
    ? [
        { market: 'BTTS_YES', label: 'KG Var', prob: p.prob_btts_yes },
        { market: 'BTTS_NO',  label: 'KG Yok', prob: p.prob_btts_no },
      ]
    : [];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow },
      ]}
    >
      {/* Üst satır: lig + zaman + detay link */}
      <View style={styles.headerRow}>
        <Text style={[styles.league, { color: colors.textDim }]} numberOfLines={1}>
          {fixture.league?.name || ''}
        </Text>
        <View style={styles.timeWrap}>
          <Ionicons name="time-outline" size={11} color={colors.textFaint} />
          <Text style={[styles.time, { color: colors.textFaint }]}>{time}</Text>
        </View>
      </View>

      {/* Takım satırı: logo+ad — yatay layout */}
      <Link href={`/match/${fixture.id}`} asChild>
        <View style={styles.teamsRow}>
          <View style={styles.teamCol}>
            {fixture.home_team?.logo ? (
              <Image source={{ uri: fixture.home_team.logo }} style={styles.logo} resizeMode="contain" />
            ) : <View style={[styles.logoFallback, { backgroundColor: colors.cardElev }]} />}
            <Text style={[styles.team, { color: colors.text }]} numberOfLines={2}>{home}</Text>
          </View>

          <View style={[styles.scoreCenter, { backgroundColor: colors.cardElev }]}>
            <Text style={[styles.predScore, { color: colors.text }]}>{p.predicted_score}</Text>
          </View>

          <View style={[styles.teamCol, styles.teamColRight]}>
            {fixture.away_team?.logo ? (
              <Image source={{ uri: fixture.away_team.logo }} style={styles.logo} resizeMode="contain" />
            ) : <View style={[styles.logoFallback, { backgroundColor: colors.cardElev }]} />}
            <Text style={[styles.team, styles.teamRight, { color: colors.text }]} numberOfLines={2}>
              {away}
            </Text>
          </View>
        </View>
      </Link>

      {/* Pick row — 1X2 */}
      <View style={[styles.pickGroup, { borderTopColor: colors.border }]}>
        <Text style={[styles.groupLabel, { color: colors.textFaint }]}>1X2</Text>
        <View style={styles.chipRow}>
          {market1x2.map(m => (
            <PickChip
              key={m.market}
              label={m.label}
              prob={m.prob}
              selected={hasPick(fixture.id, m.market)}
              highConfidence={m.prob >= highConfidenceThreshold}
              onPress={() => handlePick(m.market, m.prob)}
            />
          ))}
        </View>
      </View>

      {/* Pick row — Üst/Alt */}
      <View style={styles.pickGroup}>
        <Text style={[styles.groupLabel, { color: colors.textFaint }]}>Üst/Alt</Text>
        <View style={styles.chipRow}>
          {marketOU.map(m => (
            <PickChip
              key={m.market}
              label={m.label}
              prob={m.prob}
              selected={hasPick(fixture.id, m.market)}
              highConfidence={m.prob >= highConfidenceThreshold}
              onPress={() => handlePick(m.market, m.prob)}
            />
          ))}
        </View>
      </View>

      {/* Pick row — BTTS (sadece dc-v1 modelinde dolu) */}
      {marketBTTS.length > 0 ? (
        <View style={styles.pickGroup}>
          <Text style={[styles.groupLabel, { color: colors.textFaint }]}>KG (Karşılıklı Gol)</Text>
          <View style={styles.chipRow}>
            {marketBTTS.map(m => (
              <PickChip
                key={m.market}
                label={m.label}
                prob={m.prob}
                selected={hasPick(fixture.id, m.market)}
                highConfidence={m.prob >= highConfidenceThreshold}
                onPress={() => handlePick(m.market, m.prob)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    marginHorizontal: 12, marginVertical: 6, borderWidth: 1,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  league:    { ...typography.label, fontWeight: '600' },
  timeWrap:  { flexDirection: 'row', alignItems: 'center', gap: 3 },
  time:      { ...typography.caption, fontSize: 11, fontVariant: ['tabular-nums'] },

  teamsRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  teamCol:    { flex: 1, alignItems: 'flex-start' },
  teamColRight: { alignItems: 'flex-end' },
  logo:        { width: 28, height: 28, marginBottom: 2 },
  logoFallback:{ width: 28, height: 28, borderRadius: 14 },
  team:        { ...typography.bodySmall, fontWeight: '700', marginTop: 4 },
  teamRight:   { textAlign: 'right' },
  scoreCenter: { minWidth: 54, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginHorizontal: 8, alignItems: 'center' },
  predScore:   { ...typography.numSmall, fontSize: 14, fontWeight: '800' },

  pickGroup:   { marginTop: 10, paddingTop: 8 },
  groupLabel:  { ...typography.labelSmall, fontSize: 9, marginBottom: 6, letterSpacing: 0.4 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap' },
});
