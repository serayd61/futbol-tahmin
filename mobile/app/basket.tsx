// V3 — Tahmin Sepeti detayı + Kaydet ekranı
// • Pick listesi (her satır: maç + market + olasılık + çıkar)
// • Toplam olasılık (independence varsayımı — küçük yazıyla uyarı)
// • Beklenen puan
// • "Sepeti Kaydet" → Apple Sign-In yoksa modal aç
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { typography } from '../theme/typography';
import { useBasket } from '../lib/BasketContext';
import { useAuth } from '../lib/AuthContext';
import { saveBasket } from '../lib/queries';
import { formatMatchDate, pct } from '../lib/format';
import EmptyState from '../components/EmptyState';
import type { Market } from '../lib/types';

const MARKET_LABELS: Record<Market, string> = {
  '1X2_HOME': 'Ev sahibi (1)',
  '1X2_DRAW': 'Beraberlik (X)',
  '1X2_AWAY': 'Deplasman (2)',
  'OVER_25':  'Üst 2.5',
  'UNDER_25': 'Alt 2.5',
  'BTTS_YES': 'KG Var',
  'BTTS_NO':  'KG Yok',
};

export default function BasketScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { picks, count, combinedProb, removePick, clear } = useBasket();
  const { user, signInWithApple, signInAnonymously, isAppleAvailable } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (saving) return;

    // Auth yoksa önce Apple Sign-In dene, başarısızsa anonim'e düş
    if (!user) {
      let signedIn = false;

      if (Platform.OS === 'ios' && isAppleAvailable) {
        const r = await signInWithApple();
        if (r.ok) {
          signedIn = true;
        } else if (r.error === 'cancelled') {
          // Kullanıcı iptal etti — anonim önerme, sadece geri dön
          return;
        }
        // Diğer hatalarda anonim'e fallback
      }

      if (!signedIn) {
        const r = await signInAnonymously();
        if (!r.ok) {
          Alert.alert('Giriş başarısız', r.error);
          return;
        }
      }
    }

    setSaving(true);
    try {
      await saveBasket(picks);
      clear();
      Alert.alert(
        'Sepet kaydedildi 🎉',
        'Maçlar bittikçe sonuçların otomatik puanlanacak.',
        [
          { text: 'Sepetlerime git', onPress: () => router.replace('/my-baskets') },
          { text: 'Kapat', style: 'cancel', onPress: () => router.back() },
        ],
      );
    } catch (e: any) {
      Alert.alert('Kaydedilemedi', e?.message || 'Bilinmeyen hata');
    } finally {
      setSaving(false);
    }
  };

  if (count === 0) {
    return (
      <>
        <Stack.Screen options={{ title: 'Tahmin Sepeti', headerBackTitle: 'Geri' }} />
        <View style={[styles.emptyWrap, { backgroundColor: colors.bg }]}>
          <EmptyState
            icon="🛒"
            title="Sepetin boş"
            subtitle="Lig odalarından maç seç, pick'leri sepete ekle. Her isabet 10 puan kazandırır."
            cta={{ label: 'Liglere git', onPress: () => router.push('/leagues') }}
          />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Tahmin Sepeti',
          headerBackTitle: 'Geri',
          headerRight: () => (
            <Pressable
              onPress={() => {
                Alert.alert('Sepeti temizle?', 'Tüm pickler silinecek.', [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Temizle', style: 'destructive', onPress: clear },
                ]);
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ marginRight: 16 }}
            >
              <Text style={[styles.headerAction, { color: colors.away }]}>Temizle</Text>
            </Pressable>
          ),
        }}
      />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
        {picks.map((p) => (
          <View
            key={`${p.fixture_id}-${p.market}`}
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.rowBody}>
              <Text style={[styles.matchLine, { color: colors.text }]} numberOfLines={1}>
                {p.home_team_name || '—'} <Text style={{ color: colors.textDim }}>vs</Text> {p.away_team_name || '—'}
              </Text>
              <Text style={[styles.metaLine, { color: colors.textFaint }]} numberOfLines={1}>
                {p.league_name ? `${p.league_name} · ` : ''}
                {p.utc_date ? formatMatchDate(p.utc_date) : ''}
              </Text>
              <View style={styles.pickRow}>
                <View style={[styles.marketPill, { backgroundColor: colors.primaryBg, borderColor: colors.primary }]}>
                  <Text style={[styles.marketText, { color: colors.primary }]}>
                    {MARKET_LABELS[p.market]}
                  </Text>
                </View>
                <Text style={[styles.probText, { color: colors.text }]}>{pct(p.prob)}</Text>
              </View>
            </View>
            <Pressable
              onPress={() => removePick(p.fixture_id, p.market)}
              accessibilityRole="button"
              accessibilityLabel="Pick'i sepetten çıkar"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close-circle" size={22} color={colors.textFaint} />
            </Pressable>
          </View>
        ))}

        {/* Özet */}
        <View style={[styles.summary, { backgroundColor: colors.cardElev, borderColor: colors.border }]}>
          <SummaryRow label="Pick sayısı" value={String(count)} colors={colors} />
          <SummaryRow
            label="Birleşik olasılık"
            value={pct(combinedProb)}
            valueColor={colors.primary}
            colors={colors}
          />
          <SummaryRow
            label="Beklenen puan (hepsi tutturulursa)"
            value={`${count * 10}`}
            colors={colors}
          />
          <Text style={[styles.disclaimer, { color: colors.textFaint }]}>
            Birleşik olasılık pick'lerin bağımsız olduğu varsayımı ile hesaplanır.
            Gerçek korelasyon farklı olabilir.
          </Text>
        </View>

        {/* Kaydet butonu */}
        <Pressable
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: pressed ? colors.primaryDim : colors.primary,
              opacity: saving ? 0.6 : 1,
            },
          ]}
        >
          <Text style={styles.saveBtnText}>
            {saving
              ? 'Kaydediliyor…'
              : user
              ? 'Sepeti Kaydet'
              : (Platform.OS === 'ios' && isAppleAvailable)
              ? 'Apple ile Devam Et ve Kaydet'
              : 'Misafir Olarak Kaydet'}
          </Text>
        </Pressable>

        {!user ? (
          <Text style={[styles.authNote, { color: colors.textFaint }]}>
            {Platform.OS === 'ios' && isAppleAvailable
              ? 'Apple ile giriş yapınca puanların cihazlar arası senkronize olur. Apple giriş başarısız olursa otomatik misafir hesabı açılır.'
              : 'Misafir hesabıyla sepetini kaydet, puanların bu cihazda saklanır. Hiçbir kişisel veri istenmez.'}
          </Text>
        ) : null}
      </ScrollView>
    </>
  );
}

