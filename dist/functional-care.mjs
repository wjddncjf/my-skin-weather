import { functionalIngredients } from './ingredients.mjs';

export const schedules = {
  weekly: '주 1회', twice: '주 2회', thrice: '주 3회',
  alternate: '격일', daily: '매일', custom: '직접 간격 지정'
};
export const adaptations = { new: '처음 사용', adapting: '적응 중', stable: '안정적으로 사용 중', stopped: '사용 중단' };
export const concerns = ['건조함', '유분감', '민감도', '붉은기', '여드름', '피부결 관리', '피부톤 관리'];
export const statuses = {
  hold: '사용 보류', interval: '사용 간격 확인', conditional: '조건부 제안', candidate: '오늘의 집중 관리 후보'
};

const trackedFamilies = new Set(['레티노이드', 'AHA', 'BHA']);
const weeklyLimits = { weekly: 1, twice: 2, thrice: 3 };
const intervals = { alternate: 2, daily: 1 };
const elapsed = (day, earlier) => (Date.parse(day) - Date.parse(earlier)) / 86400000;
const purposesOf = product => product.purposes ?? (product.purpose ? [product.purpose] : []);

export function functionalProfile(product, ingredients = functionalIngredients(product.ingredients)) {
  const settings = product.functionalCare ?? {};
  const rinse = settings.contact === 'rinse' || (!settings.contact && product.type === '클렌저');
  const families = [...new Set(ingredients.map(entry => entry.family))];
  const tracked = families.filter(family => trackedFamilies.has(family));
  const targeted = product.active || purposesOf(product).some(purpose => ['피부결 관리', '피부톤 관리'].includes(purpose));
  // Support ingredients can also occur in everyday moisturizers and sunscreen.
  const separate = !rinse && (targeted || tracked.length > 0 || ingredients.some(entry => entry.form === '순수형'));
  const nameHint = !product.ingredients?.trim() && /레티놀|레티날|retinol|retinal|비타민[ ]?c|vitamin[ ]?c|\b(?:aha|bha)\b/i.test(product.name);
  return { settings, ingredients, families, tracked, rinse, separate, show: ingredients.length > 0 || targeted || nameHint };
}

export function functionalUsage(journal, products) {
  const profiles = new Map(products.map(product => [product.id, functionalProfile(product)]));
  return Object.entries(journal).flatMap(([day, entry]) =>
    Object.entries(entry.sessions ?? {}).flatMap(([period, session]) =>
      (session.used ?? []).map(used => ({
        ...used, day, period,
        families: used.families ?? profiles.get(used.id)?.families ?? [],
        rinse: used.rinse ?? profiles.get(used.id)?.rinse ?? false
      })))).sort((a, b) => b.day.localeCompare(a.day));
}

function relevantConcerns(skin, interests) {
  const matched = new Set(interests ?? []);
  if (skin?.dryness >= 4) matched.add('건조함');
  if (skin?.oiliness >= 4) matched.add('유분감');
  if (skin?.sensitivity >= 4) matched.add('민감도');
  if (skin?.redness === '있음') matched.add('붉은기');
  if (skin?.acne === '있음') matched.add('여드름');
  return matched;
}

function matchesPurpose(product, relevant) {
  const matches = {
    '보습': ['건조함'], '수분 공급': ['건조함'], '진정': ['민감도', '붉은기'],
    '유분 관리': ['유분감'], '피부결 관리': ['피부결 관리'], '피부톤 관리': ['피부톤 관리'], '여드름 관리': ['여드름']
  };
  return [...new Set(purposesOf(product).flatMap(purpose => matches[purpose] ?? []))].filter(concern => relevant.has(concern));
}

function combination(profile, families) {
  return profile.tracked.length > 0 && families.some(family => trackedFamilies.has(family));
}

