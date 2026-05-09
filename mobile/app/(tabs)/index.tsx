import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import MatchCard from '../../components/MatchCard';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import { getTodayFixtures, getUpcomingFixtures } from '../../lib/queries';
import type { FixtureWithDetails } from '../../lib/types';

export default function HomeScreen() {
  const [fixtures, setFixtures] = useState<FixtureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const today = await getTodayFixtures();
      // Bugün maç yoksa yaklaşan ilk birkaç maçı göster
      if (today.length > 0) {
        setFixtures(today);
      } else {
        const upcoming = await getUpcomingFixtures(7);
        setFixtures(upcoming.slice(0, 30));
      }
    } catch (e: any) {
      setError(e?.message || 'Veri yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Loading />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={fixtures}
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
            <EmptyState title="Hata" subtitle={error} />
          ) : (
            <EmptyState
              title="Maç bulunamadı"
              subtitle="Aşağı çekerek yenile veya Fikstür sekmesini dene"
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 12, paddingBottom: 40, flexGrow: 1 },
});
