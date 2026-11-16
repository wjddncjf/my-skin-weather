import { functionalProfile } from './functional-care.mjs';
import { analyzeIngredients, ingredientDetails } from './ingredients.mjs?view=ingredient-details';

export const skinFields = [
  ['sensitivity', '민감도'], ['dryness', '건조함'], ['oiliness', '유분감'], ['redness', '붉은기']
];

export function productPurposes(product) {
  return product.purposes ?? (product.purpose ? [product.purpose] : []);
}

const steps = ['클렌징', '토너', '앰플·세럼', '보습크림', '선크림', '기타'];
const stepByType = new Map([
  ['클렌저', 0], ['토너', 1], ['앰플', 2], ['세럼', 2], ['크림', 3], ['로션', 3], ['선크림', 4]
]);
const moistureLevels = ['가벼움', '보통', '풍부함'];

function cleansingPreference(skin, weather) {
  if (skin.cleansingContext === '선크림·메이크업 사용') {
    return { type: '1차 세안제', reason: '선크림이나 메이크업을 사용했다고 기록해 1차 세안제를 골랐어요.' };
  }
  if (skin.cleansingContext === '맨얼굴' && weather?.temperature >= 25 && skin.oiliness >= 4) {
    return { type: '약알칼리성', reason: '맨얼굴 · ' + weather.temperature + '°C · 유분감 ' + skin.oiliness + '/5라 약알칼리성 제품을 우선했어요.' };
  }
  if (skin.cleansingContext === '아침 세안' || skin.cleansingContext === '맨얼굴') {
    return { type: '약산성', reason: skin.cleansingContext + ' 상황에 맞춰 약산성 제품을 골랐어요.' };
  }
  return null;
}

