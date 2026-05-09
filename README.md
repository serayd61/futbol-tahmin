# Futbol Tahmin

Avrupa'nın büyük liglerini ve uluslararası kupaları kapsayan futbol maçları için **Poisson tabanlı tahmin uygulaması**. n8n otomasyonu ile her gün veri çekip Supabase'e yazar; React Native (Expo) tabanlı iOS/Android app tahminleri görselleştirir.

## Mimari

```
Football-Data.org   ┐
api-sports.io       ┼─►  n8n workflows  ─►  Supabase Postgres  ─►  Expo (RN) App
                    ┘     (cron 03/04/05)
```

- **n8n** (`/n8n`): 3 workflow — fixtures sync, team-stats rebuild, predictions compute
- **Supabase**: 5 tablo (leagues, teams, fixtures, team_stats, predictions) + RLS public read
- **Tahmin motoru**: Poisson dağılımı + son 5 maç form ağırlığı (`/n8n/workflows/_src/poisson_predict.js`)
- **Mobil app** (`/mobile`): Expo Router, TypeScript, Supabase JS client

## Geliştirme

Mobil:
```bash
cd mobile
npx expo start
```

n8n (yerel):
```bash
cd n8n
docker compose up -d
# Panel: http://localhost:5678
```

## Tahmin modeli — Poisson v1

Her takım için:
- Lig ortalamasına göre normalize edilmiş saldırı/savunma katsayıları
- Ev/deplasman ayrımı
- Son 5 maç formuyla ağırlıklandırma (W=1, D=0.5, L=0)

Çıktı: 1X2 olasılıkları, en olası skor, beklenen goller, Üst/Alt 2.5 olasılığı, confidence (low/medium/high).

## Disclaimer

Bu uygulama eğitim amaçlıdır. Tahminler istatistiksel modele dayanır ve gerçek sonuçları garantilemez.
