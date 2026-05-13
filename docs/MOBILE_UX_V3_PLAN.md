# 🎨 Mobile UX/UI V3 — Detaylı İyileştirme Planı

> **Hedef:** TestFlight build 13'te çalışan v2 sürümünü, App Store'a "production-grade" çıkacak olgunluğa taşımak. Kapsam: görsel sistem, etkileşim, performans, erişilebilirlik ve içerik mimarisi.
>
> **Yaklaşım:** Faz faz — her faz teslim edilebilir, kullanıcı görür, sonra bir sonraki.
>
> **Mevcut durum referansı:** v2 (Poisson v2 modeli, 4 tab, dark/light auto theme, onboarding, push notifications, favoriler, AI yorum, H2H + form badges, accuracy tracking).

---

## 🔭 Mevcut durumun kısa kritiği (audit özeti)

Genel olarak iskelet sağlam — design tokens var, dark/light disiplinli, confidence sistemi tutarlı, skeleton loading var. Ancak detaylar v2'de "bitirilmiş app" hissini bozuyor:

**Görsel:** Tab bar'da emoji ikon kullanımı (⚽ 📅 📊 ⚙️) production app standardı değil — render düşük çözünürlüklü, tipografiyle hizalanmıyor. "Bugün" sekmesi düz bir liste, hero/öne çıkan kart yok — açılışta sönük hissediyor. Match card'da skor + confidence rozeti + "Tahmin" label aynı satırda sıkışık.

**Etkileşim:** Sayfa geçişlerinde animasyon yok (default stack). PredictionBar dolma animasyonu yok — anında yüklenmiş gibi görünüyor. Match card tıklanınca hover state var ama press feedback yumuşak değil. Pull-to-refresh haricinde "yeniden yükle" affordance yok.

**Bilgi mimarisi:** Match detail uzun bir scroll — sticky header yok, section'lar arasında hiyerarşi zayıf. Poisson skor matrisi (modelin kalbi) hiç gösterilmiyor — "kara kutu" hissi. Stats sayfası sadece 30 gün, lig bazlı veya confidence bazlı kırılım yok.

**Mikro-içerik:** "Skor belirsiz" gibi düz negatif ifadeler. Empty state'lerde CTA yok. LIVE badge var ama dakika yok. Tarih formatı "12 May 22:00" — "Bugün", "Yarın", "Pazartesi" gibi insancıl etiketler yok.

**Erişilebilirlik:** `accessibilityLabel`, `accessibilityRole` hiçbir yerde yok. Dynamic Type desteklenmiyor (sabit font size). Touch target'lar bazı yerlerde 44pt altında (LeagueFilter chip ≈36pt).

**Performans:** `FlatList`'lerde `getItemLayout` yok, `MatchCard` memoize edilmemiş. Görsel cache için `expo-image` değil `<Image />` kullanılıyor — büyük listelerde takım logoları her renderda yeniden çekiliyor.

---

## 📐 Faz haritası (önceliklendirilmiş)

| # | Faz | Süre | Etki | Risk |
|---|-----|------|------|------|
| 1 | Görsel temeller: ikon sistemi, tipografi, tab bar | 2-3 s | 🔥🔥🔥 | düşük |
| 2 | Match Card 2.0 + PredictionBar animasyonu | 2-3 s | 🔥🔥🔥 | düşük |
| 3 | "Bugün" Hero & section grupları | 2-3 s | 🔥🔥🔥 | düşük |
| 4 | Match Detail 2.0: Poisson skor heatmap + sticky header | 3-4 s | 🔥🔥 | orta |
| 5 | Stats 2.0: dönem seçici, lig kırılımı, kalibrasyon | 3-4 s | 🔥🔥 | orta |
| 6 | Erişilebilirlik (a11y) + Dynamic Type | 2 s | 🔥🔥 | düşük |
| 7 | Performans: expo-image, memoization, FlatList | 1-2 s | 🔥 | düşük |
| 8 | Empty state, micro-copy, motion polish | 1-2 s | 🔥 | düşük |
| 9 | Settings 2.0: bildirim granülarite, tahmin tercihleri | 2-3 s | 🔥 | orta |
| 10 | (Opsiyonel) Onboarding 2.0 + tutorial overlay | 2 s | 🔥 | düşük |

