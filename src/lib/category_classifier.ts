/**
 * Source-independent category classifier.
 *
 * Categories returned here are the same canonical keys used by the filter UI.
 * Keep this conservative: an unknown campaign belongs in `etc`, never in an
 * attractive but unsupported category.
 */
export function classifyCampaignCategory(
  title = '',
  description = '',
  rawCategoryArray: string[] = [],
): string {
  const sourceCategory = rawCategoryArray.join(' ').replace(/(청주점|광주점|원주점|전주점|진주점|경주점|파주점|제주점|공주점|나주점|충주점|양주점|영주점|상주점|여주점)/g, '');
  const cleanTitle = title.replace(/(청주점|광주점|원주점|전주점|진주점|경주점|파주점|제주점|공주점|나주점|충주점|양주점|영주점|상주점|여주점)/g, '');
  const text = `${cleanTitle} ${description} ${sourceCategory}`.toLowerCase();
  const has = (pattern: RegExp) => pattern.test(text);

  // Explicit source categories are trusted when they are sufficiently specific.
  if (has(/(?:주점|술집|이자카야|포차|와인바|칵테일바|펍)/)) return 'food-pub';
  if (has(/(?:카페|디저트|베이커리|제과|커피)/)) return 'food-cafe';
  if (has(/(?:오마카세)/)) return 'food-omakase';
  if (has(/(?:일식|일본식|스시|초밥|사시미|라멘|돈카츠)/)) return 'food-japanese';
  if (has(/(?:중식|중국식|마라탕|마라샹궈|짜장|짬뽕|훠궈)/)) return 'food-chinese';
  if (has(/(?:양식|이탈리안|파스타|피자|스테이크|브런치|버거)/)) return 'food-western';
  if (has(/(?:삼겹살|갈비|한우|소고기|돼지고기|정육|식육|고기구이|양고기|흑염소)/)) return 'food-meat';
  if (has(/(?:떡볶이|분식|김밥|순대|닭발)/)) return 'food-snack';
  if (has(/(?:한식|국밥|갈비|삼겹살|한우|곱창|족발|보쌈|닭갈비|감자탕|냉면|칼국수|해장국|백반|찌개|고기집|고깃집|전집|맛있는전시회|돼지|치킨|떡볶이|분식|김밥|순대|닭발|닭도리탕|육회|식육|정육|불고기|제육|쭈꾸미|쭈꾸미|돈육|소고기|샤브샤브|쌀국수)/)) return 'food-korean';

  if (has(/(?:필라테스|피트니스|헬스장|헬스|pt\b|요가|수영|테니스|골프|운동)/i)) return 'health-fitness';
  if (has(/(?:영양제|유산균|비타민|홍삼|건강식품|프로바이오틱스|단백질)/)) return 'health-food';
  if (has(/(?:다이어트\s*관리|체형\s*관리|슬리밍|비만\s*관리)/)) return 'beauty-body';
  if (has(/(?:피부관리|에스테틱|왁싱|속눈썹|마사지|스파|풋케어|발관리|슬리밍|다이어트관리)/)) return 'beauty-spa';
  if (has(/(?:미용실|헤어|염색|펌|네일|두피|시술|커트|탈색)/)) return 'beauty-salon';
  if (has(/(?:화장품|스킨케어|메이크업|토너|크림|앰플|세럼|마스크팩|클렌징|선크림|선스크린|립스틱|쿠션|샴푸|바디워시|향수|네일폴리시)/)) return 'beauty-cosmetics';

  if (has(/(?:도서|베스트셀러|소설|에세이|인터넷강의|인강|교육|학습지|학원|교재|워크북)/)) return 'book';
  if (has(/(?:호텔|펜션|풀빌라|리조트|글램핑|게스트하우스|모텔|숙박|스테이)/)) return 'accommodation';
  if (has(/(?:공연|전시(?:\s|관|회|티켓)|박물관|미술관|연극|뮤지컬|콘서트|영화관)/)) return 'culture';
  if (has(/(?:여행|관광|투어|레저|테마파크|놀이공원|아쿠아리움|렌트카|서핑|요트|스노보드|패러글라이딩|캠핑카|스키(?:장|체험|\s)|스쿠버|다이빙|낚시)/)) return 'travel';
  if (has(/(?:원데이클래스|공방|도예|가죽공예|뜨개|드로잉|베이킹클래스|쿠킹클래스|사진촬영|방탈출|diy|만들기키트|체험키트|스포츠파크|키즈카페|키즈런)/)) return 'hobby';

  if (has(/(?:유아|아동|아기|육아|기저귀|분유|젖병|유모차|카시트|베이비)/)) return 'baby';
  if (has(/(?:강아지|고양이|애견|반려동물|펫|사료|개껌|캣)/)) return 'pet';
  if (has(/(?:의류|패션|자켓|코트|셔츠|티셔츠|원피스|니트|바지|치마|아우터|아동복)/)) return 'fashion-clothing';
  if (has(/(?:가방|백팩|숄더백|신발|구두|운동화|스니커즈|모자|액세서리|악세사리|귀걸이|목걸이|시계|주얼리)/)) return 'fashion-accessory';
  if (has(/(?:자동차|연료첨가제|차량용|블랙박스|타이어|엔진오일)/)) return 'life-auto';
  if (has(/(?:가전|청소기|모니터|키보드|마우스|가습기|이어폰|헤드폰|스마트폰|충전기|디지털|안마기|자동차|연료첨가제|차량용|블랙박스|타이어)/)) return 'life-appliances';
  if (has(/(?:밀키트|신선식품|반찬|과일|조미료|가공식품|식품|커피원두)/)) return 'health-fresh';
  if (has(/(?:세제|섬유유연제|치약|칫솔|화장지|물티슈|침구|베개|가구|인테리어|식기|생활용품|수건|디퓨저|양말|보온용품|전통과자|한과|주방용품|문구|반려용품)/)) return 'life-goods';
  if (has(/(?:맛집|식당|음식점|레스토랑|뷔페|샤브|카레|해물|생선회|물회|횟집)/)) return 'food-korean';
  return 'etc';
}
