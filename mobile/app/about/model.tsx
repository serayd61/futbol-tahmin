import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function ModelInfo() {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Tahminler Nasıl Hesaplanıyor?</Text>

      <Section title="Model" colors={colors}>
        Futbol Tahmini, futbol maçlarına özel istatistiksel bir model olan{' '}
        <Text style={[styles.bold, { color: colors.text }]}>Poisson dağılımı</Text>'nı kullanır.
        Her takımın atması beklenen ve yiyeceği beklenen gol sayısı (xG) hesaplanır,
        ardından bu değerlerden olası tüm skor kombinasyonlarının olasılıkları çıkarılır.
      </Section>

      <Section title="Hangi Veriler Kullanılır?" colors={colors}>
        {'• Son maçlardaki atılan-yenen gol ortalamaları\n' +
          '• Ev sahibi/Deplasman ayrımıyla performans farkı\n' +
          '• Son 5 maçtaki form puanı (galibiyet/beraberlik/yenilgi)\n' +
          '• Lig ortalaması (Bayesian shrinkage ile az veri olan takımlar bu ortalamaya yakınsar)\n' +
          '• Kafa-Kafaya (H2H) geçmişi'}
      </Section>

      <Section title="Güven Seviyeleri" colors={colors}>
        <Text style={{ color: colors.text }}>
          <Text style={[styles.bold, { color: colors.high }]}>Güçlü</Text> · Model en olası
          sonucu %60'tan yüksek bir olasılıkla öneriyor. Geçmiş 30 günde bu kategorideki
          tahminlerin doğruluk oranı yaklaşık %70.
        </Text>
        {'\n\n'}
        <Text style={{ color: colors.text }}>
          <Text style={[styles.bold, { color: colors.medium }]}>Olası</Text> · Model bir sonucu
          öneriyor ama olasılık %45-60 arası. Riskli — sürpriz çıkabilir.
        </Text>
        {'\n\n'}
        <Text style={{ color: colors.text }}>
          <Text style={[styles.bold, { color: colors.low }]}>Belirsiz</Text> · Veri yetersiz
          veya olasılıklar birbirine yakın. Bu durumda skor tahmini gizlenir.
        </Text>
      </Section>

      <Section title="Doğruluk" colors={colors}>
        Model genel olarak {'\n'}
        • 1X2 (kazanan): yaklaşık %60 doğruluk{'\n'}
        • Üst/Alt 2.5 gol: yaklaşık %72 doğruluk{'\n'}
        • Tam skor: yaklaşık %12 doğruluk (her zaman düşük){'\n\n'}
        Bu değerler İstatistik sekmesinde gerçek zamanlı güncellenir.
      </Section>

      <Section title="Sınırlamalar" colors={colors}>
        {'• Sakatlık, ceza, kart durumu hesaba katılmıyor\n' +
          '• Hava şartları, hakem etkisi yok\n' +
          '• Sezon başında veri az olduğu için güven düşer\n' +
          '• Türkiye Süper Lig için veri kalitesi ileri sürümde paid API ile iyileşecek'}
      </Section>

      <View style={[styles.warning, { backgroundColor: colors.awayBg, borderColor: colors.away }]}>
        <Text style={[styles.warningTitle, { color: colors.away }]}>Önemli Uyarı</Text>
        <Text style={[styles.warningText, { color: colors.text }]}>
          Bu uygulama yalnızca istatistiksel analiz sunar. Bahis, kumar veya gerçek-para
          işlemlerinde kullanılmak için tasarlanmadı. Tahminler garanti değildir.
        </Text>
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function Section({ title, colors, children }: { title: string; colors: any; children: React.ReactNode }) {
  return (
    <View style={[styles.section, { borderBottomColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.body, { color: colors.text }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 24 },
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 21 },
  bold: { fontWeight: '700' },
  warning: {
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  warningTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  warningText: { fontSize: 13, lineHeight: 19 },
});
