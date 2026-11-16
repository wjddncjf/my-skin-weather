const functionalNames = [
  ['레티노이드', '레티놀', 'retinol'],
  ['레티노이드', '레티날', 'retinal', 'retinaldehyde', '레티날데하이드', '레티날데히드'],
  ['레티노이드', '레티닐팔미테이트', 'retinyl palmitate'],
  ['비타민 C', '아스코빅애씨드', 'ascorbic acid', 'l-ascorbic acid', '아스코르브산'],
  ['비타민 C', '아스코빌글루코사이드', 'ascorbyl glucoside'],
  ['비타민 C', '소듐아스코빌포스페이트', 'sodium ascorbyl phosphate'],
  ['비타민 C', '마그네슘아스코빌포스페이트', 'magnesium ascorbyl phosphate'],
  ['비타민 C', '3-O-에틸아스코빅애씨드', '3-o-ethyl ascorbic acid', 'ethyl ascorbic acid'],
  ['비타민 C', '테트라헥실데실아스코베이트', 'tetrahexyldecyl ascorbate'],
  ['AHA', '글라이콜릭애씨드', 'glycolic acid', '글리콜산'],
  ['AHA', '락틱애씨드', 'lactic acid', '젖산'],
  ['AHA', '만델릭애씨드', 'mandelic acid', '만델산'],
  ['BHA', '살리실릭애씨드', 'salicylic acid', '살리실산'],
  ['BHA', '베타인살리실레이트', 'betaine salicylate'],
  ['기타', '나이아신아마이드', 'niacinamide', 'nicotinamide', '니아신아마이드']
];

const groups = [
  { label: '수분 공급', names: [
    ['글리세린', 'glycerin', 'glycerol'], ['히알루론산', 'hyaluronic acid'],
    ['소듐하이알루로네이트', 'sodium hyaluronate'], ['베타인', 'betaine'],
    ['부틸렌글라이콜', 'butylene glycol'], ['트레할로오스', 'trehalose']
  ] },
  { label: '진정 관련', names: [
    ['판테놀', 'panthenol'], ['알란토인', 'allantoin'],
    ['마데카소사이드', 'madecassoside'], ['병풀추출물', 'centella asiatica extract'],
    ['베타글루칸', 'beta-glucan']
  ] },
  { label: '보습·장벽 관련', names: [
    ['세라마이드엔피', 'ceramide np'], ['세라마이드에이피', 'ceramide ap'],
    ['스쿠알란', 'squalane'], ['시어버터', 'shea butter', 'butyrospermum parkii butter']
  ] },
  { label: '기능성 루틴에 쓰이는 성분', names: functionalNames.map(([, ...aliases]) => aliases) },
  { label: '민감한 날 확인할 성분', names: [
    ['레티놀', 'retinol'], ['레티날', 'retinal', 'retinaldehyde'],
    ['살리실릭애씨드', 'salicylic acid'], ['글라이콜릭애씨드', 'glycolic acid'],
    ['락틱애씨드', 'lactic acid'], ['향료', 'fragrance', 'parfum'],
    ['변성알코올', 'alcohol denat'], ['리모넨', 'limonene'], ['리날룰', 'linalool']
  ] }
];

const normalizeName = name => name.normalize('NFKC').toLowerCase().replace(/[\s.\-]/g, '');

const ingredientIndex = new Map();
for (const { label, names } of groups) {
  for (const aliases of names) {
    for (const alias of aliases) {
      const key = normalizeName(alias);
      if (!ingredientIndex.has(key)) ingredientIndex.set(key, { name: aliases[0], roles: [] });
      const entry = ingredientIndex.get(key);
      if (!entry.roles.includes(label)) entry.roles.push(label);
    }
  }
}

export function ingredientDetails(text = '') {
  return text.split(/(?<!\d),|,(?!\d)|[，;；\n·]/).map(entry => {
    const input = entry.replace(/^\s*(전성분|ingredients)\s*[:：]?\s*/i, '').trim();
    if (!input) return null;
    const dose = input.match(/\s*(?:\(\s*)?(\d+(?:[.,]\d+)?\s*(?:%|ppm))\s*\)?$/i);
    const name = dose ? input.slice(0, dose.index) : input;
    const match = [name, ...name.split(/[()]/)].map(alias => ingredientIndex.get(normalizeName(alias))).find(Boolean);
    return { input, ...match, concentration: dose?.[1] };
  }).filter(Boolean);
}

export function analyzeIngredients(text = '') {
  const entries = ingredientDetails(text);
  return groups.map(({ label }) => ({
    label, ingredients: [...new Set(entries.filter(entry => entry.roles?.includes(label)).map(entry => entry.name))]
  })).filter(group => group.ingredients.length);
}

const familyByName = new Map(functionalNames.map(([family, name]) => [name, family]));

export function functionalIngredients(text) {
  return ingredientDetails(text).filter(entry => familyByName.has(entry.name))
    .map(({ name, concentration }) => ({ name, concentration, family: familyByName.get(name),
      form: familyByName.get(name) === '비타민 C' ? (name === '아스코빅애씨드' ? '순수형' : '유도체') : name }));
}
