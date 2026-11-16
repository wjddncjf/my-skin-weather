import assert from 'node:assert/strict';
import { test } from 'node:test';
import { functionalIngredients } from '../dist/ingredients.mjs';
import { evaluateFunctionalCare, functionalProfile, functionalUsage } from '../dist/functional-care.mjs';
import { mergePersonalBackup } from '../dist/personal-backup.mjs';
import { buildRoutine } from '../dist/routine.mjs';
import { irritationHistory, weeklyReport } from '../dist/skin-insights.mjs';
import { dayKey, fetchWeather } from '../dist/weather.mjs';

const day = '2026-11-16';
const earlier = '2026-11-12';
const skin = { sensitivity: 1, dryness: 2, oiliness: 2, redness: '없음' };
const settings = { schedule: 'alternate', adaptation: 'stable', directions: true };
const serum = { id: 'one', brand: '시험용', name: '세럼', type: '세럼', ingredients: 'Retinal (0.05%)',
  purposes: ['피부결 관리'], functionalCare: settings };
const cream = { id: 'cream', brand: '시험용', name: '보습크림', type: '크림', ingredients: 'glycerin, niacinamide',
  purposes: ['보습'] };
const sun = { id: 'sun', brand: '시험용', name: '선크림', type: '선크림', purposes: ['자외선 차단'] };
const used = product => ({ id: product.id, name: product.name });
const usage = (...products) => ({ sessions: { evening: { used: products.map(used) } } });
const journal = { [earlier]: usage(serum) };
const context = { day, period: 'evening', skin, interests: ['피부결 관리'], journal, flagged: new Set() };
const result = (product = serum, changes = {}) => evaluateFunctionalCare([product], { ...context, ...changes })[0];

test('한영 성분과 형태, 명시 농도, 여러 계열, 제품명과 전성분 불일치', () => {
  const entries = functionalIngredients('Retinol, 레티날데히드 (0.05%), L-Ascorbic Acid 10%, Ascorbyl Glucoside, 젖산, 살리실산, Nicotinamide');
  assert.deepEqual(entries.map(entry => entry.family), ['레티노이드', '레티노이드', '비타민 C', '비타민 C', 'AHA', 'BHA', '기타']);
  assert.deepEqual(entries.map(entry => entry.form).slice(0, 4), ['레티놀', '레티날', '순수형', '유도체']);
  assert.equal(entries[1].concentration, '0.05%');
  assert.equal(entries[3].concentration, undefined);
  assert.equal(functionalProfile({ ...cream, name: '레티놀', ingredients: '정제수' }).show, false);
  assert.equal(result({ ...serum, ingredients: '' }).status, 'conditional');
  assert.equal(functionalProfile({ ...serum, type: '클렌저' }).separate, false);
});

test('안정, 첫 사용, 아침, 미표기 농도, 현재 자극, 이력, 중단', () => {
  assert.equal(result().status, 'candidate');
  assert.equal(result(serum, { journal: {} }).status, 'conditional');
  assert.equal(result(serum, { period: 'morning' }).status, 'conditional');
  assert.equal(result({ ...serum, ingredients: '레티날' }).status, 'conditional');
  assert.equal(result(serum, { skin: { ...skin, stinging: '있음' } }).status, 'hold');
  assert.equal(result(serum, { skin: { ...skin, sensitivity: 5, redness: '있음' } }).status, 'hold');
  assert.equal(result(serum, { flagged: new Set([serum.id]) }).status, 'hold');
  assert.equal(result({ ...serum, functionalCare: { adaptation: 'stopped' } }).status, 'hold');
  assert.equal(result({ ...serum, functionalCare: {} }).status, 'interval');
  assert.equal(result(serum, { interests: [] }).status, 'conditional');
});

