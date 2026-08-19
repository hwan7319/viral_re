import axios from 'axios';
import * as cheerio from 'cheerio';
import { insertOrUpdateCampaigns, Campaign } from './db';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

// D-Day 텍스트 날짜 변환
function parseDdayToDate(ddayText: string): string {
  const now = new Date();
  const namumMatch = ddayText.match(/(\d+)일\s*남음/);
  if (namumMatch) {
    const days = parseInt(namumMatch[1]);
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return targetDate.toISOString().split('T')[0];
  }
  const match = ddayText.match(/D-(\d+)/i);
  if (match) {
    const days = parseInt(match[1]);
    const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return targetDate.toISOString().split('T')[0];
  }
  if (ddayText.includes('오늘마감') || ddayText.includes('D-0')) {
    return now.toISOString().split('T')[0];
  }
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

// 남은 일수 숫자를 YYYY-MM-DD로 변환
function parseRemainDaysToDate(days: number): string {
  const now = new Date();
  const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return targetDate.toISOString().split('T')[0];
}

// 지원수 및 정원수 파싱
function parseCountText(text: string): { applyCount: number; limitCount: number } {
  let applyCount = 0;
  let limitCount = 10;
  try {
    const cleanText = text.replace(/,/g, '');
    const applyMatch = cleanText.match(/신청\s*(\d+)/);
    const limitMatch = cleanText.match(/모집\s*(\d+)/);
    if (applyMatch) applyCount = parseInt(applyMatch[1]);
    if (limitMatch) limitCount = parseInt(limitMatch[1]);
  } catch (e) {
    console.error(e);
  }
  return { applyCount, limitCount };
}

// 카테고리 자동 판별
function detectCategory(title: string, desc: string): string {
  const text = (title + ' ' + desc).toLowerCase();
  if (text.includes('카페') || text.includes('디저트') || text.includes('베이커리') || text.includes('빵') || text.includes('케이크') || text.includes('도넛') || text.includes('마카롱') || text.includes('음료') || text.includes('커피') || text.includes('빙수') || text.includes('에그타르트') || text.includes('화과자') || text.includes('아이스크림') || text.includes('티하우스')) return 'food-cafe';
  if (text.includes('술집') || text.includes('주점') || text.includes('이자카야') || text.includes('포차') || text.includes('와인') || text.includes('맥주') || text.includes('칵테일') || text.includes('펍') || text.includes('하이볼')) return 'food-pub';
  if (text.includes('삼겹살') || text.includes('고기') || text.includes('식사') || text.includes('레스토랑') || text.includes('맛집') || text.includes('한우') || text.includes('파스타') || text.includes('스시') || text.includes('뷔페') || text.includes('갈비') || text.includes('치킨') || text.includes('피자') || text.includes('돈까스') || text.includes('마라탕') || text.includes('양꼬치') || text.includes('횟집') || text.includes('곱창') || text.includes('통닭') || text.includes('닭발') || text.includes('식사권') || text.includes('족발') || text.includes('보쌈') || text.includes('초밥') || text.includes('샤브샤브') || text.includes('국밥') || text.includes('찌개') || text.includes('냉면') || text.includes('우동') || text.includes('라멘') || text.includes('떡볶이') || text.includes('대게') || text.includes('조개') || text.includes('한정식') || text.includes('정식') || text.includes('칼국수') || text.includes('전골') || text.includes('찜') || text.includes('분식') || text.includes('만두') || text.includes('해장국') || text.includes('곰탕') || text.includes('설렁탕') || text.includes('순대') || text.includes('아구찜') || text.includes('해신탕') || text.includes('갈치') || text.includes('조림') || text.includes('게장') || text.includes('삼계탕') || text.includes('오리') || text.includes('장어') || text.includes('페리카나') || text.includes('교촌') || text.includes('bhc') || text.includes('bbq') || text.includes('쿠우쿠우') || text.includes('애슐리') || text.includes('자유이용권') || text.includes('매장이용권') || text.includes('이용권') || text.includes('제공')) return 'food-restaurant';
  if (text.includes('밀키트') || text.includes('신선식품') || text.includes('과일') || text.includes('복숭아') || text.includes('수박') || text.includes('두부') || text.includes('어묵') || text.includes('육수') || text.includes('반찬') || text.includes('간식') || text.includes('한우선물') || text.includes('수제') || text.includes('김치') || text.includes('사골')) return 'health-fresh';
  if (text.includes('화장품') || text.includes('크림') || text.includes('앰플') || text.includes('에센스') || text.includes('세럼') || text.includes('선크림') || text.includes('마스크팩') || text.includes('쿠션') || text.includes('립스틱') || text.includes('뷰티') || text.includes('클렌징') || text.includes('토너') || text.includes('로션') || text.includes('메이크업')) return 'beauty-cosmetic';
  if (text.includes('헤어') || text.includes('미용실') || text.includes('염색') || text.includes('펌') || text.includes('클리닉') || text.includes('커트') || text.includes('바버') || text.includes('두피')) return 'beauty-hair';
  if (text.includes('피부') || text.includes('에스테틱') || text.includes('스파') || text.includes('마사지') || text.includes('속눈썹') || text.includes('네일') || text.includes('왁싱') || text.includes('체형') || text.includes('윤곽') || text.includes('리프팅')) return 'beauty-skin';
  if (text.includes('헬스') || text.includes('피트니스') || text.includes('요가') || text.includes('필라테스') || text.includes('pt') || text.includes('헬스장') || text.includes('운동') || text.includes('골프') || text.includes('테니스') || text.includes('수영')) return 'health-fitness';
  if (text.includes('영양제') || text.includes('건강식품') || text.includes('비타민') || text.includes('유산균') || text.includes('콜라겐') || text.includes('홍삼') || text.includes('프로틴') || text.includes('다이어트') || text.includes('즙')) return 'health-food';
  if (text.includes('숙박') || text.includes('호텔') || text.includes('펜션') || text.includes('풀빌라') || text.includes('글램핑') || text.includes('리조트') || text.includes('게스트하우스') || text.includes('모텔') || text.includes('캠핑')) return 'travel-stay';
  if (text.includes('여행') || text.includes('레저') || text.includes('관광') || text.includes('체험') || text.includes('방탈출') || text.includes('공연') || text.includes('전시') || text.includes('티켓') || text.includes('스튜디오') || text.includes('사진관') || text.includes('가족사진') || text.includes('웨딩') || text.includes('클래스') || text.includes('원데이클래스') || text.includes('아쿠아리움') || text.includes('키즈카페') || text.includes('노래방') || text.includes('렌트카') || text.includes('제주도') || text.includes('데이트')) return 'travel-leisure';
  if (text.includes('의류') || text.includes('패션') || text.includes('셔츠') || text.includes('티셔츠') || text.includes('원피스') || text.includes('바지') || text.includes('아우터') || text.includes('자켓') || text.includes('코트') || text.includes('속옷') || text.includes('모자')) return 'fashion-clothing';
  if (text.includes('가방') || text.includes('신발') || text.includes('스니커즈') || text.includes('뉴발란스') || text.includes('나이키') || text.includes('아디다스') || text.includes('구두') || text.includes('지갑') || text.includes('주얼리') || text.includes('목걸이') || text.includes('반지') || text.includes('귀걸이') || text.includes('시계') || text.includes('잡화')) return 'fashion-accessory';
  if (text.includes('강아지') || text.includes('고양이') || text.includes('반려') || text.includes('애견') || text.includes('사료') || text.includes('애묘') || text.includes('펫')) return 'pet';
  if (text.includes('육아') || text.includes('유아') || text.includes('아동') || text.includes('기저귀') || text.includes('분유') || text.includes('장난감') || text.includes('유모차') || text.includes('베이비')) return 'baby';
  if (text.includes('가전') || text.includes('디지털') || text.includes('청소기') || text.includes('드라이기') || text.includes('헤드셋') || text.includes('이어폰') || text.includes('마우스') || text.includes('키보드') || text.includes('거치대') || text.includes('충전기') || text.includes('카메라') || text.includes('짐벌') || text.includes('스피커')) return 'life-appliances';
  if (text.includes('도서') || text.includes('책') || text.includes('교육') || text.includes('교재') || text.includes('동화')) return 'book';
  if (text.includes('베개') || text.includes('세제') || text.includes('샴푸') || text.includes('치약') || text.includes('텀블러') || text.includes('경추') || text.includes('물티슈') || text.includes('생활용품') || text.includes('주방용품') || text.includes('인테리어') || text.includes('매트') || text.includes('이불') || text.includes('타월') || text.includes('디퓨저') || text.includes('향수')) return 'life-goods';
  return 'etc';
}

// 텍스트 기반 자동 검색 키워드 태그 구축기
function buildAutoKeywords(title: string, desc: string): string {
  const t = (title + ' ' + desc).toLowerCase();
  const keywords: string[] = [];
  if (t.includes('삼겹살')) keywords.push('삼겹살');
  if (t.includes('치킨') || t.includes('통닭')) keywords.push('치킨');
  if (t.includes('피자')) keywords.push('피자');
  if (t.includes('마라탕')) keywords.push('마라탕');
  if (t.includes('파스타')) keywords.push('파스타');
  if (t.includes('소고기') || t.includes('한우')) keywords.push('소고기');
  if (t.includes('카페') || t.includes('디저트')) keywords.push('카페');
  if (t.includes('펜션') || t.includes('풀빌라')) keywords.push('온수풀', '풀빌라', '펜션');
  return keywords.length > 0 ? `,${keywords.join(',')},` : '';
}

// 1. 강남맛집, 디너의여왕, 포블로그, 리뷰노트 4대 주요 사이트 통합 실시간 검색 수집 (On-Demand)
export async function crawlKeywordOnDemand(keyword: string): Promise<number> {
  console.log(`[Combined-OnDemand] Multi-source search trigger for "${keyword}"...`);
  const now = new Date();
  const collected: Campaign[] = [];
  const encodedKeyword = encodeURIComponent(keyword);

  // ==================== 1. 강남맛집 수집 (Static 28개 + AJAX 10개 병합) ====================
  try {
    // 정적 1페이지
    const staticUrl = `https://xn--939au0g4vj8sq.net/cp/?stx=${encodedKeyword}`;
    const staticRes = await axios.get(staticUrl, { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(staticRes.data);
    $('.list_item').each((i, el) => {
      const titleLink = $(el).find('dt.tit a');
      const title = titleLink.text().trim();
      const campaignUrlPath = titleLink.attr('href') || '';
      const campaignUrl = `https://xn--939au0g4vj8sq.net${campaignUrlPath}`;
      const description = $(el).find('dd.sub_tit').text().trim();
      let imageUrl = $(el).find('.imgArea img').attr('src') || '';
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      const ddayText = $(el).find('.dday em.day_c').text().trim();
      const endDate = parseDdayToDate(ddayText);
      const platformText = $(el).find('.label em.blog').text().trim().toLowerCase();
      const platform = (platformText.includes('instagram') || platformText.includes('insta')) ? 'instagram' : 'blog';
      const { applyCount, limitCount } = parseCountText($(el).find('.item_info .numb').text().trim());
      const locMatch = title.match(/\[([^\]]+)\]/);
      const location = locMatch ? locMatch[1] : undefined;
      const category = detectCategory(title, description);

      if (title && campaignUrlPath) {
        const urlParams = new URL(campaignUrl).searchParams;
        const cpId = urlParams.get('id') || campaignUrlPath.replace(/[^0-9]/g, '');
        const id = `gn-${cpId}`;
        const autoKws = buildAutoKeywords(title, description);
        const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

        collected.push({
          id, title, description, platform, category, location, campaignUrl,
          imageUrl, targetSite: '강남맛집', limitCount, applyCount,
          startDate: now.toISOString().split('T')[0], endDate,
          createdAt: now.toISOString(), updatedAt: now.toISOString(),
          searchKeywords
        });
      }
    });

    // AJAX 1~2페이지 추가
    for (let page = 1; page <= 2; page++) {
      const ajaxUrl = `https://xn--939au0g4vj8sq.net/theme/go/_list_cmp_tpl.php?stx=${encodedKeyword}&rpage=${page}&row_num=28`;
      const ajaxRes = await axios.get(ajaxUrl, { headers: HEADERS, timeout: 6000 });
      const htmlContent = ajaxRes.data.trim();
      if (!htmlContent || htmlContent.includes('조회된 캠페인이 없습니다')) break;
      const $ajax = cheerio.load(`<ul>${htmlContent}</ul>`);
      $ajax('li.list_item').each((i, el) => {
        const titleLink = $ajax(el).find('dt.tit a');
        const title = titleLink.text().trim();
        const campaignUrlPath = titleLink.attr('href') || '';
        const campaignUrl = `https://xn--939au0g4vj8sq.net${campaignUrlPath}`;
        const description = $ajax(el).find('dd.sub_tit').text().trim();
        let imageUrl = $ajax(el).find('.imgArea img').attr('src') || '';
        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
        const ddayText = $ajax(el).find('.dday em.day_c').text().trim();
        const endDate = parseDdayToDate(ddayText);
        const platformText = $ajax(el).find('.label em.blog').text().trim().toLowerCase();
        const platform = (platformText.includes('instagram') || platformText.includes('insta')) ? 'instagram' : 'blog';
        const { applyCount, limitCount } = parseCountText($ajax(el).find('.item_info .numb').text().trim());
        const locMatch = title.match(/\[([^\]]+)\]/);
        const location = locMatch ? locMatch[1] : undefined;
        const category = detectCategory(title, description);

        if (title && campaignUrlPath) {
          const urlParams = new URL(campaignUrl).searchParams;
          const cpId = urlParams.get('id') || campaignUrlPath.replace(/[^0-9]/g, '');
          const id = `gn-${cpId}`;
          const autoKws = buildAutoKeywords(title, description);
          const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

          collected.push({
            id, title, description, platform, category, location, campaignUrl,
            imageUrl, targetSite: '강남맛집', limitCount, applyCount,
            startDate: now.toISOString().split('T')[0], endDate,
            createdAt: now.toISOString(), updatedAt: now.toISOString(),
            searchKeywords
          });
        }
      });
    }
  } catch (err: any) {
    console.error('[OnDemand] Gangnam맛집 crawl failed:', err.message);
  }

  // ==================== 2. 디너의여왕 수집 (stx=query 파라미터 매치 및 비동기 무한 스크롤 AJAX 병합) ====================
  try {
    const dqUrl = `https://dinnerqueen.net/taste?query=${encodedKeyword}`;
    const response = await axios.get(dqUrl, { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(response.data);
    
    // 1페이지 파싱
    $('.qz-dq-card').each((index, element) => {
      const linkEl = $(element).find('.qz-dq-card__link');
      const rawTitle = linkEl.attr('title') || '';
      const title = rawTitle.replace(/신청하기$/, '').replace(/보러가기$/, '').trim();
      const campaignUrl = linkEl.attr('href') || '';
      const imgEl = $(element).find('.qz-dq-card__link__img img');
      const imageUrl = imgEl.attr('src') || '';
      const ddayText = $(element).find('.layer-primary p.qz-caption-kr--line strong').text().trim();
      const endDate = parseDdayToDate(ddayText);
      const badgesText = $(element).find('.qz-wrap').text();
      const platform = badgesText.includes('인스타그램') ? 'instagram' : 'blog';
      const applyText = $(element).find('.apply_badge .qz-caption-kr').text().trim();
      const { applyCount, limitCount } = parseCountText(applyText);
      
      let location = undefined;
      const isDelivery = badgesText.includes('배송');
      if (!isDelivery) {
        const locMatch = title.match(/\[([^\]]+)\]/);
        location = locMatch ? locMatch[1] : '서울 마포구';
      }
      const category = detectCategory(title, badgesText);

      if (title && campaignUrl) {
        const fullUrl = campaignUrl.startsWith('http') ? campaignUrl : `https://dinnerqueen.net${campaignUrl}`;
        const dqId = fullUrl.split('/').pop() || fullUrl.replace(/[^0-9]/g, '');
        const id = `dq-${dqId}`;
        const autoKws = buildAutoKeywords(title, badgesText);
        const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

        collected.push({
          id, title, description: title, platform, category, location, campaignUrl: fullUrl,
          imageUrl, targetSite: '디너의여왕', limitCount, applyCount,
          startDate: now.toISOString().split('T')[0], endDate,
          createdAt: now.toISOString(), updatedAt: now.toISOString(),
          searchKeywords
        });
      }
    });

    // 2페이지 이후 AJAX POST 순회 수집
    let dqPage = 2;
    let dqHasNext = true;
    const dqHeaders = {
      ...HEADERS,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://dinnerqueen.net/taste'
    };

    while (dqHasNext && dqPage <= 3) {
      const dqListUrl = `https://dinnerqueen.net/taste/taste_list?query=${encodedKeyword}&page=${dqPage}`;
      const listRes = await axios.post(dqListUrl, {}, { headers: dqHeaders, timeout: 6000 });
      const listData = listRes.data;

      if (!listData.layout || listData.layout === '[]' || listData.layout.trim() === '') {
        break;
      }

      const $list = cheerio.load(`<div>${listData.layout}</div>`);
      $list('.qz-dq-card').each((index, element) => {
        const linkEl = $list(element).find('.qz-dq-card__link');
        const rawTitle = linkEl.attr('title') || '';
        const title = rawTitle.replace(/신청하기$/, '').replace(/보러가기$/, '').trim();
        const campaignUrl = linkEl.attr('href') || '';
        const imgEl = $list(element).find('.qz-dq-card__link__img img');
        const imageUrl = imgEl.attr('src') || '';
        const ddayText = $list(element).find('.layer-primary p.qz-caption-kr--line strong').text().trim();
        const endDate = parseDdayToDate(ddayText);
        const badgesText = $list(element).find('.qz-wrap').text();
        const platform = badgesText.includes('인스타그램') ? 'instagram' : 'blog';
        const applyText = $list(element).find('.apply_badge .qz-caption-kr').text().trim();
        const { applyCount, limitCount } = parseCountText(applyText);
        
        let location = undefined;
        const isDelivery = badgesText.includes('배송');
        if (!isDelivery) {
          const locMatch = title.match(/\[([^\]]+)\]/);
          location = locMatch ? locMatch[1] : '서울 마포구';
        }
        const category = detectCategory(title, badgesText);

        if (title && campaignUrl) {
          const fullUrl = campaignUrl.startsWith('http') ? campaignUrl : `https://dinnerqueen.net${campaignUrl}`;
          const dqId = fullUrl.split('/').pop() || fullUrl.replace(/[^0-9]/g, '');
          const id = `dq-${dqId}`;
          const autoKws = buildAutoKeywords(title, badgesText);
          const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

          collected.push({
            id, title, description: title, platform, category, location, campaignUrl: fullUrl,
            imageUrl, targetSite: '디너의여왕', limitCount, applyCount,
            startDate: now.toISOString().split('T')[0], endDate,
            createdAt: now.toISOString(), updatedAt: now.toISOString(),
            searchKeywords
          });
        }
      });

      if (!listData.has_next) {
        dqHasNext = false;
      } else {
        dqPage++;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[OnDemand] DinnerQueen parsed total ${collected.filter(c => c.targetSite === '디너의여왕').length} items`);
  } catch (err: any) {
    console.error('[OnDemand] DinnerQueen crawl failed:', err.message);
  }

  // ==================== 3. 포블로그 수집 (loadMoreDataCategorySearch2 API 직접 호출) ====================
  try {
    const pbUrl = `https://4blog.net/loadMoreDataCategorySearch2?search=${encodedKeyword}&search2=${encodedKeyword}&offset=0&limit=30`;
    const response = await axios.get(pbUrl, { headers: HEADERS, timeout: 6000 });
    
    if (Array.isArray(response.data)) {
      response.data.forEach((item: any) => {
        const id = `pb-${item.CID}`;
        const title = (item.LOCATION_NM || '') + ' ' + (item.CAMPAIGN_NM || '');
        const description = item.REVIEWER_BENEFIT || '상세정보 원본 참조';
        const platform = (item.CATEGORY || '').toLowerCase().includes('instar') ? 'instagram' : 'blog';
        const category = detectCategory(title, description);
        const location = item.LOCATION_NM ? item.LOCATION_NM.replace(/[\[\]]/g, '') : undefined;
        const campaignUrl = `https://4blog.net/campaign/${item.CID}/`;
        
        // 이미지 경로 조합
        const imageUrl = `https://d3oxv6xcx9d0j1.cloudfront.net/public/pr/${item.PRID}/thumbnail/${item.IMGKEY}`;
        const endDate = parseRemainDaysToDate(item.REMAINDATE || 7);
        const limitCount = parseInt(item.REVIEWER_CNT || item.LIMIT_CNT || 5, 10) || 5;
        const applyCount = parseInt(item.REVIEWER_REQ_CNT || item.REQ_CNT || 0, 10) || 0;

        const autoKws = buildAutoKeywords(title, description);
        const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

        collected.push({
          id, title, description, platform, category, location, campaignUrl,
          imageUrl, targetSite: '포블로그', limitCount, applyCount,
          startDate: now.toISOString().split('T')[0], endDate,
          createdAt: now.toISOString(), updatedAt: now.toISOString(),
          searchKeywords
        });
      });
      console.log(`[OnDemand] ForBlog parsed ${response.data.length} items`);
    }
  } catch (err: any) {
    console.error('[OnDemand] ForBlog crawl failed:', err.message);
  }

  // ==================== 4. 리뷰노트 수집 (Referer API 우회 호출 및 페이지네이션 무제한 순회) ====================
  try {
    let page = 0;
    let hasMore = true;
    let rnCount = 0;

    while (hasMore && page < 5) {
      const rnApiUrl = `https://www.reviewnote.co.kr/api/v2/campaigns?search=${encodedKeyword}&limit=96&page=${page}`;
      const response = await axios.get(rnApiUrl, {
        headers: {
          ...HEADERS,
          'Referer': 'https://www.reviewnote.co.kr/campaigns',
          'Origin': 'https://www.reviewnote.co.kr'
        },
        timeout: 6000
      });
      
      const campaignsList = response.data?.objects;
      const apiHasMore = response.data?.has_more;

      if (!Array.isArray(campaignsList) || campaignsList.length === 0) {
        break;
      }

      campaignsList.forEach((item: any) => {
        const id = `rn-${item.id}`;
        const title = item.title;
        const description = item.offer || '제공 혜택 상세 참조';
        const platform = (item.channel || '').toLowerCase().includes('insta') ? 'instagram' : 'blog';
        const category = detectCategory(title, description);
        const location = item.sido?.name ? `${item.city || ''} ${item.sido.name}` : undefined;
        const campaignUrl = `https://www.reviewnote.co.kr/campaigns/${item.id}`;
        const imageUrl = `https://firebasestorage.googleapis.com/v0/b/reviewnote-e92d9.appspot.com/o/${encodeURIComponent(item.imageKey)}?alt=media`;
        const endDate = item.applyEndAt ? item.applyEndAt.split('T')[0] : parseRemainDaysToDate(7);
        const limitCount = item.infNum || 10;
        const applyCount = item.applicantCount || 0;

        const autoKws = buildAutoKeywords(title, description);
        const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

        collected.push({
          id, title, description, platform, category, location, campaignUrl,
          imageUrl, targetSite: '리뷰노트', limitCount, applyCount,
          startDate: now.toISOString().split('T')[0], endDate,
          createdAt: now.toISOString(), updatedAt: now.toISOString(),
          searchKeywords
        });
      });

      rnCount += campaignsList.length;

      if (!apiHasMore || campaignsList.length === 0) {
        hasMore = false;
      } else {
        page++;
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }
    console.log(`[OnDemand] ReviewNote parsed total ${rnCount} items across ${page + 1} pages`);
  } catch (err: any) {
    console.error('[OnDemand] ReviewNote crawl failed:', err.message);
  }

  // 수집한 모든 데이터 SQLite DB에 저장
  if (collected.length > 0) {
    const result = await insertOrUpdateCampaigns(collected);
    console.log(`[Combined-OnDemand] Crawl finished. Total Buffer Size: ${collected.length} | Added: ${result.inserted}, Updated: ${result.updated}`);
    return collected.length;
  }

  return 0;
}

// 2. 전체 벌크 크롤러 (최초 실행 스케줄링용)
export async function runCrawlerCore(): Promise<{ inserted: number; updated: number; isMock: boolean }> {
  console.log('[Core] Starting Bulk ReviewMoa Crawler via AJAX template...');
  const allCampaigns: Campaign[] = [];
  const now = new Date();
  
  // 강남맛집 전체 최신 글을 AJAX API 호출을 통해 대량 수집 (1p ~ 3p)
  for (let page = 1; page <= 3; page++) {
    try {
      const gangnamUrl = `https://xn--939au0g4vj8sq.net/theme/go/_list_cmp_tpl.php?rpage=${page}&row_num=28`;
      console.log(`[Core] Crawling gangnam맛집 page ${page} from ${gangnamUrl}...`);
      const response = await axios.get(gangnamUrl, { headers: HEADERS, timeout: 6000 });
      const htmlContent = response.data.trim();

      if (!htmlContent || htmlContent.includes('조회된 캠페인이 없습니다')) {
        break;
      }

      const $ = cheerio.load(`<ul>${htmlContent}</ul>`);
      let pageCount = 0;

      $('li.list_item').each((index, element) => {
        const titleLink = $(element).find('dt.tit a');
        const title = titleLink.text().trim();
        const campaignUrlPath = titleLink.attr('href') || '';
        const campaignUrl = `https://xn--939au0g4vj8sq.net${campaignUrlPath}`;
        const description = $(element).find('dd.sub_tit').text().trim();
        let imageUrl = $(element).find('.imgArea img').attr('src') || '';
        if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
        const ddayText = $(element).find('.dday em.day_c').text().trim();
        const endDate = parseDdayToDate(ddayText);
        const platformText = $(element).find('.label em.blog').text().trim().toLowerCase();
        const platform = (platformText.includes('instagram') || platformText.includes('insta')) ? 'instagram' : 'blog';
        const { applyCount, limitCount } = parseCountText($(element).find('.item_info .numb').text().trim());
        let location = undefined;
        const locMatch = title.match(/\[([^\]]+)\]/);
        if (locMatch) location = locMatch[1];
        const category = detectCategory(title, description);

        if (title && campaignUrlPath) {
          const urlParams = new URL(campaignUrl).searchParams;
          const cpId = urlParams.get('id') || campaignUrlPath.replace(/[^0-9]/g, '');
          const id = `gn-${cpId}`;
          const autoKws = buildAutoKeywords(title, description);

          allCampaigns.push({
            id, title, description, platform, category, location, campaignUrl,
            imageUrl: imageUrl || 'https://picsum.photos/600/400',
            targetSite: '강남맛집', limitCount, applyCount,
            startDate: now.toISOString().split('T')[0], endDate,
            createdAt: now.toISOString(), updatedAt: now.toISOString(),
            searchKeywords: autoKws || undefined
          });
          pageCount++;
        }
      });
      console.log(`[Core] Successfully parsed ${pageCount} campaigns from gangnam맛집 page ${page}`);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error(`[Core] Scraping from gangnam맛집 page ${page} failed:`, error.message);
      break;
    }
  }

  // 디너의여왕 수집 (New & Hot)
  const dinnerQueenUrls = [
    'https://dinnerqueen.net/taste?order=new',
    'https://dinnerqueen.net/taste?order=hot'
  ];

  for (const targetUrl of dinnerQueenUrls) {
    try {
      console.log(`[Core] Crawling dinnerqueen from ${targetUrl}...`);
      const response = await axios.get(targetUrl, { headers: HEADERS, timeout: 6000 });
      const $ = cheerio.load(response.data);
      
      let dqCount = 0;
      $('.qz-dq-card').each((index, element) => {
        const linkEl = $(element).find('.qz-dq-card__link');
        const rawTitle = linkEl.attr('title') || '';
        const title = rawTitle.replace(/신청하기$/, '').replace(/보러가기$/, '').trim();
        const campaignUrl = linkEl.attr('href') || '';
        const imgEl = $(element).find('.qz-dq-card__link__img img');
        const imageUrl = imgEl.attr('src') || '';
        const ddayText = $(element).find('.layer-primary p.qz-caption-kr--line strong').text().trim();
        const endDate = parseDdayToDate(ddayText);
        const badgesText = $(element).find('.qz-wrap').text();
        const platform = badgesText.includes('인스타그램') ? 'instagram' : 'blog';
        const applyText = $(element).find('.apply_badge .qz-caption-kr').text().trim();
        const { applyCount, limitCount } = parseCountText(applyText);

        let location = undefined;
        const isDelivery = badgesText.includes('배송');
        if (!isDelivery) {
          const locMatch = title.match(/\[([^\]]+)\]/);
          location = locMatch ? locMatch[1] : '서울 마포구';
        }
        const category = detectCategory(title, badgesText);

        if (title && campaignUrl) {
          const fullUrl = campaignUrl.startsWith('http') ? campaignUrl : `https://dinnerqueen.net${campaignUrl}`;
          const dqId = fullUrl.split('/').pop() || fullUrl.replace(/[^0-9]/g, '');
          const id = `dq-${dqId}`;
          const autoKws = buildAutoKeywords(title, badgesText);

          allCampaigns.push({
            id, title, description: title, platform, category, location, campaignUrl: fullUrl,
            imageUrl, targetSite: '디너의여왕', limitCount, applyCount,
            startDate: now.toISOString().split('T')[0], endDate,
            createdAt: now.toISOString(), updatedAt: now.toISOString(),
            searchKeywords: autoKws || undefined
          });
          dqCount++;
        }
      });
      console.log(`[Core] Successfully parsed ${dqCount} campaigns from dinnerqueen`);
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error: any) {
      console.error('[Core] Live scraping failed:', error.message);
    }
  }

  const result = await insertOrUpdateCampaigns(allCampaigns);
  return { ...result, isMock: false };
}
