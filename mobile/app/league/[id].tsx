// V3 — Belirli bir ligin maç listesi (multi-market pick chip'li)
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { getFixturesByLeague } from '../../lib/queries';
import { countryFlag } from '../../lib/format';
import MatchCardPick from '../../components/MatchCardPick';
import Loading from '../../components/Loading';
import EmptyState from '../../components/EmptyState';
import BasketBadge from '../../components/BasketBadge';
import type { FixtureWithDetails } from '../../lib/types';

export default function LeagueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [fixtures, setFixtures] = useState<FixtureWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leagueIdNum = Number(id);

  const load = useCallback(async () => {
    if (!leagueIdNum) return;
    try {
      setError(null);
      const data = await getFixturesByLeague(leagueIdNum, 7);
      setFixtures(data);
    } catch (e: any) {
      setError(e?.message || 'Maçlar yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leagueIdNum]);

  useEffect(() => { load(); }, [load]);

  const leagueName = fixtures[0]?.league?.name || 'Lig';
  const country    = fixtures[0]?.league?.country;
  const headerTitle = country ? `${countryFlag(country)} ${leagueName}` : leagueName;

  if (loading) return (
    <>
      <Stack.Screen options={{ title: 'Yükleniyor…', headerRight: () => <BasketBadge /> }} />
      <Loading />
    </>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: headerTitle,
          headerBackTitle: 'Geri',
          headerRight: () => <BasketBadge />,
        }}
      />
      <FlatList
        style={{ backgroundColor: colors.bg }}
        data={fixtures}
        keyExtractor={f => String(f.id)}
        renderItem={({ item }) => <MatchCardPick fixture={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.intro}>
            <Text style={[styles.introText, { color: colors.textDim }]}>
              Pick'lere dokunarak <Text style={{ color: colors.primary, fontWeight: '700' }}>sepete</Text> ekle.
              Sağ üstte sepet sayacın var.
            </Text>
          </View>
        }
        ListEmptyComponent={
          error ? (
            <EmptyState icon="⚠️" title="Hata" subtitle={error} />
          ) : (
            <EmptyState
              icon="📅"
              title="Bu ligde yaklaşan maç yok"
              subtitle="Önümüzdeki 7 günde tahminli maç bulunamadı"
            />
          )
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  list:      { paddingBottom: 32, paddingTop: 8, flexGrow: 1 },
  intro:     { paddingHorizontal: 16, paddingVertical: 8 },
  introText: { ...typography.caption, fontSize: 12, lineHeight: 17 },
});
