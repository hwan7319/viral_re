/**
 * 🎯 Precision Category Classification Engine
 * Solves city branch name substring collisions (e.g. 청주점, 광주점, 파주점, 제주점 containing '주점')
 * and single-character collisions (e.g. '바' matching 바디, 바이크, 바질).
 */
export function classifyCampaignCategory(
  title: string = '',
  description: string = '',
  rawCategoryArray: string[] = []
): string {
  const catText = (rawCategoryArray || []).join(' ');
  const titleText = (title || '').trim();
  const descText = (description || '').trim();

  // 1. Sanitize city branch names that contain '주점' (e.g. 청주점, 광주점, 원주점, 전주점, 파주점, 제주점)
  const cleanTitle = titleText.replace(/(청주점|광주점|원주점|전주점|진주점|경주점|파주점|제주점|공주점|나주점|충주점|양주점|영주점|상주점|여주점)/g, '');
  const cleanCatText = catText.replace(/(청주점|광주점|원주점|전주점|진주점|경주점|파주점|제주점|공주점|나주점|충주점|양주점|영주점|상주점|여주점)/g, '');
  const fullCleanText = `${cleanTitle} ${descText} ${cleanCatText}`.toLowerCase();

  // 2. Explicit Revu category tags (Highest priority)
  if (cleanCatText.includes('주점') || cleanCatText.includes('술집') || cleanCatText.includes('이자카야') || cleanCatText.includes('포차') || cleanCatText.includes('바(bar)')) {
    return 'food-pub';
  }
  if (cleanCatText.includes('카페') || cleanCatText.includes('디저트') || cleanCatText.includes('베이커리')) {
    return 'food-cafe';
  }
  if (cleanCatText.includes('맛집') || cleanCatText.includes('식당') || cleanCatText.includes('음식점')) {
    return 'food-korean';
  }
  if (cleanCatText.includes('스킨케어') || cleanCatText.includes('화장품') || cleanCatText.includes('뷰티') || cleanCatText.includes('메이크업')) {
    return 'beauty-cosmetic';
  }
  if (cleanCatText.includes('헤어') || cleanCatText.includes('미용실') || cleanCatText.includes('네일') || cleanCatText.includes('에스테틱')) {
    return 'beauty-hair';
  }
  if (cleanCatText.includes('숙박') || cleanCatText.includes('호텔') || cleanCatText.includes('펜션') || cleanCatText.includes('풀빌라')) {
    return 'travel-stay';
  }
  if (cleanCatText.includes('주방용품') || cleanCatText.includes('생활용품') || cleanCatText.includes('디지털') || cleanCatText.includes('가전') || cleanCatText.includes('잡화')) {
    return 'life';
  }
  if (cleanCatText.includes('농수산물') || cleanCatText.includes('식품') || cleanCatText.includes('밀키트')) {
    return 'health-fresh';
  }
  if (cleanCatText.includes('패션') || cleanCatText.includes('의류') || cleanCatText.includes('신발') || cleanCatText.includes('가방')) {
    return 'fashion-clothing';
  }

  // 3. Keyword-based matching with strict boundary/context checking
  // Food & Pub
  if (/(술집|주점|이자카야|포차|수제맥주|와인바|칵테일바|감성바|위스키|하이볼|요리주점|다이닝바|호프집)/.test(fullCleanText)) {
    return 'food-pub';
  }
  if (/(카페|디저트|베이커리|마카롱|케이크|아인슈페너|원두|로스팅|소금빵)/.test(fullCleanText)) {
    return 'food-cafe';
  }
  if (/(삼겹살|한우|갈비|치킨|피자|파스타|초밥|스시|뷔페|곱창|족발|보쌈|해물|고기|맛집|식당)/.test(fullCleanText)) {
    return 'food-korean';
  }

  // Beauty & Skin & Hair
  if (/(화장품|뷰티|스킨케어|토너|패드|크림|앰플|세럼|마스크팩|마스크|클렌징|바디워시|바디로션|샴푸|선크림|쿠션|립스틱)/.test(fullCleanText)) {
    return 'beauty-cosmetic';
  }
  if (/(헤어|미용실|염색|두피|속눈썹|네일|왁싱|에스테틱)/.test(fullCleanText)) {
    return 'beauty-hair';
  }

  // Accommodation & Travel
  if (/(숙박|호텔|펜션|풀빌라|리조트|게스트하우스|글램핑|모텔)/.test(fullCleanText)) {
    return 'travel-stay';
  }
  if (/(여행|레저|관광|티켓|입장권|스튜디오|렌트카|투어)/.test(fullCleanText)) {
    return 'travel-leisure';
  }

  // Food & Health Supplies
  if (/(밀키트|반찬|과일|신선식품|영양제|유산균|홍삼|비타민)/.test(fullCleanText)) {
    return 'health-fresh';
  }

  // Fashion
  if (/(의류|패션|가방|신발|악세사리|주얼리|지갑|백팩|미니백)/.test(fullCleanText)) {
    return 'fashion-clothing';
  }

  // Life & Appliances (Default for living, digital, bike, soap, etc.)
  if (/(주방세제|세제|치약|가습기|청소기|휴지|바이크|자전거|유아|반려|펫|가전|디지털|생활)/.test(fullCleanText)) {
    return 'life';
  }

  return 'life';
}