> Toplam 20-26 saatlik bir iş — her faz bağımsız teslim edilebilir, TestFlight'a sırayla push edilebilir.

---

## ⛳ Faz 1 — Görsel temeller (ikon sistemi, tipografi, tab bar)

**Hedef:** "Production app" hissini ilk 5 saniyede vermek. Bu faz tek başına bile çok büyük fark yaratır.

### 1.1 Vector ikon sistemine geçiş

Emoji yerine `@expo/vector-icons` (Feather veya Lucide tarzı, ince çizgi, futbol estetiğine uygun).

```bash
npx expo install @expo/vector-icons lucide-react-native
```

`app/(tabs)/_layout.tsx` içinde:

```tsx
import { Home, Calendar, BarChart3, Settings } from 'lucide-react-native';
// ...
<Tabs.Screen name="index" options={{
  title: 'Bugün',
  tabBarIcon: ({ color, focused }) => (
    <Home size={22} color={color} strokeWidth={focused ? 2.4 : 1.8} />
  ),
}} />
```

Aynı yaklaşımı tüm UI'da: LIVE badge'in dot'u, confidence rozeti, H2H galibiyet/beraberlik kutuları, settings rows ve onboarding ikonları için vector ikonlara geç. Emoji'yi sadece marketing/onboarding hero'da bırak.

### 1.2 Tipografi sistemi

Mevcut sorun: heading scale'i tutarsız (20, 22, 26 farklı yerlerde), `fontVariant: ['tabular-nums']` sadece bazı yerlerde, font weight'leri 600/700/800 karışık.

**Çözüm:** `theme/typography.ts` ekle:

```ts
export const typography = {
  // Heading scale
  h1: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4, lineHeight: 34 },
  h2: { fontSize: 22, fontWeight: '700', letterSpacing: -0.2, lineHeight: 28 },
  h3: { fontSize: 17, fontWeight: '700', letterSpacing: 0,    lineHeight: 22 },
  // Body
  body:    { fontSize: 15, fontWeight: '500', lineHeight: 21 },
  bodyDim: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  // Numeric (skor, oran, %)
  numLarge: { fontSize: 36, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  numMed:   { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] },
  numSmall: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  // Labels (uppercase mikro)
  label:    { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' as const },
} as const;
```

Tüm `styles.heading`, `styles.title`, `styles.score` vs. ad hoc tanımları bu objeyi import eder hâle gelir. `MatchCard.predScore` → `typography.numMed`.

**Bonus:** iOS'ta `San Francisco`, Android'de `Roboto`, ikisi de tabular kullanır. Custom font (Inter/Manrope) eklemek istersen `expo-font` ile — ama ilk fazda native default daha hızlı yol.

### 1.3 Tab bar polish

- iOS tarzı blur background: `BlurView` (`expo-blur`)
- Aktif sekmede üst kenarda 2px primary çubuk
- `tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }`
- `tabBarStyle.height` iOS'ta 84 (notch için), Android 64

```bash
npx expo install expo-blur
```

```tsx
import { BlurView } from 'expo-blur';

<Tabs screenOptions={{
  tabBarBackground: () => (
    <BlurView intensity={50} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
  ),
  tabBarStyle: {
    position: 'absolute',
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
}}>
```

ContentContainer'lara `paddingBottom: 88` ekle ki son MatchCard tab bar arkasında kalmasın.

**Başarı kriteri:** Build alıp 5 saniye TestFlight'a baktığında "yeni uygulama gibi" hissini al.

---

## 🎴 Faz 2 — Match Card 2.0 + PredictionBar animasyonu

**Hedef:** Listenin her satırı kartın işini tek bakışta anlatsın. Şu an "Tahmin" label + skor + confidence pill aynı satıra sıkışık, prediction bar düz çiziyor.

### 2.1 Yeni layout (önerilen)

