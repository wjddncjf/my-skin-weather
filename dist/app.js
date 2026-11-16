import { cities, citySourceUrl, dayKey, previousDay, isFreshWeather, fetchWeather, sourceUrl, timezone } from './weather.mjs?view=usage-journal';
import { updatePersonalWeather } from './personal.mjs?view=functional-care';

const recordPrefix = city => 'my-skin-weather:' + city + ':v1:';
const errors = {
  timeout: ['응답 지연', '날씨 원천 응답이 늦습니다. 잠시 후 다시 시도해 주세요.'],
  denied: ['원천 접근 거절', '출처 링크에서 원천 상태를 확인한 뒤 다시 시도해 주세요.'],
  limited: ['요청 제한', '요청이 제한됐습니다. 잠시 기다린 뒤 다시 시도해 주세요.'],
  offline: ['연결 끊김', '인터넷에 연결한 뒤 다시 시도해 주세요.'],
  schema: ['데이터 형식 변경', '출처 링크에서 데이터 제공 상태를 확인한 뒤 다시 시도해 주세요.'],
  upstream: ['원천 오류', '날씨 원천 상태를 확인한 뒤 다시 시도해 주세요.'],
  network: ['연결 오류', '인터넷 연결과 날씨 원천 상태를 확인한 뒤 다시 시도해 주세요.']
};

const byId = id => document.getElementById(id);
const refresh = byId('refresh');
const citySelect = byId('city');
for (const [value, { name }] of Object.entries(cities)) citySelect.add(new Option(name, value));
let city = 'daejeon';
citySelect.value = city;
const records = new Map();
const timeFormat = new Intl.DateTimeFormat('ko-KR', {
  timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
});
const formatTime = value => timeFormat.format(new Date(value));
let busy = false;
const lastWeatherAttempt = new Map();
let errorCode = null;
let recovered = false;

function storageWarning() {
  const message = byId('storage-message');
  message.hidden = false;
  message.textContent = '브라우저 저장소를 사용할 수 없습니다. 이번 조회 결과는 페이지를 닫으면 사라질 수 있습니다.';
}

function loadRecords() {
  records.clear();
  const prefix = recordPrefix(city);
  try {
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith(prefix)) continue;
      try {
        const record = JSON.parse(localStorage.getItem(key));
        if (record?.day === key.slice(prefix.length) && /^\d{4}-\d{2}-\d{2}$/.test(record.day) &&
            Number.isFinite(record.humidity) && record.humidity >= 0 && record.humidity <= 100 &&
            Number.isFinite(Date.parse(record.sourceTime)) && Number.isFinite(Date.parse(record.retrievedAt)) &&
            dayKey(new Date(record.retrievedAt)) === record.day &&
            (record.sourceUrl === citySourceUrl(city, { forecast: true }) || record.sourceUrl === citySourceUrl(city) || (city === 'seoul' && record.sourceUrl === sourceUrl))) {
          records.set(record.day, record);
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
    }
  } catch {
    storageWarning();
  }
}

