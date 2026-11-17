import { adaptations, concerns, evaluateFunctionalCare, functionalProfile, schedules, statuses } from './functional-care.mjs?view=cycle-check';
import { dailyRecords, irritationHistory, metrics, offsetDay, weeklyReport } from './skin-insights.mjs';
import { mergePersonalBackup } from './personal-backup.mjs';
import { dayKey, isFreshWeather, previousDay } from './weather.mjs?view=usage-journal';
import { skinFields, buildRoutine, productPurposes } from './routine.mjs?view=functional-care';
import { ingredientDetails } from './ingredients.mjs?view=catalog-suggestions';
import { catalogBrands, catalogProductIdentity, catalogProductSize, searchExamples, searchProducts } from './product-catalog.mjs?view=lab-suncare';

const storageKey = 'my-skin-weather:private:v1';
const byId = id => document.getElementById(id);
const skinForm = byId('skin-form');
const acne = skinForm.elements.namedItem('acne');
const acneType = skinForm.elements.namedItem('acneType');
const productForm = byId('product-form');
const productType = productForm.elements.namedItem('type');
const cleanserType = productForm.elements.namedItem('cleanserType');
const ingredientInput = productForm.elements.namedItem('ingredients');
const routineTime = byId('routine-time');
const eveningCleansing = byId('evening-cleansing');
const activity = byId('activity');
const reactionForm = byId('reaction-form');
const outingTime = byId('outing-time');
const journalMonth = byId('journal-month');
let selectedJournalDay;
const zoneFields = [
  ['tDry', 'T존 건조함'], ['tOil', 'T존 유분감'],
  ['cheekDry', '볼·입가 건조함'], ['cheekOil', '볼·입가 유분감']
];
const periodNames = { morning: '아침', evening: '저녁' };
const todayKey = () => dayKey(new Date());
const sessionAt = (day, period) => data.journal[day]?.sessions?.[period] ?? {};
const skinAt = (day, period) => sessionAt(day, period).skin ??
  (period === 'morning' ? data.journal[day]?.skin : undefined);
const nameOf = product => product.brand + ' ' + product.name;
function freshWeather(day) {
  const weather = context?.weather;
  return !context?.failed && weather?.day === day && isFreshWeather(weather) ? weather : null;
}

function saveDay(day, changes, feedback) {
  const entry = { ...data.journal[day], ...changes };
  return save({ ...data, journal: { ...data.journal, [day]: entry } }, feedback);
}

function saveSession(day, period, changes, feedback, dayChanges = {}) {
  const sessions = { ...data.journal[day]?.sessions,
    [period]: { ...sessionAt(day, period), ...changes } };
  return saveDay(day, { ...dayChanges, sessions }, feedback);
}
let data = { products: [], journal: {} };
let editId;
let catalogProduct;
let formDay;
const skinDrafts = new Map();
let context;

try {
  const stored = JSON.parse(localStorage.getItem(storageKey));
  if (stored !== null) {
    if (!Array.isArray(stored.products) || !stored.journal || typeof stored.journal !== 'object') {
      throw new Error('Invalid personal records');
    }
    data = stored;
  }
} catch {
  byId('storage-personal').hidden = false;
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function save(next, feedback) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    data = next;
    return true;
  } catch {
    byId('storage-personal').hidden = false;
    byId(feedback).textContent = '이 브라우저에 저장하지 못했어요. 저장소 설정을 확인해 주세요.';
    return false;
  }
}

for (const [name, title] of skinFields) {
  const fieldset = element('fieldset');
  fieldset.append(element('legend', title));
  const options = element('div', '', 'choices');
  for (const value of name === 'redness' ? ['없음', '있음'] : [1, 2, 3, 4, 5]) {
    const label = element('label');
    const input = element('input');
    input.type = 'radio';
    input.name = name;
    input.value = value;
    input.required = true;
    input.setAttribute('aria-label', title + ' ' + value);
    label.append(input, element('span', String(value)));
    options.append(label);
  }
  fieldset.append(options);
  byId('skin-fields').append(fieldset);
}

for (const [key, label] of zoneFields) {
  const field = element('label', label);
  const select = element('select');
  select.name = key;
  select.append(new Option('선택 안 함', ''), ...[1, 2, 3, 4, 5].map(value => new Option(value)));
  field.append(select);
  byId('zone-fields').append(field);
}

function journalEntry(skin, products) {
  const weather = freshWeather(todayKey());
  const { routine, careCards, secondCleanser } = currentRoutine(skin, products, weather);
  return {
    skin, city: context?.city,
    weather: weather && { humidity: weather.humidity, temperature: weather.temperature ?? null, uv: weather.uv ?? null },
    picks: [
      ...routine.flatMap(({ pick, joint }) => joint.length ? joint : pick ? [pick] : []),
      ...(secondCleanser ? [secondCleanser] : []),
      ...careCards.filter(card => card.status === 'candidate').map(({ product, reason }) => ({ product, reason }))
    ].map(({ product, reason }) => ({ name: nameOf(product), reason }))
  };
}

function syncAcneType() {
  const hasAcne = acne.value === '있음';
  byId('acne-type-field').hidden = !hasAcne;
  acneType.disabled = !hasAcne;
  acneType.required = hasAcne;
  if (!hasAcne) acneType.value = '';
}

acne.addEventListener('change', syncAcneType);

function fillSkin(skin) {
  skinForm.reset();
  for (const [key] of skinFields) skinForm.elements.namedItem(key).value = skin?.[key] ?? '';
  for (const [key] of zoneFields) skinForm.elements.namedItem(key).value = skin?.[key] ?? '';
  skinForm.elements.namedItem('stinging').value = skin?.stinging ?? '';
  acne.value = skin?.acne ?? '';
  acneType.value = skin?.acneType ?? '';
  syncAcneType();
}

function syncForm(day) {
  const period = routineTime.value;
  const key = day + period;
  if (formDay === key) return;
  formDay = key;
  fillSkin(skinDrafts.get(key) ?? skinAt(day, period));
  byId('skin-time').value = period;
  byId('skin-period').textContent = periodNames[period] + ' 피부 상태 · ' + day;
  const entry = data.journal[day];
  eveningCleansing.value = entry?.sessions?.evening?.cleansingContext ?? entry?.skin?.cleansingContext ?? '';
  activity.value = entry?.activity ?? '';
  outingTime.value = entry?.outingTime ?? '';
}

function describeSkin(skin) {
  return [...skinFields, ...zoneFields].filter(([key]) => skin?.[key] !== undefined && skin[key] !== '')
    .map(([key, label]) => label + ' ' + skin[key]).join(' · ');
}

function renderJournal(day) {
  const days = Object.keys(data.journal).sort().reverse();
  renderCalendar(day);
  const period = routineTime.value;
  const prior = days.find(key => key < day && skinAt(key, period));
  const current = skinAt(day, period);
  byId('skin-comparison').textContent = current && prior
    ? prior + ' ' + periodNames[period] + ' 대비 · ' + skinFields.map(([key, label]) => label + ' ' + skinAt(prior, period)[key] + ' → ' + current[key]).join(' · ')
    : '같은 시간대의 오늘과 이전 피부 기록이 있으면 변화를 표시해요.';
  const list = byId('skin-history');
  list.replaceChildren();
  const date = selectedJournalDay ?? day;
  byId('journal-date-label').textContent = date + (data.journal[date] ? ' 기록' : ' · 저장된 개인 기록 없음');
  for (const key of date <= day || days.includes(date) ? [date] : []) {
    const { city, weather, activity: environment, reactions } = data.journal[key] ?? {};
    const item = element('li');
    item.append(element('strong', key));
    if (weather) item.append(element('p', [city, weather.humidity + '%',
      weather.uv == null ? null : 'UV ' + weather.uv, weather.temperature == null ? null : weather.temperature + '°C'].filter(Boolean).join(' · ')));
    if (environment) item.append(element('p', '활동 · ' + environment));
    for (const [period, label] of Object.entries(periodNames)) {
      const session = sessionAt(key, period);
      const skin = skinAt(key, period);
      const picks = session.picks ?? (period === 'morning' ? data.journal[key]?.picks : undefined) ?? [];
      if (!skin && !Object.keys(session).length && !picks.length && key > day) continue;
      if (!skin && !Object.keys(session).length && !picks.length && !data.products.length) continue;
      item.append(element('h4', label + (session.complete ? ' · 기록 완료' : '')));
      if (skin) {
        item.append(element('p', describeSkin(skin)));
        if (skin.stinging) item.append(element('p', '따가움 · ' + skin.stinging));
        if (skin.acne) item.append(element('p', '여드름 · ' + (skin.acneType || skin.acne)));
      }
      const cleansingContext = session.cleansingContext ?? (period === 'morning' ? skin?.cleansingContext : undefined);
      if (cleansingContext) item.append(element('p', '세안 상황 · ' + cleansingContext));
      if (picks.length) item.append(element('p', '제안 · ' + picks.map(pick => pick.name).join(', ')));
      renderJournalUsage(item, key, day, period, session.used ?? []);
    }
    for (const [period, reaction] of Object.entries(reactions ?? {})) {
      item.append(element('p', reaction.usedDay + ' ' + periodNames[period] + ' 사용 후 · ' + reaction.used.map(product => product.name).join(', ')));
      item.append(element('p', reactionSummary(reaction)));
    }
    list.append(item);
  }
}

