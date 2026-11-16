import { adaptations, concerns, schedules } from './functional-care.mjs';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string';
const optional = (value, check) => value === undefined || check(value);
const arrayOf = (value, check) => Array.isArray(value) && value.every(check);
const fields = (value, names, check) => names.every(key => optional(value[key], check));
const dateKey = value => string(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const periods = ['morning', 'evening'];
const skinKeys = ['sensitivity', 'dryness', 'oiliness', 'redness'];
const skin = value => record(value) &&
  skinKeys.slice(0, 3).every(key => Number.isInteger(value[key]) && value[key] >= 1 && value[key] <= 5) &&
  ['없음', '있음'].includes(value.redness) && fields(value, ['acne', 'acneType', 'cleansingContext'], string) &&
  optional(value.stinging, stinging => ['', '있음', '없음'].includes(stinging)) &&
  fields(value, ['tDry', 'tOil', 'cheekDry', 'cheekOil'], level => Number.isInteger(level) && level >= 1 && level <= 5);
const used = value => arrayOf(value, item => record(item) && string(item.id) && string(item.name) &&
  optional(item.families, families => arrayOf(families, family => ['레티노이드', '비타민 C', 'AHA', 'BHA', '기타'].includes(family))) &&
  optional(item.rinse, rinse => typeof rinse === 'boolean'));
const picks = value => arrayOf(value, item => record(item) && string(item.name) && optional(item.reason, string));
const periodMap = (value, check) => record(value) &&
  Object.entries(value).every(([key, item]) => periods.includes(key) && check(item));

function session(value) {
  return record(value) && optional(value.skin, skin) && optional(value.used, used) &&
    optional(value.picks, picks) && optional(value.cleansingContext, string) &&
    optional(value.complete, complete => typeof complete === 'boolean');
}

function reaction(value) {
  return record(value) && dateKey(value.usedDay) && used(value.used) &&
    record(value.changes) && Object.entries(value.changes).every(([key, change]) =>
      skinKeys.includes(key) && ['', '증가', '감소', '변화 없음'].includes(change)) &&
    arrayOf(value.signs, sign => ['따가움', '붉어짐', '트러블'].includes(sign)) &&
    string(value.note) && string(value.productId) &&
    (!value.productId || value.used.some(product => product.id === value.productId));
}

function journalEntry(value) {
  return record(value) && optional(value.skin, skin) && optional(value.picks, picks) &&
    optional(value.sessions, sessions => periodMap(sessions, session)) &&
    optional(value.reactions, reactions => periodMap(reactions, reaction)) &&
    optional(value.careConcerns, selected => arrayOf(selected, concern => concerns.includes(concern))) &&
    fields(value, ['city', 'activity', 'outingTime'], string) &&
    optional(value.weather, weather => weather === null || (record(weather) &&
      Number.isFinite(weather.humidity) && fields(weather, ['uv', 'temperature'], n => n === null || Number.isFinite(n))));
}

function product(value) {
  return record(value) && ['id', 'brand', 'name', 'type'].every(key => string(value[key]) && value[key].trim()) &&
    fields(value, ['note', 'moisture', 'ingredients', 'avoidIngredients', 'purpose', 'cleanserType', 'reaction', 'catalogSource'], string) &&
    optional(value.purposes, purposes => arrayOf(purposes, string)) &&
    optional(value.active, active => typeof active === 'boolean') &&
    fields(value, ['openedOn', 'startedOn'], value => value === '' || dateKey(value)) &&
    optional(value.usagePlan, string) &&
    optional(value.functionalCare, care => record(care) &&
      optional(care.schedule, value => value === '' || Object.hasOwn(schedules, value)) &&
      optional(care.adaptation, value => value === '' || Object.hasOwn(adaptations, value)) &&
      optional(care.period, value => value === '' || periods.includes(value)) &&
      optional(care.contact, value => ['', 'rinse', 'leave'].includes(value)) &&
      optional(care.days, value => Number.isInteger(value) && value >= 1 && value <= 365) &&
      (care.schedule !== 'custom' || Number.isInteger(care.days)) &&
      optional(care.startedOn, value => value === '' || dateKey(value)) &&
      optional(care.directions, value => typeof value === 'boolean') && optional(care.note, string)) &&
    optional(value.useStatus, status => ['', 'using', 'paused'].includes(status)) &&
    optional(value.caution, caution => ['', 'hold', 'resume'].includes(caution));
}

export function mergePersonalBackup(current, backup) {
  if (!record(backup) || backup.version !== 1 || !record(backup.data)) throw new Error('backup');
  const { products, journal } = backup.data;
  if (!arrayOf(products, product) || new Set(products.map(item => item.id)).size !== products.length ||
      !record(journal) || !Object.entries(journal).every(([key, value]) => dateKey(key) && journalEntry(value))) {
    throw new Error('backup');
  }
  const ids = new Set(current.products.map(item => item.id));
  return {
    products: [...current.products, ...products.filter(item => !ids.has(item.id))],
    journal: { ...journal, ...current.journal }
  };
}
