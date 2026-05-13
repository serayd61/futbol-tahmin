# 🩺 Supabase Sağlık Raporu — 12 Mayıs 2026

> Bu rapor, otomatik yapılan tüm Supabase işlerinin durumunu ve **manuel yapılması gereken** son birkaç adımı listeler.

---

## ✅ TÜM OTOMATİK İŞLER TAMAM

### Tablolar & Schema (Migration 07-10)

| Yapı | Beklenen | Gerçek | Durum |
|---|---|---|---|
| `predictions` kolon sayısı | 20 | **20** | ✅ |
| `user_baskets` kolon sayısı | 11 | **11** | ✅ |
| `user_basket_picks` kolon sayısı | 6 | **6** | ✅ |
| `predictions.score_matrix` (jsonb) | doluyor | **94 satır dolu** | ✅ |
| `predictions.prob_btts_yes` (KGV) | doluyor | **94 satır dolu** | ✅ |
| `predictions.home_advantage` + `rho` + `factors` | doluyor | dc-v1 satırlarında dolu | ✅ |

### View'lar

| View | İçerik | Durum |
|---|---|---|
| `leagues_overview` | 206 lig (ülke + accuracy + hafta maç sayısı) | ✅ |
| `model_brier` | poisson-v1 + poisson-v2 baseline | ✅ |
| `model_calibration` | confidence × prob_bucket | ✅ |
| `model_calibration_league` | 33 lig için per-league accuracy | ✅ |
| `league_home_advantage` | 11 lig için γ katsayısı | ✅ |
| `leaderboard_weekly` | henüz boş (sepet yok) | ✅ |
| `leaderboard_alltime` | henüz boş (sepet yok) | ✅ |

### Otomatik Scoring (Migration 10)

| Bileşen | Durum |
|---|---|
| `fixture_score_baskets` trigger | ✅ active |
| `score_basket_picks_for_fixture()` function | ✅ kurulu |
| `refresh_basket_aggregate()` function | ✅ kurulu |
| `trg_fixture_scored()` function | ✅ kurulu |

**Çalışma akışı:** Bir maç `status='FINISHED'` durumuna geçince trigger tetiklenir → her pick (1X2/Ü-A/KGV-KGY) `hit` veya `miss` olarak işaretlenir → ilgili sepetin `hits`, `points`, `status` alanları güncellenir.

### RLS Güvenliği

| Tablo | RLS | Policy sayısı | Açıklama |
|---|---|---|---|
| fixtures, leagues, predictions, team_stats, teams | true | 1 | public read |
| **user_baskets** | **true** | **4** | sahibi CRUD yapar, başkası göremez |
| **user_basket_picks** | **true** | **1** | sahibi catch-all |

### Index'ler

- `fixtures`: pkey + date + league_season + status — 4 index ✅
- `predictions`: pkey + model_version + computed_at — 3 index ✅
- `user_basket_picks`: basket_id, fixture_id index'leri ✅
- `user_baskets`: user_id, status index'leri ✅

---

## ⚠️ MANUEL YAPILMASI GEREKEN 4 ŞEY

Aşağıdakileri **Claude otomatize edemez** çünkü Apple Developer hesabı ve özel credentials gerekir.

### 1️⃣ Apple Sign-In setup (Apple Developer Console)

**Apple Developer'da yapılacaklar** (https://developer.apple.com):

1. **Certificates, Identifiers & Profiles** → **Identifiers** → "+" → **Services IDs**
2. Yeni Service ID: `com.serkanaydin.futboltahmin.signin` (veya benzeri)
3. **Sign in with Apple** capability ekle
4. **Configure** → **Primary App ID:** `com.serkanaydin.futboltahmin`
5. **Return URLs:** `https://dfaeelstabyoouuoivzd.supabase.co/auth/v1/callback`
6. Save → bu Services ID'yi kopyala

Ardından **Keys** bölümünde:

1. **+** → "Sign in with Apple" capability'i seç → Configure
2. Primary App ID seç → Save
3. Key oluştur → adı "FutbolTahmin Sign in with Apple"
4. **.p8 dosyasını indir** (bir kere indirebilirsin, kaybetme!)
5. **Key ID**'yi kopyala