function usedFamilies(entry) {
  const product = data.products.find(product => product.id === entry.id);
  return entry.families ?? (product ? functionalProfile(product).families : []);
}

function renderJournalUsage(item, date, today, period, used) {
  item.append(element('p', used.length ? '실제 사용' : '실제 사용 기록 없음'));
  const list = element('ul', '', 'journal-use-list');
  for (const entry of used) {
    const families = usedFamilies(entry);
    const row = element('li');
    row.append(element('span', entry.name + (families.length ? ' · ' + families.join(' / ') : '')));
    if (date <= today) {
      row.append(productButton('사용 취소', () => setUsed(date, period, entry, false)));
    }
    list.append(row);
  }
  if (used.length) item.append(list);
  const available = data.products.filter(product => !used.some(entry => entry.id === product.id));
  if (date > today || !available.length) return;
  const details = element('details');
  const label = element('label', periodNames[period] + ' 보유 제품 ');
  const select = element('select');
  select.append(new Option('제품 선택', ''), ...available.map(product => new Option(nameOf(product), product.id)));
  label.append(select);
  const add = productButton('실제 사용 추가', () => {
    const product = available.find(product => product.id === select.value);
    if (product) setUsed(date, period, product, true);
  });
  add.disabled = true;
  select.addEventListener('change', () => { add.disabled = !select.value; });
  details.append(element('summary', '이 날짜의 사용 기록 수정'), label, add);
  item.append(details);
}

function renderCalendar(day) {
  journalMonth.value ||= day.slice(0, 7);
  const [year, month] = journalMonth.value.split('-').map(Number);
  const first = new Date(journalMonth.value + '-01T00:00:00Z');
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const grid = byId('journal-calendar');
  grid.replaceChildren(...['일', '월', '화', '수', '목', '금', '토'].map(label => element('span', label)));
  for (let offset = 0; offset < first.getUTCDay(); offset++) grid.append(element('span'));
  for (let number = 1; number <= count; number++) {
    const date = journalMonth.value + '-' + String(number).padStart(2, '0');
    const button = productButton(String(number), () => {
      selectedJournalDay = date;
      renderJournal(todayKey());
      byId('journal-calendar').querySelector('[aria-pressed="true"]')?.focus();
    });
    const functional = Object.values(data.journal[date]?.sessions ?? {}).some(session =>
      session.used?.some(entry => usedFamilies(entry).length));
    button.setAttribute('aria-label', date + (functional ? ' 기능성 성분 포함 제품 사용 기록' : data.journal[date] ? ' 기록 있음' : ''));
    button.classList.toggle('has-functional-use', functional);
    button.setAttribute('aria-pressed', String(date === (selectedJournalDay ?? day)));
    button.classList.toggle('has-record', Boolean(data.journal[date]));
    grid.append(button);
  }
}
journalMonth.addEventListener('change', () => {
  selectedJournalDay = journalMonth.value ? journalMonth.value + '-01' : undefined;
  renderJournal(todayKey());
});

function outingForecast(weather) {
  if (!outingTime.value || !weather?.hourlyUv?.length) return undefined;
  const hour = outingTime.value.slice(0, 2);
  const time = Date.parse(weather.day + 'T' + hour + ':00:00+09:00');
  return weather.hourlyUv.find(entry => Date.parse(entry.time) === time);
}

function currentRoutine(skin, products, weather, period = routineTime.value) {
  const evening = period === 'evening';
  const cleansingContext = evening ? eveningCleansing.value : '아침 세안';
  const day = todayKey();
  const flagged = new Set(irritationHistory(data.journal).keys());
  const result = buildRoutine({ ...skin, cleansingContext }, products, weather, {
    evening, environment: activity.value, outingUv: outingForecast(weather)?.value, flagged
  });
  const routineProducts = result.routine.flatMap(({ pick, joint }) => [pick, ...joint].filter(Boolean))
    .map(({ product }) => product);
  const careCards = evaluateFunctionalCare(products, {
    day, period, skin, interests: data.journal[day]?.careConcerns, journal: data.journal, flagged,
    excluded: new Set(result.excludedIds), routineProducts
  });
  return { ...result, careCards };
}

function renderTodaySummary(day) {
  const weather = freshWeather(day);
  const readings = weather
    ? ['지역 습도 ' + weather.humidity + '%', weather.temperature != null && weather.temperature + '°C',
        weather.uv != null && 'UV ' + weather.uv].filter(Boolean).join(' · ')
    : '현재 추천에 사용할 최신 날씨가 없어요.';
  const link = element('a', '날씨 상세');
  link.href = '#weather';
  byId('today-weather-summary').replaceChildren(readings + ' · ' + byId('comparison').textContent + ' · ', link);
  const cards = byId('today-periods');
  cards.replaceChildren();
  for (const [period, label] of Object.entries(periodNames)) {
    const skin = skinAt(day, period);
    const session = sessionAt(day, period);
    const { routine } = currentRoutine(skin, data.products, weather, period);
    const products = routine.flatMap(({ pick, joint }) => joint.length ? joint : pick ? [pick] : []);
    const card = element('div');
    card.append(element('h3', label), element('p', skin
      ? skinFields.map(([key, field]) => field + ' ' + skin[key]).join(' · ') : '피부 상태를 기록해 주세요.'));
    card.append(element('p', '실제 사용 ' + (session.used?.length ?? 0) + '개 · ' + (session.complete ? '루틴 완료' : '루틴 미완료')));
    const names = products.slice(0, 3).map(({ product }) => nameOf(product));
    card.append(element('p', names.length ? '주요 추천 · ' + names.join(', ') : '현재 추천할 보유 제품이 없어요.', 'subtitle'));
    for (const [target, caption] of [['skin', skin ? '피부 기록 보기' : '피부 기록하기'], ['routine', '추천 및 사용 기록']]) {
      const link = element('a', caption);
      link.href = '#' + target;
      link.addEventListener('click', () => {
        if (routineTime.value !== period) {
          routineTime.value = period;
          routineTime.dispatchEvent(new Event('change'));
        }
      });
      card.append(link, ' ');
    }
    cards.append(card);
  }
}

const insightRange = byId('insight-range');
const insightStart = byId('insight-start');
const insightEnd = byId('insight-end');
const insightProduct = byId('insight-product');
for (const input of [insightRange, insightStart, insightEnd, insightProduct]) {
  input.addEventListener('change', () => renderInsights(todayKey()));
}

function describeDaily(row) {
  if (!row.recorded) return '피부 미기록';
  const scores = metrics.filter(([key]) => row[key] !== null)
    .map(([key, label]) => label + ' ' + row[key]);
  return [...scores, row.redness !== null && '붉은기 ' + (row.redness ? '있음' : '없음')].filter(Boolean).join(' · ');
}