test('사용 간격, 동일 계열, 레티노이드와 각질 관리 조합', () => {
  const retinol = { ...serum, id: 'retinol', ingredients: 'Retinol 0.1%' };
  const acid = { ...serum, id: 'acid', ingredients: 'Glycolic Acid 5%' };
  assert.equal(result(serum, { journal: { '2026-11-15': usage(serum) } }).status, 'interval');
  const getCards = changes => evaluateFunctionalCare([serum, retinol, acid], { ...context, ...changes });
  assert.equal(getCards({ journal: { ...journal, '2026-11-15': usage(retinol) } })[0].status, 'interval');
  assert.equal(getCards({ journal: { ...journal, [day]: usage(acid) } })[0].status, 'conditional');
  assert.equal(getCards({ journal: { [earlier]: usage(serum, retinol, acid) } })
    .filter(card => card.status === 'candidate').length, 1);
  assert.equal(result({ ...serum, functionalCare: { ...settings, schedule: 'weekly' } }).status, 'interval');
  assert.equal(result({ ...serum, functionalCare: { ...settings, schedule: 'custom', days: 5 } }).status, 'interval');
});

test('기본 보습·자외선 차단, 날씨 없이 루틴, 중단 반영', () => {
  const products = [cream, sun, serum];
  const morning = buildRoutine(skin, products, null);
  assert.deepEqual(morning.routine.map(step => step.pick?.product.id), [undefined, undefined, undefined, 'cream', 'sun']);
  assert.equal(buildRoutine(skin, products, null, { evening: true }).routine.length, 4);
  assert.equal(buildRoutine(skin, [{ ...cream, functionalCare: { adaptation: 'stopped' } }], null).routine[3].pick, undefined);
});

test('사용 스냅샷, 반응, 리포트 및 버전 1 백업 호환', () => {
  const reaction = { usedDay: earlier, used: [used(serum)], signs: ['따가움'], changes: {}, note: '', productId: '' };
  const current = { products: [cream], journal: { [day]: { skin } } };
  const dated = { [earlier]: { ...journal[earlier], sessions: {
    evening: { used: [{ ...used(serum), families: ['레티노이드'], rinse: false }] }
  } }, '2026-11-13': { reactions: { evening: reaction }, careConcerns: ['피부결 관리'] } };
  const restored = mergePersonalBackup(current, { version: 1, data: { products: [serum], journal: dated } });
  assert.equal(restored.products[1].functionalCare.schedule, 'alternate');
  assert.deepEqual(restored.journal[day].skin, skin);
  assert.deepEqual(functionalUsage(restored.journal, [])[0].families, ['레티노이드']);
  assert.equal(irritationHistory(restored.journal).has(serum.id), true);
  assert.equal(weeklyReport(restored.journal, day).current.days, 1);
  assert.throws(() => mergePersonalBackup(current, { version: 1, data: {
    products: [{ ...serum, functionalCare: { schedule: 'custom', days: 0 } }], journal: {}
  } }));
});

test('공개 날씨 KST, 실패 분류 및 정상 응답 복구 (모의 응답)', async () => {
  assert.equal(dayKey(new Date('2026-11-15T15:00:00Z')), day);
  const originalFetch = globalThis.fetch;
  const connection = Object.getOwnPropertyDescriptor(globalThis.navigator, 'onLine');
  Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true });
  try {
    for (const [code, expected] of [[401, 'denied'], [403, 'denied'], [429, 'limited']]) {
      globalThis.fetch = async () => new Response(null, { status: code });
      await assert.rejects(fetchWeather(), { code: expected });
    }
    globalThis.fetch = async () => Response.json({});
    await assert.rejects(fetchWeather(), { code: 'schema' });
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: false });
    await assert.rejects(fetchWeather(), { code: 'offline' });
    Object.defineProperty(globalThis.navigator, 'onLine', { configurable: true, value: true });
    const realSetTimeout = globalThis.setTimeout;
    try {
      globalThis.setTimeout = callback => realSetTimeout(callback, 0);
      globalThis.fetch = async (_url, options) => new Promise((_, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason));
      });
      await assert.rejects(fetchWeather(), { code: 'timeout' });
    } finally {
      globalThis.setTimeout = realSetTimeout;
    }
    globalThis.fetch = async () => Response.json({ current: { time: Math.floor(Date.now() / 1000), relative_humidity_2m: 42 },
      current_units: { relative_humidity_2m: '%' } });
    assert.equal((await fetchWeather()).humidity, 42);
  } finally {
    globalThis.fetch = originalFetch;
    if (connection) Object.defineProperty(globalThis.navigator, 'onLine', connection);
    else delete globalThis.navigator.onLine;
  }
});
