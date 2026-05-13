// Expo Push Sender — yaklaşık 1 saat içinde başlayacak maçlar için
// favori takımı olan kullanıcılara push gönderir.
//
// Akış:
//   1) Supabase'den önümüzdeki 50-70 dk içinde başlayan SCHEDULED maçları çek
//   2) push_tokens'tan enabled=true olanları, favori takımları maçlardakilerle eşleştir
//   3) Her eşleşme için Expo Push API'sine bildirim gönder
//
// Not: Expo Push API tek bir POST'la 100'e kadar bildirimi batch alır.

const items = $input.all();
let rows = [];
if (items.length === 1 && Array.isArray(items[0].json?.data)) {
  rows = items[0].json.data;
} else if (items.length === 1 && Array.isArray(items[0].json)) {
  rows = items[0].json;
} else {
  rows = items.map(i => i.json);
}

// Aggregate sonrası gelen "data" iki ayrı sorguyu birleştirir:
// data: [{fixtures: [...]}, {push_tokens: [...]}] gibi gelmez genelde — her query ayrı
// Bu workflow yapısında: önce maçları sonra tokenları sırayla çekiyoruz.
// Build Push Messages sadece maçları görüyor, token'ları $('Get Tokens') ile alır.

const fixtures = $('Get Upcoming Fixtures (1h)').all().flatMap(i => {
  const j = i.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.data)) return j.data;
  return [j];
});

const tokens = $('Get Push Tokens').all().flatMap(i => {
  const j = i.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.data)) return j.data;
  return [j];
});

if (fixtures.length === 0 || tokens.length === 0) {
  return [{ json: { messages: [], reason: 'no fixtures or tokens' } }];
}

// Zaman penceresi — PostgREST'te aynı isimli iki query param duplicate olduğunda
// sadece sonuncusu uygulanıyor. Burda kesin filter uygula: şimdi - 5 dk ... şimdi + 75 dk
const nowMs = Date.now();
const windowStart = nowMs - 5 * 60 * 1000;
const windowEnd = nowMs + 75 * 60 * 1000;
const upcoming = fixtures.filter(f => {
  if (!f.utc_date) return false;
  const t = new Date(f.utc_date).getTime();
  return t >= windowStart && t <= windowEnd;
});

if (upcoming.length === 0) {
  return [{ json: { messages: [], reason: 'no upcoming fixtures in 75min window', total_fixtures: fixtures.length } }];
}

// Team isim cache için minimal lookup — fixtures içinde nested gelirse onu kullan
const teamNameById = new Map();
for (const f of upcoming) {
  if (f.home_team?.name) teamNameById.set(f.home_team_id, f.home_team.name);
  if (f.away_team?.name) teamNameById.set(f.away_team_id, f.away_team.name);
}

// Expo Push Message array
const messages = [];

for (const t of tokens) {
  if (!t.enabled) continue;
  const favs = Array.isArray(t.favorite_teams) ? t.favorite_teams : [];
  if (favs.length === 0) continue;

  // Bu kullanıcının favorisinin olduğu maçları bul
  for (const f of upcoming) {
    const inFav = favs.includes(f.home_team_id) || favs.includes(f.away_team_id);
    if (!inFav) continue;

    const home = teamNameById.get(f.home_team_id) || 'Ev sahibi';
    const away = teamNameById.get(f.away_team_id) || 'Deplasman';
    const minutes = Math.round(
      (new Date(f.utc_date).getTime() - Date.now()) / 60000
    );
    const minLabel = minutes < 0 ? 'birazdan' : `${minutes} dakika içinde`;

    messages.push({
      to: t.token,
      sound: 'default',
      title: `${home} — ${away}`,
      body: `Maç ${minLabel} başlıyor. Tahminleri kontrol et!`,
      data: { fixture_id: f.id },
      priority: 'high',
    });
  }
}

return [{ json: { messages, count: messages.length } }];