function renderInsights(day) {
  const custom = insightRange.value === 'custom';
  byId('insight-custom').hidden = !custom;
  insightStart.value ||= offsetDay(day, -6);
  insightEnd.value ||= day;
  insightStart.max = insightEnd.max = day;
  const start = custom ? insightStart.value : offsetDay(day, 1 - Number(insightRange.value));
  const end = custom ? insightEnd.value : day;
  const valid = start && end && start <= end && end <= day && start >= offsetDay(end, -365);
  const rows = valid ? dailyRecords(data.journal, start, end) : [];
  const graphs = byId('insight-graphs');
  const days = byId('insight-days');
  graphs.replaceChildren();
  days.replaceChildren();
  byId('insight-status').textContent = valid
    ? start + ' ~ ' + end + ' · 피부 기록 ' + rows.filter(row => row.recorded).length + '일' +
      (rows.some(row => row.recorded) ? '' : ' · 그래프를 표시할 기록이 부족해요.')
    : '오늘까지의 기간을 최대 366일로 선택해 주세요.';

  if (rows.some(row => row.recorded)) {
    for (const [key, label] of [...metrics, ['redness', '붉은기 발생 여부']]) {
      const track = element('div', '', 'plot-scroll');
      const chart = element('ol', '', 'skin-plot');
      chart.setAttribute('aria-label', label + ' 날짜별 기록');
      for (const row of rows) {
        const value = row[key];
        const point = element('li', '', 'plot-day');
        const amount = key === 'redness' ? value === null ? '—' : value ? '있음' : '없음' : value ?? '—';
        point.title = row.day + ' · ' + label + ' ' + (value === null ? '미기록' : amount);
        const bar = element('span', String(amount), 'plot-value');
        if (value === null) bar.classList.add('missing');
        else bar.style.setProperty('--height', (key === 'redness' ? value ? 85 : 25 : value * 20) + '%');
        const column = element('div', '', 'plot-column');
        column.append(bar);
        point.append(column, element('time', row.day.slice(5)));
        chart.append(point);
      }
      track.append(chart);
      graphs.append(element('h3', label), track);
    }
  }

  for (const row of rows.filter(row => row.recorded || row.weather || row.used.length)) {
    const item = element('li');
    item.append(element('strong', row.day), element('p', describeDaily(row)));
    if (Number.isFinite(row.weather?.humidity)) item.append(element('p', (row.city ? row.city + ' ' : '') + '지역 기상 습도 ' + row.weather.humidity + '%'));
    if (row.used.length) item.append(element('p', '실제 사용 · ' + [...new Set(row.used.map(product => product.name))].join(', ')));
    days.append(item);
  }
  if (!days.childElementCount) days.append(element('li', '선택 기간에 비교할 기록이 없어요.'));

  const selected = insightProduct.value;
  const usedProducts = new Map();
  for (const entry of Object.values(data.journal)) for (const session of Object.values(entry.sessions ?? {})) {
    for (const product of session.used ?? []) usedProducts.set(product.id, product.name);
  }
  insightProduct.replaceChildren(new Option('사용한 제품 선택', ''), ...[...usedProducts].map(([id, name]) => new Option(name, id)));
  if (usedProducts.has(selected)) insightProduct.value = selected;
  const uses = byId('insight-uses');
  uses.replaceChildren();
  const observed = new Map();
  let useDays = 0;
  for (const row of rows.filter(row => selected && row.used.some(product => product.id === selected)).reverse()) {
    useDays++;
    const nextDay = offsetDay(row.day, 1);
    const [next] = dailyRecords(data.journal, nextDay, nextDay);
    const item = element('li');
    item.append(element('strong', row.day + ' 사용'), element('p', '다음 날 · ' + describeDaily(next)));
    for (const reaction of next.reactions.filter(reaction => reaction.usedDay === row.day && reaction.used.some(product => product.id === selected))) {
      const linked = reaction.productId === selected || (!reaction.productId && reaction.used.length === 1);
      if (linked) for (const sign of new Set(reaction.signs)) {
        if (!observed.has(sign)) observed.set(sign, new Set());
        observed.get(sign).add(row.day);
      }
      item.append(element('p', (reaction.used.length > 1 ? '여러 제품 사용 후 관찰 · ' : '사용 후 관찰 · ') + reactionSummary(reaction)));
    }
    uses.append(item);
  }
  const repeats = [...observed].filter(([, dates]) => dates.size > 1).map(([sign, dates]) => sign + ' ' + dates.size + '일');
  byId('insight-product-summary').textContent = !selected ? '제품을 선택하면 사용일과 다음 날 기록을 비교해요.'
    : !useDays ? '선택 기간에 사용 기록이 없어요.'
    : '실제 사용 ' + useDays + '일 · ' + (repeats.length ? '반복 관찰 · ' + repeats.join(', ') : '반복 반응을 판단할 기록이 부족해요.');

  const { monday, lastStart, lastEnd, current, previous } = weeklyReport(data.journal, day);
  const report = byId('weekly-report');
  report.replaceChildren(element('p', '이번 주 ' + monday + ' ~ ' + day + ' · 지난주 ' + lastStart + ' ~ ' + lastEnd + ' (KST)'));
  const redness = current.days ? '붉은기 발생 ' + current.redness + '일' : '붉은기 미기록';
  report.append(element('p', '피부 기록 ' + current.days + '일 · ' + redness + ' · 루틴 완료 ' + current.completed + '회'));
  for (const [key, label] of [['dry', '건조함'], ['sensitive', '민감도']]) {
    const now = current[key];
    const before = previous[key];
    const comparison = now.count >= 2 && before.count >= 2
      ? '지난주 ' + before.value.toFixed(1) + '점 (' + before.count + '일) · 차이 ' +
        new Intl.NumberFormat('ko-KR', { signDisplay: 'exceptZero', maximumFractionDigits: 1 }).format(now.value - before.value) + '점'
      : '주별 비교에 필요한 기록이 부족해요.';
    report.append(element('p', label + ' · ' + (now.count ? '일평균 ' + now.value.toFixed(1) + '점 (' + now.count + '일)' : '이번 주 미기록') + ' · ' + comparison));
  }
  report.append(element('p', current.frequent ? '가장 자주 사용 · ' + current.frequent.name + ' ' + current.frequent.count + '회' : '이번 주 제품 사용 기록이 없어요.'));
  report.append(element('p', current.reactions.length ? '특이 반응 기록 · ' + current.reactions.join(', ') : '이번 주에 입력한 특이 반응이 없어요.'));
}

for (const concern of concerns) {
  const label = element('label');
  const input = element('input');
  input.type = 'checkbox';
  input.value = concern;
  label.append(input, ' ' + concern);
  byId('care-interests').querySelector('.purpose-options').append(label);
}
byId('care-interests').addEventListener('change', () => {
  const day = todayKey();
  const careConcerns = [...byId('care-interests').querySelectorAll('input:checked')].map(input => input.value);
  const saved = saveDay(day, { careConcerns }, 'care-feedback');
  if (saved) refreshSavedPicks();
  renderRoutine();
});

function renderCareSettings(card, oldForm) {
  const { product, settings } = card;
  if (oldForm) return oldForm;
  const details = element('details');
  details.dataset.careProduct = product.id;
  const form = element('form');
  const fields = element('div', '', 'product-fields care-settings');
  const choice = (key, title, options, empty) => {
    const label = element('label', title);
    const select = element('select');
    select.name = key;
    select.append(new Option(empty, ''), ...Object.entries(options).map(([key, value]) => new Option(value, key)));
    select.value = settings[key] ?? '';
    label.append(select);
    fields.append(label);
    return select;
  };
  const schedule = choice('schedule', '사용 주기', schedules, '주기 설정 안 함');
  choice('adaptation', '적응 상태', adaptations, '선택 안 함');
  choice('period', '제품 안내에 따른 시간대', periodNames, '지정 안 함');
  choice('contact', '제품 사용 방식', { rinse: '씻어내는 제품', leave: '피부에 남기는 제품' }, '제품 종류 기준');
  const dayLabel = element('label', '직접 지정 간격 (일)');
  const days = element('input');
  Object.assign(days, { type: 'number', name: 'days', min: 1, max: 365, value: settings.days ?? '' });
  const syncInterval = () => {
    days.disabled = schedule.value !== 'custom';
    days.required = !days.disabled;
    dayLabel.hidden = days.disabled;
  };
  schedule.addEventListener('change', syncInterval);
  dayLabel.append(days);
  fields.append(dayLabel);
  syncInterval();
  const dateLabel = element('label', '처음 사용한 날짜');
  const date = element('input');
  Object.assign(date, { type: 'date', name: 'startedOn', max: todayKey(), value: settings.startedOn ?? product.startedOn ?? '' });
  dateLabel.append(date);
  const noteLabel = element('label', '사용 메모', 'memo');
  const note = element('textarea');
  note.name = 'note';
  note.rows = 2;
  note.value = settings.note ?? '';
  noteLabel.append(note);
  fields.append(dateLabel, noteLabel);
  const confirmed = element('label', '', 'checkbox');
  const directions = element('input');
  Object.assign(directions, { type: 'checkbox', name: 'directions', checked: settings.directions ?? false });
  confirmed.append(directions, ' 제품 사용 안내를 확인했어요.');
  const submit = element('button', '집중 관리 설정 저장', 'secondary');
  submit.type = 'submit';
  form.append(element('p', '제품 설명에 맞춰 설정하세요. 주 단위 설정은 오늘을 포함한 최근 7일의 사용 날짜를 비교해요.', 'subtitle'),
    fields, confirmed, submit);
  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const functionalCare = Object.fromEntries(values);
    functionalCare.directions = values.has('directions');
    if (values.has('days')) functionalCare.days = Number(values.get('days'));
    const products = data.products.map(item => item.id === product.id ? { ...item, functionalCare } : item);
    if (!save({ ...data, products }, 'care-feedback')) return;
    refreshSavedPicks();
    renderRoutine();
    renderProducts();
    const result = details.closest('li');
    const status = result.querySelector('.care-status').textContent;
    const checkElement = result.querySelector('.care-check');
    const time = checkElement.querySelector('time');
    const check = time ? checkElement.textContent.replace(time.textContent, time.getAttribute('aria-label')) : checkElement.textContent;
    byId('care-feedback').textContent = nameOf(product) + '의 집중 관리 설정을 저장했어요. ' + status + '. ' + check;
    details.querySelector('summary').focus();
  });
  details.append(element('summary', '사용 주기·적응 상태 설정'), form);
  return details;
}