function SummaryRow({
  label, value, valueColor, colors,
}: { label: string; value: string; valueColor?: string; colors: any }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: colors.textDim }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: valueColor || colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyWrap: { flex: 1, justifyContent: 'center' },
  content:   { padding: 12, paddingBottom: 40 },

  headerAction: { ...typography.body, fontSize: 14, fontWeight: '600' },

  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    borderRadius: 12, padding: 12, borderWidth: 1, marginVertical: 4,
    gap: 10,
  },
  rowBody:   { flex: 1 },
  matchLine: { ...typography.body, fontSize: 14, fontWeight: '700' },
  metaLine:  { ...typography.caption, fontSize: 11, marginTop: 2 },

  pickRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  marketPill:{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  marketText:{ ...typography.labelSmall, fontSize: 10 },
  probText:  { ...typography.numSmall, fontSize: 12 },

  summary:        { marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  summaryRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  summaryLabel:   { ...typography.caption, fontSize: 12 },
  summaryValue:   { ...typography.numMed, fontSize: 16 },
  disclaimer:     { ...typography.caption, fontSize: 10, marginTop: 8, lineHeight: 14 },

  saveBtn: {
    marginTop: 16, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
    minHeight: 48, justifyContent: 'center',
  },
  saveBtnText: { ...typography.h3, color: '#FFFFFF', fontSize: 15 },

  authNote: { ...typography.caption, fontSize: 11, textAlign: 'center', marginTop: 10, lineHeight: 15, paddingHorizontal: 16 },
});
