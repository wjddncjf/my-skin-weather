import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { citySourceUrl, dayKey, normalize, previousDay } from '../dist/weather.mjs';

const directory = new URL('../dist/evidence/', import.meta.url);
await mkdir(directory, { recursive: true });
const days = (await readdir(directory)).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name))
  .map(name => name.slice(0, -5)).sort();
const today = dayKey(new Date());
if (days.length >= 2 || (days.length === 1 && days[0] !== previousDay(today))) {
  throw new Error('공개 검증 기록은 연속된 두 KST 날짜에 한 번씩 수집합니다.');
}

const url = citySourceUrl('daejeon');
const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
if (!response.ok) throw new Error('Open-Meteo HTTP ' + response.status);
const raw = await response.text();
const record = normalize(JSON.parse(raw), new Date(), url);

if (days.length === 1 && days[0] !== previousDay(record.day)) throw new Error('조회 중 KST 날짜가 변경됐습니다.');
await writeFile(new URL(record.day + '.json', directory),
  JSON.stringify({ record, raw: JSON.parse(raw) }, null, 2) + '\n', { flag: 'wx' });
await writeFile(new URL('index.json', directory), JSON.stringify([...days, record.day], null, 2) + '\n');
console.log(record);