function renderCareCard(card, oldForm) {
  const { product, settings, ingredients, families, status, reason, first, last, relatedLast, lastReaction, nextCheck } = card;
  const item = element('li');
  const statusLabel = element('p', '', 'care-status care-' + status);
  statusLabel.append(element('span', '제품 사용 판정: ', 'visually-hidden'), statuses[status]);
  item.append(element('strong', nameOf(product)), statusLabel, element('p', reason));
  if (ingredients.length) item.append(element('p', '전성분에서 확인 · ' + ingredients.map(entry =>
    entry.family + ' ' + entry.name + (entry.family === '비타민 C' ? ' (' + entry.form + ')' : '') +
    (entry.concentration ? ' ' + entry.concentration : ' (농도 미표기)')).join(' / '), 'subtitle'));
  item.append(element('p', (card.rinse ? '씻어내는 제품' : '피부에 남기는 제품') + ' · 목적 ' +
    (productPurposes(product).join(', ') || '미등록'), 'subtitle'));
  const firstDate = [settings.startedOn || product.startedOn, first].filter(Boolean).sort()[0];
  const interval = settings.schedule === 'custom' ? settings.days + '일 간격' : schedules[settings.schedule];
  item.append(element('p', ['첫 사용 ' + (firstDate ?? '기록 없음'), '마지막 사용 ' + (last ?? '기록 없음'),
    interval ?? '주기 미설정', '최근 7일 사용 ' + card.recentCount + '일',
    adaptations[settings.adaptation]].filter(Boolean).join(' · '), 'subtitle'));
  const check = element('p', '다음 주기 확인 · ', 'subtitle care-check');
  if (nextCheck.date) {
    const date = element('time', nextCheck.date);
    date.dateTime = nextCheck.date;
    const [year, month, day] = nextCheck.date.split('-').map(Number);
    date.setAttribute('aria-label', `${year}년 ${month}월 ${day}일`);
    check.textContent = '다음 주기 확인일 · ';
    check.append(date, ' · ');
  }
  check.append(nextCheck.message);
  item.append(check);
  const roles = {
    '레티노이드': '피부결 관리', '비타민 C': '피부톤 관리', AHA: '각질 관리', BHA: '각질·유분 관리', '기타': '피부톤·장벽 관리'
  };
  if (families.length && card.separate) item.append(element('p', '성분 역할 참고 · ' +
    families.map(family => family + ' ' + roles[family]).join(' / ') + ' · 배합과 사용 방식에 따라 달라져요.', 'subtitle'));
  if (relatedLast) item.append(element('p', '같은 계열 최근 사용 · ' + relatedLast.day + ' ' + relatedLast.name, 'subtitle'));
  if (lastReaction) item.append(element('p', lastReaction.date + ' · ' +
    (lastReaction.used.length > 1 ? '여러 제품 사용 후 관찰 · ' : '사용 후 관찰 · ') + reactionSummary(lastReaction), 'subtitle'));
  if (card.history) item.append(element('p', '따가움·붉어짐 관찰 이력이 있어요. 함께 사용한 제품이 있었다면 기록도 같이 확인하세요.', 'caution'));
  if (card.conflict) item.append(element('p', '같은 날 사용하는 레티노이드·각질 관리 제품의 사용 안내와 피부 반응을 함께 확인하세요.', 'caution'));
  if (families.includes('레티노이드')) item.append(element('p', '임신 중이거나 임신을 계획 중이라면 레티노이드 사용을 피하고 제품 안내와 전문가의 조언을 따르세요.', 'caution'));
  item.append(useCheckbox(product), renderCareSettings(card, oldForm));
  return item;
}

function renderRoutine() {
  const day = dayKey(new Date());
  syncForm(day);
  byId('evening-cleansing-field').hidden = routineTime.value !== 'evening';
  const skin = skinAt(day, routineTime.value);
  const list = byId('recommendations');
  const messages = [];
  list.replaceChildren();
  const optionalSection = byId('optional-care');
  const optionalList = byId('optional-care-products');
  optionalSection.hidden = true;
  const careForms = new Map([...optionalList.querySelectorAll('[data-care-product]')]
    .map(details => [details.dataset.careProduct, details]));
  optionalList.replaceChildren();
  byId('caution').hidden = true;
  if (!skin) messages.push('오늘의 피부 상태를 저장하면 아래 루틴에 피부 상태도 반영돼요.');
  if (!data.products.length) messages.push('내 화장대에 제품을 등록해 주세요.');
  if (context?.failed) messages.push('날씨 조회에 실패했어요. 현재 제안에는 입력한 피부 상태만 반영합니다.');
  {
    const weather = freshWeather(day);
    const forecast = outingForecast(weather);
    byId('outing-uv').textContent = !outingTime.value ? '' : forecast
      ? outingTime.value.slice(0, 2) + '시 KST 예보 · UV ' + forecast.value + ' · Open-Meteo'
      : '선택한 시각의 UV 예보를 사용할 수 없어요.';
    const { routine, careCards, caution, missingSun, secondCleanser, sunAdvice } = currentRoutine(skin, data.products, weather);
    if (data.products.length && !careCards.some(card => card.status === 'candidate') && !routine.some(({ pick, joint }) => pick || joint.length)) messages.push('오늘 조건에 맞는 보유 제품이 없어요.');
    if (sunAdvice && !routine[4]?.pick) messages.push(sunAdvice);
    if (missingSun) messages.push('자외선 지수에 대응할 차단 제품이 화장대에 없어요.');
    for (const [index, { stage, instruction, pick, joint, alternatives }] of routine.entries()) {
      const item = element('li');
      item.append(element('p', (index + 1) + '. ' + stage, 'eyebrow'), element('strong', instruction));
      if (pick) item.append(element('p', pick.reason), useCheckbox(pick.product));
      if (index === 0 && secondCleanser) {
        item.append(element('p', '2차 세안이 필요하면 · ' + nameOf(secondCleanser.product) + ' (약산성 세안제)'), useCheckbox(secondCleanser.product));
      }
      if (joint.length) {
        const options = element('ul');
        for (const candidate of joint) {
          const option = element('li');
          option.append(element('strong', candidate.product.brand + ' ' + candidate.product.name), element('p', candidate.reason), useCheckbox(candidate.product));
          options.append(option);
        }
        item.append(options);
      }
      if (pick?.reviewIngredients.length) item.append(element('p', '민감한 날 확인 · ' + pick.reviewIngredients.join(', '), 'caution'));
      if (pick?.product.note) item.append(element('p', '내 메모 · ' + pick.product.note, 'subtitle'));
      if (alternatives.length) {
        const details = element('details');
        const options = element('ul');
        for (const alternative of alternatives) {
          const option = element('li');
          option.append(element('strong', alternative.product.brand + ' ' + alternative.product.name), element('p', alternative.reason), useCheckbox(alternative.product));
          if (alternative.reviewIngredients.length) {
            option.append(element('p', '민감한 날 확인 · ' + alternative.reviewIngredients.join(', '), 'caution'));
          }
          options.append(option);
        }
        details.append(element('summary', '다른 선택지 ' + alternatives.length + '개'), options);
        item.append(details);
      }
      list.append(item);
    }
    optionalSection.hidden = careCards.length === 0;
    for (const card of careCards) optionalList.append(renderCareCard(card, careForms.get(card.product.id)));
    for (const input of byId('care-interests').querySelectorAll('input')) {
      input.checked = data.journal[day]?.careConcerns?.includes(input.value) ?? false;
    }
    byId('caution').textContent = caution;
    byId('caution').hidden = !caution;
  }
  byId('routine-message').textContent = messages.join(' ');
  renderUsage(day);
  renderJournal(day);
  renderTodaySummary(day);
  renderInsights(day);
}

skinForm.addEventListener('input', () => {
  if (formDay) skinDrafts.set(formDay, Object.fromEntries(new FormData(skinForm)));
});
byId('skin-time').addEventListener('change', event => {
  routineTime.value = event.target.value;
  routineTime.dispatchEvent(new Event('change'));
});
routineTime.addEventListener('change', () => {
  byId('skin-feedback').textContent = '';
  renderRoutine();
  refreshSavedPicks();
});
eveningCleansing.addEventListener('change', () => {
  saveSession(todayKey(), 'evening', { cleansingContext: eveningCleansing.value }, 'usage-feedback');
  renderRoutine();
  refreshSavedPicks();
});
activity.addEventListener('change', () => {
  saveDay(todayKey(), { activity: activity.value }, 'usage-feedback');
  renderRoutine();
  refreshSavedPicks();
});

outingTime.addEventListener('change', () => {
  saveDay(todayKey(), { outingTime: outingTime.value }, 'usage-feedback');
  renderRoutine();
  refreshSavedPicks();
});
byId('copy-yesterday').addEventListener('click', () => {
  const skin = skinAt(previousDay(todayKey()), routineTime.value);
  if (skin) {
    fillSkin(skin);
    skinDrafts.set(formDay, Object.fromEntries(new FormData(skinForm)));
  }
  byId('skin-feedback').textContent = skin ? '어제 상태를 불러왔어요. 바뀐 항목을 수정한 뒤 저장하세요.' : '어제 같은 시간대의 피부 기록이 없어요.';
});

function refreshSavedPicks() {
  const day = todayKey();
  const period = routineTime.value;
  const skin = skinAt(day, period);
  if (!skin && !sessionAt(day, period).used?.length) return;
  const entry = journalEntry(skin, data.products);
  const weather = entry.weather ? { city: entry.city, weather: entry.weather } : {};
  saveSession(day, period, { picks: entry.picks }, 'skin-feedback', weather);
}

export function updatePersonalWeather(weather, city, failed) {
  context = { weather, city, failed };
  renderRoutine();
  if (freshWeather(todayKey())) refreshSavedPicks();
}

skinForm.addEventListener('submit', event => {
  event.preventDefault();
  const day = todayKey();
  const period = routineTime.value;
  if (formDay !== day + period) {
    syncForm(day);
    byId('skin-feedback').textContent = '날짜가 바뀌었어요. 오늘의 피부 상태를 선택해 주세요.';
    return;
  }
  const skin = Object.fromEntries(new FormData(skinForm));
  for (const [key] of skinFields.slice(0, 3)) skin[key] = Number(skin[key]);
  for (const [key] of zoneFields) {
    if (skin[key]) skin[key] = Number(skin[key]);
    else delete skin[key];
  }
  const entry = journalEntry(skin, data.products);
  const weather = entry.weather ? { city: entry.city, weather: entry.weather } : {};
  if (saveSession(day, period, { skin, picks: entry.picks }, 'skin-feedback', weather)) {
    skinDrafts.delete(formDay);
    byId('skin-feedback').textContent = periodNames[period] + ' 피부 상태를 저장했어요.';
    renderRoutine();
    if (byId('reaction-panel').open) syncReaction();
  }
});

