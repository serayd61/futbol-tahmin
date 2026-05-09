# ⚽ FUTBOL TAHMİN UYGULAMASI — MASTER YOL HARİTASI

> Bu dosya tüm projenin tek kaynak referansıdır. Her aşamada Claude'a (veya Cursor'a) ilgili bölümün promptunu kopyala/yapıştır olarak verebilirsin. Aşağıdaki sıra **birbirine bağımlıdır** — atlama.

---

## 0. PROJE MİMARİSİ (TEK BAKIŞTA)

```
┌─────────────────────┐      ┌──────────────┐      ┌──────────────────┐
│  Football-Data.org  │ ───► │              │ ───► │                  │
│  API-Football       │      │     n8n      │      │    Supabase      │
│  TheSportsDB        │      │ (workflows)  │      │   (Postgres)     │
└─────────────────────┘      └──────┬───────┘      └────────┬─────────┘
                                    │                       │
                                    ▼                       │
                            Tahmin Motoru                   │
                            (Poisson + Form)                │
                                    │                       │
                                    └───────► tahminler ────┘
                                                            │
                                                            ▼
                                              ┌──────────────────────┐
                                              │   Expo (RN) App      │
                                              │   iOS + Android      │
                                              └──────────┬───────────┘
                                                         │
                                                         ▼
                                              ┌──────────────────────┐
                                              │  GitHub  ─►  EAS     │
                                              │            ─► TestFlight │
                                              └──────────────────────┘
```

**Ne nerede çalışacak:**
- **Veri çekme + tahmin hesabı:** n8n (sunucuda cron ile)
- **Veri saklama:** Supabase (ücretsiz Postgres)
- **Mobil arayüz:** Expo (React Native)
- **Dağıtım:** GitHub → EAS Build → TestFlight

---

## 1. AŞAMA — ÜCRETSİZ API HESAPLARI

Üç kaynağı **birlikte** kullanacağız. Hiçbiri tek başına "tüm ligler" sözü tutmuyor.

### 1.1 Football-Data.org (ANA KAYNAK — ücretsiz, key kolay)
- **Site:** https://www.football-data.org/client/register
- **Ücretsiz tier:** 10 req/dk, ana Avrupa ligleri (PL, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Şampiyonlar Ligi, EURO/Dünya Kupası, Championship)
- **Senin yapacağın:** Üye ol → email doğrula → "API Token" panelinden anahtarı kopyala.
- **Bana vereceğin:** `FOOTBALL_DATA_API_KEY`

### 1.2 API-Football (RapidAPI üzerinden — daha geniş lig kapsamı)
- **Site:** https://rapidapi.com/api-sports/api/api-football
- **Ücretsiz tier:** Günde 100 istek, 1000+ lig (Süper Lig dahil)
- **Senin yapacağın:** RapidAPI'ye Google ile giriş yap → "Subscribe to Test (Basic)" → ücretsiz planı seç → "X-RapidAPI-Key"i kopyala.
- **Bana vereceğin:** `RAPIDAPI_KEY`

### 1.3 TheSportsDB (yedek — anahtar gerekmez)
- **Site:** https://www.thesportsdb.com/api.php
- **Kullanım:** Public anahtar `123` ile çalışıyor. Logo, takım resmi, eksik veri için.
- **Senin yapacağın:** Hiçbir şey, key yok.

### 1.4 (Opsiyonel) ScoreBat — canlı skor video önizleme
- Eğer maç videoları/highlight'ları istersen: https://www.scorebat.com/video-api/
- Şimdilik atlayabilirsin.

> ✅ **Bu aşamayı bitirdiğinde elinde 2 adet API key olmalı.** Bunları bir not defterine kaydet, n8n'de kullanacağız.

---

## 2. AŞAMA — SUPABASE (VERİTABANI) KURULUMU

