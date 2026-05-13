// Son 30 gün için ayrı tarih item'ları üret (api-sports.io single-date endpoint için)
const today = new Date();
const items = [];
for (let i = 30; i >= 1; i--) {
  const d = new Date(today.getTime() - i * 86400000);
  items.push({ json: { date: d.toISOString().slice(0, 10) } });
}
return items;