function setUsed(day, period, product, checked) {
  const used = (sessionAt(day, period).used ?? []).filter(item => item.id !== product.id);
  if (checked) {
    const { families, rinse } = functionalProfile(product);
    used.push({ id: product.id, name: nameOf(product), families, rinse });
  }
  const weather = freshWeather(day);
  const dayChanges = weather ? { city: context.city, weather: { humidity: weather.humidity, temperature: weather.temperature, uv: weather.uv } } : {};
  const picks = sessionAt(day, period).picks ?? (day === todayKey() ? journalEntry(skinAt(day, period), data.products).picks : []);
  if (saveSession(day, period, { used, picks, complete: false }, 'usage-feedback', dayChanges)) {
    byId('usage-feedback').textContent = checked ? '실제 사용을 기록했어요.' : '사용 기록을 취소했어요.';
  }
  renderRoutine();
  renderProducts();
  if (byId('reaction-panel').open) syncReaction();
}

function useCheckbox(product) {
  const day = todayKey();
  const period = routineTime.value;
  const label = element('label', '', 'checkbox');
  const input = element('input');
  input.type = 'checkbox';
  input.checked = (sessionAt(day, period).used ?? []).some(item => item.id === product.id);
  input.dataset.usedProduct = product.id;
  input.addEventListener('change', () => {
    const focused = document.activeElement === input;
    setUsed(day, period, product, input.checked);
    if (focused) {
      const check = document.querySelector('[data-used-product="' + CSS.escape(product.id) + '"]');
      if (check && check.getClientRects().length) check.focus();
      else byId('usage-panel').querySelector('summary').focus();
    }
  });
  label.append(input, element('span', nameOf(product) + ' 사용 완료'));
  return label;
}

function renderUsage(day) {
  const period = routineTime.value;
  const { used = [], complete } = sessionAt(day, period);
  const select = byId('used-product');
  const selected = select.value;
  select.replaceChildren(new Option('보유 제품 선택', ''));
  for (const product of data.products) {
    if (!used.some(item => item.id === product.id)) select.add(new Option(nameOf(product), product.id));
  }
  if (Array.from(select.options).some(option => option.value === selected)) select.value = selected;
  const list = byId('used-products');
  list.replaceChildren();
  for (const product of used) {
    const item = element('li');
    item.append(element('span', product.name), productButton('사용 취소', () => setUsed(day, period, product, false)));
    list.append(item);
  }
  byId('routine-complete').checked = Boolean(complete);
  byId('usage-count').textContent = periodNames[period] + ' 실제 사용 ' + used.length + '개 · ' + (complete ? '완료' : '미완료');
}

byId('add-used-product').addEventListener('click', () => {
  const product = data.products.find(item => item.id === byId('used-product').value);
  if (product) setUsed(todayKey(), routineTime.value, product, true);
});
byId('routine-complete').addEventListener('change', event => {
  if (saveSession(todayKey(), routineTime.value, { complete: event.target.checked }, 'usage-feedback')) {
    byId('usage-feedback').textContent = event.target.checked ? '루틴 완료를 기록했어요.' : '루틴 완료를 취소했어요.';
  }
  renderRoutine();
});

function reactionSummary(reaction) {
  const changes = skinFields.filter(([key]) => reaction.changes[key])
    .map(([key, label]) => label + ' ' + reaction.changes[key]);
  const linked = reaction.used.find(product => product.id === reaction.productId);
  return [...changes, ...reaction.signs, linked && '연결 제품 · ' + linked.name, reaction.note].filter(Boolean).join(' · ');
}

for (const [key, label] of skinFields) {
  const field = element('label', label + ' 변화');
  const select = element('select');
  select.name = key;
  select.append(new Option('선택 안 함', ''), ...['감소', '변화 없음', '증가'].map(value => new Option(value)));
  field.append(select);
  byId('reaction-fields').append(field);
}

function syncReaction() {
  const day = todayKey();
  const yesterday = previousDay(day);
  const period = reactionForm.elements.namedItem('period').value;
  const saved = data.journal[day]?.reactions?.[period];
  const used = saved?.used ?? sessionAt(yesterday, period).used ?? [];
  const select = reactionForm.elements.namedItem('product');
  select.replaceChildren(new Option('사용한 제품 전체', ''), ...used.map(product => new Option(product.name, product.id)));
  select.value = saved?.productId ?? '';
  for (const [key] of skinFields) reactionForm.elements.namedItem(key).value = saved?.changes[key] ?? '';
  for (const input of reactionForm.querySelectorAll('[name="signs"]')) input.checked = saved?.signs.includes(input.value) ?? false;
  reactionForm.elements.namedItem('note').value = saved?.note ?? '';
  const before = describeSkin(skinAt(yesterday, period));
  const after = describeSkin(skinAt(day, period));
  byId('reaction-baseline').textContent = used.length
    ? '어제 사용 · ' + used.map(product => product.name).join(', ') + ' / 어제 ' + (before || '미기록') + ' / 오늘 ' + (after || '미기록')
    : '어제 이 시간대에 실제 사용한 제품 기록이 없어요.';
  reactionForm.querySelector('[type="submit"]').disabled = !used.length;
  byId('delete-reaction').disabled = !saved;
}

byId('reaction-panel').addEventListener('toggle', () => {
  if (byId('reaction-panel').open) syncReaction();
});
reactionForm.elements.namedItem('period').addEventListener('change', syncReaction);
reactionForm.addEventListener('submit', event => {
  event.preventDefault();
  const day = todayKey();
  const usedDay = previousDay(day);
  const fields = new FormData(reactionForm);
  const period = fields.get('period');
  const reactions = { ...data.journal[day]?.reactions };
  const used = reactions[period]?.used ?? sessionAt(usedDay, period).used ?? [];
  if (!used.length) return;
  const changes = Object.fromEntries(skinFields.map(([key]) => [key, fields.get(key)]));
  const signs = fields.getAll('signs');
  const note = fields.get('note').trim();
  if (!Object.values(changes).some(Boolean) && !signs.length && !note) {
    byId('reaction-feedback').textContent = '변화, 특이 반응 또는 메모를 입력해 주세요.';
    return;
  }
  reactions[period] = { usedDay, used, changes, signs, note, productId: fields.get('product') };
  if (saveDay(day, { reactions }, 'reaction-feedback')) {
    byId('reaction-feedback').textContent = '다음 날 반응을 저장했어요.';
    syncReaction();
    renderProducts();
    renderRoutine();
    refreshSavedPicks();
  }
});
byId('delete-reaction').addEventListener('click', () => {
  const day = todayKey();
  const reactions = { ...data.journal[day]?.reactions };
  delete reactions[reactionForm.elements.namedItem('period').value];
  if (saveDay(day, { reactions }, 'reaction-feedback')) {
    syncReaction();
    renderProducts();
    renderRoutine();
    refreshSavedPicks();
    byId('reaction-feedback').textContent = '저장한 반응을 삭제했어요.';
  }
});

function productButton(label, action) {
  const button = element('button', label, 'secondary');
  button.type = 'button';
  button.addEventListener('click', action);
  return button;
}

function syncCleanserType() {
  const isCleanser = productType.value === '클렌저';
  byId('cleanser-type-field').hidden = !isCleanser;
  cleanserType.disabled = !isCleanser;
  if (!isCleanser) cleanserType.value = '';
}

productType.addEventListener('change', syncCleanserType);

function stopEditing() {
  editId = undefined;
  catalogProduct = undefined;
  productForm.reset();
  byId('catalog-source').hidden = true;
  syncCleanserType();
  renderIngredientPreview();
  byId('product-save').textContent = '제품 등록';
  byId('product-cancel').hidden = true;
}

function renderIngredientDetails(list, entries) {
  list.replaceChildren();
  for (const { input, name, roles } of entries) {
    const item = element('li');
    let description = roles ? roles.join(' · ') : '역할 및 주의 정보 미분류';
    if (roles && !roles.includes('민감한 날 확인할 성분')) description += ' · 앱의 주의 목록 일치 없음';
    item.append(element('strong', input), element('p', (name && name !== input ? name + ' · ' : '') + description));
    list.append(item);
  }
}

function ingredientSummary(entries) {
  const recognized = entries.filter(entry => entry.roles).length;
  const flagged = entries.filter(entry => entry.roles?.includes('민감한 날 확인할 성분')).length;
  return '입력 ' + entries.length + '개 중 ' + recognized + '개 분류 · 민감한 날 확인 ' + flagged + '개';
}

function renderIngredientPreview() {
  const preview = byId('ingredient-preview');
  const details = byId('ingredient-preview-details');
  const entries = ingredientDetails(ingredientInput.value);
  preview.hidden = details.hidden = !entries.length;
  preview.textContent = entries.length ? ingredientSummary(entries) : '';
  if (details.open) renderIngredientDetails(details.querySelector('ul'), entries);
}

ingredientInput.addEventListener('input', renderIngredientPreview);
byId('ingredient-preview-details').addEventListener('toggle', renderIngredientPreview);