export function suggest(skin = {}, products, weather, { environment, outingUv, flagged = new Set() } = {}) {
  const reactive = skin.sensitivity >= 4 || skin.redness === '있음';
  const analyzed = products.filter(product => product.useStatus !== 'paused' && product.functionalCare?.adaptation !== 'stopped').map(product => {
    const matches = new Map(analyzeIngredients(product.ingredients).map(group => [group.label, group.ingredients]));
    const key = name => name.normalize('NFKC').toLowerCase().replace(/[\s.-]/g, '');
    const entries = ingredientDetails(product.ingredients);
    const names = new Set(entries.flatMap(({ input, name }) => [
      key(input.replace(/\s*\d+(?:\.\d+)?\s*(?:%|ppm)\s*$/i, '')), ...(name ? [key(name)] : [])
    ]));
    const avoided = ingredientDetails(product.avoidIngredients).filter(({ input, name }) => names.has(key(name ?? input)));
    const review = matches.get('민감한 날 확인할 성분') ?? [];
    const history = flagged.has(product.id) || product.reaction === 'irritated';
    const cautionHeld = product.caution === 'hold' || (history && (product.caution !== 'resume' || !isComfortable(skin)));
    const functional = functionalProfile(product).separate;
    const excluded = cautionHeld || avoided.length > 0 || (reactive && (functional || review.length > 0));
    return { product, history, matches, review, excluded, avoided, functional, hasIngredients: entries.length > 0 };
  });
  const caution = analyzed.filter(({ excluded }) => excluded).map(({ product, review, avoided, functional }) => {
    const reasons = [
      product.caution === 'hold' && '사용자가 주의 제품으로 지정함',
      flagged.has(product.id) && '사용 후 따가움 또는 붉은기 관찰 기록',
      product.reaction === 'irritated' && '따갑거나 붉어졌다고 기록함',
      avoided.length > 0 && '피하고 싶은 성분 ' + avoided.map(({ input }) => input).join(', '),
      reactive && review.length > 0 && '민감한 날 확인할 성분 ' + review.join(', '),
      reactive && functional && '자극 주의 표시 또는 피부결 관리 제품'
    ].filter(Boolean);
    return product.brand + ' ' + product.name + ' 제외 (' + reasons.join(' · ') + ')';
  }).join(' / ');
  const priorities = new Map([
    ['보습', [50, '평소 보습에 쓰는 제품을 기본 루틴으로 제안해요.']],
    ['자외선 차단', [40, '낮에 외출할 때 쓸 수 있는 보유 자외선 차단 제품이에요.']],
    ['세정', [30, '세정 목적으로 등록한 제품이에요. 세안 상황을 선택하면 더 구체적으로 제안할 수 있어요.']]
  ]);
  if (weather?.uv >= 3) priorities.set('자외선 차단', [100, '자외선 지수 ' + weather.uv + ' · 낮에 외출할 때 자외선 차단을 우선 고려해 보세요.']);
  const sunAdvice = {
    '외출하지 않음': '실내에서도 창가에 오래 머무는 등 햇빛 노출이 있다면 자외선 차단을 고려하세요.',
    '실내 활동 위주': '이동 중이나 창가에서 햇빛을 받는 시간에 맞춰 자외선 차단을 고려하세요.',
    '야외 활동 위주': '야외 활동 시간의 햇빛 노출을 고려해 자외선 차단을 준비하세요.'
  }[environment];
  if (sunAdvice || Number.isFinite(outingUv)) {
    const forecastAdvice = Number.isFinite(outingUv) ? '외출 예정 시간대 예보 UV ' + outingUv + ' · ' : '';
    priorities.set('자외선 차단', [environment === '야외 활동 위주' || outingUv >= 3 ? 100 : 40,
      forecastAdvice + (sunAdvice ?? '햇빛 노출에 맞춰 자외선 차단을 고려하세요.')]);
  }
  if (reactive) {
    const reason = skin.sensitivity >= 4 ? '민감도 ' + skin.sensitivity + '/5' : '붉은기 있음';
    priorities.set('보습', [90, reason + ' · 평소 잘 맞았던 보습 제품이라면 우선 고려해 보세요.']);
  } else if (skin.dryness >= 4 && weather && weather.humidity < 45) {
    priorities.set('보습', [80, '지역 기상 습도 ' + weather.humidity + '%와 건조함 ' + skin.dryness + '/5를 함께 고려했어요.']);
  } else if (skin.dryness >= 4 || (skin.dryness >= 3 && Number.isFinite(weather?.temperature) && weather.temperature <= 10)) {
    priorities.set('보습', [70, skin.dryness >= 4 ? '오늘 입력한 건조함이 높아 보습 목적의 제품을 골랐어요.'
      : '기온 ' + weather.temperature + '°C와 입력한 건조함을 함께 고려했어요.']);
  }
  const oilyInHeat = !reactive && skin.oiliness >= 4 && weather?.temperature >= 25;
  if (oilyInHeat) {
    priorities.set('유분 관리', [60, '기온 ' + weather.temperature + '°C와 유분감 ' + skin.oiliness + '/5를 함께 고려했어요.']);
    priorities.set('세정', [55, '기온 ' + weather.temperature + '°C와 유분감 ' + skin.oiliness + '/5 · 저녁 세정에 등록한 클렌저를 고려해 보세요.']);
  }
  if (reactive || skin.dryness >= 4) {
    priorities.set('세정', [30, '민감도·붉은기 또는 건조함 기록을 고려해, 세정이 필요할 때 평소 잘 맞았던 클렌저를 고려해 보세요.']);
  }
  if (skin.acne === '있음') {
    const type = skin.acneType === '둘 다' ? '화농성·좁쌀' : skin.acneType;
    const entry = type ? '여드름 유형을 ‘' + type + '’으로 기록해' : '여드름이 있다고 기록해';
    priorities.set('진정', [95, entry + ' 이 단계에서 진정 목적으로 등록한 제품을 골랐어요.']);
  }
  const dry = Math.max(skin.dryness ?? 0, skin.cheekDry ?? 0, skin.tDry ?? 0) >= 4;
  const oily = Math.max(skin.oiliness ?? 0, skin.tOil ?? 0, skin.cheekOil ?? 0) >= 4;
  const warmAndHumid = weather?.temperature >= 25 && weather.humidity >= 65;
  const cold = Number.isFinite(weather?.temperature) && weather.temperature <= 10;
  const coldAndDry = cold && Number.isFinite(weather.humidity) && weather.humidity < 45;
  let preferredMoisture = 1;
  let moistureReason = '오늘의 건조함과 유분감 기록을 바탕으로';
  if (dry !== oily) {
    preferredMoisture = dry ? 2 : 0;
    moistureReason = dry ? '전체 또는 부위별 건조함이 높아' : '전체 또는 부위별 유분감이 높아';
  } else if (!dry && (warmAndHumid || coldAndDry || (reactive && cold))) {
    preferredMoisture = warmAndHumid ? 0 : 2;
    moistureReason = warmAndHumid || coldAndDry
      ? '기온 ' + weather.temperature + '°C와 지역 기상 습도 ' + weather.humidity + '%를 함께 고려해'
      : '낮은 기온과 오늘의 민감도를 고려해';
  }
  const picks = [];
  const cleanser = cleansingPreference(skin, weather);
  for (const entry of analyzed) {
    if (entry.excluded || entry.functional) continue;
    const { product, matches } = entry;
    const ingredientPurposes = new Map([
      ['수분 공급', matches.get('수분 공급')],
      ['보습', matches.get('보습·장벽 관련')],
      ['진정', matches.get('진정 관련')]
    ]);
    let purposes = productPurposes(product);
    if (product.type === '클렌저') purposes = ['세정'];
    else if (product.type === '선크림') purposes = ['자외선 차단'];
    else purposes = [...new Set([...purposes, ...[...ingredientPurposes].filter(([, names]) => names).map(([purpose]) => purpose)])];
    let purpose;
    let rule;
    let ingredientMatches;
    for (const label of purposes) {
      const candidate = label === '수분 공급' ? '보습' : label;
      const match = priorities.get(candidate);
      if (match && (!rule || match[0] > rule[0])) {
        purpose = candidate;
        rule = match;
        ingredientMatches = ingredientPurposes.get(label);
      }
    }
    if (!rule) continue;
    const step = purpose === '세정' ? 0 : purpose === '자외선 차단' ? 4 : stepByType.get(product.type) ?? 5;
    const level = moistureLevels.indexOf(product.moisture);
    const comparesMoisture = step >= 1 && step <= 3 && (purpose === '보습' || purpose === '진정');
    const distance = !comparesMoisture ? 0 : level < 0 ? moistureLevels.length : Math.abs(level - preferredMoisture);
    let reason = rule[1];
    if (reactive && product.reaction === 'comfortable') reason += ' 이전에 민감한 날에도 잘 맞았다고 기록했어요.';
    if (entry.history) reason += ' 과거 자극 관찰이 있으며, 사용자가 주의 상태를 해제했어요.';
    if (!entry.hasIngredients) reason += ' 전성분이 입력되지 않아 성분상 주의 여부는 미확인이에요.';
    if (ingredientMatches) reason += ' 전성분에서 ' + ingredientMatches.join(', ') + '을 확인했어요.';
    let rank = rule[0];
    if (step === 0) {
      if (cleanser && product.cleanserType === cleanser.type) {
        reason = cleanser.reason;
        rank = 100;
      } else if (product.cleanserType) {
        if (product.cleanserType !== '약산성') continue;
        reason = cleanser ? '이 상황의 대체 후보로 보유한 약산성 제품을 표시해요.'
          : '세안 상황을 선택하면 더 구체적으로 제안할 수 있어요.';
        rank = 70;
      } else if (cleanser) {
        reason = '세부 종류가 미등록된 대체 후보예요. ' + cleanser.type + '에 해당하는지 제품 용도를 확인해 주세요.';
      }
    }
    if (comparesMoisture && level === preferredMoisture) {
      reason += ' ' + moistureReason + ' 보습감을 ‘' + product.moisture + '’으로 기록한 제품을 우선했어요.';
    }
    picks.push({ product, step, distance, rank, reason, reviewIngredients: entry.review,
      hasIngredientMatch: Boolean(ingredientMatches), hasIngredients: entry.hasIngredients });
  }
  return { excludedIds: analyzed.filter(entry => entry.excluded).map(entry => entry.product.id), sunAdvice, picks: picks.sort((a, b) => a.step - b.step || comparePicks(a, b, reactive)), caution,
    missingSun: (weather?.uv >= 3 || outingUv >= 3 || environment === '야외 활동 위주') && !picks.some(({ step }) => step === 4) };
}