```
┌─────────────────────────────────────────────────┐
│ 🏆 PREMIER LEAGUE              ⏰ Bugün 22:00 │ ← üst meta
├─────────────────────────────────────────────────┤
│                                                  │
│  [logo]  Arsenal                                 │  ← Ev satırı (tek satır, sola yaslı)
│                              0.42  →  %58   1   │  ← prob bar sağda inline
│  [logo]  Tottenham                               │
│                              0.41  →  %22   X   │
│                              0.17  →  %20   2   │
│                                                  │
├─────────────────────────────────────────────────┤
│  📊 Tahmin 2-1   • Güçlü   xG 1.8 / 1.0         │ ← alt özet (footer)
└─────────────────────────────────────────────────┘
```

Anahtar değişimler:

- **Takımlar yatay değil dikey** (FotMob/OneFootball mantığı). Bu uzun takım adlarını ("Borussia Mönchengladbach") rahat sığdırır, RTL'ye hazır.
- **Prediction bar yatay segment yerine, takım satırlarının sağında yatay mini bar + yüzde** (her sonuç bir satır). Bu hem daha okunaklı hem "kazanan vurgulanmış" görsel hiyerarşi verir.
- **Footer'da kompakt özet**: tahmini skor, confidence, xG. Şu an "Tahmin 2-1" üstte ayrı bir satırda yer kaplıyor.
- **Tahmini kazanan takım satırı `colors.primaryBg` ile çok hafif vurgulanır** (1px sol border + arka plan alfa).

### 2.2 PredictionBar animasyonu

Şu an `<View style={{ flex: pHome }} />` ile dolu görünüyor. Yumuşak dolma animasyonu:

```tsx
import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

function AnimatedSegment({ target, color, isMax }: ...) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: target,
      duration: 600,
      delay: 100,
      useNativeDriver: false,
    }).start();
  }, [target]);
  // ...
}
```

`useNativeDriver: false` çünkü `flex` interpolate ediliyor (RN sınırlaması). Performans için ekran başında en fazla 8-10 görünür kart, mount olduğunda animate eder — `react-native-reanimated` ile yapılırsa native thread'de daha akıcı olur.

### 2.3 Press feedback

`Pressable` style'da `pressed` durumunda kart 0.98 scale + arka plan değişimi:

```tsx
<Pressable style={({ pressed }) => [
  styles.card,
  { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.95 : 1 },
]}>
```

iOS hapticleri için `expo-haptics`: `Haptics.selectionAsync()` press anında. Çok zarif bir detay.

### 2.4 LIVE state geliştirmesi

Şu an "CANLI" badge ama dakika yok. Backend'de eğer `fixture.minute` yoksa, n8n workflow'una eklemek 1 saatlik iş. Mobil tarafta:

```
🔴 CANLI · 67'      2 – 1
```

Pulsing red dot animasyonu: `Animated.loop` ile opacity 1 ↔ 0.4.

**Başarı kriteri:** Bir tahminin "kim ne kadar olasılıkla kazanıyor"unu kartı 1 saniye bakarak anlayabilmek.

---

## 🏠 Faz 3 — "Bugün" Hero & Section grupları

**Hedef:** Açılış ekranı bir "okunabilir gazete sayfası" hissi versin, düz liste değil.

### 3.1 Hero kart (en üstte)

Üç olası içerik (sırayla, hangisi varsa):

1. **Favori takım maçı bugün varsa** → "Galatasaray bugün 21:45 — Fenerbahçe"  (büyük kart)
2. **"Bugünün en güvenli tahmini"** → en yüksek confidence + en yüksek tek prob (örn. %72 ev sahibi)
3. **Sürpriz alarm** → ev sahibi avantajına rağmen deplasman %50+ veya tam tersi

```
┌─────────────────────────────────────┐
│  ⭐  FAVORİ MAÇINIZ                │
│                                     │
│  Galatasaray  vs  Fenerbahçe       │
│  Süper Lig · 21:45                  │
│                                     │
│  🎯 Tahmin: 2-1  · Güçlü            │
│   [───────█████──] %58  GS         │
│                                     │
│  [ Detayları gör → ]                │
└─────────────────────────────────────┘
```

