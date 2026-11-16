import { previousDay } from './weather.mjs';

export const periods = ['morning', 'evening'];
export const metrics = [['sensitivity', '민감도'], ['dryness', '건조함'], ['oiliness', '유분감']];

export function offsetDay(day, amount) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function dailyRecords(journal, start, end) {
  const rows = [];
  for (let day = start; day <= end; day = offsetDay(day, 1)) {
    const entry = journal[day];
    const sessions = periods.map(period => entry?.sessions?.[period]);
    const skins = [sessions[0]?.skin ?? entry?.skin, sessions[1]?.skin].filter(Boolean);
    const average = key => {
      const values = skins.map(skin => skin[key]).filter(value => Number.isFinite(value) && value >= 1 && value <= 5);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
    };
    const redness = skins.some(skin => skin.redness === '있음') ? true :
      skins.some(skin => skin.redness === '없음') ? false : null;
    rows.push({
      day, recorded: skins.length > 0, redness, ...Object.fromEntries(metrics.map(([key]) => [key, average(key)])),
      weather: entry?.weather, city: entry?.city, used: sessions.flatMap(session => session?.used ?? []),
      completed: sessions.filter(session => session?.complete).length,
      reactions: Object.values(entry?.reactions ?? {})
    });
  }
  return rows;
}

export function weeklyReport(journal, today) {
  const weekday = new Date(today + 'T00:00:00Z').getUTCDay();
  const monday = offsetDay(today, -((weekday + 6) % 7));
  function summarize(rows) {
    const used = new Map();
    for (const row of rows) for (const product of row.used) {
      const previous = used.get(product.id);
      used.set(product.id, { name: product.name, count: (previous?.count ?? 0) + 1 });
    }
    const average = key => {
      const values = rows.map(row => row[key]).filter(Number.isFinite);
      return { count: values.length, value: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null };
    };
    return { days: rows.filter(row => row.recorded).length, dry: average('dryness'), sensitive: average('sensitivity'),
      redness: rows.filter(row => row.redness).length,
      completed: rows.reduce((sum, row) => sum + row.completed, 0),
      reactions: rows.flatMap(row => row.reactions).flatMap(reaction => reaction.signs),
      frequent: [...used.values()].sort((a, b) => b.count - a.count)[0] };
  }
  return { monday, lastStart: offsetDay(monday, -7), lastEnd: previousDay(monday),
    current: summarize(dailyRecords(journal, monday, today)),
    previous: summarize(dailyRecords(journal, offsetDay(monday, -7), previousDay(monday))) };
}

export function irritationHistory(journal) {
  const history = new Map();
  for (const [observed, entry] of Object.entries(journal)) {
    for (const reaction of Object.values(entry.reactions ?? {})) {
      if (!reaction.signs.some(sign => sign === '따가움' || sign === '붉어짐') && reaction.changes.redness !== '증가') continue;
      const id = reaction.productId || (reaction.used.length === 1 ? reaction.used[0].id : '');
      if (!id) continue;
      if (!history.has(id)) history.set(id, []);
      history.get(id).push({ observed, usedDay: reaction.usedDay });
    }
  }
  return history;
}