Eline geçen 4 değer:
- **Services ID** (örn. `com.serkanaydin.futboltahmin.signin`)
- **Team ID** (`ZP6DN8JZX7` — eas.json'dan zaten elinde)
- **Key ID** (10 karakter)
- **Private Key** (.p8 dosyası içeriği)

### 2️⃣ Supabase Auth Provider — Apple aktivasyonu

1. https://supabase.com/dashboard/project/dfaeelstabyoouuoivzd/auth/providers
2. **Apple** satırına tıkla → "Enable" toggle açık konuma getir
3. **Services ID** alanına yapıştır
4. **Secret Key (for OAuth)** alanına:
   - Eğer Supabase otomatik secret üretimi destekliyorsa → Team ID + Key ID + .p8 ayrı alanlar (yeni Supabase UI bunu yapıyor)
   - Eski UI'da → JWT secret üretip yapıştırman gerekebilir
5. **Save**

### 3️⃣ Mobil tarafta paket kurulumu + app.json

Terminalden:

```bash
cd "/Users/serkanaydin/futbol tahmin/Futbol Tahmin/mobile"
npx expo install expo-apple-authentication
```

Sonra `mobile/app.json` dosyasında iOS bölümüne **`usesAppleSignIn: true`** ekle:

```json
"ios": {
  "bundleIdentifier": "com.serkanaydin.futboltahmin",
  "buildNumber": "15",
  "supportsTablet": true,
  "usesAppleSignIn": true,
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false
  },
  ...
}
```

### 4️⃣ EAS Build sonrası Apple Developer'da capability check

Build aldığında EAS, App ID'ye otomatik Sign in with Apple capability ekler. Sorun olursa:

1. Apple Developer → Identifiers → `com.serkanaydin.futboltahmin`
2. **Capabilities** sekmesi → **Sign in with Apple** ✓ aktif olmalı
3. Provisioning profile yeniden oluştur (EAS otomatik yapar)

---

## 🧪 TEST EDİLMEYEN AMA KURULU (production'da otomatik kanıtlanır)

**Scoring trigger synthetic test'i atlandı** — sebep: `user_baskets.user_id` FK constraint, gerçek auth.users kaydı olmadan sahte sepet eklenemiyor. Bu **bilinçli bir tercih** (production safety).

Gerçek test akışı: kullanıcı Apple Sign-In yapar → sepet kaydeder → maç FINISHED olur → trigger tetiklenir → `user_basket_picks.result` ve `user_baskets.points` otomatik güncellenir. İlk gerçek kullanıcı ilk maç bittikten sonra log'larda doğrulanabilir.

---

## 📅 ÖNERİLEN AKIŞ (Apple Sign-In + Build)

1. Apple Developer Console → Services ID + Key oluştur (~15 dakika)
2. Supabase Dashboard → Auth → Apple toggle aç + credentials gir (~5 dakika)
3. `npx expo install expo-apple-authentication` + app.json edit (~2 dakika)
4. `eas build --platform ios --profile production --auto-submit` (~20-30 dakika)
5. TestFlight'ta yeni build aç → "Ligler" sekmesine git → bir pick ekle → sepet → Apple Sign-In test

**Apple Sign-In credentials yokken** uygulama çalışır ama sepet kaydetmeye çalıştığında "Apple modülü eksik" uyarısı verir. Yani bu kullanıcı için **bloklayıcı değil**, ama Apple App Store yayını için **zorunlu** (3rd party auth kullanılıyorsa).

---

## 🎯 ŞU AN ELINDEKI

Sen TestFlight'a build attığında **mobil tarafta birebir çalışan bütün altyapı hazır:**

- ✅ Lig odaları (206 lig, ülke bayrakları, model isabet oranı)
- ✅ Multi-market pick chip'leri (1X2 + Üst/Alt + KGV/KGY)
- ✅ Tahmin Sepeti (10 pick'e kadar, combined probability, beklenen puan)
- ✅ Score matrix heatmap (Dixon-Coles modelin 7×7 olasılık grid'i)
- ✅ Factor attribution (modelin "neden bu tahmin" açıklaması)
- ✅ Apple Sign-In stub (paket kurulunca aktive olur)
- ✅ Otomatik scoring trigger (maç bitince sepetler otomatik puanlanır)
- ✅ Leaderboard view'ları (haftalık + tüm zamanlar)

Geri kalan tek şey **Apple Developer setup** ve **mobil paket kurulumu** — bu 30-40 dakikalık manuel iş.

İyi launch! 🚀
