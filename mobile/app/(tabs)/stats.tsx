import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import AccuracyCard from '../../components/AccuracyCard';
import OutcomeRow from '../../components/OutcomeRow';
import EmptyState from '../../components/EmptyState';
import Loading from '../../components/Loading';
import { getAccuracyStats, getRecentOutcomes, getModelBrier } from '../../lib/queries';
import type { ModelBrierRow } from '../../lib/queries';
import ModelComparison from '../../components/ModelComparison';
import { typography, TAB_BAR_HEIGHT } from '../../theme/typography';
import type { AccuracyStats, OutcomeRow as OutcomeRowType } from '../../lib/types';

export default function StatsScreen() {
  const { colors } = useTheme();
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeRowType[]>([]);
  const [modelBrier, setModelBrier] = useState<ModelBrierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [s, o, mb] = await Promise.all([
        getAccuracyStats(30),
        getRecentOutcomes(20),
        getModelBrier(),
      ]);
      setStats(s);
      setOutcomes(o);
      setModelBrier(mb);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={[styles.heading, { color: colors.text }]}>Son 30 Gün</Text>
        <Text style={[styles.sub, { color: colors.textDim }]}>
          Toplam {stats?.total ?? 0} bitmiş maç değerlendirildi
        </Text>

        {error && <EmptyState icon="⚠️" title="Bir sorun oluştu" subtitle={error} />}

        {stats && stats.total > 0 ? (
          <View>
            <AccuracyCard title="1X2 Tahmin"   pct={stats.pct_1x2}        hit={stats.hit_1x2}        total={stats.total} />
            <AccuracyCard title="Üst/Alt 2.5"  pct={stats.pct_over_under} hit={stats.hit_over_under} total={stats.total} />
            <AccuracyCard title="Tam Skor"     pct={stats.pct_score}      hit={stats.hit_score}      total={stats.total} />
          </View>
        ) : (
          !error && (
            <EmptyState
              icon="📊"
              title="Henüz değerlendirme yok"
              subtitle="Bitmiş maçlar geldikçe doğruluk istatistikleri burada görünür"
            />
          )
        )}

        {/* V3 — Model versiyonları karşılaştırma (dc-v1 vs poisson-v2) */}
        {modelBrier.length > 0 ? (
          <>
            <Text style={[styles.heading, { color: colors.text, marginTop: 24 }]}>Model Versiyonları</Text>
            <Text style={[styles.sub, { color: colors.textDim }]}>
              Aktif tahmin motoru ve karşılaştırma
            </Text>
            <ModelComparison rows={modelBrier} activeModel="dc-v1" />
          </>
        ) : null}

        {outcomes.length > 0 && (
          <>
            <Text style={[styles.heading, { color: colors.text, marginTop: 24 }]}>Son Tahminler</Text>
            <Text style={[styles.sub, { color: colors.textDim }]}>Geçmiş tahmin–sonuç karşılaştırması</Text>
            <View style={{ marginTop: 8 }}>
              {outcomes.map(o => <OutcomeRow key={o.fixture_id} row={o} />)}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />

        <Text style={[styles.disclaimer, { color: colors.textDim }]}>
          Tahminler Poisson v2 istatistiksel modele dayanır.
          Geçmiş başarı oranı gelecek başarıyı garantilemez.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: TAB_BAR_HEIGHT + 24 },
  heading: { ...typography.h2 },
  sub: { ...typography.caption, marginTop: 4, marginBottom: 12 },
  disclaimer: { ...typography.caption, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 24 },
});
