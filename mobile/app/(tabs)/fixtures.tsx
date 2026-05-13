import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import MatchCard from '../../components/MatchCard';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import LeagueFilter, { LeagueChip } from '../../components/LeagueFilter';
import { getUpcomingFixtures } from '../../lib/queries';
import { TAB_BAR_HEIGHT } from '../../theme/typography';
import type { FixtureWithDetails } from '../../lib/types';

export default function FixturesScreen() {
  const { colors } = useTheme();
  const [fixtures, setFixtures] = useState<FixtureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getUpcomingFixtures(7);
      setFixtures(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const leagueChips = useMemo<LeagueChip[]>(() => {
    const map = new Map<number, { name: string; count: number }>();
    for (const f of fixtures) {
      if (!f.league) continue;
      const cur = map.get(f.league.id);
      if (cur) cur.count++;
      else map.set(f.league.id, { name: f.league.name, count: 1 });
    }
    const arr: LeagueChip[] = Array.from(map.entries())
      .map(([id, v]) => ({ id, name: v.name, count: v.count }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));
    return [{ id: null, name: 'Tümü', count: fixtures.length }, ...arr];
  }, [fixtures]);

  const filtered = useMemo(() => {
    if (selectedLeague == null) return fixtures;
    return fixtures.filter(f => f.league?.id === selectedLeague);
  }, [fixtures, selectedLeague]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <View style={[styles.filterWrap, { borderBottomColor: colors.border }]}>
        <LeagueFilter
          leagues={leagueChips}
          selected={selectedLeague}
          onSelect={setSelectedLeague}
        />
      </View>
      <FlatList
        data={filtered}
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
          <EmptyState
            icon={selectedLeague != null ? '🔍' : '📅'}
            title={selectedLeague != null ? 'Bu ligde maç yok' : 'Yaklaşan maç yok'}
            subtitle={
              selectedLeague != null
                ? 'Başka bir lig seçmeyi dene'
                : 'Önümüzdeki 7 gün için planlanmış maç yok. Aşağı çekerek yenileyebilirsin.'
            }
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  filterWrap: { borderBottomWidth: 1 },
  // V3: absolute blur tab bar ile son kart üst üste binmesin
  list: { padding: 12, paddingBottom: TAB_BAR_HEIGHT + 16, flexGrow: 1 },
});
