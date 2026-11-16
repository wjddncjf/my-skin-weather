import { snatureListings } from './snature-catalog.mjs';
import { koreanBrandListings } from './korean-brand-catalog.mjs?view=mildlab';

const deepToner = {
  brand: '더랩바이블랑두',
  aliases: '더랩 THE LAB by BLANC DOUX 올리고 히알루론산 딥토너 올리고 히알 딥토너 저분자 히알 토너',
  type: '토너',
  purposes: ['수분 공급', '보습'],
  ingredients: '정제수, 부틸렌글라이콜, 1,2-헥산다이올, 글리세린, 베타-글루칸, 베타인, 소듐하이알루로네이트(2,700 ppm), 판테놀, 솔비톨, 아세틸글루코사민, 글루쿠로닉애씨드, 알란토인, 토코페롤, 에틸헥실글리세린, 다이소듐이디티에이'
};

const catalog = [
  {
    brand: '더랩바이블랑두',
    name: '올리고 히알루론산 선 에센스 40ml',
    aliases: '더랩 THE LAB by BLANC DOUX SUN ESSENCE',
    type: '선크림',
    purposes: ['자외선 차단'],
    ingredients: '정제수, 다이부틸아디페이트, 프로판다이올, 디에칠아미노하이드록시벤조일헥실벤조에이트, 폴리메틸실세스퀴옥세인, 에칠헥실트리아존, 메칠렌비스-벤조트리아졸릴테트라메칠부틸페놀, 코코-카프릴레이트/카프레이트, 카프릴릴메티콘, 디에칠헥실부타미도트리아존, 글리세린, 1,2-헥산다이올, 부틸렌글라이콜, 하이드롤라이즈드하이알루로닉애씨드(1,000 ppm), 펜틸렌글라이콜, 베헤닐알코올, 폴리C10-30알킬아크릴레이트, 폴리글리세릴-3메틸글루코오스다이스테아레이트, 데실글루코사이드, 트로메타민, 카보머, 아크릴레이트/C10-30알킬아크릴레이트크로스폴리머, 소듐스테아로일글루타메이트, 폴리아크릴레이트크로스폴리머-6, 에틸헥실글리세린, 잔탄검, t-부틸알코올, 토코페롤',
    region: '더랩바이블랑두 국내 공식몰 · 40ml 전성분',
    source: 'https://blancdoux.com/product/올리고-히알루론산-선-에센스-40ml/52'
  },
  {
    brand: '더랩바이블랑두',
    name: '그린 플라보노이드 2.0 선 40ml',
    aliases: '더랩 THE LAB by BLANC DOUX GREEN FLAVONOID SUN',
    type: '선크림',
    purposes: ['자외선 차단'],
    ingredients: '정제수, 징크옥사이드, 프로판다이올, 부틸옥틸살리실레이트, 프로필헵틸카프릴레이트, 사이클로헥사실록세인, 카프릴릴메티콘, 코코-카프릴레이트/카프레이트, 아이소도데케인, 폴리글리세릴-3폴리다이메틸실록시에틸다이메티콘, 메틸트라이메티콘, 다이스테아다이모늄헥토라이트, 메틸메타크릴레이트크로스폴리머, 귤껍질추출물, 글리세린, 알란토인, 판테놀, 베타-글루칸, 글루코실헤스페리딘, 귀리커넬추출물, 아티초크잎추출물, 녹차수, 소듐하이알루로네이트, 메틸프로판다이올, 글리세릴카프릴레이트, 카프릴릴글라이콜, 1,2-헥산다이올, 하이드로제네이티드레시틴, 마그네슘설페이트, 트라이에톡시카프릴릴실레인, 폴리글리세릴-2다이폴리하이드록시스테아레이트, 라우릴폴리글리세릴-3폴리다이메틸실록시에틸다이메티콘, 폴리메틸실세스퀴옥세인, 폴리쿼터늄-51, 토코페롤, 에틸헥실글리세린',
    region: '더랩바이블랑두 국내 공식몰 · 40ml 전성분',
    source: 'https://blancdoux.com/product/detail.html?product_no=195'
  },
  {
    brand: '파티온',
    name: '노스카나인 트러블 세럼 30ml',
    aliases: 'FATION NOSCA9 TROUBLE SERUM 노스카9 트러블세럼',
    type: '세럼',
    purposes: ['진정', '수분 공급'],
    ingredients: '정제수, 글리세린, 다이프로필렌글라이콜, 판테놀, 1,2-헥산다이올, 펜틸렌글라이콜, 소듐하이알루로네이트, 다이에톡시에틸석시네이트, 하이드록시에틸우레아, 아크릴레이트/C10-30알킬아크릴레이트크로스폴리머, 암모늄아크릴로일다이메틸타우레이트/브이피코폴리머, 트로메타민, 알란토인, 하이드록시아세토페논, 에틸헥실글리세린, 폴리글리세릴-10라우레이트, 석시닉애씨드, 잔탄검, 소듐헤파린, 쑥잎추출물, 병풀추출물, 사과추출물, 토코페롤, 카프릴릴/카프릴글루코사이드, 하이드로제네이티드레시틴, 세라마이드엔피',
    region: '파티온 국내 공식몰 · 30ml 전성분',
    source: 'https://www.fation.co.kr/product/노스카나인-트러블-세럼/329/category/1/display/17/'
  },
  {
    brand: '에스트라',
    name: '아토베리어365 크림 80ml',
    aliases: 'AESTURA ATOBARRIER 365 CREAM 장벽크림',
    type: '크림',
    purposes: ['보습'],
    ingredients: '정제수, 부틸렌글라이콜, 글리세린, 부틸렌글라이콜다이카프릴레이트/다이카프레이트, 세틸에틸헥사노에이트, 스쿠알란, 펜타에리스리틸테트라아이소스테아레이트, 다이카프릴릴카보네이트, 베헤닐알코올, 다이메티콘, 하이드록시프로필비스팔미타마이드엠이에이, 스테아릭애씨드, 베타인, 만니톨, C14-22알코올, 팔미틱애씨드, 하이드록시프로필비스라우라마이드엠이에이, 아라키딜알코올, 콜레스테롤, 폴리아크릴레이트-13, C12-20알킬글루코사이드, 알란토인, 아라키딜글루코사이드, 나이아신아마이드, 세라마이드엔피, 글리세릴카프릴레이트, 에틸헥실글리세린, 하이드로제네이티드폴리아이소부텐, 카보머, 트로메타민, 다이메티콘올, 폴리글리세릴-10라우레이트, 하이드로제네이티드레시틴, 에틸헥실팔미테이트, 아크릴레이트/암모늄메타크릴레이트코폴리머, 솔비탄아이소스테아레이트, 실리카, 피토스핑고신, 스핑고리피드, 아라키딕애씨드, 토코페롤, 올레익애씨드',
    region: '에스트라 한국 공식몰 · 80ml 전성분',
    source: 'https://www.aestura.com/web/product/view.do?prdSeq=1021'
  },
  {
    brand: '에스트라',
    name: '아토베리어365 하이드로 수딩크림 80ml',
    aliases: 'AESTURA ATOBARRIER 365 HYDRO SOOTHING CREAM 수딩 크림',
    type: '크림',
    purposes: ['수분 공급', '보습'],
    ingredients: '정제수, 글리세린, 부틸렌글라이콜, 다이메티콘, 스쿠알란, 1,2-헥산다이올, 베타인, 세테아릴알코올, 암모늄아크릴로일다이메틸타우레이트/브이피코폴리머, 하이드로제네이티드쌀겨오일, 하이드로제네이티드레시틴, 폴리글리세릴-3메틸글루코오스다이스테아레이트, 폴리아크릴레이트크로스폴리머-6, 만니톨, 세틸-피지하이드록시에틸팔미타마이드, 스테아릭애씨드, 에틸헥실글리세린, 글리세릴카프릴레이트, 프로판다이올, 글리세릴스테아레이트, 소듐메타포스페이트, 세라마이드엔피, 카보머, 팔미틱애씨드, 실리카, 징크클로라이드, 콜레스테롤, 베타-글루칸, 스핑고리피드, 소듐하이알루로네이트, 하이드록시프로필메틸셀룰로오스, 미리스틱애씨드, 프로필렌글라이콜, 라우릭애씨드, 토코페롤',
    region: '에스트라 한국 공식몰 · 80ml 전성분',
    source: 'https://www.aestura.com/web/product/view.do?prdSeq=1148'
  },
  {
    brand: '에스트라',
    name: '더마UV365 장벽수분 무기자차 선크림',
    aliases: 'AESTURA DERMA UV 365 MINERAL SUNSCREEN 썬크림',
    type: '선크림',
    purposes: ['자외선 차단'],
    ingredients: '정제수, 징크옥사이드, 사이클로헥사실록세인, 프로판다이올, 부틸옥틸살리실레이트, 프로필헵틸카프릴레이트, 아이소도데케인, 폴리글리세릴-3폴리다이메틸실록시에틸다이메티콘, 카프릴릴메티콘, 다이실록세인, 다이스테아다이모늄헥토라이트, 마그네슘설페이트, 트라이에톡시카프릴릴실레인, 1,2-헥산다이올, 폴리메틸실세스퀴옥세인, 폴리글리세릴-2다이폴리하이드록시스테아레이트, 라우릴폴리글리세릴-3폴리다이메틸실록시에틸다이메티콘, 알란토인, 카프릴릴글라이콜, 글리세릴카프릴레이트, 에틸헥실글리세린, 소듐하이알루로네이트, 세라마이드엔피, 토코페롤, 소듐아세틸레이티드하이알루로네이트, 하이드롤라이즈드하이알루로닉애씨드',
    region: '에스트라 한국 공식몰 전성분',
    source: 'https://www.aestura.com/web/product/view.do?prdSeq=1107'
  },
  {
    brand: '에스트라',
    name: '더마UV365 비타C 광채수분 선크림',
    aliases: 'AESTURA DERMA UV 365 VITA C SUNSCREEN 비타씨 유기자차 썬크림',
    type: '선크림',
    purposes: ['자외선 차단'],
    ingredients: '정제수, 비스-에칠헥실옥시페놀메톡시페닐트리아진, 다이부틸아디페이트, 다이에틸헥실석시네이트, 에칠헥실트리아존, 디에칠아미노하이드록시벤조일헥실벤조에이트, 프로판다이올, 폴리실리콘-15, 나이아신아마이드, 1,2-헥산다이올, 실리카, 페닐트라이메티콘, 베헤닐알코올, 글리세릴스테아레이트에스이, 아크릴레이트/C10-30알킬아크릴레이트크로스폴리머, 트로메타민, 알란토인, 소듐메틸스테아로일타우레이트, 암모늄폴리아크릴로일다이메틸타우레이트, 폴리글리세릴-3메틸글루코오스다이스테아레이트, 글리세릴카프릴레이트, 에틸헥실글리세린, 아데노신, 소듐메타포스페이트, 아스코빌테트라이소팔미테이트, 세라마이드엔피, 하이드롤라이즈드하이알루로닉애씨드, 토코페롤',
    region: '에스트라 한국 공식몰 전성분',
    source: 'https://www.aestura.com/web/product/view.do?prdSeq=1140'
  },
  {
    brand: '코스알엑스',
    name: '약산성 굿모닝 젤 클렌저 150ml',
    aliases: 'COSRX LOW PH GOOD MORNING GEL CLEANSER 굿모닝클렌저',
    type: '클렌저',
    cleanserType: '약산성',
    purposes: ['세정'],
    ingredients: '정제수, 코카미도프로필베타인, 소듐라우로일메틸이세티오네이트, 소듐클로라이드, 폴리솔베이트20, 때죽나무가지/열매/잎추출물, 부틸렌글라이콜, 효모발효물, 삼나무잎추출물, 연꽃잎추출물, 대왕송잎추출물, 당느릅나무뿌리추출물, 달맞이꽃추출물, 칡뿌리추출물, 티트리잎오일, 알란토인, 카프릴릴글라이콜, 에틸헥실글리세린, 베타인살리실레이트, 시트릭애씨드, 에틸헥산다이올, 1,2-헥산다이올, 트라이소듐에틸렌다이아민다이석시네이트, 소듐벤조에이트, 다이소듐이디티에이',
    region: '코스알엑스 한국 공식몰 · 150ml 전성분',
    source: 'https://www.cosrx.co.kr/m/product.html?branduid=222'
  },
  {
    brand: '에스네이처',
    name: '아쿠아 스쿠알란 수분크림 60ml',
    aliases: 'S.NATURE SNATURE Aqua Squalane Cream 스쿠알란 크림 수분 크림',
    type: '크림',
    purposes: ['수분 공급', '보습'],
    ingredients: '정제수, 스쿠알란(150,000 ppm), 글리세린, 1,2-헥산다이올, 베타인, 판테놀, 소듐하이알루로네이트, 하이드롤라이즈드콜라겐, 하이드록시프로필트라이모늄하이알루로네이트, 하이드롤라이즈드하이알루로닉애씨드, 소듐아세틸레이티드하이알루로네이트, 아세틸헥사펩타이드-8, 아데노신, 하이알루로닉애씨드, 하이드롤라이즈드소듐하이알루로네이트, 소듐하이알루로네이트크로스폴리머, 포타슘하이알루로네이트, 아크릴레이트/C10-30알킬아크릴레이트크로스폴리머, 알지닌, 알란토인, 자일리틸글루코사이드, 안하이드로자일리톨, 자일리톨, 글루코오스, 부틸렌글라이콜, 암모늄아크릴로일다이메틸타우레이트/브이피코폴리머, 카프릴릴글라이콜',
    region: '에스네이처 공식몰 · 60ml 전성분',
    source: 'https://m.snature.co.kr/product/detail.html?product_no=74',
    references: [
      ['공식 상품고시 이미지', 'https://cafe24img.poxo.com/smasteri/web/upload/new_design/cream/60ml/cream60_info.jpg'],
      ['올리브영 제품 정보', 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000152046']
    ]
  },
  {
    ...deepToner,
    name: '올리고 히알루론산 딥 토너 200ml',
    region: '한국 브랜드 공식몰 · 200ml 전성분',
    source: 'https://blancdoux.com/product/올리고-히알루론산-딥-토너-200ml/169',
  },
  {
    ...deepToner,
    name: '올리고 히알루론산 딥 토너 500ml',
    region: '한국 브랜드 공식몰 · 500ml 전성분',
    source: 'https://blancdoux.com/product/detail.html?cate_no=91&display_group=1&product_no=171',
    references: [
      ['올리브영 제품 정보', 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000207054'],
      ['화해 제품 정보', 'https://www.hwahae.co.kr/goods/56189?goods_tab=review_ingredients']
    ]
  },
  {
    brand: '더랩바이블랑두',
    name: '올리고 히알루론산 부스팅 앰플 30ml',
    aliases: '더랩 THE LAB by BLANC DOUX 히알 부스팅앰플 수분앰플',
    type: '앰플',
    purposes: ['수분 공급'],
    ingredients: '정제수, 부틸렌글라이콜, 글리세린, 1,2-헥산다이올, 펜틸렌글라이콜, 글리세릴글루코사이드, 하이드록시에틸셀룰로오스, 소듐하이알루로네이트(10,000 ppm), 자일리틸글루코사이드, 꽃송이버섯추출물, 백설차잎추출물, 자일리톨, 글리세레스-26, 트로메타민, 에틸헥실글리세린, 안하이드로자일리톨, 알란토인, 글루코오스, 토코페롤, 카보머, 소듐클로라이드',
    region: '한국 브랜드 공식몰 · 30ml 전성분',
    source: 'https://blancdoux.com/product/올리고-히알루론산-부스팅-앰플-30ml/34/'
  },
  {
    brand: 'The Ordinary',
    name: 'Niacinamide 10% + Zinc 1%',
    aliases: '디오디너리 나이아신아마이드 징크 아연',
    type: '세럼',
    purposes: ['유분 관리'],
    ingredients: 'Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin',
    region: '미국 공식 제품 페이지',
    source: 'https://theordinary.com/en-us/niacinamide-10-zinc-1-serum-100436.html'
  },
  {
    brand: 'The Ordinary',
    name: '100% Plant-Derived Squalane',
    aliases: '디오디너리 스쿠알란 식물유래 스쿠알레인',
    type: '세럼',
    purposes: ['보습'],
    ingredients: 'Squalane',
    region: '푸에르토리코 공식 제품 페이지',
    source: 'https://theordinary.com/en-pr/100-plant-derived-squalane-face-oil-100398.html'
  }
];

const normalize = text => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

const snatureBySource = new Map(catalog.filter(product => product.brand === '에스네이처')
  .map(product => [product.source, product]));

const snatureCatalog = snatureListings.filter(([, name]) => !/세트|키트|\bSET\b|\d+\s*STEP/i.test(name)).map(([id, name]) => {
  const source = 'https://m.snature.co.kr/product/detail.html?product_no=' + id;
  const verified = snatureBySource.get(source);
  if (verified) return verified;
  return {
    brand: '에스네이처', name, aliases: 'S.NATURE SNATURE',
    type: listedType(name),
    region: '에스네이처 국내 공식몰', source
  };
});
function productKey(brand, source) {
  const url = new URL(source);
  const id = url.searchParams.get('prdSeq') ?? url.searchParams.get('product_no') ??
    url.pathname.match(/^\/product\/[^/]+\/(\d+)(?:\/|$)/)?.[1];
  return id ? brand + ':' + id : null;
}

const verifiedKeys = new Set(catalog.map(product => productKey(product.brand, product.source)).filter(Boolean));
const additionalCatalog = koreanBrandListings.flatMap(([brand, aliases, listings]) =>
  listings.filter(([, source]) => !verifiedKeys.has(productKey(brand, source))).map(([name, source]) => ({
    brand, name, aliases, type: listedType(name), source,
    region: source.includes('oliveyoung.co.kr/store/display/') ? '올리브영 브랜드관' :
      source.includes('oliveyoung.co.kr/') ? '올리브영 제품 정보' :
      source.includes('larocheposay.co.kr/product/list') || source.endsWith('/product/allList.do')
      ? '국내 공식몰 상품 목록' : '국내 공식몰 제품 정보'
  })));
function listedType(name) {
  if (/클렌징|클렌저|클렌져|세안제/.test(name)) return '클렌저';
  if (/선크림|썬크림|선스크린|선세럼|선플루이드|선로션|선젤|선밀크/.test(name)) return '선크림';
  if (/마스크|패치|도자기팩/.test(name)) return '기타';
  if (/패드/.test(name)) return /토너\s*패드/.test(name) ? '토너' : '기타';
  const type = name.match(/토너|앰플|세럼|크림|로션|에센스/g)?.at(-1);
  return type === '에센스' ? '세럼' : type ?? '';
}

const searchableCatalog = [...snatureCatalog, ...catalog.filter(product => !snatureBySource.has(product.source)), ...additionalCatalog];

const sizePattern = /(?<![\d.])\d+(?:\.\d+)?\s*(?:ml|mg|kg|g|l|매)(?![a-z\d])/gi;
const productsByName = new Map();
for (const product of searchableCatalog) {
  const name = product.name.normalize('NFKC');
  const baseName = name.replace(sizePattern, '').replace(/\(\s*\)|\[\s*\]/g, '').trim();
  const key = normalize(product.brand) + ':' + normalize(baseName);
  if (!productsByName.has(key)) productsByName.set(key, { name: baseName, products: [] });
  productsByName.get(key).products.push(product);
}

export const searchExamples = ['딥토너', '아토베리어', '어성초 토너', '녹두 클렌저', '넘버즈인', '에스네이처'];

export const catalogBrands = [...new Set(searchableCatalog.map(product => product.brand))]
  .sort((a, b) => a.localeCompare(b, 'ko'));

export function catalogProductSize(name) {
  return name.normalize('NFKC').match(sizePattern)?.join(' · ') ?? '';
}

export function catalogProductIdentity({ brand, name }) {
  return normalize(brand) + ':' + normalize(name);
}

const relatedTerms = new Set(['앰플', '세럼', '에센스', 'ampoule', 'serum', 'essence']);
const hasRelatedType = product => /앰플|세럼|에센스/.test(product.type || '') ||
  /앰플|세럼|에센스|ampoule|serum|essence/i.test(product.name);

const normalizeSearch = text => normalize(text).replaceAll('썬크림', '선크림');

export function searchProducts(query, { brand = '', types = [], verified = false, sort = 'relevance' } = {}) {
  const groups = query.split(/[,，]/).map(part => part.split(/\s+/).map(normalizeSearch).filter(Boolean)).filter(terms => terms.length);
  if (!groups.length && !brand && !types.length && !verified) return [];
  const results = [];
  for (const group of productsByName.values()) {
    const available = group.products.filter(product => (!brand || product.brand === brand) &&
      (!types.length || types.includes(product.type || '')) && (!verified || product.ingredients));
    const matches = available.map(product => {
      const name = normalizeSearch(product.name);
      const searchable = normalizeSearch([product.brand, product.name, product.aliases, product.type === '선크림' ? product.type : ''].join(' '));
      const scores = groups.map(terms => {
        if (!terms.every(term => searchable.includes(term) || (relatedTerms.has(term) && hasRelatedType(product)))) return 0;
        const exact = terms.every(term => searchable.includes(term));
        const phrase = terms.join('');
        return (exact ? 10 : 1) + (name.includes(phrase) ? 4 : 0) + (name.startsWith(phrase) ? 2 : 0);
      });
      return { product, score: groups.length ? Math.max(...scores) : 1 };
    }).filter(match => match.score > 0);
    matches.sort((a, b) => b.score - a.score || Number(Boolean(b.product.ingredients)) - Number(Boolean(a.product.ingredients)));
    if (!matches.length) continue;
    const [{ product: selected, score }] = matches;
    results.push({
      name: group.name, selected, score,
      products: available.map(product => ({ product, size: catalogProductSize(product.name) }))
    });
  }
  return results.sort((a, b) => {
    if (sort === 'brand') return a.selected.brand.localeCompare(b.selected.brand, 'ko') || a.name.localeCompare(b.name, 'ko');
    const verifiedFirst = Number(Boolean(b.selected.ingredients)) - Number(Boolean(a.selected.ingredients));
    return sort === 'verified' ? verifiedFirst || b.score - a.score : b.score - a.score || verifiedFirst;
  });
}
