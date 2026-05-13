// Gemini her item için cevap döndü. Şimdi parse + tek bir update payload oluştur.
// Multi-input (her biri 1 fixture_id + Gemini response) → 1 output (array içinde updates).
const items = $input.all();
const promptItems = $('Build Prompts').all();   // her birinde fixture_id var

const updates = [];
const now = new Date().toISOString();

for (let i = 0; i < items.length; i++) {
  const aiData = items[i].json;
  const fixtureId = promptItems[i]?.json?.fixture_id;
  if (!fixtureId) continue;

  // Gemini response yapısı: { candidates: [{ content: { parts: [{ text: "..." }] } }] }
  const text = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) continue;

  updates.push({
    fixture_id: fixtureId,
    ai_comment: text.slice(0, 500),
    ai_generated_at: now,
  });
}

return [{
  json: {
    updates,
    count: updates.length,
  },
}];
