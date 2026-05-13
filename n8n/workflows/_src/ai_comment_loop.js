// AI Yorum üretici — tek Code node içinde tüm akış:
//   1) AI yorumu olmayan SCHEDULED maçları çek (Supabase REST)
//   2) Her biri için Gemini 2.5 Flash'a kısa Türkçe yorum sor
//   3) Sonuçları Supabase'de upsert (ai_comment + ai_generated_at)
//
// Limit: günlük 15 maç (Gemini free tier 1500/gün, kotanın %1'i)

// n8n Code node'unda fetch global yok → node:https ile polyfill
const https = require('https');
const fetch = (url, options = {}) => new Promise((resolve, reject) => {
  const u = new URL(url);
  const req = https.request({
    hostname: u.hostname,
    path: u.pathname + u.search,
    method: options.method || 'GET',
    headers: options.headers || {},
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      resolve({
        ok: res.statusCode >= 200 && res.statusCode < 300,
        status: res.statusCode,
        text: () => Promise.resolve(body),
        json: () => Promise.resolve(body ? JSON.parse(body) : null),
      });
    });
  });
  req.on('error', reject);
  if (options.body) {
    req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
  }
  req.end();
});

const SUPABASE_URL = '__SUPABASE_URL__';
const SUPABASE_KEY = '__SUPABASE_SERVICE_KEY__';
const GEMINI_KEY   = '__GEMINI_API_KEY__';
const BATCH_LIMIT  = 15;
const MODEL        = 'gemini-2.0-flash';

const sbHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
};

// 1) Pending predictions çek (yorumu olmayan + SCHEDULED + 7 gün içinde)
const now = new Date();
const weekLater = new Date(now.getTime() + 7 * 86400000);

const predUrl = `${SUPABASE_URL}/rest/v1/predictions` +
  `?select=fixture_id,predicted_score,prob_home_win,prob_draw,prob_away_win,prob_over_25,confidence` +
  `&ai_comment=is.null` +
  `&order=computed_at.desc` +
  `&limit=${BATCH_LIMIT * 4}`;   // overshoot, sonra status filter

const predResp = await fetch(predUrl, { headers: sbHeaders });
const preds = await predResp.json();

if (!Array.isArray(preds) || preds.length === 0) {
  return [{ json: { updated: 0, message: 'Yorum gerektiren tahmin yok' } }];
}

// 2) Fixture + team detaylarını batch çek
const fixIds = preds.map(p => p.fixture_id);
const fixUrl = `${SUPABASE_URL}/rest/v1/fixtures?select=*&id=in.(${fixIds.join(',')})&status=eq.SCHEDULED`;
const fixResp = await fetch(fixUrl, { headers: sbHeaders });
const fixtures = await fixResp.json();

const fixMap = new Map(fixtures.map(f => [f.id, f]));
const usable = preds.filter(p => fixMap.has(p.fixture_id)).slice(0, BATCH_LIMIT);

if (usable.length === 0) {
  return [{ json: { updated: 0, message: 'SCHEDULED maç yok' } }];
}

const teamIds  = Array.from(new Set(usable.flatMap(p => {
  const f = fixMap.get(p.fixture_id);
  return f ? [f.home_team_id, f.away_team_id] : [];
})));
const leagueIds = Array.from(new Set(usable.map(p => fixMap.get(p.fixture_id).league_id)));

const teamUrl = `${SUPABASE_URL}/rest/v1/teams?select=id,name&id=in.(${teamIds.join(',')})`;
const leagueUrl = `${SUPABASE_URL}/rest/v1/leagues?select=id,name&id=in.(${leagueIds.join(',')})`;
const statsUrl = `${SUPABASE_URL}/rest/v1/team_stats?select=team_id,form,matches_played,goals_scored_avg&team_id=in.(${teamIds.join(',')})`;

const [teamsRes, leaguesRes, statsRes] = await Promise.all([
  fetch(teamUrl, { headers: sbHeaders }).then(r => r.json()),
  fetch(leagueUrl, { headers: sbHeaders }).then(r => r.json()),
  fetch(statsUrl, { headers: sbHeaders }).then(r => r.json()),
]);

const teamMap   = new Map(teamsRes.map(t => [t.id, t.name]));
const leagueMap = new Map(leaguesRes.map(l => [l.id, l.name]));
const statsMap  = new Map(statsRes.map(s => [s.team_id, s]));

// 3) Her maç için Gemini'ye sor + Supabase'i güncelle
const updates = [];
const errors = [];

for (const p of usable) {
  const f = fixMap.get(p.fixture_id);
  const home = teamMap.get(f.home_team_id) || 'Ev';
  const away = teamMap.get(f.away_team_id) || 'Deplasman';
  const lig = leagueMap.get(f.league_id) || '';
  const hStats = statsMap.get(f.home_team_id);
  const aStats = statsMap.get(f.away_team_id);

  const prompt = `Aşağıdaki futbol maçı için 1-2 cümlelik kısa, profesyonel Türkçe yorum yaz.
Sadece düz metin (max 250 karakter). Markdown yok, emoji yok, başlık yok.
Garantili kazanç vaat etme, "muhtemelen" / "modele göre" gibi ifadeler kullan.

Lig: ${lig}
Ev sahibi: ${home} (form ${hStats?.form || '?'}, ${hStats?.matches_played || 0} maç, atılan gol ort ${hStats?.goals_scored_avg || '?'})
Deplasman: ${away} (form ${aStats?.form || '?'}, ${aStats?.matches_played || 0} maç, atılan gol ort ${aStats?.goals_scored_avg || '?'})
Tahmini skor: ${p.predicted_score}
1X2 olasılıkları: 1=${(p.prob_home_win*100).toFixed(0)}% X=${(p.prob_draw*100).toFixed(0)}% 2=${(p.prob_away_win*100).toFixed(0)}%
Üst 2.5: ${(p.prob_over_25*100).toFixed(0)}%
Güven: ${p.confidence}

Yorum:`;

  try {
    const aiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 120,
            temperature: 0.5,
          },
        }),
      }
    );

    if (!aiResp.ok) {
      errors.push({ fixture_id: p.fixture_id, status: aiResp.status });
      continue;
    }

    const aiData = await aiResp.json();
    const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      errors.push({ fixture_id: p.fixture_id, reason: 'empty' });
      continue;
    }

    updates.push({
      fixture_id: p.fixture_id,
      ai_comment: text.slice(0, 500),
      ai_generated_at: new Date().toISOString(),
    });
  } catch (e) {
    errors.push({ fixture_id: p.fixture_id, error: String(e).slice(0, 80) });
  }
}

// 4) Supabase'e bulk upsert
if (updates.length > 0) {
  const upsertResp = await fetch(
    `${SUPABASE_URL}/rest/v1/predictions?on_conflict=fixture_id`,
    {
      method: 'POST',
      headers: {
        ...sbHeaders,
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(updates),
    }
  );
  if (!upsertResp.ok) {
    return [{ json: {
      generated: updates.length,
      saved: 0,
      error: 'upsert failed',
      status: upsertResp.status,
      body: (await upsertResp.text()).slice(0, 200),
    }}];
  }
}

return [{ json: {
  candidates: usable.length,
  generated: updates.length,
  errors: errors.length,
  errorSamples: errors.slice(0, 3),
}}];
