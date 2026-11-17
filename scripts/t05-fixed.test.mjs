import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFunctionalCare } from '../dist/functional-care.mjs';

const baseProduct = {
  id: 't05-test',
  brand: '시험용',
  name: '테스트 레티날',
  type: '세럼',
  ingredients: 'Retinal (0.05%)',
  purposes: ['피부결 관리']
};

function check({
  lastUsedDay = null,
  schedule = 'alternate',
  days,
  day = '2026-11-17',
  adaptation = 'stable'
} = {}) {
  const product = {
    ...baseProduct,
    functionalCare: {
      schedule,
      days,
      adaptation,
      directions: true
    }
  };

  const journal = lastUsedDay ? {
    [lastUsedDay]: {
      sessions: {
        evening: {
          used: [{ id: product.id, name: product.name }]
        }
      }
    }
  } : {};

  return evaluateFunctionalCare([product], {
    day,
    period: 'evening',
    skin: {
      sensitivity: 1,
      dryness: 2,
      oiliness: 2,
      redness: '없음'
    },
    interests: ['피부결 관리'],
    journal,
    flagged: new Set()
  })[0];
}

test('T05-01 격일', () => {
  const card = check({ lastUsedDay: '2026-11-16' });
  assert.equal(card.nextCheck?.date, '2026-11-18');
});

test('T05-02 직접 지정 3일', () => {
  const card = check({
    lastUsedDay: '2026-11-16',
    schedule: 'custom',
    days: 3
  });
  assert.equal(card.nextCheck?.date, '2026-11-19');
});

test('T05-03 매일', () => {
  const card = check({
    lastUsedDay: '2026-11-16',
    schedule: 'daily'
  });
  assert.equal(card.nextCheck?.date, '2026-11-17');
});

test('T05-04 주 1회', () => {
  const card = check({
    lastUsedDay: '2026-11-16',
    schedule: 'weekly'
  });
  assert.equal(card.nextCheck?.date, '2026-11-23');
});

test('T05-05 월 경계', () => {
  const card = check({
    lastUsedDay: '2026-11-30',
    day: '2026-12-01'
  });
  assert.equal(card.nextCheck?.date, '2026-12-02');
});

test('T05-06 연도 경계', () => {
  const card = check({
    lastUsedDay: '2026-12-30',
    day: '2027-01-01',
    schedule: 'custom',
    days: 3
  });
  assert.equal(card.nextCheck?.date, '2027-01-02');
});

test('T05-07 사용 기록 없음', () => {
  const card = check();
  assert.equal(card.nextCheck?.date, null);
  assert.match(card.nextCheck?.message ?? '', /사용 기록 없음/);
});

test('T05-08 잘못된 간격 0일', () => {
  const card = check({
    lastUsedDay: '2026-11-16',
    schedule: 'custom',
    days: 0
  });
  assert.equal(card.nextCheck?.date, null);
  assert.match(card.nextCheck?.message ?? '', /잘못된 설정/);
});

test('T05-09 주 2회', () => {
  const card = check({
    lastUsedDay: '2026-11-16',
    schedule: 'twice'
  });
  assert.equal(card.nextCheck?.date, null);
  assert.match(card.nextCheck?.message ?? '', /주 2회/);
});

test('T05-10 사용 중단', () => {
  const card = check({
    lastUsedDay: '2026-11-16',
    adaptation: 'stopped'
  });
  assert.equal(card.status, 'hold');
  assert.match(card.nextCheck?.message ?? '', /사용 보류/);
  assert.doesNotMatch(card.nextCheck?.message ?? '', /사용 가능/);
});
