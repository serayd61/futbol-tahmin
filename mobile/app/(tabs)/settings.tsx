import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme/colors';

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Hakkında</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Sürüm</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Veri kaynağı</Text>
          <Text style={styles.value}>Football-Data.org · API-Football</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Tahmin modeli</Text>
          <Text style={styles.value}>Poisson v1 (form ağırlıklı)</Text>
        </View>

        <Text style={styles.disclaimer}>
          Bu uygulama eğitim amaçlıdır. Tahminler istatistiksel modele dayanır ve
          gerçek sonuçları garantilemez. Bahis amaçlı kullanım önerilmez.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 20 },
  heading: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: { color: colors.textDim, fontSize: 14 },
  value: { color: colors.text, fontSize: 14, fontWeight: '500' },
  disclaimer: {
    marginTop: 28,
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 18,
  },
});