function productSourceLink(source, label) {
  if (typeof source !== 'string' || !/^https:\/\/(theordinary\.com|blancdoux\.com|www\.aestura\.com|www\.cosrx\.co\.kr|www\.torriden\.com|www\.larocheposay\.co\.kr|m\.theuiq\.com|roundlab\.co\.kr|m\.anua\.kr|www\.numbuzin\.com|beplain\.co\.kr|m\.snature\.co\.kr|cafe24img\.poxo\.com|www\.oliveyoung\.co\.kr|www\.hwahae\.co\.kr|cosrx\.co\.kr|www\.drdifferent\.com|www\.zeroid\.co\.kr|m\.medihealshop\.com|wellage\.co\.kr|www\.dalba\.co\.kr|www\.fation\.co\.kr|www\.illiyoon\.com|www\.physiogel\.co\.kr|dermafactory\.net|mildlab\.co\.kr)\//.test(source)) {
    return element('span', label);
  }
  const link = element('a', label);
  link.href = source;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

const catalogQuery = byId('catalog-query');

const bulkProducts = new Map();
const brandFilter = byId('catalog-brand');
const typeFilters = byId('catalog-types');
const verifiedFilter = byId('catalog-verified');
const sortFilter = byId('catalog-sort');
const purposeOptions = [...productForm.querySelectorAll('[name="purposes"]')].map(input => input.value);
let pageProducts = [];
const chosenVariants = new Map();
const defaultPurposes = new Map([
  ['클렌저', '세정'], ['토너', '수분 공급'], ['크림', '보습'],
  ['로션', '보습'], ['선크림', '자외선 차단']
]);

for (const brand of catalogBrands) brandFilter.add(new Option(brand));
for (const [label, types] of [
  ['클렌저', '클렌저'], ['토너', '토너'], ['앰플·세럼', '앰플,세럼'],
  ['크림', '크림'], ['로션', '로션'], ['선크림', '선크림'], ['기타', '기타'], ['종류 미확인', '']
]) {
  const field = element('label');
  const input = element('input');
  input.type = 'checkbox';
  input.value = types;
  field.append(input, label);
  typeFilters.append(field);
}

function ownsProduct(product) {
  if (!catalogProductSize(product.name)) return false;
  const key = catalogProductIdentity(product);
  return data.products.some(item => catalogProductIdentity(item) === key);
}

function selectProduct(product, selected, allowDuplicate = false) {
  const key = catalogProductIdentity(product);
  if (!selected) {
    bulkProducts.delete(key);
  } else if (!bulkProducts.has(key) && (!ownsProduct(product) || allowDuplicate)) {
    bulkProducts.set(key, {
      product, allowDuplicate, type: product.type ?? '', ingredients: product.ingredients ?? '',
      cleanserType: product.type === '클렌저' ? product.cleanserType ?? '' : '',
      purposes: product.purposes?.length ? [...product.purposes] : suggestedPurposes(product.type),
      suggested: !product.purposes?.length
    });
  }
}

function suggestedPurposes(type) {
  const purpose = defaultPurposes.get(type);
  return purpose ? [purpose] : [];
}

function updateDraftType(draft, type) {
  draft.type = type;
  if (type !== '클렌저') draft.cleanserType = '';
  if (draft.suggested) draft.purposes = suggestedPurposes(type);
}

function draftIssues(draft) {
  const issues = [];
  if (!draft.type) issues.push('제품 종류 선택');
  if (!draft.ingredients.trim() && !draft.purposes.length) issues.push('사용 목적 선택 또는 전성분 입력');
  if (ownsProduct(draft.product) && !draft.allowDuplicate) issues.push('이미 등록됨 · 검색 결과에서 같은 제품 추가 선택');
  return issues;
}

function reviewSelection() {
  const section = byId('bulk-shelf');
  section.scrollIntoView({ block: 'start' });
  byId('bulk-heading').focus({ preventScroll: true });
}

function purposeSelect(placeholder) {
  const control = element('select');
  control.add(new Option(placeholder, ''));
  for (const value of purposeOptions) control.add(new Option(value));
  return control;
}

const bulkType = productType.cloneNode(true);
bulkType.removeAttribute('name');
const bulkPurpose = purposeSelect('변경 안 함');
for (const [label, control] of [['제품 종류 ', bulkType], ['사용 목적 추가 ', bulkPurpose]]) {
  const field = element('label', label);
  field.append(control);
  byId('bulk-edits').append(field);
}
byId('bulk-apply').addEventListener('click', () => {
  for (const draft of bulkProducts.values()) {
    if (bulkType.value) updateDraftType(draft, bulkType.value);
    if (bulkPurpose.value) {
      if (!draft.purposes.includes(bulkPurpose.value)) draft.purposes.push(bulkPurpose.value);
      draft.suggested = false;
    }
  }
  renderBulkProducts();
});

function selectionChanged() {
  renderBulkProducts();
  renderCatalogResults();
}

function renderBulkProducts() {
  byId('bulk-shelf').hidden = bulkProducts.size === 0;
  byId('bulk-bar').hidden = bulkProducts.size === 0;
  byId('bulk-count').textContent = '선택한 제품 ' + bulkProducts.size + '개';
  byId('catalog-clear').disabled = !bulkProducts.size;
  const list = byId('bulk-products');
  list.replaceChildren();
  for (const draft of bulkProducts.values()) {
    const result = draft.product;
    const item = element('li');
    item.append(element('strong', nameOf(result)));
    const issue = element('p', '', 'subtitle');
    const metadata = element('p', '', 'subtitle');
    const details = element('details');
    details.append(element('summary', '종류·사용 목적·전성분 수정'));

    const typeLabel = element('label', '제품 종류 ');
    const type = productType.cloneNode(true);
    type.removeAttribute('name');
    type.value = draft.type;
    typeLabel.append(type);
    const cleanserLabel = element('label', '클렌저 세부 종류 ');
    const subtype = cleanserType.cloneNode(true);
    subtype.removeAttribute('name');
    cleanserLabel.append(subtype);
    subtype.addEventListener('change', () => {
      draft.cleanserType = subtype.value;
      update();
    });

    const purposes = element('fieldset');
    purposes.append(element('legend', '사용 목적'));
    const options = element('div', '', 'purpose-options');
    for (const value of purposeOptions) {
      const label = element('label');
      const input = element('input');
      input.type = 'checkbox';
      input.value = value;
      label.append(input, value);
      options.append(label);
    }
    purposes.append(options);

    const label = element('label', '전성분 ');
    const ingredients = element('textarea');
    ingredients.rows = 3;
    ingredients.maxLength = 12000;
    ingredients.value = draft.ingredients;
    label.append(ingredients);
    const typeControls = element('div', '', 'catalog-controls');
    typeControls.append(typeLabel, cleanserLabel);
    details.append(typeControls, purposes, label);
    details.open = draft.type === '클렌저' || draftIssues(draft).length > 0;

    function update() {
      const issues = draftIssues(draft);
      issue.textContent = issues.length ? '확인 필요 · ' + issues.join(' · ') : '';
      issue.hidden = !issues.length;
      cleanserLabel.hidden = draft.type !== '클렌저';
      subtype.disabled = cleanserLabel.hidden;
      subtype.value = draft.cleanserType;
      metadata.textContent = [catalogProductSize(result.name) ? '' : '용량 미확인', draft.type || '종류 미확인',
        draft.purposes.join(' · '), draft.ingredients.trim() ? '전성분 입력됨' : '전성분 미확인'].filter(Boolean).join(' · ');
      for (const input of options.querySelectorAll('input')) input.checked = draft.purposes.includes(input.value);
    }
    type.addEventListener('change', () => { updateDraftType(draft, type.value); update(); });
    options.addEventListener('change', () => {
      draft.purposes = [...options.querySelectorAll('input:checked')].map(input => input.value);
      draft.suggested = false;
      update();
    });
    ingredients.addEventListener('input', () => { draft.ingredients = ingredients.value; update(); });
    update();
    item.append(metadata, issue, details);
    item.append(productButton('빼기', () => {
      selectProduct(result, false);
      selectionChanged();
    }));
    list.append(item);
  }
}

function saveSelection(readyOnly = false) {
  const feedback = byId('bulk-feedback');
  const pending = [...bulkProducts.values()];
  const ready = pending.filter(draft => !draftIssues(draft).length);
  const blocked = pending.filter(draft => draftIssues(draft).length);
  if (blocked.length && (!readyOnly || !ready.length)) {
    feedback.textContent = blocked.map(draft => nameOf(draft.product) + ' · ' + draftIssues(draft).join(', ')).join(' / ');
    byId('bulk-ready-save').hidden = !ready.length;
    reviewSelection();
    feedback.focus({ preventScroll: true });
    return;
  }
  const additions = ready.map(draft => {
    const result = draft.product;
    return {
      id: crypto.randomUUID(), brand: result.brand, name: result.name, type: draft.type,
      purposes: draft.purposes,
      ingredients: draft.ingredients.trim(),
      ...(result.ingredients && result.ingredients === draft.ingredients.trim() ? { catalogSource: result.source } : {}),
      ...(draft.type === '클렌저' && draft.cleanserType ? { cleanserType: draft.cleanserType } : {})
    };
  });
  if (!additions.length || !save({ ...data, products: [...data.products, ...additions] }, 'bulk-feedback')) return;
  for (const draft of ready) bulkProducts.delete(catalogProductIdentity(draft.product));
  byId('bulk-ready-save').hidden = true;
  feedback.textContent = '';
  selectionChanged();
  refreshSavedPicks();
  renderProducts();
  renderRoutine();
  const result = byId('bulk-result');
  result.textContent = additions.length + '개 제품을 등록했어요.' +
    (blocked.length ? ' 확인이 필요한 ' + blocked.length + '개는 선택 목록에 남겨뒀어요.' : '');
  result.focus();
}
byId('bulk-save').addEventListener('click', () => saveSelection());
byId('bulk-quick-save').addEventListener('click', () => saveSelection());
byId('bulk-ready-save').addEventListener('click', () => saveSelection(true));
byId('bulk-review').addEventListener('click', reviewSelection);
byId('catalog-select-page').addEventListener('click', () => {
  for (const product of pageProducts) selectProduct(product, true);
  selectionChanged();
});
byId('catalog-clear').addEventListener('click', () => {
  bulkProducts.clear();
  selectionChanged();
});

const catalogPageSize = 8;
let catalogPage = 0;
let lastCatalogQuery;

function renderCatalogResults() {
  const query = catalogQuery.value.trim();
  if (query !== lastCatalogQuery) {
    catalogPage = 0;
    chosenVariants.clear();
  }
  lastCatalogQuery = query;
  const types = [...typeFilters.querySelectorAll('input:checked')].flatMap(input => input.value.split(','));
  const filters = { brand: brandFilter.value, types, verified: verifiedFilter.checked, sort: sortFilter.value };
  const results = searchProducts(query, filters);
  const hasCriteria = Boolean(query || filters.brand || types.length || filters.verified);
  const unfiltered = query && !results.length ? searchProducts(query) : [];
  const active = [query && '검색어 ' + query, filters.brand && '브랜드 ' + filters.brand,
    types.length && '종류 ' + types.map(type => type || '미확인').join(', '),
    filters.verified && '전성분 확인 제품만',
    filters.sort !== 'relevance' && sortFilter.selectedOptions[0].textContent].filter(Boolean);
  const activeStatus = byId('catalog-active');
  activeStatus.hidden = !active.length;
  activeStatus.textContent = '적용 중 · ' + active.join(' / ');
  byId('catalog-reset').hidden = !active.length;
  byId('catalog-manual').hidden = !query || results.length > 0 || unfiltered.length > 0;
  byId('catalog-page-actions').hidden = !results.length && !bulkProducts.size;
  byId('catalog-select-page').disabled = !results.length;
  const suggestions = byId('catalog-suggestions');
  const prefix = catalogQuery.value.match(/^.*[,，]\s*/)?.[0] ?? '';
  suggestions.replaceChildren(...(query ? results.slice(0, 6).map(group =>
    new Option(prefix + group.selected.brand + ' ' + group.name)) : []));
  pageProducts = [];
  const pageCount = Math.ceil(results.length / catalogPageSize);
  const start = catalogPage * catalogPageSize;
  byId('catalog-pages').hidden = pageCount <= 1;
  byId('catalog-previous').disabled = catalogPage === 0;
  byId('catalog-next').disabled = catalogPage + 1 >= pageCount;
  byId('catalog-page-number').textContent = (catalogPage + 1) + ' / ' + pageCount + ' 페이지';
  const list = byId('catalog-results');
  const status = byId('catalog-status');
  list.replaceChildren();
  byId('catalog-examples').hidden = hasCriteria;
  status.textContent = !hasCriteria ? '제품명 일부를 입력해 보세요. 검색 결과에 전성분 확인 여부가 표시돼요.'
    : results.length ? '일치하는 제품 ' + results.length + '개 · 전성분 확인 ' +
      results.filter(group => group.products.some(({ product }) => product.ingredients)).length + '개'
    : unfiltered.length ? '다른 검색 조건에서 ' + unfiltered.length + '개를 찾았어요. 브랜드·카테고리·전성분 필터를 조정해 보세요.'
      : query ? '카탈로그에서 찾지 못했어요. 검색어로 직접 등록할 수 있어요.'
        : '이 필터 조합에 맞는 제품이 없어요. 검색 조건을 조정해 보세요.';
  for (const group of results.slice(start, start + catalogPageSize)) {
    const groupKey = group.selected.brand + ':' + group.name;
    let result = group.products.find(({ product }) => product === chosenVariants.get(groupKey))?.product ?? group.selected;
    const item = element('li');
    const heading = element('strong', result.brand + ' ' + (group.products.length > 1 ? group.name : result.name));
    const info = element('p');
    const selectionLabel = element('label', '', 'catalog-selection');
    const check = element('input');
    check.type = 'checkbox';
    const checkText = element('span');
    const pageIndex = pageProducts.push(result) - 1;
    check.addEventListener('change', () => {
      selectProduct(result, check.checked, ownsProduct(result));
      byId('bulk-ready-save').hidden = true;
      byId('bulk-feedback').textContent = '';
      renderBulkProducts();
      updateDetails();
    });
    selectionLabel.append(check, checkText);
    const sourceDetails = element('details');
    const links = element('div');
    sourceDetails.append(element('summary', '제품 정보와 출처'), links);
    item.append(heading);
    if (group.products.length > 1) {
      const label = element('label', '용량 ');
      const select = element('select');
      group.products.forEach(({ product, size }, index) => {
        select.add(new Option((size ?? product.name) + (product.ingredients ? ' · 전성분 확인' : ''), String(index)));
      });
      select.value = String(group.products.findIndex(({ product }) => product === result));
      select.addEventListener('change', () => {
        result = group.products[Number(select.value)].product;
        chosenVariants.set(groupKey, result);
        pageProducts[pageIndex] = result;
        updateDetails();
      });
      label.append(select);
      item.append(element('br'), label);
    }
    function updateDetails() {
      const owned = ownsProduct(result);
      check.checked = bulkProducts.has(catalogProductIdentity(result));
      checkText.textContent = owned ? '같은 제품도 추가하기' : '등록할 제품으로 선택';
      check.setAttribute('aria-label', nameOf(result) + ' · ' + checkText.textContent);
      item.classList.toggle('catalog-selected', check.checked);
      info.textContent = [result.type || '종류 미확인', result.ingredients ? '전성분 확인' : '전성분 미확인',
        owned ? '화장대에 등록됨' : ''].filter(Boolean).join(' · ');
      links.replaceChildren(productSourceLink(result.source, result.region));
      for (const [label, url] of result.references ?? []) {
        const reference = element('p');
        reference.append(productSourceLink(url, label));
        links.append(reference);
      }
    }
    updateDetails();
    item.prepend(selectionLabel);
    item.append(info, sourceDetails);
    sourceDetails.append(
      productButton('등록 양식에 채우기', () => {
        if (editId) {
          status.textContent = '수정 중인 제품을 저장하거나 수정 취소한 뒤 검색 결과를 선택해 주세요.';
          return;
        }
        catalogProduct = result.ingredients ? result : undefined;
        for (const key of ['brand', 'name', 'type', 'ingredients']) {
          productForm.elements.namedItem(key).value = result[key] ?? '';
        }
        for (const input of productForm.querySelectorAll('[name="purposes"]')) {
          input.checked = result.purposes?.includes(input.value) ?? false;
        }
        cleanserType.value = result.cleanserType ?? '';
        syncCleanserType();
        renderIngredientPreview();
        const source = byId('catalog-source');
        source.replaceChildren(productSourceLink(result.source, result.region),
          result.ingredients ? ' · 구매한 제품의 라벨과 전성분을 대조한 뒤 등록해 주세요.'
            : ' · 자동 입력된 내용을 확인하고 사용 목적 또는 전성분을 입력해 주세요.');
        source.hidden = false;
        productForm.elements.namedItem('brand').focus();
      }));
    list.append(item);
  }
}

for (const [id, direction] of [['catalog-previous', -1], ['catalog-next', 1]]) {
  byId(id).addEventListener('click', () => {
    catalogPage += direction;
    renderCatalogResults();
    byId('catalog-status').focus();
  });
}

for (const control of [brandFilter, typeFilters, verifiedFilter, sortFilter]) {
  control.addEventListener('change', () => {
    catalogPage = 0;
    renderCatalogResults();
  });
}

byId('catalog-reset').addEventListener('click', () => {
  byId('catalog-search').reset();
  catalogPage = 0;
  chosenVariants.clear();
  renderCatalogResults();
  catalogQuery.focus();
});

byId('catalog-manual').addEventListener('click', () => {
  if (editId) {
    byId('catalog-status').textContent = '수정 중인 제품을 먼저 저장하거나 취소해 주세요.';
    return;
  }
  let query = catalogQuery.value.split(/[,，]/).filter(part => part.trim()).at(-1)?.trim() ?? '';
  const typedBrand = [...catalogBrands].sort((a, b) => b.length - a.length)
    .find(brand => query === brand || query.startsWith(brand + ' '));
  const brand = typedBrand ?? brandFilter.value;
  if (typedBrand) query = query.slice(typedBrand.length).trim();
  stopEditing();
  productForm.elements.namedItem('brand').value = brand;
  productForm.elements.namedItem('name').value = query;
  productForm.elements.namedItem(brand ? 'name' : 'brand').focus();
});

catalogQuery.addEventListener('input', renderCatalogResults);
byId('catalog-search').addEventListener('submit', event => {
  event.preventDefault();
  renderCatalogResults();
});
for (const example of searchExamples) {
  byId('catalog-example-buttons').append(productButton(example, () => {
    catalogQuery.value = example;
    renderCatalogResults();
    catalogQuery.focus();
  }));
}

function persistProducts(products, message) {
  if (!save({ ...data, products }, 'product-feedback')) return;
  refreshSavedPicks();
  stopEditing();
  renderProducts();
  renderRoutine();
  renderCatalogResults();
  byId('product-feedback').textContent = message;
}

function renderProducts() {
  const shelf = byId('products');
  shelf.replaceChildren();
  const historyByProduct = irritationHistory(data.journal);
  const categories = new Map(Array.from(productForm.elements.namedItem('type').options)
    .filter(option => option.value)
    .map(option => [option.value, element('ul', '', 'product-list shelf-list')]));
  byId('shelf-empty').hidden = data.products.length > 0;
  for (const product of data.products) {
    const item = element('li');
    item.append(element('p', product.brand, 'eyebrow'), element('strong', product.name),
      element('p', [product.type, product.cleanserType, ...productPurposes(product)].filter(Boolean).join(' · ')));
    if (product.reaction) item.append(element('p', '민감한 날 사용 반응 · ' +
      (product.reaction === 'comfortable' ? '잘 맞았어요' : '따갑거나 붉어졌어요'), 'subtitle'));
    if (product.avoidIngredients) item.append(element('p', '피하고 싶은 성분 · ' + product.avoidIngredients, 'subtitle'));
    const caution = element('select');
    for (const [value, label] of [['', '기록 기준'], ['hold', '주의 제품으로 지정'], ['resume', '주의 상태 해제']]) {
      caution.add(new Option(label, value));
    }
    caution.value = product.caution ?? '';
    caution.addEventListener('change', () => {
      const products = data.products.map(item => item.id === product.id ? { ...item, caution: caution.value } : item);
      if (save({ ...data, products }, 'product-feedback')) {
        refreshSavedPicks();
        renderRoutine();
      } else caution.value = product.caution ?? '';
    });
    const cautionLabel = element('label', '추천 주의 상태 ');
    cautionLabel.append(caution);
    item.append(cautionLabel);
    const observations = historyByProduct.get(product.id);
    if (observations?.length) {
      const latest = observations.map(entry => entry.observed).sort().at(-1);
      item.append(element('p', '자극 관찰 ' + observations.length + '건 · 최근 ' + latest, 'subtitle'));
    } else if (!product.reaction) item.append(element('p', '사용 반응을 판단할 기록이 부족해요.', 'subtitle'));
    const management = [product.openedOn && '개봉 ' + product.openedOn, product.startedOn && '사용 시작 ' + product.startedOn,
      product.useStatus === 'paused' ? '사용 중단' : product.useStatus === 'using' ? '사용 중' : '', product.usagePlan].filter(Boolean);
    if (management.length) item.append(element('p', management.join(' · '), 'subtitle'));
    if (product.moisture) item.append(element('p', '내가 느낀 보습감 · ' + product.moisture, 'subtitle'));
    if (product.note) item.append(element('p', product.note, 'subtitle'));
    if (product.catalogSource) item.append(productSourceLink(product.catalogSource, '자동 입력 전성분 출처'));
    if (product.ingredients) {
      item.append(element('p', product.catalogSource ? '카탈로그에서 제공한 전성분' : '직접 입력한 전성분', 'subtitle'));
      const details = element('details');
      const entries = ingredientDetails(product.ingredients);
      const ingredients = element('ul', '', 'ingredient-list');
      details.append(element('summary', '전성분 분석'), element('p', ingredientSummary(entries)), ingredients);
      details.addEventListener('toggle', () => {
        if (details.open && !ingredients.hasChildNodes()) renderIngredientDetails(ingredients, entries);
      });
      item.append(details);
    }
    if (!product.ingredients) item.append(element('p', '전성분 미확인', 'subtitle'));
    const history = element('details');
    const entries = element('ul');
    let lastUsed;
    for (const day of Object.keys(data.journal).sort().reverse()) {
      for (const [period, label] of Object.entries(periodNames)) {
        if (sessionAt(day, period).used?.some(used => used.id === product.id)) {
          lastUsed ??= day;
          entries.append(element('li', day + ' ' + label + ' 사용'));
        }
        const reaction = data.journal[day].reactions?.[period];
        if (reaction?.used.some(used => used.id === product.id)) {
          entries.append(element('li', day + ' 관찰 (' + reaction.usedDay + ' 사용) · ' + (reaction.used.length > 1 ? '여러 제품 사용 후 · ' : '') + reactionSummary(reaction)));
        }
      }
    }
    item.append(element('p', lastUsed ? '마지막 사용 · ' + lastUsed : '실제 사용 기록이 아직 없어요.', 'subtitle'));
    if (entries.childElementCount) {
      history.append(element('summary', '사용 및 반응 이력'), entries);
      item.append(history);
    }
    const actions = element('div', '', 'actions');
    actions.append(productButton('수정', () => {
      editId = product.id;
      catalogProduct = product.catalogSource ? { ...product, source: product.catalogSource } : undefined;
      byId('catalog-source').hidden = true;
      for (const key of ['brand', 'name', 'type', 'note', 'moisture', 'ingredients', 'reaction', 'avoidIngredients', 'openedOn', 'startedOn', 'useStatus', 'usagePlan']) {
        productForm.elements.namedItem(key).value = product[key] ?? '';
      }
      renderIngredientPreview();
      cleanserType.value = product.cleanserType ?? '';
      syncCleanserType();
      for (const input of productForm.querySelectorAll('[name="purposes"]')) {
        input.checked = productPurposes(product).includes(input.value);
      }
      productForm.elements.namedItem('active').checked = product.active;
      byId('product-save').textContent = '변경 저장';
      byId('product-cancel').hidden = false;
      productForm.elements.namedItem('brand').focus();
    }), productButton('삭제', () => {
      persistProducts(data.products.filter(item => item.id !== product.id), '제품을 삭제했어요.');
    }));
    item.append(actions);
    (categories.get(product.type) ?? categories.get('기타')).append(item);
  }
  for (const [category, list] of categories) {
    if (!list.childElementCount) continue;
    const group = element('section');
    group.append(element('h3', category + ' · ' + list.childElementCount + '개'), list);
    shelf.append(group);
  }
}

productForm.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(productForm);
  const purposes = fields.getAll('purposes');
  fields.delete('purposes');
  const product = Object.fromEntries([...fields].map(([key, value]) => [key, value.trim()]));
  if (!product.brand || !product.name) {
    byId('product-feedback').textContent = '브랜드명과 제품명을 입력해 주세요.';
    return;
  }
  if (!purposes.length && !product.ingredients) {
    byId('product-feedback').textContent = '사용 목적을 선택하거나 전성분을 입력해 주세요.';
    productForm.querySelector('[name="purposes"]').focus();
    return;
  }
  if (!editId && ownsProduct(product) && !window.confirm('이미 화장대에 있는 제품이에요. 같은 제품을 추가할까요?')) return;
  product.purposes = purposes;
  if (catalogProduct && ['brand', 'name', 'ingredients'].every(key => product[key] === catalogProduct[key])) {
    product.catalogSource = catalogProduct.source;
  }
  product.active = fields.has('active');
  product.id = editId ?? crypto.randomUUID();
  const priorProduct = data.products.find(item => item.id === editId);
  if (priorProduct?.functionalCare) product.functionalCare = priorProduct.functionalCare;
  if (priorProduct?.caution) product.caution = priorProduct.caution;
  const products = editId ? data.products.map(item => item.id === editId ? product : item) : [...data.products, product];
  persistProducts(products, editId ? '제품 정보를 수정했어요.' : '화장대에 제품을 등록했어요.');
});