### 2.1 Hesap & Proje
- **Site:** https://supabase.com/dashboard
- GitHub ile giriş yap → "New project" → adı `futbol-tahmin` → bölge `Frankfurt (eu-central-1)` → şifreyi güçlü seç ve **kaydet**.
- Proje hazır olduğunda **Settings → API** sayfasından şu üçü kopyala:
  - `Project URL` → `SUPABASE_URL`
  - `anon public` key → `SUPABASE_ANON_KEY`
  - `service_role` key → `SUPABASE_SERVICE_KEY` (bu sadece n8n'de kullanılacak, app'te ASLA olmayacak)

### 2.2 Şema (SQL Editor'a yapıştırılacak)
Supabase panelinde **SQL Editor → New query** açıp aşağıyı çalıştır:

```sql
-- Ligler
create table leagues (
  id          bigint primary key,
  name        text not null,
  country     text,
  logo        text,
  season      int,
  source      text,
  updated_at  timestamptz default now()
);

-- Takımlar
create table teams (
  id          bigint primary key,
  name        text not null,
  short_name  text,
  logo        text,
  country     text,
  league_id   bigint references leagues(id),
  updated_at  timestamptz default now()
);

-- Fikstür / maçlar
create table fixtures (
  id            bigint primary key,
  league_id     bigint references leagues(id),
  season        int,
  utc_date      timestamptz not null,
  status        text,                    -- SCHEDULED, LIVE, FINISHED, POSTPONED
  home_team_id  bigint references teams(id),
  away_team_id  bigint references teams(id),
  home_goals    int,
  away_goals    int,
  venue         text,
  source        text,
  updated_at    timestamptz default now()
);
create index on fixtures (utc_date);
create index on fixtures (status);
create index on fixtures (league_id, season);

-- Takım form / istatistik (n8n her gece günceller)
create table team_stats (
  team_id           bigint primary key references teams(id),
  league_id         bigint references leagues(id),
  matches_played    int default 0,
  goals_scored_avg  numeric(4,2) default 0,
  goals_conceded_avg numeric(4,2) default 0,
  home_scored_avg   numeric(4,2) default 0,
  home_conceded_avg numeric(4,2) default 0,
  away_scored_avg   numeric(4,2) default 0,
  away_conceded_avg numeric(4,2) default 0,
  form              text,                -- "WWLDW" son 5 maç
  updated_at        timestamptz default now()
);

-- Tahminler
create table predictions (
  fixture_id        bigint primary key references fixtures(id) on delete cascade,
  prob_home_win     numeric(4,3),        -- 0.000 — 1.000
  prob_draw         numeric(4,3),
  prob_away_win     numeric(4,3),
  predicted_score   text,                -- "2-1"
  expected_goals_home numeric(4,2),
  expected_goals_away numeric(4,2),
  prob_over_25      numeric(4,3),
  prob_under_25     numeric(4,3),
  confidence        text,                -- "low" | "medium" | "high"
  model_version     text default 'poisson-v1',
  computed_at       timestamptz default now()
);

-- Mobil app için public read view (anon key ile erişilecek)
alter table leagues    enable row level security;
alter table teams      enable row level security;
alter table fixtures   enable row level security;
alter table predictions enable row level security;

create policy "public read leagues"     on leagues    for select using (true);
create policy "public read teams"       on teams      for select using (true);
create policy "public read fixtures"    on fixtures   for select using (true);
create policy "public read predictions" on predictions for select using (true);
```

> ✅ **Bu aşamayı bitirdiğinde:** 5 tablo, 1 SUPABASE_URL, 1 ANON_KEY, 1 SERVICE_KEY elinde olacak.

---

## 3. AŞAMA — n8n KURULUMU

İki seçenek var. **Tavsiyem: 3.A (kendi makinende Docker).** Hem ücretsiz hem sürekli çalışır.

### 3.A Self-host (Docker) — ÖNERİLEN
Mac'inde Docker Desktop kurulu olmalı (https://www.docker.com/products/docker-desktop/).

`/Users/serkanaydin/futbol tahmin/Futbol Tahmin/n8n/` klasöründe `docker-compose.yml`:

```yaml
version: "3.8"
services:
  n8n:
    image: n8nio/n8n:latest
    restart: always
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - GENERIC_TIMEZONE=Europe/Istanbul
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=DEGISTIR_BURAYI
      - FOOTBALL_DATA_API_KEY=${FOOTBALL_DATA_API_KEY}
      - RAPIDAPI_KEY=${RAPIDAPI_KEY}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
    volumes:
      - ./data:/home/node/.n8n
```

Aynı klasörde `.env`:
```
FOOTBALL_DATA_API_KEY=xxx
RAPIDAPI_KEY=xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
```

Çalıştır:
```bash
cd "/Users/serkanaydin/futbol tahmin/Futbol Tahmin/n8n"
docker compose up -d
```

Tarayıcıdan **http://localhost:5678** → admin / şifren ile gir.

### 3.B Alternatif: n8n Cloud (kolay ama 14 gün ücretsiz, sonra ücretli)
https://n8n.io/cloud/ — sadece denemek için.

### 3.3 n8n Workflow'ları (3 tane kuracağız)

#### Workflow 1: `daily-fixtures-sync` (her gün 03:00'da çalışır)
**Düğümler:**
1. **Schedule Trigger** — `0 3 * * *`
2. **HTTP Request** — `GET https://api.football-data.org/v4/matches?dateFrom={today}&dateTo={today+7}`
   - Header: `X-Auth-Token: {{ $env.FOOTBALL_DATA_API_KEY }}`
3. **Code** (JavaScript) — gelen `matches` arrayini Supabase formatına dönüştür (`fixtures`, `teams`, `leagues` tablolarına ayır)
4. **Supabase** node (3 tane, upsert) — leagues, teams, fixtures'a yaz
5. **HTTP Request** — RapidAPI'den eksik ligleri tamamla (Süper Lig vb.)
6. **Supabase** upsert — tekrar fixtures

#### Workflow 2: `team-stats-rebuild` (her gece 04:00)
**Düğümler:**
1. **Schedule Trigger** — `0 4 * * *`
2. **Supabase** SELECT — son 30 gündeki bitmiş maçlar
3. **Code** — her takım için: maç sayısı, atılan/yenilen ortalamaları (ev/deplasman ayrı), son 5 maç formu (W/L/D)
4. **Supabase** UPSERT — `team_stats`

