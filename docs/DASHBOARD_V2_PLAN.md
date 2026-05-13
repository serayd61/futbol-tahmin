# 🎯 Dashboard V2 — "Tahmin Sepeti" konsepti

> **Yayınlanma:** Beta tester Burak Tekkan'ın "Dashboard olsa daha iyi olur, bütün ligler ayrı odalarda, ülke bayraklarıyla" feedback'i + serkan'ın eskizleri (3 frame).
>
> **Hedef:** Kullanıcı tek tek maç tahmini görmek yerine **çoklu maç seçerek bir "Tahmin Sepeti" oluştursun**. Bu sepetin toplam olasılığı, modelin güveni, beklenen puan değeri gösterilsin. Maçlar oynandığında sepet otomatik puanlanır → kullanıcı leaderboard'da yarışır.
>
> **Yasal çerçeve:** Para yok, "oran" yok, "kupon" yok. "Sepet", "olasılık", "puan", "rozet" üzerinden kurulur. Apple ve TR mevzuatında güvende kalır.

---

## 🖼️ Eskizden çıkardığım gereksinimler

### Frame 1 — Ana Dashboard
- Başlık: **"Futbol Tahmini"**
- Üstte vurgulu **"Tahmin Sepeti Oluştur"** butonu
- Altında lig kartları: **Süper Lig, Italya Serie A, Fransa Ligue 1, vb.** (Burak: ülke bayraklarıyla)
- Her lig kartı = içeri girilen bir "oda"

### Frame 2 — Lig içi maç listesi (oda)
- Her maç için **multi-market pick chip'leri:**
  - **Üst** (Üst 2.5 gol)
  - **Alt** (Alt 2.5 gol)
  - **KGV** (Karşılıklı Gol Var — both teams to score yes)
  - **KGY** (Karşılıklı Gol Yok — no)
- **"+%80 ihtim"** etiketi: modelin güçlü olduğu pick'lere otomatik rozet
- Kullanıcı pick'lere tıklayarak sepete ekler

### Frame 3 — Sepet ekranı
- Eklenen tüm pick'lerin listesi
- Toplam birleşik olasılık (independence assumption)
- "Sepeti Kaydet" butonu
- Maçlar oynandığında sonuç + puan

---

## 🏗️ Mimari — 3 ana sayfa

### Sayfa A: "Ligler" (yeni ana ekran veya sekme)

```
┌───────────────────────────────────┐
│  Bugün           [+ Sepet 0/5]    │ ← üst bar (sepetteki pick sayısı)
├───────────────────────────────────┤
│                                   │
│  🇹🇷 Süper Lig                    │
│  9 maç bugün · %62 model isabeti  │
│                                   │
│  🇬🇧 Premier League               │
│  10 maç bugün · %58 model isabeti │
│                                   │
│  🇪🇸 La Liga                       │
│  8 maç bugün · %65 model isabeti  │
│                                   │
│  🇮🇹 Serie A                       │
│  ...                              │
│                                   │
└───────────────────────────────────┘
```

