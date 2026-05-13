import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useTheme } from '../../theme/ThemeContext';
import TeamSearchModal from '../../components/TeamSearchModal';
import { useFavoriteTeams } from '../../lib/preferences';
import type { ThemeMode } from '../../lib/preferences';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { typography, TAB_BAR_HEIGHT } from '../../theme/typography';
import { Ionicons } from '@expo/vector-icons';
import type { Team } from '../../lib/types';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { favorites, add, remove } = useFavoriteTeams();
  const { user, signOut } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadTeams = useCallback(async () => {
    if (favorites.length === 0) { setTeams([]); return; }
    const { data } = await supabase
      .from('teams')
      .select('*')
      .in('id', favorites);
    setTeams((data || []) as Team[]);
  }, [favorites]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const themeOptions: { id: ThemeMode; label: string }[] = [
    { id: 'auto',  label: 'Otomatik' },
    { id: 'dark',  label: '🌙 Koyu' },
    { id: 'light', label: '☀️ Açık' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* V3 — Hesabım bölümü (auth state'e göre) */}
        <Text style={[styles.heading, { color: colors.text }]}>Hesabım</Text>
        {user ? (
          <View style={[styles.accountBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.accountHeader}>
              <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                <Text style={styles.avatarText}>
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                  {user.displayName || 'Kullanıcı'}
                </Text>
                {user.email ? (
                  <Text style={[styles.accountEmail, { color: colors.textDim }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                ) : null}
              </View>
              <Pressable onPress={signOut} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.signOutLink, { color: colors.away }]}>Çıkış</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={[styles.accountBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.signInHint, { color: colors.textDim }]}>
              Tahmin Sepeti kaydetmek ve puanlarını takip etmek için giriş yap.
            </Text>
          </View>
        )}

        <Link href="/my-baskets" asChild>
          <Pressable style={[styles.linkRow, { borderColor: colors.border, marginTop: 8 }]}>
            <Ionicons name="basket-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
            <Text style={[styles.linkLabel, { color: colors.text, flex: 1 }]}>Sepetlerim</Text>
            <Text style={[styles.linkArrow, { color: colors.textDim }]}>›</Text>
          </Pressable>
        </Link>

        {/* Tema seçici */}
        <Text style={[styles.heading, { color: colors.text, marginTop: 24 }]}>Tema</Text>
        <View style={styles.themeRow}>
          {themeOptions.map(opt => {
            const active = mode === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setMode(opt.id)}
                style={[
                  styles.themeChip,
                  {
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primary : colors.card,
                  },
                ]}
              >
                <Text style={{
                  color: active ? '#FFFFFF' : colors.textDim,
                  fontWeight: '600',
                  fontSize: 13,
                }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Favori Takımlar */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Favori Takımlar</Text>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addBtnText}>+ Ekle</Text>
          </Pressable>
        </View>

        {favorites.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyText, { color: colors.textDim }]}>
              Henüz favori takım eklemedin.{'\n'}"+ Ekle" ile başla.
            </Text>
          </View>
        ) : (
          <View style={[styles.teamList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {teams.map(t => (
              <View key={t.id} style={[styles.teamRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.teamName, { color: colors.text }]}>{t.name}</Text>
                  {t.country ? <Text style={[styles.teamCountry, { color: colors.textDim }]}>{t.country}</Text> : null}
                </View>
                <Pressable onPress={() => remove(t.id)}>
                  <Text style={[styles.removeBtn, { color: colors.away }]}>Kaldır</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* Hakkında */}
        <Text style={[styles.heading, { color: colors.text, marginTop: 32 }]}>Hakkında</Text>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textDim }]}>Sürüm</Text>
          <Text style={[styles.value, { color: colors.text }]}>1.0.0 (V2)</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textDim }]}>Veri kaynağı</Text>
          <Text style={[styles.value, { color: colors.text }]}>Football-Data · API-Sports</Text>
        </View>
        <View style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.textDim }]}>Tahmin modeli</Text>
          <Text style={[styles.value, { color: colors.text }]}>Poisson v2 (Bayesian shrinkage)</Text>
        </View>

        <Link href="/about/model" asChild>
          <Pressable style={[styles.linkRow, { borderColor: colors.border }]}>
            <Text style={[styles.linkLabel, { color: colors.text }]}>Tahminler nasıl hesaplanıyor?</Text>
            <Text style={[styles.linkArrow, { color: colors.textDim }]}>›</Text>
          </Pressable>
        </Link>

        <Text style={[styles.disclaimer, { color: colors.textDim }]}>
          Bu uygulama eğitim amaçlıdır. Tahminler istatistiksel modele dayanır ve
          gerçek sonuçları garantilemez. Bahis amaçlı kullanım önerilmez.
        </Text>
      </ScrollView>

      <TeamSearchModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(t) => { add(t.id); setPickerOpen(false); }}
        excludeIds={favorites}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: TAB_BAR_HEIGHT + 32 },
  heading: { ...typography.h2 },
  themeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  themeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, borderWidth: 1, marginRight: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  addBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyBox: { padding: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  teamList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  teamName: { fontSize: 15, fontWeight: '600' },
  teamCountry: { fontSize: 11, marginTop: 2 },
  removeBtn: { fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
  disclaimer: { marginTop: 28, fontSize: 12, lineHeight: 18 },
  linkRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  linkLabel: { fontSize: 14, fontWeight: '600' },
  linkArrow: { fontSize: 22, lineHeight: 22 },

  // V3 — Hesabım bölümü
  accountBox: { borderRadius: 12, padding: 14, borderWidth: 1, marginTop: 12 },
  accountHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  accountName: { ...typography.h3, fontSize: 15 },
  accountEmail: { ...typography.caption, fontSize: 11, marginTop: 2 },
  signOutLink: { ...typography.body, fontSize: 13, fontWeight: '600' },
  signInHint: { ...typography.caption, fontSize: 12, lineHeight: 17 },
});