#### Workflow 3: `predictions-compute` (her gün 05:00 + manuel tetikleme)
**Düğümler:**
1. **Schedule Trigger** — `0 5 * * *`
2. **Supabase** SELECT — gelecek 7 gündeki `SCHEDULED` maçlar
3. **Supabase** SELECT — bu maçların ev/deplasman takımlarının `team_stats`'ı
4. **Code** — Poisson modeliyle tahmin hesapla (formül §7'de)
5. **Supabase** UPSERT — `predictions` tablosu

> ⚠️ Workflow JSON'larını ben sana **3.A çalıştıktan sonra** ayrı dosyalarda vereceğim — bu master prompt sadece çatı.

---

## 4. AŞAMA — MOBİL UYGULAMA (Expo + React Native)

### 4.1 Proje oluştur

```bash
cd "/Users/serkanaydin/futbol tahmin/Futbol Tahmin"
npx create-expo-app@latest mobile -t expo-template-blank-typescript
cd mobile
npx expo install expo-router react-native-safe-area-context react-native-screens \
  @supabase/supabase-js @react-native-async-storage/async-storage \
  react-native-url-polyfill date-fns
```

### 4.2 Dosya yapısı

```
mobile/
├── app/
│   ├── _layout.tsx              # Root layout (tab navigator)
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar
│   │   ├── index.tsx            # ANASAYFA: bugünün maçları + tahminler
│   │   ├── fixtures.tsx         # FİKSTÜR: lig seç, tarih filtre
│   │   └── settings.tsx         # AYARLAR: tema, lig favorileri
│   └── match/[id].tsx           # MAÇ DETAY: tüm tahmin metrikleri
├── lib/
│   ├── supabase.ts              # client init
│   ├── queries.ts               # tüm DB sorguları (tek yer)
│   └── format.ts                # tarih, skor format helper'ları
├── components/
│   ├── MatchCard.tsx            # ev-skor-deplasman + tahmin rozeti
│   ├── PredictionBar.tsx        # 1-X-2 olasılık çubuğu
│   ├── ScoreBadge.tsx           # tahmini skor
│   └── EmptyState.tsx
├── theme/
│   └── colors.ts                # tek renk paleti (yeşil/lacivert futbol teması)
├── app.json                     # Expo config
├── eas.json                     # EAS build config
└── .env.local                   # SUPABASE_URL & ANON_KEY
```

### 4.3 Kritik dosya içerikleri (özet)

**`lib/supabase.ts`:**
```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true } }
);
```

**`lib/queries.ts`:** `getTodayFixtures()`, `getFixtureWithPrediction(id)`, `getUpcomingByLeague(leagueId)` — sadece SELECT, RLS public okuma izniyle çalışır.

**`app.json` (kritik alanlar):**
```json
{
  "expo": {
    "name": "Futbol Tahmin",
    "slug": "futbol-tahmin",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.serkanaydin.futboltahmin",
      "buildNumber": "1",
      "supportsTablet": true
    },
    "android": { "package": "com.serkanaydin.futboltahmin" },
    "plugins": ["expo-router"],
    "scheme": "futboltahmin"
  }
}
```

> ✅ **Detaylı kod aşaması:** `mobile/` klasörü oluştuktan sonra "Aşama 4 promptunu" bana vereceksin — tüm dosyaları tek tek yazacağım.

---

## 5. AŞAMA — GITHUB

```bash
cd "/Users/serkanaydin/futbol tahmin/Futbol Tahmin"
git init
echo "node_modules/
.expo/
dist/
.env
.env.local
ios/
android/
n8n/data/
.DS_Store" > .gitignore

git add .
git commit -m "feat: initial scaffold (n8n + supabase schema + expo app)"
```

GitHub'da **yeni repo aç** (https://github.com/new), adı `futbol-tahmin`, **Private** seç, README ekleme.

```bash
git remote add origin git@github.com:KULLANICI_ADIN/futbol-tahmin.git
git branch -M main
git push -u origin main
```

> Not: `.env.local` ve `n8n/.env` ASLA push edilmez. `.gitignore`'da olduklarından emin ol.

---

## 6. AŞAMA — EAS BUILD → TESTFLIGHT

### 6.1 EAS hazırlık
```bash
cd mobile
npm i -g eas-cli
eas login              # Expo hesabınla
eas build:configure    # eas.json üretir
```

`eas.json`:
```json
{
  "cli": { "version": ">= 7.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal", "ios": { "simulator": true } },
    "production":  { "autoIncrement": true }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "serayd6161@gmail.com",
        "ascAppId": "BURAYI_APP_STORE_CONNECT_TEN_AL",
        "appleTeamId": "BURAYI_DEVELOPER_PORTALDAN_AL"
      }
    }
  }
}
```

### 6.2 App Store Connect'te uygulama oluştur
1. https://appstoreconnect.apple.com → My Apps → "+" → New App
2. Platform: iOS, Name: **Futbol Tahmin**, Bundle ID: `com.serkanaydin.futboltahmin` (önce Developer Portal'da Identifier oluştur), SKU: `futbol-tahmin-001`
3. **App Information** doldur, **Pricing** = Free
4. App ID'yi (sayısal) `eas.json`'a `ascAppId` olarak yaz.

### 6.3 Build & Submit
```bash
# iOS production build (~15-25 dk sürer)
eas build --platform ios --profile production

# Build başarılıysa TestFlight'a gönder
eas submit --platform ios --latest
```

İlk seferde EAS sana sorar:
- Apple ID şifresi (App-Specific Password önerilir: appleid.apple.com → Sign-In and Security → App-Specific Passwords)
- Distribution Certificate ve Provisioning Profile → "Let EAS handle it" seç.

### 6.4 TestFlight'ta test et
1. App Store Connect → TestFlight sekmesi → 5-10 dk sonra build görünür ("Processing")
2. **Export Compliance** sorusuna "No" (HTTPS dışı şifreleme yok) → Submit
3. **Internal Testing** grubu oluştur, kendi Apple ID'ni ekle
4. Telefonda **TestFlight** uygulamasını aç → davet linkini kabul et → install

> 🎉 Buraya gelince ilk build telefonunda. Her sonraki commit için `eas build` + `eas submit` döngüsü.

---

## 7. TAHMİN MOTORU — POISSON FORMÜLÜ

n8n Workflow 3'ün Code düğümünde çalışacak. Mantık:

### 7.1 Beklenen gol (xG) hesabı
```
Lig ortalaması: lig_avg = lig_genelinde_atılan_gol / lig_genelinde_oynanan_maç
Ev saldırı gücü:    home_attack  = home.home_scored_avg  / lig_avg
Ev savunma zaafı:   home_defense = home.home_conceded_avg / lig_avg
Dep saldırı gücü:   away_attack  = away.away_scored_avg  / lig_avg
Dep savunma zaafı:  away_defense = away.away_conceded_avg / lig_avg

xG_home = home_attack * away_defense * lig_avg
xG_away = away_attack * home_defense * lig_avg
```

**Form ağırlığı:** Son 5 maçtaki W=1.0 / D=0.5 / L=0.0 toplamı `0..5` arası. xG'yi `(0.85 + 0.06 * form_pts)` ile çarp.

### 7.2 Skor olasılıkları (Poisson)
```
P(home_goals=k) = (xG_home^k * e^-xG_home) / k!
P(away_goals=k) = (xG_away^k * e^-xG_away) / k!
```
0..6 gol için iki tarafın olasılık matrisini çarp → 7×7 ortak olasılık tablosu.

### 7.3 1X2 olasılığı
- `prob_home_win`  = matrisin alt-üçgeni (home > away)
- `prob_draw`      = köşegen (home = away)
- `prob_away_win`  = üst-üçgen (home < away)

### 7.4 Üst/Alt 2.5
- `prob_over_25`  = `home + away ≥ 3` hücrelerinin toplamı
- `prob_under_25` = `1 - prob_over_25`

### 7.5 Tahmini skor
Matriste **en yüksek olasılıklı** hücre.

### 7.6 Confidence
- En yüksek 1X2 olasılığı `≥ 0.55` → `high`
- `0.45 — 0.55` → `medium`
- `< 0.45` → `low`

---

## 8. SIRALI ÇALIŞMA PLANI (Sen ↔ Ben)

| # | Aşama | Sen yapacaksın | Ben yapacağım |
|---|-------|----------------|----------------|
| 1 | API key | Football-Data + RapidAPI'den 2 key al | — |
| 2 | Supabase | Hesap aç, projeyi oluştur, key'leri bana ver | Şema SQL'i çalıştırma talimatı vereceğim |
| 3 | n8n | Docker'ı başlat, panele ulaş | 3 workflow JSON'unu vereceğim, import edeceksin |
| 4 | Test | İlk Supabase verisini gör | Sorgu örnekleri vereceğim |
| 5 | Mobile | `npx create-expo-app` çalıştır | Tüm dosyaları yazacağım |
| 6 | GitHub | Repo aç, push et | Komutları vereceğim |
| 7 | Apple | App Store Connect'te app aç | `eas.json` ve submit komutları vereceğim |
| 8 | TestFlight | Davet linkini kabul et | Build hatalarında debug |

---

## 9. AŞAMA AŞAMA SANA VERECEĞİN PROMPTLAR

Aşağıdakileri ilgili aşamada bana yapıştır.

### 🔹 Prompt — Aşama 2 (Supabase şeması doğrulama)
```
Aşama 2'deki SQL'i Supabase'de çalıştırdım. Şu çıktıyı aldım: [yapıştır].
Tablolar oluştu mu kontrol et, herhangi bir uyarı varsa açıkla.
```

### 🔹 Prompt — Aşama 3 (n8n workflow'ları)
```
n8n http://localhost:5678'de çalışıyor. Bana 3 workflow'un JSON dosyalarını ver:
1) daily-fixtures-sync
2) team-stats-rebuild
3) predictions-compute

Football-Data + RapidAPI çağrılarını birleştir, Supabase upsert için service key kullan.
JSON'u doğrudan n8n'e import edebileceğim formatta hazırla.
```

### 🔹 Prompt — Aşama 4 (mobil app kodu)
```
mobile/ klasörü oluştu. Şu dosyaların TAMAMINI yaz:
- app/_layout.tsx, app/(tabs)/_layout.tsx
- app/(tabs)/index.tsx (bugünün maçları + tahmin rozetleri)
- app/(tabs)/fixtures.tsx (lig + tarih filtreli liste)
- app/(tabs)/settings.tsx
- app/match/[id].tsx (1X2 barı, skor matrisi, üst/alt 2.5)
- components/MatchCard.tsx, PredictionBar.tsx, ScoreBadge.tsx
- lib/supabase.ts, queries.ts, format.ts
- theme/colors.ts (koyu tema, futbol yeşili #16A34A vurgu)

Kullandığın TS tiplerini lib/types.ts'de topla. Tüm verileri Supabase'den çek.
```

### 🔹 Prompt — Aşama 5 (GitHub)
```
Repo URL: https://github.com/KULLANICI/futbol-tahmin
Bu noktaya kadar olan her şeyi commit'le ve push et. .gitignore'da .env, node_modules,
ios/, android/, n8n/data/ olduğundan emin ol.
```

### 🔹 Prompt — Aşama 6 (TestFlight)
```
EAS ile iOS production build alıp TestFlight'a göndermek istiyorum.
- Apple Team ID: [App Store Connect → Membership]
- ASC App ID: [App Store Connect → App Information → Apple ID (sayısal)]
- Bundle ID: com.serkanaydin.futboltahmin

eas.json'u güncelle, eas build + eas submit komutlarını ver. Hata çıkarsa debug et.
```

---

## 10. SIK YAPILAN HATALAR (önden uyarı)

- ❌ Bundle ID'yi App Store Connect'te yanlış girmek → submit'te red. **Önce Developer Portal → Identifiers'da oluştur.**
- ❌ `service_role` key'i mobil app'e koymak → güvenlik açığı. **Sadece n8n'de.**
- ❌ Supabase RLS'yi açmadan public okuma → 401 hatası. **§2.2'deki policy'leri unutma.**
- ❌ TestFlight'ta "Encryption" sorusunu boş bırakmak → build "Missing Compliance" takılır. **No seç ve Submit.**
- ❌ Free tier API limitlerini aşmak → 429. **n8n'de cron'ları sırala** (03:00, 04:00, 05:00 gibi).
- ❌ Bağımsızlık ikonları & splash screen unutmak → App Store reddedebilir. **app.json'a `icon` ve `splash` ekle (1024×1024 PNG).**

---

## 11. PROJE BİTTİ MENTÖRÜ

Her aşama tamamlandığında bana **şu cümleyi** yapıştır:

> "Aşama N tamam. [Görülen çıktı / hata mesajı]. Aşama N+1'e geç."

Ben sıradaki adıma uygun komutları/kodu ürettiğimde sen uygulayıp tekrar bana bildireceksin. Bu döngü TestFlight build'ı telefonunda görene kadar devam eder.

---

**🚀 BAŞLANGIÇ NOKTASI:** Şu an Aşama 1'desin. Football-Data.org ve RapidAPI'ye kayıt olmaya başla, key'leri aldığında bana yapıştır — Aşama 2'ye geçeriz.
