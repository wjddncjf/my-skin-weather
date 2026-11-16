export const timezone = 'Asia/Seoul';
export const source = 'Open-Meteo';
export const sourceUrl = 'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=relative_humidity_2m&timezone=Asia%2FSeoul&timeformat=unixtime';
export const cities = {
  daejeon: { name: '대전', latitude: 36.3504, longitude: 127.3845 },
  seoul: { name: '서울', latitude: 37.5665, longitude: 126.9780 },
  busan: { name: '부산', latitude: 35.1796, longitude: 129.0756 },
  daegu: { name: '대구', latitude: 35.8714, longitude: 128.6014 },
  gwangju: { name: '광주', latitude: 35.1595, longitude: 126.8526 },
  jeju: { name: '제주', latitude: 33.4996, longitude: 126.5312 }
};

export function citySourceUrl(city, { forecast = false } = {}) {
  const { latitude, longitude } = cities[city];
  const url = new URL(sourceUrl);
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('current', 'relative_humidity_2m,temperature_2m,uv_index');
  if (forecast) {
    url.searchParams.set('hourly', 'uv_index');
    url.searchParams.set('forecast_days', '1');
  }
  return url.href;
}

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit'
});

export function dayKey(date) {
  const parts = Object.fromEntries(dayFormat.formatToParts(date).map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function isFreshWeather(record, now = new Date()) {
  if (record?.day !== dayKey(now)) return false;
  return [record.sourceTime, record.retrievedAt].every(value => {
    const age = now.getTime() - Date.parse(value);
    return age >= 0 && age <= 2 * 3600000;
  });
}

export function previousDay(day) {
  const date = new Date(day + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export class WeatherError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function normalize(payload, retrievedAt, requestedUrl = sourceUrl) {
  const humidity = payload?.current?.relative_humidity_2m;
  const timestamp = payload?.current?.time;
  const sourceDate = new Date(timestamp * 1000);
  if (!Number.isFinite(humidity) || humidity < 0 || humidity > 100 ||
      !Number.isSafeInteger(timestamp) || !Number.isFinite(sourceDate.getTime()) ||
      payload?.current_units?.relative_humidity_2m !== '%') {
    throw new WeatherError('schema');
  }

  const temperature = payload.current.temperature_2m;
  const uv = payload.current.uv_index;
  const day = dayKey(retrievedAt);
  const times = payload.hourly?.time;
  const values = payload.hourly?.uv_index;
  const hourlyUv = Array.isArray(times) && Array.isArray(values) && times.length === values.length &&
    payload.hourly_units?.uv_index === ''
    ? times.slice(0, 24).flatMap((timestamp, index) => {
      const date = new Date(timestamp * 1000);
      const value = values[index];
      return Number.isSafeInteger(timestamp) && Number.isFinite(date.getTime()) &&
        dayKey(date) === day && Number.isFinite(value) && value >= 0 ? [{ time: date.toISOString(), value }] : [];
    }) : [];
  return {
    hourlyUv, day, humidity, unit: '%', source, sourceUrl: requestedUrl, timezone,
    temperature: Number.isFinite(temperature) && payload.current_units.temperature_2m === '°C' ? temperature : null,
    uv: Number.isFinite(uv) && uv >= 0 && payload.current_units.uv_index === '' ? uv : null,
    sourceTime: sourceDate.toISOString(), retrievedAt: retrievedAt.toISOString()
  };
}

export async function fetchWeather(requestedUrl = sourceUrl) {
  if (navigator.onLine === false) throw new WeatherError('offline');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(requestedUrl, {
      signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'
    });
    if ([401, 403].includes(response.status)) throw new WeatherError('denied');
    if (response.status === 429) throw new WeatherError('limited');
    if (!response.ok) throw new WeatherError('upstream');

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) throw new WeatherError('schema');
      throw error;
    }
    return normalize(payload, new Date(), requestedUrl);
  } catch (error) {
    if (error instanceof WeatherError) throw error;
    if (controller.signal.aborted) throw new WeatherError('timeout');
    throw new WeatherError(navigator.onLine === false ? 'offline' : 'network');
  } finally {
    clearTimeout(timer);
  }
}
