# 🚀 Production Launch Roadmap — "TestFlight'tan App Store'a"

> **Hedef:** Şu an TestFlight'ta build 14 var, fonksiyonel ama "beta" hissi. Bu doküman piyasaya çıktığında **gerçekten iyi** olması için neyin yapılması gerektiğini 6 tier'da, somut adımlarla anlatır.
>
> **Yaklaşım:** Tier 1 (engelleyiciler) olmadan App Store reddi alır veya kullanıcılar gider. Tier 2'siz "amatör" hissi verir. Tier 3 olmadan kimse paylaşmaz, Tier 4 olmadan kimse geri dönmez.

---

## 📊 Tier piramidi

```
                    ╔════════════════╗
                    ║  6. Marketing  ║   Landing, press kit, demo
                    ╠════════════════╣
                    ║   5. Scale     ║   Lokalizasyon, Watch, Web
                    ╠════════════════╣
                    ║  4. Retention  ║   Tahmin Ligi, streak, kalibrasyon UI
                    ╠════════════════╣
                    ║  3. Viral      ║   Paylaşma kartı, Live Activity, Widget
                    ╠════════════════╣
                    ║  2. Quality    ║   Match Card 2.0, Hero, polish, a11y
                    ╠════════════════╣
                    ║ 1. Blockers    ║   Legal, monitoring, ATT, age rating
                    ╚════════════════╝
```

---

## 🚨 Tier 1 — Launch Blockers (olmadan reddedilir veya kullanıcı kaçar)

### 1.1 App Store Compliance
- **Privacy Policy URL** App Store Connect'te → `https://futbol-tahmin.com/privacy` (veya `docs/privacy.html`'i bir web sunucusuna koy)
- **Terms of Service** ayrı sayfa — kullanım koşulları + bahis disclaimer
- **App Tracking Transparency (ATT)** — analytics ekleyeceksen `NSUserTrackingUsageDescription` Info.plist'te + ATT prompt
- **Yaş kısıtlaması (Age Rating)** — futbol tahmini ≠ kumar ama Apple bunu inceleyebilir. App Store Review'da net: "Bu uygulama bahis aracı **değildir**, istatistiksel analiz sunar". Yaş 12+ uygun.
- **Encryption Compliance** — `ITSAppUsesNonExemptEncryption: false` ✅ zaten ayarlı
- **Apple Sign-In zorunluluğu** — eğer 3rd party login (Google, Apple, vb.) eklersen Apple Sign-In de zorunlu
- **In-App Purchase compliance** — şu an ücretsiz, sorun yok; ileride premium tier eklersen Apple %30 kesinti

### 1.2 Yasal — Bahis hassasiyeti (Türkiye için kritik)
TR mevzuatında iddaa/spor toto **devlet tekeli**. Bahis tavsiyesi veren özel uygulamalar yasal gri alanda. **"Tahmin"** ile **"bahis"** arasındaki sınırı çok net tutmak zorundayız:

- Hiçbir yerde "kazanırsın", "oyna", "iddaa", "bet", "kupon" kelimesi kullanma
- "İstatistiksel tahmin", "olasılık modeli", "analiz" kullan
- **Settings'te belirgin disclaimer:** "Bu uygulama eğitim/eğlence amaçlıdır. Bahis veya kumar tavsiyesi değildir. 18 yaş altı kullanım önerilmez."
- App Store'da "Sports Reference" kategorisinde kal, **"Gambling"** kategorisine girme

### 1.3 Üretim İzleme (Production Monitoring)
Şu an hiç observability yok. Build 14 çöküyorsa **bilmeyeceksin**. Eklenecekler:

- **Sentry (mobil + n8n)** — crash reporting + JavaScript error tracking
  ```bash
  npx expo install @sentry/react-native
  ```
- **PostHog veya Mixpanel** — kullanıcı davranışı, funnel, retention metrikleri
- **Better Stack / UptimeRobot** — Supabase + n8n endpoint uptime
- **n8n alarm**: workflow başarısız olursa Telegram/Email push (Telegram bot kurma 10 dakika)
- **Supabase log inspection** — kritik query'leri tag'le

### 1.4 Veri Pipeline Sağlığı
Bugün öğrendiğimiz pipeline bug'ı kullanıcıya görünmedi — çünkü monitoring yok. Eklenecekler:

- **Workflow başarısızlık alarmı** — n8n'de "Error Workflow" tanımla, her workflow'a bağla
- **"Modelin son ne zaman çalıştığı"** Stats sayfasında küçük indicator: `Son güncelleme: 2 saat önce ✅` veya `Son güncelleme: 3 gün önce ⚠️`
- **API quota uyarısı** — RapidAPI 100 req/gün limitine yaklaştığında dashboard'da göster
- **Health check endpoint** — Supabase Edge Function: `predictions tablosunda son 24 saatte yeni satır var mı?`

### 1.5 Boş durum / Hata kurtarma
- **Offline mode** — internet yoksa cache'li veriyi göster, "internet yok" rozeti
- **Supabase hatası** → kullanıcı dostu Türkçe mesaj, "Tekrar dene" CTA
- **Stale data uyarısı** — son güncellemeden 24+ saat geçtiyse Bugün ekranında banner

**Tier 1 toplam süre:** 4-6 gün. Bunlar olmadan launch riskli.

---

## 💎 Tier 2 — Launch Quality (ilk açılış izlenimi)

### 2.1 Mobile UX Faz 2 — Match Card 2.0 (MOBILE_UX_V3_PLAN.md'de detaylı)
Listelerin her satırı önemli. Şu anki kartlar yatay (logo + skor + logo), ama uzun takım adları sığmıyor ve PredictionBar düz çiziyor. Önerilen:
- Dikey takım layout (FotMob tarzı)
- Animasyonlu PredictionBar (Reanimated ile dolma efekti)
- Haptic feedback press anında
- LIVE state'te dakika + pulsing dot

### 2.2 Mobile UX Faz 3 — "Bugün" Hero & Section grupları
- **Hero kart:** favori takım maçı varsa onu öne çıkar, yoksa "En güvenli tahmin" göster
- **Section grupları:** "🔴 Şu an oynanan" / "⚡ Birazdan başlayacak" / "🌙 Bugün gece" / "📅 Yarın"
- **SectionList** sticky header ile

### 2.3 Empty State + Micro-copy
- "Bu ligde maç yok" → "Bu ligde maç yok" + **[Tüm liglere dön]** CTA
- "Skor belirsiz" → "Tahmin net değil — yine de olasılıklara bak"
- "Veri yetersiz" → "İki takım az karşılaşmış, H2H sinyali zayıf"

### 2.4 Motion polish
- Sayfa geçişlerinde `slide_from_right` animation
- Pull-to-refresh sonrası kart layout animation (Reanimated FadeIn)
- Tab değişimi `Haptics.selectionAsync()`

### 2.5 A11y bitirme
- VoiceOver tam test (ekran okuyucu)
- Dynamic Type cap'i 1.4× (büyük font modunda layout patlamasın)
- Reduce Motion respect (animasyonlar opsiyonel)
- High contrast varyant (kart border kalın)

### 2.6 Onboarding 2.0
- 4. slide: **Default favori seçici** (Galatasaray, Fenerbahçe, Arsenal önerileri checkbox)
- "İlk açılışta" sample tahmin gösterimi (tutorial overlay)
- Notification permission **request asla onboarding 1. slide'da değil** — kullanıcı app'i tanıdıktan sonra

**Tier 2 toplam süre:** 6-8 gün. Bunlar olmadan app "beta" hissi verir.

---

## 🔥 Tier 3 — Viral hooks (kullanıcı paylaşır mı?)

### 3.1 Tahmin paylaşma kartı (1 hafta içinde yapılabilir, viral potansiyel yüksek)
Match detail sayfasında "Paylaş" butonu → marka stilinde 1080×1920 PNG üretir → iOS share sheet'e yollar (WhatsApp, Instagram Story, Twitter).

Görsel:
```
┌──────────────────────────┐
│  ⚽ FUTBOL TAHMİNİ        │
│                          │
│  Arsenal vs Tottenham    │
│  Premier League · 22:00  │
│                          │
│  🎯 2-1                  │
│  ────────────            │
│  ■■■■■■■ %58  GS         │
│  ■■■    %22  X           │
│  ■■■    %20  TS          │
│                          │
│  futboltahmin.app        │
└──────────────────────────┘
```

Implementation: `react-native-view-shot` ile React component → PNG → `expo-sharing`. 2 günlük iş.

**Why viral:** WhatsApp gruplarında bu görsel paylaşılır → "Arkadaşım bu uygulamadan tahminleri yolluyor"

### 3.2 Live Activity (iOS 16.1+) — Dynamic Island + kilit ekranı
Favori takım maçı başladığında:
- Kilit ekranında canlı skor + dakika
- Dynamic Island'da kompakt versiyon
- Maç bitince notification