Renk: `colors.card` + `colors.primaryBg` ile çok hafif gradient (LinearGradient).

### 3.2 Section grupları

Liste düz değil, başlıklarla bölünür:

- **Şu anda oynanan** (LIVE) — varsa
- **Birazdan başlayacak** (sonraki 3 saat)
- **Bugün gece**
- **Yarın**

`SectionList` kullan:

```tsx
const sections = useMemo(() => {
  const now = Date.now();
  const groups = { live: [], soon: [], later: [], tomorrow: [] };
  for (const f of fixtures) {
    const t = new Date(f.utc_date).getTime();
    if (f.status === 'LIVE') groups.live.push(f);
    else if (t - now < 3 * 3600_000) groups.soon.push(f);
    else if (isToday(t)) groups.later.push(f);
    else groups.tomorrow.push(f);
  }
  return [
    { title: '🔴 ŞU AN OYNANIYOR',    data: groups.live },
    { title: '⚡ BİRAZDAN BAŞLAYACAK', data: groups.soon },
    { title: '🌙 BUGÜN GECE',          data: groups.later },
    { title: '📅 YARIN',                data: groups.tomorrow },
  ].filter(s => s.data.length > 0);
}, [fixtures]);
```

Section header sticky (`stickySectionHeadersEnabled`).

### 3.3 Filter chip iyileştirmesi

Şu an tek satır: "Tümü · Premier League (5) · La Liga (3)" — sığmazsa yatay scroll, ama ipucu yok. İki şey:

- Sağ tarafa "yavaşça soldan sağa kayboluyor" gradient fade (görsel scroll ipucu)
- Aktif chip'in alt satırında küçük bir bilgi: "5 maç · %62 doğruluk geçmişte"

**Başarı kriteri:** "Bugün" sekmesini açtığında ilk şey gözüne çarpan bir öneri olsun, düz liste değil.

---

## 🔬 Faz 4 — Match Detail 2.0: Poisson skor heatmap + sticky header

**Hedef:** Modeli "kara kutu"dan çıkar, kullanıcı **neden 2-1** dediğimizi görsün.

### 4.1 Sticky header

Detail sayfası uzun bir scroll. Üstte küçük bir sticky header:

```
[← Geri]  Arsenal vs Tottenham · 22:00              [🔔 Hatırlat]
```

Tahmin skoru ve confidence sticky kalır — kullanıcı aşağı kaydırırken kaybetmesin.

### 4.2 Poisson skor heatmap

Bu özellik tek başına app'i farklılaştırır. 0..5 gol için 6x6 grid (üstü tek hücre "6+" ile birleştir), her hücrenin koyuluğu ortak olasılık:

```
       Tottenham →
        0    1    2    3    4    5
Arsenal
   0  [░░] [░░] [░░] [░░] [░░] [░░]
   1  [▒▒] [██] [▒▒] [░░] [░░] [░░]   ← en olası: 2-1
   2  [▒▒] [██] [▓▓] [░░] [░░] [░░]
   3  [░░] [▒▒] [░░] [░░] [░░] [░░]
   4  [░░] [░░] [░░] [░░] [░░] [░░]
   5  [░░] [░░] [░░] [░░] [░░] [░░]
```

İmplementasyon: backend predictions'a `score_matrix` (jsonb, 6x6 array) ekle veya client-side Poisson formülünden xG ile yeniden hesapla. Render: `View` grid + her hücreye `backgroundColor: rgba(34,197,94, prob * 6)` (clamp 0..1).

Hücreye dokununca tooltip: "2-1: %18 olasılık".

### 4.3 Form karşılaştırma side-by-side

`FormBadges` şu an alt alta iki takım için ayrı. Yatay karşılaştırma daha okunur:

```
                Arsenal        Tottenham
Son 5         W W D L W       L D W L W
Puan          10 / 15         5 / 15
Gol ort.      2.4             1.2
Yenilen       0.8             1.6
```

### 4.4 "Tahminin Sebebi" iyileştirme