function comparePicks(a, b, reactive) {
  if (reactive && a.step >= 1 && a.step <= 3 && a.step === b.step) {
    if (a.step !== 3) return b.rank - a.rank || Number(b.product.reaction === 'comfortable') - Number(a.product.reaction === 'comfortable') || a.distance - b.distance;
    return Number(b.product.reaction === 'comfortable') - Number(a.product.reaction === 'comfortable') ||
      Number(b.hasIngredients) - Number(a.hasIngredients) || a.distance - b.distance || b.rank - a.rank;
  }
  return b.rank - a.rank || Number(b.hasIngredientMatch) - Number(a.hasIngredientMatch) || a.distance - b.distance;
}

function isComfortable(skin) {
  return skin?.redness === '없음' && [1, 2].includes(Number(skin.sensitivity)) &&
    [1, 2, 3].includes(Number(skin.dryness));
}

export function buildRoutine(skin, products, weather, { evening = false, ...preferences } = {}) {
  const { picks, caution, missingSun, sunAdvice, excludedIds } = suggest(skin, products, weather, preferences);
  const actions = [
    name => name + '으로 세안하세요.',
    name => '세안 후 ' + name + '을 바르세요.',
    name => name + '을 바르세요.',
    name => name + '을 발라 보습을 마무리하세요.',
    name => '낮에 외출하기 전 ' + name + '을 바르세요.'
  ];
  const cleanser = cleansingPreference(skin ?? {}, weather);
  const doubleCleanse = cleanser?.type === '1차 세안제';
  const secondCleanser = doubleCleanse ? picks.find(candidate =>
    candidate.step === 0 && candidate.product.cleanserType === '약산성') : undefined;
  const routine = actions.slice(0, evening ? 4 : actions.length).map((action, step) => {
    const [first, ...others] = picks.filter(candidate => candidate.step === step &&
      !(step === 0 && doubleCleanse && candidate.product.cleanserType !== '1차 세안제'));
    const reactive = skin?.sensitivity >= 4 || skin?.redness === '있음';
    const tied = step === 3 && reactive && first ? others.filter(candidate => comparePicks(first, candidate, reactive) === 0) : [];
    const joint = tied.length ? [first, ...tied] : [];
    const pick = joint.length ? undefined : first;
    const alternatives = others.filter(candidate => !tied.includes(candidate));
    const empty = step === 0 && cleanser
      ? '화장대에 이 상황에 제안할 ' + cleanser.type + ' 제품이 없어요.'
      : '이 단계에 제안할 제품이 없어 건너뛰어요.';
    return {
      stage: steps[step],
      pick,
      alternatives,
      joint,
      instruction: joint.length ? '공동 후보 · 아래 보습크림 중 하나를 골라 바르세요.' : pick ? step === 0 && pick.product.cleanserType === '1차 세안제'
        ? '‘' + pick.product.brand + ' ' + pick.product.name + '’로 1차 세안하세요.'
        : action('‘' + pick.product.brand + ' ' + pick.product.name + '’')
        : empty
    };
  });
  return { routine, excludedIds, secondCleanser, sunAdvice: evening ? undefined : sunAdvice, caution, missingSun: !evening && missingSun };
}
