// V3 — Kullanıcının kaydettiği Tahmin Sepetleri
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl, Pressable,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { useAuth } from '../lib/AuthContext';
import { getMyBaskets } from '../lib/queries';
import { formatMatchDate } from '../lib/format';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import type { Basket } from '../lib/types';

export default function MyBasketsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, signInWithApple, signInAnonymously, isAppleAvailable } = useAuth();
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      setError(null);
      const data = await getMyBaskets();
      setBaskets(data);
    } catch (e: any) {
      setError(e?.message || 'Sepetler yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Auth yok → Giriş yap CTA (Apple varsa Apple, yoksa anonim)
  if (!user) {
    return (
      <>
        <Stack.Screen options={{ title: 'Sepetlerim', headerBackTitle: 'Geri' }} />
        <View style={[styles.center, { backgroundColor: colors.bg }]}>
          <EmptyState
            icon="🔐"
            title="Giriş gerekli"
            subtitle={
              isAppleAvailable
                ? 'Apple ile giriş yap veya misafir olarak devam et — her ikisinde de sepetlerini görebilirsin.'
                : 'Misafir hesabıyla devam et, sepetlerini kaydet ve puanlarını takip et.'
            }
            cta={{
              label: isAppleAvailable ? 'Apple ile giriş yap' : 'Misafir olarak devam et',
              onPress: async () => {
                let r;
                if (isAppleAvailable) {
                  r = await signInWithApple();
                  if (!r.ok && r.error !== 'cancelled') {
                    r = await signInAnonymously();
                  }
                } else {
                  r = await signInAnonymously();
                }
                if (r.ok) load();
              },
            }}
          />
        </View>
      </>
    );
  }

  if (loading) return (
    <>
      <Stack.Screen options={{ title: 'Sepetlerim', headerBackTitle: 'Geri' }} />
      <Loading />
    </>
  );

  // Toplam istatistikler
  const totalPoints = baskets.reduce((s, b) => s + b.points, 0);
  const totalHits   = baskets.reduce((s, b) => s + b.hits, 0);
  const totalPicks  = baskets.reduce((s, b) => s + b.total_picks, 0);
  const pendingCount = baskets.filter(b => b.status !== 'complete').length;

  return (
    <>
      <Stack.Screen options={{ title: 'Sepetlerim', headerBackTitle: 'Geri' }} />
      <FlatList
        style={{ flex: 1, backgroundColor: colors.bg }}
        data={baskets}
        keyExtractor={b => b.id}
        renderItem={({ item }) => <BasketRow basket={item} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          baskets.length > 0 ? (
            <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{totalPoints}</Text>
                <Text style={[styles.statLabel, { color: colors.textDim }]}>Toplam Puan</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {totalHits}/{totalPicks}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textDim }]}>İsabet</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statBlock}>
                <Text style={[styles.statValue, { color: pendingCount > 0 ? colors.medium : colors.text }]}>
                  {pendingCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textDim }]}>Bekliyor</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          error ? (
            <EmptyState icon="⚠️" title="Hata" subtitle={error} />
          ) : (
            <EmptyState
              icon="🛒"
              title="Henüz sepetin yok"
              subtitle="Lig odalarından pick seç, sepete ekle, kaydet. İsabet ettikçe puan kazan."
              cta={{ label: 'Liglere git', onPress: () => router.push('/leagues') }}
            />
          )
        }
      />
    </>
  );
}

interface RowProps { basket: Basket; }
function BasketRow({ basket }: RowProps) {
  const { colors } = useTheme();

  const statusColors: Record<string, string> = {
    complete: colors.high,
    partial: colors.medium,
    pending: colors.textDim,
  };
  const statusLabels: Record<string, string> = {
    complete: 'Tamamlandı',
    partial: 'Devam ediyor',
    pending: 'Bekliyor',
  };

  const accuracy = basket.total_picks > 0
    ? Math.round((basket.hits / basket.total_picks) * 100)
    : 0;

  const statusColor = statusColors[basket.status] || colors.textDim;

  return (
    <View style={[styles.basketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.basketHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.basketName, { color: colors.text }]} numberOfLines={1}>
            {basket.name}
          </Text>
          <Text style={[styles.basketDate, { color: colors.textFaint }]}>
            {formatMatchDate(basket.created_at)}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {statusLabels[basket.status] || basket.status}
          </Text>
        </View>
      </View>

      <View style={styles.basketBody}>
        <View style={styles.metricRow}>
          <Ionicons name="basket-outline" size={14} color={colors.textDim} />
          <Text style={[styles.metricText, { color: colors.text }]}>
            {basket.total_picks} pick
          </Text>
        </View>
        {basket.status !== 'pending' ? (
          <>
            <View style={[styles.metricDot, { backgroundColor: colors.textFaint }]} />
            <View style={styles.metricRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.high} />
              <Text style={[styles.metricText, { color: colors.text }]}>
                {basket.hits} isabet
              </Text>
            </View>
            <View style={[styles.metricDot, { backgroundColor: colors.textFaint }]} />
            <View style={styles.metricRow}>
              <Ionicons name="trophy-outline" size={14} color={colors.primary} />
              <Text style={[styles.metricText, { color: colors.primary, fontWeight: '700' }]}>
                {basket.points} puan
              </Text>
            </View>
          </>
        ) : null}
      </View>

      {/* İsabet oranı bar — sadece complete sepetlerde */}
      {basket.status === 'complete' && basket.total_picks > 0 ? (
        <View style={[styles.progressTrack, { backgroundColor: colors.cardElev }]}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${accuracy}%`,
                backgroundColor: accuracy >= 60 ? colors.high : accuracy >= 40 ? colors.medium : colors.low,
              },
            ]}
          />
          <Text style={[styles.progressLabel, { color: colors.text }]}>%{accuracy}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  list:   { padding: 12, paddingBottom: 40, flexGrow: 1 },

  statsCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 12,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { ...typography.numLarge, fontSize: 24 },
  statLabel: { ...typography.labelSmall, fontSize: 10, marginTop: 4 },
  statDivider: { width: 1, height: 36 },

  basketCard: {
    borderRadius: 12, padding: 14, borderWidth: 1, marginVertical: 5,
  },
  basketHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  basketName:   { ...typography.h3, fontSize: 14 },
  basketDate:   { ...typography.caption, fontSize: 11, marginTop: 2 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1,
    gap: 4,
  },
  statusDot:    { width: 6, height: 6, borderRadius: 3 },
  statusText:   { ...typography.labelSmall, fontSize: 10 },

  basketBody: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  metricRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { ...typography.bodySmall, fontSize: 12 },
  metricDot:  { width: 3, height: 3, borderRadius: 1.5 },

  progressTrack: {
    height: 16, borderRadius: 8, marginTop: 10,
    position: 'relative', overflow: 'hidden',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    borderRadius: 8,
  },
  progressLabel: { ...typography.labelSmall, fontSize: 10, textAlign: 'center', zIndex: 1 },
});