Şu an sade bullet list. Her bullet'a confidence göstergesi ekle (bu argümanın tahmine etkisi ne kadar):

- 🟢 Form farkı: Arsenal son 5'te +5 puan üstün **(yüksek etki)**
- 🟡 H2H: Eşit dağılım (5G - 4B - 5L) **(düşük etki)**
- 🟢 Ev avantajı: Arsenal ev sahibi **(orta etki)**

Etki etiketi backend modelinden geliyor olabilir veya basit kural: form farkı >3 puansa "yüksek", h2h dengesi <2 farksa "düşük".

### 4.5 Action row

Detail sayfasının altında 3 aksiyon:

- 🔔 **Bu maçı hatırlat** (push notification 30dk önce)
- 📤 **Paylaş** (`Share.share()` — "Arsenal-Tottenham, model tahmini 2-1, %58 ev sahibi · Futbol Tahmini")
- ⭐ **Ev sahibini favorile** (zaten favoriyse kaldır)

**Başarı kriteri:** Kullanıcı "neden 2-1?" sorusunu detay sayfasında 30 saniyede yanıtlayabilsin.

---

## 📊 Faz 5 — Stats 2.0: dönem seçici, lig kırılımı, kalibrasyon

**Hedef:** Mevcut accuracy ekranı bir overview kartı. Şu an sadece 30 gün, lig ayrımı yok. Production app'te bu sayfa "modele güvenebilir miyim?" sorusunun cevabıdır.

### 5.1 Dönem seçici (segmented control)

```
[ 7g ] [ 30g ] [ 90g ] [ Tüm zamanlar ]
```

`useState<7 | 30 | 90 | null>` + `getAccuracyStats(days)` parametrik.

### 5.2 Lig bazlı kırılım

`prediction_outcomes` view zaten `league_id` taşıyor. Sorgu:

```sql
SELECT league_id, COUNT(*) as total, SUM(hit_1x2) as hits
FROM prediction_outcomes
WHERE utc_date >= NOW() - INTERVAL '30 days'
GROUP BY league_id
ORDER BY total DESC;
```

UI'da yatay bar chart:

```
Premier League   ████████████░░░  62%  (45 / 73)
La Liga          ███████████░░░░  58%  (32 / 55)
Bundesliga       █████████░░░░░░  48%  (18 / 38)
```

Tıklanınca o lig için recent outcomes filtrelenir.

### 5.3 Confidence bazlı kalibrasyon

Bu kritik bir özellik: model "%70 olasılık" derken gerçekten %70'inde mi tutuyor? Calibration plot:

```
Tahmin %   Gerçek %
50-60%     54%      ←  iyi kalibre
60-70%     68%      ←  iyi
70-80%     61%      ←  underconfident değil, ama tutarsız
80%+       82%      ←  iyi
```

Basit tablo veya scatter dot grafik. `react-native-svg` ile (Expo zaten içerir).

### 5.4 Trend grafik

Son 90 günde haftalık rolling 1X2 accuracy:

```
70% ────────────────────────────
       /\
60% ──/──\─────────────────/────
     /    \               /
50% /      \____/\______/
40% ────────────────────────────
    W1   W3   W5   W7   W9   W11
```

`react-native-svg` ile `<Polyline>`.

### 5.5 Confidence başına accuracy

Şu an "1X2 isabet" tek sayı. Bunu confidence'a göre kır:

| Güven | Toplam | İsabet | Oran |
|-------|--------|--------|------|
| 🟢 Güçlü   | 23     | 17     | %74  |
| 🟡 Olası   | 41     | 22     | %54  |
| ⚫ Belirsiz | 18     | 7      | %39  |

Bu tablo kullanıcıya "sadece Güçlü işaretli tahminlere bak" sinyalini verir — değerli.

**Başarı kriteri:** "Bu uygulamanın tahminleri ciddiye alınır mı?" sorusunu kullanıcı kendi kendine cevaplayabilsin.

---

## ♿ Faz 6 — Erişilebilirlik & Dynamic Type

**Hedef:** VoiceOver/TalkBack kullanıcısı tam fonksiyonel kullanabilsin. iOS Dynamic Type bozmasın.

