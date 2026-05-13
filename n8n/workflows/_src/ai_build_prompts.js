// Get Pending With Context output → 15 ayrı item (her biri Gemini için 1 prompt)
// Aggregate sonrası tek bir item içinde { data: [...] } yapısında gelir.
const items = $input.all();
let rows = [];
if (items.length === 1 && Array.isArray(items[0].json?.data)) {
  rows = items[0].json.data;
} else if (items.length === 1 && Array.isArray(items[0].json)) {
  rows = items[0].json;
} else {
  rows = items.map(i => i.json);
}

const out = [];
for (const r of rows) {
  if (!r || !r.fixture_id) continue;
  const f = r.fixture || {};
  const home = f.home_team?.name || 'Ev sahibi';
  const away = f.away_team?.name || 'Deplasman';
  const lig  = f.league?.name || '';

  const prompt = `Aşağıdaki futbol maçı için 1-2 cümlelik kısa, profesyonel Türkçe yorum yaz.
Sadece düz metin (max 250 karakter). Markdown yok, emoji yok, başlık yok.
"Muhtemelen", "modele göre" gibi temkinli ifadeler kullan, garantili kazanç vaat etme.

Lig: ${lig}
Ev sahibi: ${home}
Deplasman: ${away}
Tahmini skor: ${r.predicted_score}
1X2 olasılıkları: 1=%${(r.prob_home_win*100).toFixed(0)} X=%${(r.prob_draw*100).toFixed(0)} 2=%${(r.prob_away_win*100).toFixed(0)}
Üst 2.5: %${(r.prob_over_25*100).toFixed(0)}
Güven: ${r.confidence}

Yorum:`;

  out.push({
    json: {
      fixture_id: r.fixture_id,
      prompt,
      // Pre-built Gemini API body
      // Gemini 2.5 Flash bir "thinking" model — thinkingBudget: 0 ile internal düşünme kapatılır
      // (yoksa output token'ların çoğu thinking'e gider, cevaba 1-2 kelime kalır)
      geminiBody: {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 350,
          temperature: 0.5,
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
    },
  });
}

return out;
