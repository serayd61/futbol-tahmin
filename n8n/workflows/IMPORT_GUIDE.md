# n8n Workflow Import Rehberi

3 adet workflow JSON dosyası bu klasörde:

| Dosya | Ne işe yarar | Cron |
|---|---|---|
| `workflow1-fixtures-sync.json` | Football-Data + API-Football'dan fikstür çek, Supabase'e yaz | her gün 03:00 |
| `workflow2-team-stats-rebuild.json` | Son 30 günün maçlarından takım form/istatistik | her gün 04:00 |
| `workflow3-predictions-compute.json` | Poisson modeliyle tahmin hesapla | her gün 05:00 |

> ⚠️ Sıralama önemli: önce 1, sonra 2, sonra 3. Workflow 2'nin verisi 1'in sonucuna, 3'ün verisi 2'nin sonucuna bağlı.

## 1) JSON'ları n8n'e import et

Tarayıcıda http://localhost:5678 → sol üstte **Workflows** → sağ üstte **Add workflow** dropdown'ı → **Import from File**.

Sırayla 3 dosyayı yükle:
1. `workflow1-fixtures-sync.json`
2. `workflow2-team-stats-rebuild.json`
3. `workflow3-predictions-compute.json`

Her import sonrası workflow editör ekranı açılır. Sağ üstten **Save** (`Cmd+S`) yap.

## 2) Doğrulama — Workflow 1'i manuel çalıştır

1. **1 — daily-fixtures-sync** workflow'unu aç.
2. Sol üstte ilk düğüm olan **Manual Trigger**'a tıkla → **Execute Node** (veya editörün altındaki **Test workflow** butonu).
3. Düğümler sırayla yeşil dolacak. Her düğüme tıkla, sağ panelde dönüş verisini gör:
   - **Get FD Matches** → `matches` array'inde maç olmalı
   - **Transform FD** → `count` > 0 olmalı
   - **Upsert *** düğümleri → boş response (Prefer: return=minimal yüzünden), HTTP status `201` olmalı

## 3) Supabase'de veri olduğunu kontrol et

Supabase Dashboard → **Table Editor** → `fixtures` tablosu. Birkaç satır görünmeli (önümüzdeki 7 gün).

Veya SQL Editor'da:
```sql
select count(*), source from fixtures group by source;
select count(*) from leagues;
select count(*) from teams;
```

## 4) Workflow 2'yi tetikle (stats)

Workflow 1'in *bir kez* çalışmış olması yeterli ama **istatistik için bitmiş maç** lazım. İlk çalıştırmada Football-Data'dan **gelecek** maçlar çektiğin için `team_stats` boş gelebilir. Çözüm:

`workflow1-fixtures-sync.json`'un **Date Range** düğümünü geçici düzenle:

```js
const today = new Date();
const past  = new Date(today.getTime() - 30*86400000);
const week  = new Date(today.getTime() +  7*86400000);
const fmt = d => d.toISOString().slice(0,10);
return [{ json: { dateFrom: fmt(past), dateTo: fmt(week), todayDate: fmt(today) }}];
```

Bunu uygula → Manual Trigger → çalıştır. Şimdi son 30 günün bitmiş maçları da DB'de.

Sonra **Workflow 2 → Manual Trigger → Execute** çalıştır. `team_stats` tablosunda satır görmelisin.

> 💡 Bu geçici değişikliği geri al — günlük cron'da sadece +7 gün lazım, geçmiş çekmek API kotanı yer.

## 5) Workflow 3'ü tetikle (predictions)

Workflow 2 başarılıysa **Workflow 3 → Manual Trigger → Execute**. `predictions` tablosunda satır görmelisin:

```sql
select fixture_id, predicted_score, prob_home_win, prob_draw, prob_away_win,
       prob_over_25, confidence
from predictions
limit 10;
```

## 6) Otomatik çalışmayı aç

Her 3 workflow'u açtığında sağ üst köşede **Active** toggle'ı var. **3'ünü de Active** yap. Artık her gün 03/04/05'te otomatik çalışacak.

## 7) Yaygın hatalar

- **`401 Unauthorized` (Football-Data)** → `.env`'deki `FOOTBALL_DATA_API_KEY` yanlış / boş. n8n'i `docker compose restart n8n` ile yenile.
- **`401 Unauthorized` (Supabase)** → `SUPABASE_SERVICE_KEY` yanlış. **Yeni sıfırladığın** anahtar olduğundan emin ol, eski olmasın.
- **`429 Too Many Requests`** → API kotası bitti. Football-Data 10 req/dk; aralık ver. RapidAPI 100 req/gün; gereksiz manuel run yapma.
- **Workflow 1'in 2. yarısı (AF) çökerse** → büyük ihtimalle RapidAPI subscription aktif değil. RapidAPI panelinde `api-football` → Subscribe to Test (Basic) seçili mi kontrol et.
- **`Transform FD` count=0** → Bu hafta o tarihler arası FD'nin takip ettiği liglerde maç yok demektir; tarih aralığını genişletip tekrar dene.

## 8) Bana bildir

Üç workflow'da da yeşil dolu run ve Supabase'de veri görünce yaz:

> "Workflow'lar çalıştı, fixtures + team_stats + predictions tablolarında veri var"

Sonra **Aşama 4 — Mobil uygulama**'ya geçeceğim.