byId('product-cancel').addEventListener('click', stopEditing);
byId('export-personal').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, data }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = element('a');
  link.href = url;
  link.download = 'my-skin-weather-' + todayKey() + '.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

byId('import-personal').addEventListener('change', async event => {
  const input = event.target;
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const feedback = byId('backup-feedback');
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error('size');
    const backup = JSON.parse(await file.text());
    const merged = mergePersonalBackup(data, backup);
    if (!save(merged, 'backup-feedback')) return;
    formDay = undefined;
    stopEditing();
    renderProducts();
    renderRoutine();
    if (byId('reaction-panel').open) syncReaction();
    feedback.textContent = '백업을 합쳤어요. 같은 날짜와 제품 ID는 이 기기의 기록을 유지했어요.';
  } catch {
    feedback.textContent = '백업 형식을 읽을 수 없어요. MY SKIN WEATHER에서 내보낸 JSON을 선택해 주세요.';
  }
});

byId('reset-personal').addEventListener('click', () => {
  const feedback = byId('reset-feedback');
  if (!window.confirm('이 브라우저의 피부 상태, 스킨케어 제안 기록과 화장대 제품 전체를 삭제할까요? 삭제 후에는 복구할 수 없습니다. 기상 기록은 유지됩니다.')) return;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    feedback.textContent = '개인 입력을 삭제하지 못했어요. 브라우저 저장소 설정을 확인해 주세요.';
    return;
  }
  data = { products: [], journal: {} };
  skinDrafts.clear();
  bulkProducts.clear();
  renderBulkProducts();
  byId('bulk-feedback').textContent = '';
  byId('catalog-search').reset();
  catalogPage = 0;
  renderCatalogResults();
  formDay = undefined;
  stopEditing();
  byId('skin-feedback').textContent = '';
  byId('product-feedback').textContent = '';
  renderProducts();
  renderRoutine();
  syncReaction();
  feedback.textContent = '피부 기록과 화장대 제품을 초기화했어요.';
});
renderProducts();

renderBulkProducts();
renderCatalogResults();