export function evaluateFunctionalCare(products, { day, period, skin, interests, journal, flagged, excluded = new Set(), routineProducts = [] }) {
  const use = functionalUsage(journal, products).filter(entry => entry.day <= day);
  const concernsToday = relevantConcerns(skin, interests);
  const observations = Object.values(journal[day]?.reactions ?? {});
  const irritated = skin?.stinging === '있음' || skin?.redness === '있음' || skin?.sensitivity >= 4 ||
    observations.some(reaction => reaction.signs.some(sign => ['따가움', '붉어짐'].includes(sign)) || reaction.changes.redness === '증가');
  const stable = skin?.redness === '없음' && [1, 2].includes(skin.sensitivity) && [1, 2, 3].includes(skin.dryness);
  const recordedReactions = Object.keys(journal).filter(date => date <= day).sort().reverse()
    .flatMap(date => Object.values(journal[date].reactions ?? {}).map(reaction => ({ ...reaction, date })));
  const cards = [];
  let selectedTracked = false;
  for (const product of products) {
    const profile = functionalProfile(product);
    if (!profile.show) continue;
    const { settings, ingredients, families, tracked, rinse } = profile;
    const own = use.filter(entry => entry.id === product.id);
    const related = use.filter(entry => !rinse && !entry.rinse && entry.id !== product.id && entry.families.some(family => tracked.includes(family)));
    const last = own[0]?.day;
    const first = own.at(-1)?.day;
    const conflict = !rinse && (use.some(entry => entry.day === day && entry.id !== product.id && !entry.rinse && combination(profile, entry.families)) ||
      routineProducts.some(item => item.id !== product.id && !functionalProfile(item).rinse && combination(profile, functionalProfile(item).families)));
    const matches = matchesPurpose(product, concernsToday);
    const history = flagged.has(product.id) || product.reaction === 'irritated';
    const lastReaction = recordedReactions.find(reaction => reaction.used.some(entry => entry.id === product.id));
    const preferredPeriod = settings.period || (families.includes('레티노이드') && !rinse ? 'evening' : '');
    const days = settings.schedule === 'custom' ? settings.days : intervals[settings.schedule];
    const weekly = weeklyLimits[settings.schedule];
    const recentDates = new Set(own.filter(entry => elapsed(day, entry.day) < 7).map(entry => entry.day));
    const relatedDates = new Set(related.filter(entry => elapsed(day, entry.day) < 7).map(entry => entry.day));
    const hasRecentFamily = related.some(entry => elapsed(day, entry.day) < (days ?? 1)) ||
      (weekly && relatedDates.size > 0 && new Set([...recentDates, ...relatedDates]).size >= weekly);
    let status = 'conditional';
    let reason;
    if (product.useStatus === 'paused' || settings.adaptation === 'stopped' || product.caution === 'hold') {
      status = 'hold'; reason = '제품의 사용 중단 또는 주의 설정을 확인해 주세요.';
    } else if (irritated || history) {
      status = 'hold'; reason = history ? '이 제품과 연결된 불편 반응 기록이 있어요. 함께 쓴 다른 제품도 확인해 주세요.' :
        '오늘 피부에 민감함이나 자극이 기록됐어요. 평소 잘 맞는 보습 위주로 관리해 보세요.';
    } else if (excluded.has(product.id)) {
      status = 'hold'; reason = '피하고 싶은 성분이나 민감할 때 확인할 성분을 확인해 주세요.';
    } else if (!ingredients.length) {
      reason = '전성분에서 계열을 확인할 정보가 부족해요. 제품 안내와 전성분을 확인해 주세요.';
    } else if (own.some(entry => entry.day === day) || (last && elapsed(day, last) < (days ?? 1)) ||
        (weekly && recentDates.size >= weekly) || hasRecentFamily) {
      status = 'interval'; reason = '최근 같은 제품 또는 같은 계열의 사용 기록이 있어요. 설정한 주기와 제품 안내를 확인해 주세요.';
    } else if (!stable) {
      reason = '현재 시간대의 피부 상태가 편안한지 확인할 기록이 부족해요.';
    } else if (preferredPeriod && preferredPeriod !== period) {
      reason = (preferredPeriod === 'evening' ? '저녁' : '아침') + '에 제품 사용 안내를 확인해 주세요.';
    } else if (conflict || (!rinse && selectedTracked && tracked.length)) {
      reason = '오늘 기록했거나 제안된 집중 관리 제품과 자극이 겹칠 수 있어요. 함께 쓰기 전에 제품 안내와 기존 반응을 확인해 주세요.';
    } else if (!settings.schedule && own.length) {
      status = 'interval'; reason = '사용 주기가 미설정이에요. 제품 안내에 따라 주기를 설정하면 실제 기록과 비교할 수 있어요.';
    } else if (!last || settings.adaptation !== 'stable' || !settings.directions || !settings.schedule) {
      reason = '사용 기록, 적응 상태, 사용 주기 또는 제품 안내 확인이 부족해요.';
    } else if (!rinse && (tracked.length || ingredients.some(entry => entry.form === '순수형')) && ingredients.some(entry => !entry.concentration)) {
      reason = '기록된 전성분에 모든 해당 성분의 농도가 표시되어 있지 않아요. 제품 사용 안내를 우선 확인해 주세요.';
    } else if (!matches.length || !profile.separate) {
      reason = profile.separate ? '오늘 기록한 고민과 제품에 등록된 사용 목적의 연결을 확인해 주세요.' :
        '일상 루틴에서 평가하는 제품이에요. 표기된 성분과 제품 사용 안내를 참고하세요.';
    } else {
      status = 'candidate'; reason = '현재 피부 기록과 설정한 주기를 확인했어요. ' + matches.join('·') + ' 목적의 선택 후보예요.';
      selectedTracked ||= tracked.length > 0;
    }
    cards.push({ product, ...profile, status, reason, last, first, recentCount: recentDates.size,
      relatedLast: related[0], history, conflict, lastReaction });
  }
  return cards;
}
