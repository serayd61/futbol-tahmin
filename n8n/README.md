# n8n — Futbol Tahmin Otomasyonu

Bu klasör futbol verilerini API'lerden çekip Supabase'e yazan ve tahmin hesaplayan üç n8n workflow'unu çalıştırır.

## 1) Önkoşullar

**Docker Desktop** kurulu olmalı:
- İndir: https://www.docker.com/products/docker-desktop/
- Mac'te indirip kur, uygulamayı **bir kez aç** (üst menü çubuğunda balina ikonu görünmeli, "Docker Desktop is running" yazmalı).
- Terminal'de doğrula: `docker --version` → bir versiyon basmalı.

## 2) `.env` dosyasını oluştur

```bash
cd "/Users/serkanaydin/futbol tahmin/Futbol Tahmin/n8n"
cp .env.example .env
```

Sonra `.env` dosyasını aç (Cursor/VSCode/TextEdit), şu 5 değeri doldur:

| Değişken | Nereden alınır |
|---|---|
| `N8N_PASSWORD` | Kendin seç (panel girişi için, güçlü olsun) |
| `FOOTBALL_DATA_API_KEY` | football-data.org → My Account |
| `RAPIDAPI_KEY` | rapidapi.com → My Apps → X-RapidAPI-Key |
| `SUPABASE_URL` | Zaten doldu: `https://dfaeelstabyoouuoivzd.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Supabase → Settings → API → **yeni** service_role key |

> ⚠️ `.env` dosyası asla GitHub'a pushlanmaz — `.gitignore`'da zaten var.

## 3) Çalıştır

```bash
cd "/Users/serkanaydin/futbol tahmin/Futbol Tahmin/n8n"
docker compose up -d
```

İlk seferinde n8n image'ını indirir (~200 MB, 1-2 dk). Sonraki başlatmalar saniyeler sürer.

## 4) Panele gir

Tarayıcıda aç: **http://localhost:5678**

İlk açılışta n8n bir owner hesabı oluşturmanı isteyebilir (email + şifre). Bu, basic auth'tan ayrı bir n8n iç hesap; istediğin email'i gir.

## 5) Faydalı komutlar

```bash
# Logları izle
docker compose logs -f n8n

# Durdur
docker compose down

# Tekrar başlat
docker compose up -d

# Versiyon güncelle
docker compose pull && docker compose up -d

# Durumu gör
docker compose ps
```

## 6) Sorun giderme

- **`Cannot connect to the Docker daemon`** → Docker Desktop açık değil, üst menüden başlat.
- **`port is already allocated`** → 5678 kullanımda; `docker compose down` yap, başka bir n8n çalışıyor olabilir.
- **Panel açılmıyor (localhost:5678)** → `docker compose ps` çalıştır, `Up` durumunda olmalı. Değilse `docker compose logs` ile sebebi gör.
- **Basic auth login redirect döngüsü** → Cookies temizle veya gizli pencerede aç.

## 7) Sonraki adım

Panel açıldığında bana **"n8n çalışıyor, panel açıldı"** yaz — sana 3 workflow'un JSON dosyalarını vereceğim, panele import edeceksin.