### 6.1 a11y label/hint

Tüm `Pressable`, `Image`, kritik `Text`'lere:

```tsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Arsenal Tottenham maç detayı"
  accessibilityHint="Maçın tüm tahmin metriklerini göster"
>
```

PredictionBar için:

```tsx
<View
  accessibilityRole="progressbar"
  accessibilityLabel={`Tahmin olasılıkları: Ev sahibi yüzde ${Math.round(pHome*100)}, beraberlik yüzde ${Math.round(pDraw*100)}, deplasman yüzde ${Math.round(pAway*100)}`}
>
```

Takım logosuna `accessibilityLabel={team.name}` veya `importantForAccessibility="no"` (zaten yanında text varsa).

### 6.2 Touch target boyutları

Apple HIG 44x44pt, Material 48x48dp. Mevcut:

- LeagueFilter chip: padding 12×8 + text 13 ≈ **36pt** → 44 yap (`paddingVertical: 10`)
- Tab "Kaldır" linki: line height 18 → 44'lük tap area için `hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}`
- Settings theme chip: 14×8 + 13 ≈ **38pt** → 44

### 6.3 Dynamic Type

iOS'ta kullanıcı font'u büyütünce şu an her şey sabit. `useWindowDimensions` + `PixelRatio.getFontScale()` ile scale uygula:

```ts
import { PixelRatio } from 'react-native';
const fontScale = PixelRatio.getFontScale(); // 1.0 default, 1.3 large, 2.0 accessibility

// Cap at 1.4 ki layout patlamasın
const safeFontScale = Math.min(fontScale, 1.4);
```

Veya en kolayı: tipografi token'larına `allowFontScaling` prop'unu Text'lere set et. RN default true zaten ama bazı yerlerde line height fix bu yüzden patlar — tipografi token'larında `lineHeight` yerine satır `flex` ile kendini ayarlasın.

### 6.4 Renk kontrastı

