import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import MatchCard from '../../components/MatchCard';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import LeagueFilter, { LeagueChip } from '../../components/LeagueFilter';
import { getTodayFixtures, getUpcomingFixtures, getFixturesForTeams } from '../../lib/queries';
import { useFavoriteTeams } from '../../lib/preferences';
import { typography, TAB_BAR_HEIGHT } from '../../theme/typography';
import type { FixtureWithDetails } from '../../lib/types';

type FilterMode = 'all' | 'favorites';

export default function HomeScreen() {
  const { colors } = useTheme();
  const [fixtures, setFixtures] = useState<FixtureWithDetails[]>([]);
  const [favFixtures, setFavFixtures] = useState<FixtureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);

  const { favorites } = useFavoriteTeams();

  const load = useCallback(async () => {
    try {
      setError(null);
      const today = await getTodayFixtures();
      if (today.length > 0) setFixtures(today);
      else {
        const upcoming = await getUpcomingFixtures(7);
        setFixtures(upcoming.slice(0, 50));
      }
      if (favorites.length > 0) {
        const favs = await getFixturesForTeams(favorites, 7);
        setFavFixtures(favs);
      } else {
        setFavFixtures([]);
      }
    } catch (e: any) {
      setError(e?.message || 'Veri yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [favorites]);

  useEffect(() => { load(); }, [load]);

  // Hangi listede gezdiğimize bağlı olarak lig chip'lerini üret
  const baseList = filter === 'favorites' ? favFixtures : fixtures;

  const leagueChips = useMemo<LeagueChip[]>(() => {
    const map = new Map<number, { name: string; count: number }>();
    for (const f of baseList) {
      if (!f.league) continue;
      const cur = map.get(f.league.id);
      if (cur) cur.count++;
      else map.set(f.league.id, { name: f.league.name, count: 1 });
    }
    const arr: LeagueChip[] = Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));
    return [{ id: null, name: 'Tümü', count: baseList.length }, ...arr];
  }, [baseList]);

  const visible = useMemo(() => {
    if (selectedLeague == null) return baseList;
    return baseList.filter(f => f.league?.id === selectedLeague);
  }, [baseList, selectedLeague]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      {/* Favori toggle (sadece favori varsa) */}
      {favorites.length > 0 && (
        <View style={[styles.toggleRow, { borderBottomColor: colors.border }]}>
          <Pressable
            style={[
              styles.toggle,
              {
                borderColor: filter === 'all' ? colors.primary : colors.border,
                backgroundColor: filter === 'all' ? colors.primary : colors.card,
              },
            ]}
            onPress={() => { setFilter('all'); setSelectedLeague(null); }}
          >
            <Text
              style={[
                typography.bodySmall,
                { color: filter === 'all' ? '#FFFFFF' : colors.textDim, fontWeight: '600' },
              ]}
              accessibilityRole="text"
            >
              Tümü
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.toggle,
              {
                borderColor: filter === 'favorites' ? colors.primary : colors.border,
                backgroundColor: filter === 'favorites' ? colors.primary : colors.card,
              },
            ]}
            onPress={() => { setFilter('favorites'); setSelectedLeague(null); }}
          >
            <Text
              style={[
                typography.bodySmall,
                { color: filter === 'favorites' ? '#FFFFFF' : colors.textDim, fontWeight: '600' },
              ]}
              accessibilityRole="text"
            >
              ⭐ Favorilerim ({favFixtures.length})
            </Text>
          </Pressable>
        </View>
      )}

      {/* Lig filtresi (Fikstür sekmesindekiyle aynı pattern) */}
      <View style={[styles.filterWrap, { borderBottomColor: colors.border }]}>
        <LeagueFilter
          leagues={leagueChips}
          selected={selectedLeague}
          onSelect={setSelectedLeague}
        />
      </View>

      <FlatList
        data={visible}
        keyExtractor={f => String(f.id)}
        renderItem={({ item }) => <MatchCard fixture={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          error ? (
            <EmptyState icon="⚠️" title="Bir sorun oluştu" subtitle={error} />
          ) : selectedLeague != null ? (
            <EmptyState
              icon="🔍"
              title="Bu ligde bugün maç yok"
              subtitle="Başka bir lig seçmeyi dene ya da Fikstür sekmesinden ileri tarihlere bak"
            />
          ) : filter === 'favorites' ? (
            <EmptyState
              icon="⭐"
              title="Favori takımlarda maç yok"
              subtitle="Önümüzdeki 7 günde favorilerin için bir maç planlanmamış. Ayarlar'dan yeni takım ekleyebilirsin."
            />
          ) : (
            <EmptyState
              icon="⚽"
              title="Bugün için maç yok"
              subtitle="Aşağı çekerek yenile veya Fikstür sekmesinden yarın ve sonrasını gör"
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  toggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,    // V3: 44pt min touch target için 7 → 10
    borderRadius: 18,
    borderWidth: 1,
    minHeight: 36,
  },
  filterWrap: { borderBottomWidth: 1 },
  // V3: absolute blur tab bar ile son kart üst üste binmesin
  list: { padding: 12, paddingBottom: TAB_BAR_HEIGHT + 16, flexGrow: 1 },
});