Implementation: `expo-live-activity` (community plugin) veya native Swift module. 3-4 günlük iş.

**Why viral:** iPhone reklamlarındaki "wow" özellik. Apple ekosistemini sevenler app'i bu yüzden indirir.

### 3.3 Home Screen Widget'lar (iOS 14+)
- **Small widget:** "Bugünün En Güçlü Tahmini" → 1 maç, predicted score + confidence rozeti
- **Medium widget:** "Bugünün 3 Maçı" → 3 satır, mini PredictionBar her satırda

Implementation: Native iOS widget extension (Xcode tarafı). `expo-widget` topic'inde community çözümü var ama biraz manuel. 2-3 günlük iş.

### 3.4 App Clip (opsiyonel)
**App Clip** = app'in 10MB altındaki mini versiyonu. QR code veya link ile açılır, app indirilmeden tek bir tahmin gösterilir.

Use case: Bir Twitter postunda QR kod → tarayanlar uygulamayı indirmeden "Arsenal-Tottenham tahminini" görüyor → "Daha fazlası için indir" CTA.

Implementation: Yeni target XCode'da, 1 hafta.

### 3.5 Twitter/X Otomasyonu
n8n + Twitter API ile:
- Her gün 09:00 → "Bugünün en güçlü tahmini" tweet
- Maç sonrası → "Model dedi 2-1, gerçek 2-1, isabet! 🎯" 
- Sezonun en yüksek confidence'lı maçlarında özel post

Implementation: Twitter Developer hesabı + n8n Twitter node. 1 günlük iş.

**Tier 3 toplam süre:** 2-3 hafta. Bunlar olmadan organic büyüme zor.

---

## 🎮 Tier 4 — Retention (kullanıcı geri gelir mi?)

### 4.1 "Tahmin Ligi" — Modele Karşı Yarış
**En yüksek retention katsayılı özellik.** Mevcut akış: kullanıcı tahmini görüp kapatıyor. Yeni akış: **kullanıcı kendi tahminini girer ve modele + diğer kullanıcılara karşı puanlanır**.

Mekanikler:
- Her maç için 1X2 + tahmini skor giriş (modal)
- Maç bitince puanlama: 1X2 doğru = 3p, skor doğru = 8p, ikisi de = 11p
- Haftalık/aylık/sezon leaderboard
- "Sen vs Model" karşılaştırma kartı: "Bu hafta sen modelden +12 puan öndesin"

Backend gereksinimleri:
- Auth (Sign in with Apple — Apple zorunlu kılıyor 3rd party auth varsa)
- `user_predictions` tablosu (user_id, fixture_id, prob_1, prob_x, prob_2, predicted_score)
- `leaderboard` view (RLS ile kullanıcı kendi sırasını görür)

Implementation: 2-3 hafta (auth + UI + scoring + leaderboard).

### 4.2 Özel ligler (oda) — Sosyal mekanik
- "iş arkadaşları" odası, "Galatasaray fan club" odası
- Oda kodu paylaş → davet linki → katıl
- Oda içi mini-leaderboard

**Why retention:** Arkadaşlarınla yarış sebebiyle geri gelirsin.

### 4.3 Streak rozetleri
- 5 maç üst üste 1X2 doğru → "5'in 5'i" rozeti
- 10 maç → altın rozet
- Push: "🔥 4'te 4! Yarınki Galatasaray maçında bilirsen rozet sende"

**Why retention:** Loss aversion — streak kırılma korkusu.

### 4.4 Push Notification Stratejisi
Şu an basit "maç başlıyor" push'ları. Yeni stratejik push'lar:

- **Model drift bildirimi:** "GS-FB: model son 6 saatte fikrini değiştirdi, artık GS %58 (önceki %48)" → tıkla, görüm aç
- **Outlier alarmı:** "Bugünün en yüksek olasılıklı tahmini: Man City %85 → öne çık"
- **Streak hatırlatma:** "🔥 5'in 5'i için yarınki tahminin lazım"
- **Sessiz saatler:** 23:00 - 08:00 arası push yok (Settings'te kullanıcı ayarlayabilir)

Implementation: Mevcut push altyapısı var (Expo Push Tokens), sadece n8n'de stratejik trigger'lar.

### 4.5 Stats Sayfasında Model Trust UI (UX Faz 5)
Kullanıcının "Bu uygulamaya güveneyim mi?" sorusunu cevaplayan sayfa:

- **Brier kalibrasyon görseli** — "Model %60-70 dedi, gerçekte %68 tuttu" tablosu
- **Lig kırılımı** — "Premier League: %62 isabet | La Liga: %58 | Bundesliga: %48"
- **Confidence bazlı:** "Güçlü işaretli tahminler son 30 günde %74 isabet"
- **Trend grafik** — son 90 gün haftalık rolling accuracy

Implementation: `model_calibration` ve `model_calibration_league` view'ları zaten kuruldu. 2-3 günlük UI işi.

**Tier 4 toplam süre:** 3-4 hafta. Bunlar olmadan launch sonrası "indirilip silinen" app olur.

---

## 🌐 Tier 5 — Scale (büyürken)

### 5.1 Lokalizasyon
- **TR** ✅ (ana dil)
- **EN** — Avrupa pazarı (Premier League fan'ları)
- **AR** — Orta Doğu (futbol coşkulu pazar)
- **DE** — Bundesliga fan'ları

Implementation: `expo-localization` + `i18n-js`. Tüm string'leri `i18n.t('home.todays_matches')` formatına çevir. 1 haftalık iş + her dil için 4-6 saat çeviri.

### 5.2 Apple Watch Companion
- Sadece favori takım maçları
- Mini PredictionBar
- Glance for "bugünün maçları"
- Complication: tahmin sayısı + en güçlü

Implementation: WatchOS target + native Swift. Veya React Native Watch (community, sınırlı). 1-2 hafta.

### 5.3 Web Sürümü (SEO motoru)
- `futbol-tahmin.com/maclar/arsenal-tottenham-tahmini` her maç için URL
- Vercel + Next.js + Supabase (aynı backend)
- Google'dan organic trafik → app indirmeye yönlendirme

Implementation: 2 hafta (sıfırdan Next.js + Supabase + tasarım sistemi taşıma).

### 5.4 Bahis Oranları Karşılaştırması (yasal sınırda)
Pinnacle, Bet365 API'lerinden oran çek → modelin olasılığıyla karşılaştır → "edge" göster (bahis tavsiyesi DEĞİL, istatistiksel ayrışma).

⚠️ **Türkiye'de yasal risk** — sadece "info" olarak göster, "bu bahsi oyna" deme. Ya da bu özelliği tamamen atlayıp tek başına "model bence" tarafında kal.

### 5.5 Lineup / Sakatlık Entegrasyonu (model derinleşmesi)
- API-Football lineup endpoint
- "Salah sakat" → model xG'sini düşür → daha doğru tahmin
- UX: detail sayfasında "🏥 Eksikler: Salah, Van Dijk → xG -0.6"

Implementation: 1 hafta (yeni tablo + workflow + UI).

**Tier 5 toplam süre:** 6-10 hafta. Launch sonrası 3. ay+

---

## 📢 Tier 6 — Marketing & Launch günü

### 6.1 Landing Page (futbol-tahmin.com)
- Hero: "Bilimsel futbol tahmini, ücretsiz"
- Demo video (15 sn)
- App Store + Google Play badge
- Privacy / Terms / Support footer linkleri
- Email signup ("Lansman bildirimi al")

Implementation: Vercel + tek dosya Next.js + Tailwind. 1 günlük iş.

### 6.2 App Store Optimization (ASO)
- **App name:** "Futbol Tahmini — Bilimsel Skor" (60 char)
- **Subtitle:** "Poisson modeliyle 1X2 + tam skor tahmini" (30 char)
- **Anahtar kelimeler:** futbol, tahmin, maç analizi, istatistik, skor, lig, premier, süper lig...
- **Açıklama:** İlk 250 karakter (read more öncesi) en önemli — değer önerisi + sosyal kanıt
- **Screenshots (5 adet, 6.7" iPhone):**
  1. Bugün ekranı + hero kart
  2. Match detail + heatmap (wow özellik)
  3. Stats sayfası + kalibrasyon
  4. Favori takımlar + push
  5. "Tahmin Ligi" leaderboard (eklendikten sonra)
- **Preview video (15-30 sn):** ekran kayıt + voice-over

### 6.3 Press Kit
- 5 adet yüksek çözünürlüklü screenshot
- App icon (1024×1024)
- Logo (SVG)
- 100-200 kelimelik kısa açıklama
- Founder bio (kısa)
- Press contact email

### 6.4 Launch Stratejisi
- **Soft launch:** 2-3 hafta TestFlight beta (20-50 kişi feedback)
- **Soft Türkiye launch:** Sadece TR App Store'da yayınla, Reddit r/galatasaray r/fenerbahce r/futbol'da paylaş
- **Twitter/X teaser** kampanyası 1 hafta önce
- **Product Hunt launch** (EN sürüm geldikten sonra)
- **Influencer outreach** — Goal Türkiye, Anadolu Spor, futbol Twitter'ı

### 6.5 Beta Test Grubu
- TestFlight Internal: kendi + 3-5 yakın arkadaş
- TestFlight External: 50-100 kişi (form ile başvur)
- **Feedback toplama:** Settings'te "Geri bildirim ver" butonu → form (Tally/Typeform veya in-app modal)
- **Bug bounty:** "İlk crash'i bulan: app içinde rozet + adı landing page'de"

**Tier 6 toplam süre:** Launch öncesi 2-3 hafta paralel iş.

---

## 🗺️ Önerilen 8 haftalık launch yol haritası

| Hafta | Odak | Çıktı |
|---|---|---|
| 1 | Tier 1 — Legal + Monitoring | Privacy/Terms canlı, Sentry kurulu, n8n alarmları |
| 2 | Tier 2 — Match Card 2.0 + Bugün Hero | Yeni TestFlight build, "production hissi" |
| 3 | Tier 2 — A11y + Empty State + Motion | Polish bitiş, beta test'e hazır |
| 4 | Tier 3 — Paylaşma kartı + Twitter bot | Viral altyapı |
| 5 | Tier 3 — Live Activity + Widget | iOS native özellikler |
| 6 | Tier 4 — Tahmin Ligi (auth + basic) | Retention motor |
| 7 | Tier 6 — Landing page + ASO + Press kit | Marketing altyapı |
| 8 | Soft launch + beta feedback iteration | App Store'a submit |

**Lansman sonrası 3-6 ay:** Tier 5 (lokalizasyon, Watch, Web)

---

## 🎯 Bugün karar vermen gerekenler

1. **Premium tier düşünüyor musun?** Şu an ücretsiz dedin — Apple Sign-In, IAP infrastructure değişebilir bu kararla.
2. **Hangi pazara ilk?** Sadece TR, yoksa EN paralel? Bu lokalizasyon zamanını etkiler.
3. **Tahmin Ligi (auth) öncelikli mi?** Bu Tier 4'ün omurgası ama 3 hafta sürer. Olmadan launch da olur ama retention zayıf.
4. **Yasal pozisyon:** "İstatistiksel analiz" tarafında kal mı, yoksa bahis oranları entegrasyonu eklensin mi (risk)?

Bu kararlara göre 8 haftalık plan daralabilir veya genişler.

---

## 📋 Şu anki "kalıyor" listesi (özet)

**Engelleyici (Tier 1):**
- [ ] Privacy Policy + Terms canlı bir URL'de
- [ ] Sentry crash reporting
- [ ] PostHog/Mixpanel analytics
- [ ] n8n hata alarmları (Telegram)
- [ ] Offline mode + stale data uyarısı
- [ ] Settings'te bahis disclaimer

**Kalite (Tier 2):**
- [ ] Match Card 2.0 (UX Faz 2)
- [ ] Bugün Hero & section'lar (UX Faz 3)
- [ ] A11y full pass (UX Faz 6)
- [ ] Empty state + micro-copy revizyon (UX Faz 8)
- [ ] Onboarding 2.0 — default favori öneri (UX Faz 10)

**Viral (Tier 3):**
- [ ] Paylaşma kartı (en yüksek ROI)
- [ ] Live Activity
- [ ] Home Widget
- [ ] Twitter bot

**Retention (Tier 4):**
- [ ] Tahmin Ligi (auth + scoring + leaderboard)
- [ ] Streak rozetleri
- [ ] Stats kalibrasyon UI (UX Faz 5)
- [ ] Stratejik push (drift, outlier)

**Scale (Tier 5):**
- [ ] EN lokalizasyon
- [ ] Watch companion
- [ ] Web sürümü
- [ ] Lineup/sakatlık entegrasyonu

**Marketing (Tier 6):**
- [ ] Landing page
- [ ] ASO optimizasyonu
- [ ] Press kit
- [ ] Beta tester havuzu

---

Bu doküman canlı — her tamamlandığında çıkar, her yeni fikir geldiğinde ekle.
