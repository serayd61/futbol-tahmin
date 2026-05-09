// Bugün ve +7 gün için ISO tarihler üret
const today = new Date();
const week = new Date(today.getTime() + 7 * 86400000);
const fmt = d => d.toISOString().slice(0, 10);
return [{ json: {
  dateFrom: fmt(today),
  dateTo: fmt(week),
  todayDate: fmt(today)
}}];
