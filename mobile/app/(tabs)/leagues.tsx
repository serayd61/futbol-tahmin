// V3.1 — "Ligler" sekmesi (premium tasarım)
// Her lig bir "oda" — bayrak, maç sayısı, model isabet oranı.
// Tıklanınca o ligin maçlarına gidilir, pick'ler sepete eklenir.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList, View, Text, Pressable, StyleSheet, RefreshControl, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { typography, TAB_BAR_HEIGHT } from '../../theme/typography';
import { countryFlag } from '../../lib/format';
import { getLeaguesOverview } from '../../lib/queries';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import type { LeagueOverview } from '../../lib/types';

export default function LeaguesScreen() {
  const { colors } = useTheme();
  const [leagues, setLeagues] = useState<LeagueOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getLeaguesOverview();
      setLeagues(data.filter(l => l.week_matches > 0 || (l.total_evaluated ?? 0) > 0));
    } catch (e: any) {
      setError(e?.message || 'Ligler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return leagues;
    const q = search.trim().toLowerCase();
    return leagues.filter(l =>
      l.name.toLowerCase().includes(q) ||
      (l.country || '').toLowerCase().includes(q)
    );
  }, [leagues, search]);

  if (loading) return <Loading />;

  // Toplam istatistik (header)
  const totalToday = leagues.reduce((s, l) => s + (l.today_matches || 0), 0);
  const totalWeek  = leagues.reduce((s, l) => s + (l.week_matches || 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <FlatList
        data={filtered}
        keyExtractor={l => String(l.league_id)}
        renderItem={({ item }) => <LeagueRoomCard league={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            {/* Stats banner */}
            <View style={[styles.statsBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{totalToday}</Text>
                <Text style={[styles.statLabel, { color: colors.textDim }]}>Bugün</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: colors.text }]}>{totalWeek}</Text>
                <Text style={[styles.statLabel, { color: colors.textDim }]}>Bu hafta</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: colors.text }]}>{leagues.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textDim }]}>Aktif lig</Text>
              </View>
            </View>

            {/* Search */}
            <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search" size={16} color={colors.textFaint} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Lig ara…"
                placeholderTextColor={colors.textFaint}
                style={[styles.searchInput, { color: colors.text }]}
                autoCorrect={false}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <EmptyState icon="⚠️" title="Bir sorun oluştu" subtitle={error} />
          ) : search.trim() ? (
            <EmptyState
              icon="🔍"
              title={`"${search}" bulunamadı`}
              subtitle="Farklı bir lig veya ülke adı dene"
            />
          ) : (
            <EmptyState
              icon="⚽"
              title="Bu hafta lig bulunamadı"
              subtitle="Aşağı çekerek yenileyebilirsin"
            />
          )
        }
      />
    </SafeAreaView>
  );
}

interface CardProps { league: LeagueOverview; }
function LeagueRoomCard({ league }: CardProps) {
  const { colors } = useTheme();
  const flag = countryFlag(league.country, league.name);
  const accuracyPct = league.accuracy_1x2 != null
    ? Math.round(league.accuracy_1x2 * 100)
    : null;
  const accuracyColor = accuracyPct == null
    ? colors.textFaint
    : accuracyPct >= 60 ? colors.high
    : accuracyPct >= 45 ? colors.medium
    : colors.low;

  return (
    <Link href={`/league/${league.league_id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${league.name}, ${league.week_matches} maç bu hafta${
          accuracyPct != null ? `, model isabeti yüzde ${accuracyPct}` : ''
        }`}
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
        <View style={[styles.flagBadge, { backgroundColor: colors.cardElev, borderColor: colors.border }]}>
          <Text style={styles.flag}>{flag}</Text>
        </View>

        <View style={styles.body}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{league.name}</Text>
          <View style={styles.metaRow}>
            {league.today_matches > 0 ? (
              <View style={[styles.todayPill, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
                <View style={[styles.liveDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.todayText, { color: colors.primary }]}>
                  Bugün {league.today_matches}
                </Text>
              </View>
            ) : null}
            <Text style={[styles.weekText, { color: colors.textDim }]}>
              {league.week_matches} maç bu hafta
            </Text>
          </View>
        </View>

        {accuracyPct != null ? (
          <View style={styles.accuracyWrap}>
            <Text style={[styles.accuracy, { color: accuracyColor }]}>%{accuracyPct}</Text>
            <Text style={[styles.accuracyLabel, { color: colors.textFaint }]}>isabet</Text>
          </View>
        ) : (
          <View style={styles.accuracyWrap}>
            <Text style={[styles.accuracyDim, { color: colors.textFaint }]}>—</Text>
            <Text style={[styles.accuracyLabel, { color: colors.textFaint }]}>yeni</Text>
          </View>
        )}

        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list:      { padding: 12, paddingBottom: TAB_BAR_HEIGHT + 16 },
  headerWrap:{ paddingBottom: 4 },

  // Banner: bugün / bu hafta / aktif lig
  statsBanner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 12,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.numLarge, fontSize: 22 },
  statLabel: { ...typography.labelSmall, fontSize: 9, marginTop: 3 },
  statDivider: { width: 1, height: 32 },

  // Search bar
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1, marginBottom: 12, gap: 8,
  },
  searchInput: {
    ...typography.body, fontSize: 14, flex: 1, padding: 0,
  },

  // Lig kartları
  card: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12,
    marginVertical: 4, borderWidth: 1,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
    gap: 12,
  },
  flagBadge: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  flag: { fontSize: 26, lineHeight: 30 },

  body: { flex: 1, gap: 4 },
  name: { ...typography.h3, fontSize: 15 },
  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },

  todayPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 999, borderWidth: 1, gap: 4,
  },
  liveDot:    { width: 5, height: 5, borderRadius: 2.5 },
  todayText:  { ...typography.labelSmall, fontSize: 10 },
  weekText:   { ...typography.caption, fontSize: 11 },

  accuracyWrap: { alignItems: 'flex-end', marginRight: 2 },
  accuracy:     { ...typography.numMed, fontSize: 16 },
  accuracyDim:  { ...typography.numMed, fontSize: 16 },
  accuracyLabel:{ ...typography.labelSmall, fontSize: 9, marginTop: 1, letterSpacing: 0.3 },
});