Her lig kartında:
- Ülke bayrağı emoji veya görsel
- Lig ismi
- Bugün/bu hafta kaç maç + modelin geçmiş isabet oranı (`model_calibration_league` view'dan)
- Tıklanınca o ligin maç listesine git

### Sayfa B: Lig içi — Multi-market maç listesi

```
┌───────────────────────────────────┐
│  ← Geri    Süper Lig     [+ 2/5]  │
├───────────────────────────────────┤
│  PAZARTESI 12 MAYIS              │
│                                   │
│  ┌──────────────────────────────┐ │
│  │ GS — FB         21:45         │ │
│  │ Tahmin: 2-1  · GÜÇLÜ          │ │
│  │ [1: %58] [X] [2]              │ │  ← 1X2 chip'ler
│  │ [Üst ▲%80] [Alt] [KGV ▲][KGY] │ │  ← multi-market
│  └──────────────────────────────┘ │
│                                   │
│  ┌──────────────────────────────┐ │
│  │ BJK — TS        19:00         │ │
│  │ Tahmin: 1-1                   │ │
│  │ [1] [X: %38] [2]              │ │
│  │ [Üst] [Alt ▲] [KGV] [KGY ▲]   │ │
│  └──────────────────────────────┘ │
└───────────────────────────────────┘
```

Pick chip mekaniği:
- **Tıkla** → sepete ekle (chip yeşil arka plan + ✓ ikonu)
- **Yine tıkla** → çıkar
- **▲%80** rozeti: model olasılığı ≥ %60 → rozet (yüksek güven)
- Her chip'in altında küçük model olasılığı (%)

### Sayfa C: Sepet (basket) ekranı

```
┌───────────────────────────────────┐
│  Tahmin Sepetim          [Temizle]│
├───────────────────────────────────┤
│  Süper Lig                        │
│  GS — FB   2-1  GÜÇLÜ             │
│  Pick: 1 (Ev sahibi) · %58         │
│                                   │
│  Premier League                   │
│  Man City — Crystal Palace        │
│  Pick: 1 + Üst 2.5 · %72 · %85    │
│                                   │
│  La Liga                          │
│  Real Madrid — Real Sociedad      │
│  Pick: KGV · %68                  │
├───────────────────────────────────┤
│  Toplam: 4 pick                   │
│  Birleşik olasılık: %18           │
│  Beklenen puan: 47                │
│                                   │
│  [Sepeti Kaydet]                  │
└───────────────────────────────────┘
```

Mekanikler:
- **Birleşik olasılık** = pick'lerin olasılıklarının çarpımı (`p₁ × p₂ × ... × pₙ`) — gerçekçi değil ama eğitici
- **Beklenen puan** = pick başına standart puan (1 pick = 10p, isabet ederse), toplam puan = isabet eden pick × 10
- **Kaydet** → user_baskets tablosuna yaz, maçlar oynandığında otomatik skorlanır
- **"Geçmiş sepetlerim"** sekmesi — kullanıcının tutturduğu sepetler + leaderboard'daki yeri

---

## 📊 Yeni veri ihtiyaçları

### B.1 KGV / KGY olasılığı

Mevcut model `prob_over_25` ve `prob_under_25` hesaplıyor. KGV (Karşılıklı Gol Var — Both Teams To Score) için aynı `score_matrix`'ten türetilebilir:

```js
// dixon_coles_predict.js'e ekleme:
let pBtts = 0;
for (let i = 1; i < N_GOALS; i++) {
  for (let j = 1; j < N_GOALS; j++) {
    pBtts += matrix[i][j];
  }
}
// pBtts = P(home ≥ 1 AND away ≥ 1)
// pBtts_no = 1 - pBtts

out.push({
  // ... mevcut alanlar
  prob_btts_yes: +pBtts.toFixed(3),
  prob_btts_no:  +(1 - pBtts).toFixed(3),
});
```

SQL migration:

```sql
-- supabase/09_btts_columns.sql
alter table predictions add column if not exists prob_btts_yes numeric(4,3);
alter table predictions add column if not exists prob_btts_no  numeric(4,3);
```

### B.2 user_baskets tablosu (auth gerektirir)

```sql
-- supabase/10_baskets.sql
create table user_baskets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  name          text,                  -- kullanıcı verebilir, default "Sepet 12 May"
  combined_prob numeric(5,4),          -- pick'lerin çarpımı
  total_picks   int,
  status        text default 'pending', -- pending | partial | complete
  hits          int default 0,         -- kaç pick isabet etti
  points        int default 0,         -- toplam puan (10 × hits)
  created_at    timestamptz default now(),
  resolved_at   timestamptz             -- son maç bittiğinde set edilir
);

create table user_basket_picks (
  basket_id   uuid references user_baskets(id) on delete cascade,
  fixture_id  bigint references fixtures(id),
  market      text not null,           -- '1X2_HOME' | '1X2_DRAW' | '1X2_AWAY' | 'OVER_25' | 'UNDER_25' | 'BTTS_YES' | 'BTTS_NO'
  prob        numeric(5,4),            -- kayıt anındaki model olasılığı
  result      text,                    -- 'hit' | 'miss' | null (pending)
  primary key (basket_id, fixture_id, market)
);

alter table user_baskets enable row level security;
alter table user_basket_picks enable row level security;

-- Kullanıcı sadece kendi sepetlerini görür/düzenler
create policy "own_baskets" on user_baskets
  for all using (auth.uid() = user_id);

create policy "own_basket_picks" on user_basket_picks
  for all using (
    exists (select 1 from user_baskets b
            where b.id = user_basket_picks.basket_id
            and b.user_id = auth.uid())
  );
```

### B.3 Auth (Sign in with Apple)

Auth zorunlu çünkü `user_id` ile sepet bağlamak gerek. Apple Sign-In tek yöntem önerilirse hem hızlı hem Apple uyumlu:

```bash
npx expo install expo-apple-authentication
```

Login akışı:
1. Kullanıcı ilk "Sepet Oluştur" tıklayınca modal: "Giriş yap"
2. Apple ile giriş → Supabase Auth + email tek seferlik
3. Sonraki seferler otomatik

Sosyal eklenebilir (Google, Email) ama Apple Sign-In **zorunlu**.

---

## 🎨 UX detayları

### Pick chip tasarımı

```
┌─────────────────┐
│ 1 · %58         │  ← normal pick
└─────────────────┘

┌─────────────────┐
│ 1 · %72 ▲%80    │  ← yüksek güven (modelin top pick'i)
└─────────────────┘

┌─────────────────┐
│ ✓ 1 · %72       │  ← sepete eklenmiş (yeşil arka plan)
└─────────────────┘
```

### Sepet badge (üst bar)

```
[+ Sepet 0/5]      ← boş
[+ Sepet 3/5]      ← 3 pick var
[Sepet Dolu ●]     ← 5 pick maksimum
```

Sepet maksimum 5-10 pick olabilir — sınır koymak hem UI hem matematik için iyi (5'in üzerinde birleşik olasılık çok küçük).

### Lig odaları için ülke bayrakları

Burak'ın önerisi — emoji bayrak yeterli (`🇹🇷 🇬🇧 🇪🇸 🇮🇹 🇫🇷 🇩🇪`). Native flag emoji'leri Unicode standart, RN'de sorunsuz render eder. Veya `country-flag-icons` paketinden SVG. Emoji daha hızlı.

### Boş sepet hali

```
🛒 Sepetin boş

Lig odalarından maç seç ve pick ekle.
Her isabet 10 puan kazandırır.

[Liglere git →]
```

---

## 🛣️ Implementation Fazlı

### Faz 1 — Backend (2-3 gün)
- [ ] SQL migration 09: `prob_btts_yes`, `prob_btts_no` kolonları
- [ ] `dixon_coles_predict.js` güncelle: BTTS hesapla
- [ ] n8n workflow execute → yeni alanlar dolacak
- [ ] SQL migration 10: `user_baskets` + `user_basket_picks` + RLS
- [ ] Auth setup (Apple Sign-In Supabase config)
- [ ] Basket scoring view (`basket_scores` — pick isabet/sayım otomatik)

### Faz 2 — Mobile fundamental (3-4 gün)
- [ ] `expo-apple-authentication` kur + AuthContext
- [ ] Ligler ekranı (yeni tab: "Ligler") — `getLeaguesWithStats()` query
- [ ] Lig içi maç listesi — multi-market pick chip'li MatchCard 2.0
- [ ] Sepet state (Zustand veya useReducer + Context) — global
- [ ] Sepet ekranı (modal veya yeni sekme)

### Faz 3 — Mobile polish (2-3 gün)
- [ ] Sepete ekle/çıkar animasyonu (Reanimated)
- [ ] Pick chip'lerinde haptic feedback
- [ ] "+%80 ihtim" rozeti — high confidence pick'ler için
- [ ] Sepet maksimum 5-10 limit + uyarı
- [ ] Empty state'ler

### Faz 4 — Skorlama & leaderboard (2-3 gün)
- [ ] n8n workflow: maç bitince ilgili sepetleri skorla
- [ ] Geçmiş sepetlerim sekmesi (Settings altında veya yeni Profile)
- [ ] Basit leaderboard (haftalık top 100, RLS ile gizlilik)
- [ ] Push: "Sepetin sonuçlandı: 4/5 isabet, 40 puan kazandın!"

### Faz 5 — Marketing & launch (1-2 gün)
- [ ] Onboarding'e 4. slide: "Sepet oluştur, modele karşı yarış"
- [ ] App Store screenshot'a sepet ekran ekle
- [ ] Yeni TestFlight build

**Toplam: 10-15 gün** (~ 2 hafta yoğun).

---

## 🏷️ Bu plan diğer dökümanlarla nasıl uyuyor?

- **MOBILE_UX_V3_PLAN.md** — Faz 3 "Bugün Hero & section grupları" zaten lig grupları öneriyordu, Burak'ın feedback'i bunu doğruladı. Aslında bu plan, UX Faz 3'ün **gelişmiş versiyonu**.
- **MODEL_V3_PLAN.md** — `score_matrix` jsonb sayesinde BTTS hesabı 10 satırlık ek, score_matrix'ten türetiliyor. Dixon-Coles altyapısı bu özelliği bedavaya getiriyor.
- **PRODUCTION_LAUNCH_ROADMAP.md** — Tier 4 "Tahmin Ligi" özelliğinin somutlaşmış hali. Bu plan onun yerine geçer ve **daha güçlü** çünkü "sepet" konsepti tek tek tahmin girmekten daha zevkli.

---

## 💎 Neden bu özellik launch için kritik?

1. **Retention** — Sepet kaydeden kullanıcı haftanın sonunda **sonuçlarını öğrenmek için geri döner**. Pasif "tahmini gördüm" kullanıcısı vs aktif "sepetim ne durumda?" kullanıcısı = 3-5x DAU farkı.
2. **Sosyal mekanik** — Leaderboard ile kullanıcı arkadaşlarına meydan okur. WhatsApp gruplarında ekran görüntüsü paylaşılır.
3. **Beta tester'dan gelen ilk feedback** — Burak'a "Senin fikrin sayesinde bu özellik var" diyebileceksin → erken kullanıcı sadakati.
4. **Apple App Store screenshot için ideal** — sepet ekranı, lig odaları, multi-market chip'ler — App Store visitor'ın 3 saniyede "ay bu farklı bir şey" diyeceği görsel.

---

## ⚠️ Önemli kısıtlar

1. **Para asla, hiçbir yerde** — kaydedilen sepetlerde "kazanç", "ödül parası", "iadeli" gibi finansal ima yok. Sadece **puan** ve **rozet**.
2. **Yaş 18+ koruması** — Settings'te onboarding sırasında "18+ kullanıcı olduğunu kabul ediyorum" checkbox. App Store rating 12+ kalabilir ama bu içeride de var olsun.
3. **"Kupon" kelimesi her yerden çıkar** — kod, UI, marketing materyali, ne varsa.
4. **Combined probability gerçekçi değil** — Pick'ler **bağımsız değil** (aynı liglerde maçlar korelasyonlu). Bunu küçük yazıyla belirt: "Pick'ler bağımsız varsayılır, gerçekte korelasyon olabilir."

---

## 🎯 İlk somut adım

**Faz 1 başlangıç:** `dixon_coles_predict.js`'e BTTS hesaplaması ekle + SQL migration 09 + 10 yaz. Bu yapıldığında dc-v1 modelin gece çalıştığında zaten yeni alanlar dolu olacak, mobile bağlanırken sorunsuz veri akacak.

İstersen şimdi bu üç dosyaya başlayabilirim — Faz 1'in 2 saatlik kısmı bu.