function render() {
  const history = [...records.values()].sort((a, b) => b.day.localeCompare(a.day));
  const latest = history[0];
  const today = dayKey(new Date());
  const current = records.get(today);
  const yesterday = records.get(previousDay(today));
  const status = byId('status');
  const failure = errors[errorCode];
  const fresh = !busy && !failure && isFreshWeather(current) ? current : null;
  const state = busy ? 'loading' : failure ? latest ? 'stale' : 'error' : fresh ? 'fresh' : latest ? 'stale' : 'idle';

  status.toggleAttribute('data-error', Boolean(failure));
  status.dataset.state = state;
  status.dataset.errorCode = errorCode ?? 'none';
  status.textContent = busy ? '조회 중' : failure ? failure[0] : recovered && fresh ? '복구 완료' : fresh ? '정상 조회' : latest ? '오래된 정보' : '조회 준비';
  for (const [key, unit] of [['humidity', '%'], ['uv', ''], ['temperature', '°C']]) {
    const available = Number.isFinite(latest?.[key]);
    byId(key).textContent = available ? latest[key] + unit : '—';
    byId(key + '-state').textContent = busy ? '조회 중' : available ? state === 'fresh' ? '정상 조회' : '오래된 정보'
      : failure ? '조회 실패' : '값 없음';
  }
  byId('source').href = citySourceUrl(city, { forecast: true });
  const recordSource = byId('record-source');
  recordSource.textContent = latest?.sourceUrl ?? '—';
  if (latest) recordSource.href = latest.sourceUrl;
  else recordSource.removeAttribute('href');
  byId('source-time').textContent = latest ? formatTime(latest.sourceTime) : '—';
  byId('retrieved-time').textContent = latest ? formatTime(latest.retrievedAt) : '—';
  byId('message').textContent = busy ? cities[city].name + '의 공개 날씨를 조회하고 있습니다.' :
    failure ? (latest ? '오래된 정보 · 마지막 정상값을 표시합니다. ' : '값 없음 · ') + failure[1] :
    latest && !fresh ? '오래된 정보 · 마지막 정상값을 표시합니다.' : '';

  const change = current && yesterday ? current.humidity - yesterday.humidity : null;
  const formattedChange = new Intl.NumberFormat('ko-KR', { signDisplay: 'exceptZero', maximumFractionDigits: 3 });
  byId('comparison').textContent = change === null ? '어제 대비 · 비교 불가' :
    '어제 대비 · ' + formattedChange.format(change) + '%p';

  refresh.disabled = busy;
  refresh.textContent = failure ? '다시 시도' : '날씨 조회';
  citySelect.disabled = busy;
  byId('weather-history-title').textContent = cities[city].name + ' · 일별 기상 기록';
  byId('empty').hidden = history.length > 0;
  byId('history').hidden = history.length === 0;
  const body = byId('history').tBodies[0];
  body.replaceChildren();
  for (const record of history) {
    const row = body.insertRow();
    for (const value of [record.day, record.humidity + '%', record.uv ?? '—',
      Number.isFinite(record.temperature) ? record.temperature + '°C' : '—',
      formatTime(record.sourceTime), formatTime(record.retrievedAt)]) {
      row.insertCell().textContent = value;
    }
  }
  const forecast = fresh?.hourlyUv ?? [];
  const forecastList = byId('uv-forecast');
  forecastList.replaceChildren();
  const hour = new Intl.DateTimeFormat('ko-KR', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  for (const { time, value } of forecast) {
    const item = document.createElement('li');
    item.textContent = hour.format(new Date(time)) + ' · UV ' + value;
    forecastList.append(item);
  }
  byId('uv-forecast-status').textContent = forecast.length
    ? 'Open-Meteo 모델 예보 · 현재 UV와 별도 · 조회 ' + formatTime(fresh.retrievedAt)
    : '오늘 시간대별 UV 예보를 사용할 수 없어요.';
  updatePersonalWeather(fresh, cities[city].name, Boolean(failure));
}

async function refreshWeather() {
  if (busy) return;
  const retrying = Boolean(errorCode);
  busy = true;
  lastWeatherAttempt.set(city, Date.now());
  errorCode = null;
  recovered = false;
  render();

  try {
    const record = await fetchWeather(citySourceUrl(city, { forecast: true }));
    records.set(record.day, record);
    recovered = retrying;
    try {
      localStorage.setItem(recordPrefix(city) + record.day, JSON.stringify(record));
      byId('storage-message').hidden = true;
    } catch {
      storageWarning();
    }
  } catch (error) {
    errorCode = error.code ?? 'network';
  } finally {
    busy = false;
    render();
  }
}

citySelect.addEventListener('change', () => {
  city = citySelect.value;
  errorCode = null;
  loadRecords();
  void refreshWeather();
});
refresh.addEventListener('click', refreshWeather);
function refreshOnReturn() {
  if (document.hidden || busy) return;
  const record = records.get(dayKey(new Date()));
  const last = Math.max(lastWeatherAttempt.get(city) ?? 0, Date.parse(record?.retrievedAt) || 0);
  if (!isFreshWeather(record) && Date.now() - last >= 5 * 60_000) void refreshWeather();
  else render();
}

document.addEventListener('visibilitychange', refreshOnReturn);
window.addEventListener('focus', refreshOnReturn);
window.addEventListener('pageshow', refreshOnReturn);
loadRecords();
refreshOnReturn();

async function renderEvidence() {
  const status = byId('evidence-status');
  const list = byId('evidence-list');
  try {
    const response = await fetch('./evidence/index.json');
    if (!response.ok) throw new Error('archive index');
    const dates = (await response.json()).filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day)).slice(0, 2);
    const archive = await Promise.all(dates.map(async day => {
      const path = './evidence/' + day + '.json';
      const entry = await fetch(path);
      if (!entry.ok) throw new Error('archive entry');
      return { path, record: (await entry.json()).record };
    }));
    const change = archive.length === 2 && previousDay(archive[1].record.day) === archive[0].record.day
      ? archive[1].record.humidity - archive[0].record.humidity : null;
    const changeText = change === null ? '연속 이틀 기록이 갖춰지면 차이를 표시합니다.'
      : '어제 대비 ' + new Intl.NumberFormat('ko-KR', { signDisplay: 'exceptZero' }).format(change) + '%p';
    status.textContent = '실제 조회 ' + archive.length + '/2건 · ' + changeText;
    for (const { path, record } of archive) {
      const item = document.createElement('li');
      const summary = document.createElement('p');
      summary.textContent = record.day + ' · ' + record.humidity + '% · 모델 유효 ' +
        formatTime(record.sourceTime) + ' · 실제 조회 ' + formatTime(record.retrievedAt) + ' (KST)';
      const link = document.createElement('a');
      link.href = path;
      link.textContent = '원자료와 정규화 기록 보기';
      item.append(summary, link);
      list.append(item);
    }
  } catch {
    status.textContent = '공개 검증 기록을 불러오지 못했습니다.';
  }
}

void renderEvidence();
