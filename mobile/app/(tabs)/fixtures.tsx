import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';
import MatchCard from '../../components/MatchCard';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import { getUpcomingFixtures } from '../../lib/queries';
import type { FixtureWithDetails } from '../../lib/types';

export default function FixturesScreen() {
  const [fixtures, setFixtures] = useState<FixtureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          <EmptyState
            title="Yaklaşan maç yok"
            subtitle="Workflow'lar henüz çalışmamış olabilir"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: 12, paddingBottom: 40, flexGrow: 1 },
});