`text` (#F1F5FB) on `bg` (#070C18) = ~16:1 ✅
`textDim` (#9AA8BF) on `bg` (#070C18) = ~7.5:1 ✅
`textFaint` (#5E6B82) on `bg` (#070C18) = ~3.8:1 ⚠️ (WCAG AA için 4.5 olmalı). textFaint'i bir tık aydınlat → `#6E7C95`.

Light mode `textFaint` (#94A3B8) on `bg` (#F4F6FB) = ~3.0:1 ⚠️ → `#7B8AA0` yap.

**Başarı kriteri:** App Store review reddetmesin, VoiceOver'da "Bugün ekranı, 12 maç" diye duyurulsun.

---

## ⚡ Faz 7 — Performans

**Hedef:** 50+ maç listesinde 60fps scroll, logo'lar cache'lensin, gereksiz re-render bitsin.

### 7.1 expo-image

`react-native`'in `<Image>`'i kötü cache yapar. `expo-image` HTTP cache + memory cache built-in:

```bash
npx expo install expo-image
```

```tsx
import { Image } from 'expo-image';

<Image
  source={fixture.home_team.logo}
  style={styles.logo}
  cachePolicy="memory-disk"
  transition={150}
  placeholder={require('../assets/logo-placeholder.png')}
/>
```

### 7.2 FlatList optimizasyonları

```tsx
<FlatList
  data={fixtures}
  renderItem={renderMatchCard}
  keyExtractor={f => String(f.id)}
  // Performance:
  removeClippedSubviews={true}
  maxToRenderPerBatch={8}
  windowSize={5}
  initialNumToRender={6}
  getItemLayout={(_, i) => ({ length: CARD_HEIGHT, offset: CARD_HEIGHT * i, index: i })}
/>
```

`CARD_HEIGHT` = card padding+content sabit yüksekliği (yeni layout'la 168px civarı).

### 7.3 MatchCard memo

```tsx
export default React.memo(MatchCard, (prev, next) =>
  prev.fixture.id === next.fixture.id &&
  prev.fixture.status === next.fixture.status &&
  prev.fixture.prediction?.computed_at === next.fixture.prediction?.computed_at
);
```

### 7.4 Theme context optimizasyonu

`useTheme()` her component'ta çağrılıyor ve `colors` referansı her render değişebilir (`useMemo` yok değişimde). Mevcut `theme/ThemeContext.tsx`'te `useMemo` zaten var ✅ — ama `colors` palette switch olduğunda tüm tree re-render. Kabul edilebilir, ama performans hassas kartlarda colors'u prop yerine context'ten almak yerine selector pattern uygula:

```tsx
const cardBg = useThemeSelector(t => t.colors.card);
```

(Opsiyonel — kabul edilebilir komplikasyon)

### 7.5 Bundle boyut kontrolü

`npx expo-doctor` çalıştır. `react-native-svg`, `expo-image`, `lucide-react-native`, `expo-blur`, `react-native-reanimated` eklendiğinde IPA yaklaşık +6-8MB ekler — sorun değil, ama biliyor ol.

**Başarı kriteri:** 100 maçlık listede scroll FPS 60'a yakın, takım logoları flash etmiyor.

---

## 💬 Faz 8 — Empty state, micro-copy & motion polish

### 8.1 Mikro-copy revizyon (önce → sonra)

| Önce | Sonra |
|------|-------|
| Skor belirsiz | Tahminimiz net değil — yine de 1X2 olasılıklara bak |
| Bugün için maç yok | Bugün maç günü değil — Fikstür'den haftaya bak |
| Sonuç bulunamadı | "Galatasaray" bulamadık · Süper Lig mi? |
| Veri yetersiz | İki takımın 5'ten az ortak maçı var, bu yüzden H2H sinyali zayıf |
| Tahmin henüz hesaplanmadı | Tahmin yakında — model günde 3 kez güncellenir, sonraki: 05:00 |

### 8.2 Empty state CTA'ları

Her empty state'e bir aksiyon ekle:

- "Favori takımlarda maç yok" → **[Fikstür'e git]** veya **[Favori ekle]**
- "Bu ligde maç yok" → **[Tüm liglere dön]**
- "Henüz değerlendirme yok" → **[Bugünün maçlarına git]**

`EmptyState` component zaten `cta` prop alıyor ✅ — sadece çağıran yerlerde kullanılmıyor.

### 8.3 Layout animation

Sayfa geçişlerinde `react-native-reanimated` `Layout` ve `FadeIn`:

```tsx
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

<Animated.View entering={FadeIn.duration(300)} layout={Layout.springify()}>
  <MatchCard fixture={item} />
</Animated.View>
```

Pull-to-refresh sonrası kart'lar üstten kayarak gelir. Filter chip değişince liste smooth shuffle.

### 8.4 Stack screen geçişleri

```tsx
<Stack.Screen name="match/[id]" options={{
  animation: 'slide_from_right',
  animationDuration: 250,
  presentation: 'card',
}} />
```

### 8.5 Haptic feedback

`expo-haptics` ile kritik aksiyonlarda:

- Tab değiştirme: `Haptics.selectionAsync()`
- Pull-to-refresh tetiklenince: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
- Favori ekleme/kaldırma: `Haptics.notificationAsync(NotificationFeedbackType.Success)`
- Tahmin "Güçlü" rozetli karta tıklayınca: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`

**Başarı kriteri:** Uygulamayı sallarken tüm hareketler "yumuşak", hiçbir yerde sert pop yok.

---

## ⚙️ Faz 9 — Settings 2.0

**Hedef:** Settings şu an mini — theme + favoriler + about. Production app'te 2-3 katı içerik bekleriz.

### 9.1 Bildirim ayarları

- **Maç hatırlatması:** 30dk önce / 1sa önce / 2sa önce / Kapalı
- **Tahmin sonucu:** Maç bitince push (tahminim doğru muydu)
- **Sadece favori takımlar:** toggle (kapalıysa hiç push gelmez)
- **Sessiz saatler:** 23:00 - 08:00 arası bildirim yok

```tsx
import * as Notifications from 'expo-notifications';
// Sessiz saatler için custom logic, server-side push job'da kontrol et
```

### 9.2 Tahmin görünüm tercihleri

- **Lig favorileri (yeni!):** Sadece seçtiğin ligler "Bugün" sekmesinde görünür
- **Confidence threshold:** Sadece Olası ve üstü göster / Belirsiz tahminleri de göster
- **Üst/Alt 2.5 göster:** kart altında otomatik
- **AI yorumu göster:** toggle (rate limit varsa)

### 9.3 Veri & gizlilik

- Push token'i göster (debug için): `ExponentPushToken[xxx...]` — kopyala butonu
- "Verilerimi temizle" (AsyncStorage clear)
- Privacy policy linki (zaten docs/privacy.html var, deeplink veya WebView)

### 9.4 Hesap (gelecek için yer ayır)

V3'te kullanıcı kaydı yok ama bu sayfa "Yakında: senkronizasyon" placeholder olarak hazırlanır.

### 9.5 Geliştirici (long-press version ile aç)

Settings'in en altındaki "Sürüm 1.0.0" satırına 7 kez basınca dev menüsü:

- Force tahmin yeniden hesapla (n8n webhook çağrısı)
- Veritabanı durumu (kaç maç, kaç tahmin, son güncelleme)
- Push test bildirimi gönder

**Başarı kriteri:** Power user kendi deneyimini özelleştirebilsin.

---

## 🎬 Faz 10 — (Opsiyonel) Onboarding 2.0 + Tutorial overlay

### 10.1 Onboarding 4. slide

Mevcut 3 slide bilgi yüklü. Bir tane daha:

- **Slide 4: "Tek tıkla başla"** → Default favori öneri (kullanıcının lokasyonuna göre Süper Lig + bir Avrupa ligi seç) checkbox'lı

```tsx
const suggestions = [
  { id: 564, name: 'Galatasaray' },
  { id: 565, name: 'Fenerbahçe' },
  { id: 57, name: 'Arsenal' },
];
```

### 10.2 Tutorial overlay

İlk açılışta "Bugün" sekmesinde 3 dot pulsing balon:

1. "📍 Buraya tahmini skor"
2. "📍 Bu çubuk 1X2 olasılık"
3. "📍 Karta dokunarak detay"

`react-native-reanimated` + `Modal` ile transparent overlay, "Anladım" butonu.

### 10.3 Boş state'lerde tutorial bağlantısı

"Henüz favori yok" → "İlk favorini eklemek için 30 saniye sürer →" mini videolu kart.

**Başarı kriteri:** İlk açılan kullanıcı 1 dakika içinde değer alabilsin, "Atla" tıklamasın.

---

## 🗺️ Önerilen uygulama sırası

Eğer hepsini yapacaksak, sıralama mantıklı:

1. **Faz 1** (görsel temeller) — diğer her şeyin altyapısı, önce bu
2. **Faz 6** (a11y) — Faz 1'le birlikte yapılırsa tipografi sistemiyle entegre
3. **Faz 2** (Match Card 2.0) — listeler her yerde, en görünür değişim
4. **Faz 3** (Bugün hero) — açılış ekranı, demo'da en çok satar
5. **Faz 4** (Match Detail) — heatmap "wow" özelliği
6. **Faz 7** (perf) — burada test yaparken sorunlar görülür, fix
7. **Faz 5** (Stats 2.0) — bilgi yoğun, sonra
8. **Faz 8** (motion polish) — kreyma üstü tabaka
9. **Faz 9** (Settings 2.0) — power user için
10. **Faz 10** (Onboarding 2.0) — yeni kullanıcı akışı son

---

## 🚀 Hemen başlamak istersen

İlk somut adım için 3 seçenek:

- **A. Faz 1'i baştan sona** (ikonlar + tipografi + tab bar) — 2-3 saatlik tek seans, TestFlight'a yeni build çıkar
- **B. Faz 2'yi baştan sona** (Match Card 2.0) — listelerde dramatik görsel fark
- **C. Faz 4'e atla** (Poisson heatmap) — "wow" özellik, App Store screenshot'ı için harika

Söyle, hangisini açayım — kod yazmaya başlayalım.
