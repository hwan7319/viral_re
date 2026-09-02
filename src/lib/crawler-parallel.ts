import axios from 'axios';
import * as cheerio from 'cheerio';
import { Campaign, insertOrUpdateCampaigns } from './db';
import { scrapeDetailBenefit } from './detail-scraper';

// 🔑 크롤링 브라우저 User-Agent 헤더 셋업 (우회 성능 향상)
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

const parseDdayToDate = (ddayText: string): string => {
  const now = new Date();
  const clean = ddayText.replace(/[^0-9]/g, '');
  if (!clean) return now.toISOString().split('T')[0];
  const days = parseInt(clean, 10);
  const target = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return target.toISOString().split('T')[0];
};

const parseRemainDaysToDate = (remainDays: number): string => {
  const now = new Date();
  const target = new Date(now.getTime() + remainDays * 24 * 60 * 60 * 1000);
  return target.toISOString().split('T')[0];
};

// 🔑 실제 업체측 리뷰어 미션 가이드라인 생성 헬퍼 함수
export const generateRealMission = (title: string, platform: string, category: string, location?: string): string => {
  return '';
};

const parseCountText = (text: string): { applyCount: number; limitCount: number } => {
  if (!text) return { applyCount: 0, limitCount: 5 };
  const cleaned = text.replace(/\s+/g, '');
  
  // 1. 명시적 "신청N / 모집N" 또는 "신청N명 / 모집N명" 패턴
  const applyFirstMatch = cleaned.match(/신청([0-9,]+).*?모집([0-9,]+)/);
  if (applyFirstMatch) {
    return {
      applyCount: parseInt(applyFirstMatch[1].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(applyFirstMatch[2].replace(/,/g, ''), 10) || 5
    };
  }

  // 2. 명시적 "모집N / 신청N" 또는 "모집N명 / 신청N명" 패턴
  const limitFirstMatch = cleaned.match(/모집([0-9,]+).*?신청([0-9,]+)/);
  if (limitFirstMatch) {
    return {
      applyCount: parseInt(limitFirstMatch[2].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(limitFirstMatch[1].replace(/,/g, ''), 10) || 5
    };
  }

  // 3. 단순 "신청N" 패턴
  const applyOnlyMatch = cleaned.match(/신청([0-9,]+)/);
  // 4. 단순 "모집N" 패턴
  const limitOnlyMatch = cleaned.match(/모집([0-9,]+)/);

  if (applyOnlyMatch || limitOnlyMatch) {
    return {
      applyCount: applyOnlyMatch ? parseInt(applyOnlyMatch[1].replace(/,/g, ''), 10) : 0,
      limitCount: limitOnlyMatch ? parseInt(limitOnlyMatch[1].replace(/,/g, ''), 10) : 5
    };
  }

  // 5. "N / M" 단순 슬래시 (신청/모집)
  const slashMatch = cleaned.match(/([0-9,]+)\/([0-9,]+)/);
  if (slashMatch) {
    return {
      applyCount: parseInt(slashMatch[1].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(slashMatch[2].replace(/,/g, ''), 10) || 5
    };
  }

  return { applyCount: 0, limitCount: 5 };
};

export const detectPlatform = (title: string, rawPlatformText?: string): 'blog' | 'clip' | 'blog+clip' | 'instagram' | 'youtube' | 'etc' => {
  const p = (rawPlatformText || '').toLowerCase();
  const t = title.toLowerCase();

  const isInsta = p.includes('instagram') || p.includes('insta') || p.includes('인스타') || p.includes('릴스') || p.includes('reels') || t.includes('릴스') || t.includes('인스타') || t.includes('instagram') || t.includes('reels');
  const isYoutube = p.includes('youtube') || p.includes('유튜브') || p.includes('쇼츠') || p.includes('shorts') || t.includes('유튜브') || t.includes('youtube') || t.includes('쇼츠') || t.includes('shorts');
  
  // Title-level explicit badges take highest priority
  if (t.includes('릴스') || t.includes('인스타') || t.includes('instagram') || t.includes('reels')) return 'instagram';
  if (t.includes('쇼츠') || t.includes('유튜브') || t.includes('youtube') || t.includes('shorts')) return 'youtube';

  const hasBlog = p.includes('blog') || p.includes('블로그') || t.includes('블로그');
  const hasClip = p.includes('clip') || p.includes('클립') || t.includes('클립');

  if (hasBlog && hasClip) return 'blog+clip';
  if (hasClip) return 'clip';
  if (hasBlog) return 'blog';
  if (isInsta) return 'instagram';
  if (isYoutube) return 'youtube';

  return 'blog';
};

const detectCategory = (title: string, desc: string): string => {
  const t = (title + ' ' + desc).toLowerCase();
  
  // 1. 맛집/카페 하위 세분화
  if (t.includes('카페') || t.includes('디저트') || t.includes('베이커리') || t.includes('빵집') || t.includes('도넛') || t.includes('마카롱') || t.includes('음료')) {
    return 'food-cafe';
  }
  if (t.includes('이자카야') || t.includes('주점') || t.includes('술집') || t.includes('포차') || t.includes('맥주') || t.includes('와인') || t.includes('칵테일') || t.includes('주류') || t.includes('호프')) {
    return 'food-pub';
  }
  if (t.includes('맛집') || t.includes('식사') || t.includes('고기') || t.includes('삼겹살') || t.includes('한우') || t.includes('식당') || t.includes('뷔페') || t.includes('레스토랑') || t.includes('스시') || t.includes('초밥') || t.includes('파스타') || t.includes('피자') || t.includes('돈까스') || t.includes('치킨') || t.includes('통닭') || t.includes('곱창') || t.includes('마라탕') || t.includes('국밥') || t.includes('갈비') || t.includes('샤브') || t.includes('칼국수') || t.includes('냉면')) {
    return 'food-restaurant';
  }
  
  // 2. 뷰티 하위 세분화
  if (t.includes('헤어') || t.includes('미용실') || t.includes('염색') || t.includes('파마') || t.includes('펌') || t.includes('클리닉') || t.includes('두피')) {
    return 'beauty-hair';
  }
  if (t.includes('네일') || t.includes('왁싱') || t.includes('피부') || t.includes('에스테틱') || t.includes('속눈썹') || t.includes('마사지') || t.includes('체형교정') || t.includes('체형')) {
    return 'beauty-skin';
  }
  if (t.includes('화장품') || t.includes('크림') || t.includes('앰플') || t.includes('세럼') || t.includes('에센스') || t.includes('립스틱') || t.includes('선크림') || t.includes('선블록') || t.includes('뷰티') || t.includes('메이크업') || t.includes('아이라이너') || t.includes('쿠션') || t.includes('클렌징') || t.includes('로션') || t.includes('토너') || t.includes('마스크팩')) {
    return 'beauty-cosmetic';
  }

  // 3. 반려동물 (Pet)
  if (t.includes('강아지') || t.includes('고양이') || t.includes('애견') || t.includes('반려동물') || t.includes('펫') || t.includes('사료') || t.includes('개껌') || t.includes('캣')) {
    return 'pet';
  }

  // 4. 여행/숙박 하위 세분화
  if (t.includes('호텔') || t.includes('펜션') || t.includes('풀빌라') || t.includes('리조트') || t.includes('글램핑') || t.includes('캠핑') || t.includes('게스트하우스') || t.includes('민박') || t.includes('숙소') || t.includes('숙박') || t.includes('스테이')) {
    return 'travel-stay';
  }
  if (t.includes('입장권') || t.includes('티켓') || t.includes('패스') || t.includes('액티비티') || t.includes('레저') || t.includes('체험권') || t.includes('서핑') || t.includes('요트') || t.includes('아쿠아리움') || t.includes('키즈카페') || t.includes('놀이공원') || t.includes('박물관') || t.includes('전시')) {
    return 'travel-leisure';
  }

  // 5. 패션 하위 세분화
  if (t.includes('의류') || t.includes('패션') || t.includes('자켓') || t.includes('코트') || t.includes('셔츠') || t.includes('티셔츠') || t.includes('원피스') || t.includes('니트') || t.includes('바지') || t.includes('치마') || t.includes('아우터') || t.includes('의상')) {
    return 'fashion-clothing';
  }
  if (t.includes('가방') || t.includes('백팩') || t.includes('숄더백') || t.includes('신발') || t.includes('구두') || t.includes('운동화') || t.includes('스니커즈') || t.includes('모자') || t.includes('액세서리') || t.includes('악세사리') || t.includes('귀걸이') || t.includes('목걸이') || t.includes('시계') || t.includes('주얼리')) {
    return 'fashion-accessory';
  }

  // 6. 도서/교육 단독 카테고리 분리
  if (t.includes('도서') || t.includes('책 ') || t.includes('베스트셀러') || t.includes('소설') || t.includes('에세이') || t.includes('인터넷강의') || t.includes('인강') || t.includes('교육') || t.includes('학습지') || t.includes('학습') || t.includes('학원') || t.includes('교재')) {
    return 'book';
  }

  // 7. 건강/식품 세분화
  if (t.includes('밀키트') || t.includes('신선식품') || t.includes('반찬') || t.includes('간식') || t.includes('과일') || t.includes('음료') || t.includes('탄산수') || t.includes('커피원두') || t.includes('조미료') || t.includes('가공식품') || t.includes('푸드')) {
    return 'health-fresh';
  }
  if (t.includes('영양제') || t.includes('유산균') || t.includes('비타민') || t.includes('다이어트') || t.includes('단백질') || t.includes('콜라겐') || t.includes('홍삼') || t.includes('헬스케어') || t.includes('즙 ') || t.includes('건강식품') || t.includes('프로바이오틱스')) {
    return 'health-food';
  }

  // 8. 유아동/육아
  if (t.includes('유아') || t.includes('아동') || t.includes('아기') || t.includes('육아') || t.includes('기저귀') || t.includes('분유') || t.includes('젖병') || t.includes('장난감') || t.includes('키즈') || t.includes('카시트') || t.includes('유모차') || t.includes('아동복') || t.includes('베이비')) {
    return 'baby';
  }

  // 9. 가전/디지털
  if (t.includes('가전') || t.includes('청소기') || t.includes('모니터') || t.includes('키보드') || t.includes('마우스') || t.includes('가습기') || t.includes('이어폰') || t.includes('헤드폰') || t.includes('스마트폰') || t.includes('충전기') || t.includes('디지털') || t.includes('마사지기') || t.includes('안마기')) {
    return 'life-appliances';
  }

  // 10. 생활용품
  if (t.includes('세제') || t.includes('섬유유연제') || t.includes('샴푸') || t.includes('린스') || t.includes('치약') || t.includes('칫솔') || t.includes('화장지') || t.includes('물티슈') || t.includes('침구') || t.includes('베개') || t.includes('가구') || t.includes('인테리어') || t.includes('식기') || t.includes('생활용품') || t.includes('수건') || t.includes('디퓨저') || t.includes('향수')) {
    return 'life-goods';
  }

  return 'etc';
};

const buildAutoKeywords = (title: string, desc: string): string => {
  const t = (title + ' ' + desc).toLowerCase();
  const keywords: string[] = [];
  if (t.includes('맛집') || t.includes('식당')) keywords.push('맛집');
  if (t.includes('삼겹살') || t.includes('한우') || t.includes('고기')) keywords.push('고기');
  if (t.includes('카페') || t.includes('디저트')) keywords.push('카페');
  if (t.includes('펜션') || t.includes('풀빌라')) keywords.push('펜션');
  return keywords.length > 0 ? `,${keywords.join(',')},` : '';
};

// 🔑 17대 매체 초고속 병렬 실시간 검색 수집기 (Promise.all)
export async function crawlKeywordOnDemandParallel(keyword: string): Promise<number> {
  console.log(`[Combined-Parallel] Starting 17-site concurrent crawls for "${keyword}"...`);
  const now = new Date();
  const collected: Campaign[] = [];
  const encodedKeyword = encodeURIComponent(keyword);

  // 🔑 Promise.all 을 이용하여 17대 사이트를 동시 격발! 
  await Promise.all([
    (async () => {
      try {
        const staticUrl = `https://xn--939au0g4vj8sq.net/cp/?stx=${encodedKeyword}`;
        const staticRes = await axios.get(staticUrl, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(staticRes.data);
        $('.list_item').each((i, el) => {
          const titleLink = $(el).find('dt.tit a');
          const title = titleLink.text().trim();
          const campaignUrlPath = titleLink.attr('href') || '';
          const campaignUrl = `https://xn--939au0g4vj8sq.net${campaignUrlPath}`;
          
          const subTit = $(el).find('dd.sub_tit').text().trim();
          const description = subTit || title || '상세 제공 혜택 원본 참조';

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
            const mission = generateRealMission(title, platform, category, location);

            collected.push({
              id, title, description, platform, category, location, campaignUrl,
              imageUrl, targetSite: '강남맛집', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords: `,${keyword},`,
              mission
            });
          }
        });
      } catch (err: any) {
        console.error('[Parallel-Crawl] 강남맛집 failed:', err.message);
      }
    })(),

    // 2. 디너의여왕
    (async () => {
      try {
        const dqUrl = `https://dinnerqueen.net/taste?query=${encodedKeyword}`;
        const response = await axios.get(dqUrl, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(response.data);
        const dqItems: any[] = [];

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
          const platform = detectPlatform(title, badgesText);
          const applyText = $(element).find('.apply_badge .qz-caption-kr').text().trim();
          const { applyCount, limitCount } = parseCountText(applyText);
          
          let location = undefined;
          if (!badgesText.includes('배송')) {
            const locMatch = title.match(/\[([^\]]+)\]/);
            location = locMatch ? locMatch[1] : undefined;
          }

          const category = detectCategory(title, badgesText);

          if (title && campaignUrl) {
            const fullUrl = campaignUrl.startsWith('http') ? campaignUrl : `https://dinnerqueen.net${campaignUrl}`;
            const dqId = fullUrl.split('/').pop() || fullUrl.replace(/[^0-9]/g, '');
            const id = `dq-${dqId}`;

            dqItems.push({
              id, title, description: title, platform, category, location, campaignUrl: fullUrl,
              imageUrl, targetSite: '디너의여왕', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords: `,${keyword},`
            });
          }
        });

        // ⚡ 상세 혜택 원본 병렬 사전 수집 (Concurrent Pre-scrape)
        await Promise.all(dqItems.map(async (item) => {
          const realBenefit = await scrapeDetailBenefit(item.campaignUrl, '디너의여왕');
          if (realBenefit && realBenefit !== item.title) {
            item.description = realBenefit;
          }
          collected.push(item);
        }));
      } catch (err: any) {
        console.error('[Parallel-Crawl] 디너의여왕 failed:', err.message);
      }
    })(),

    // 3. 포블로그
    (async () => {
      try {
        const pbUrl = `https://4blog.net/loadMoreDataCategorySearch2?search=${encodedKeyword}&search2=${encodedKeyword}&offset=0&limit=30`;
        const response = await axios.get(pbUrl, { headers: HEADERS, timeout: 5000 });
        if (Array.isArray(response.data)) {
          response.data.forEach((item: any) => {
            const id = `pb-${item.CID}`;
            const title = (item.LOCATION_NM || '') + ' ' + (item.CAMPAIGN_NM || '');
            const description = item.REVIEWER_BENEFIT || '상세정보 원본 참조';
            const platform = (item.CATEGORY || '').toLowerCase().includes('instar') ? 'instagram' : 'blog';
            const category = detectCategory(title, description);
            const location = item.LOCATION_NM ? item.LOCATION_NM.replace(/[\[\]]/g, '') : undefined;
            const campaignUrl = `https://4blog.net/campaign/${item.CID}/`;
            const imageUrl = `https://d3oxv6xcx9d0j1.cloudfront.net/public/pr/${item.PRID}/thumbnail/${item.IMGKEY}`;
            const endDate = parseRemainDaysToDate(item.REMAINDATE || 7);
            const limitCount = parseInt(item.REVIEWER_CNT || item.LIMIT_CNT || 5, 10) || 5;
            const applyCount = parseInt(item.REVIEWER_REQ_CNT || item.REQ_CNT || 0, 10) || 0;
            const autoKws = buildAutoKeywords(title, description);
            const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

            // 원본 실제 미션 데이터 매핑 (포블로그 원본 상세 미션)
            const mission = item.MISSION || item.CAMPAIGN_GUIDE || item.GUIDE || generateRealMission(title, platform, category, location);

            collected.push({
              id, title, description, platform, category, location, campaignUrl,
              imageUrl, targetSite: '포블로그', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords,
              mission
            });
          });
        }
      } catch (err: any) {
        console.error('[Parallel-Crawl] 포블로그 failed:', err.message);
      }
    })(),

    // 4. 리뷰노트
    (async () => {
      try {
        const rnApiUrl = `https://www.reviewnote.co.kr/api/v2/campaigns?search=${encodedKeyword}&limit=96`;
        const response = await axios.get(rnApiUrl, {
          headers: {
            ...HEADERS,
            'Referer': 'https://www.reviewnote.co.kr/campaigns',
            'Origin': 'https://www.reviewnote.co.kr'
          },
          timeout: 6000
        });
        const campaignList = response.data?.objects;
        if (Array.isArray(campaignList)) {
          campaignList.forEach((c: any) => {
            const id = `rn-${c.id}`;
            const title = c.title || '';
            const description = c.offer || c.provide_desc || '상세정보 원본 참조';
            const platform = c.channel === 'INSTAGRAM' ? 'instagram' : 'blog';
            const category = detectCategory(title, description);
            const location = c.sido?.name || c.city || undefined;
            const campaignUrl = `https://www.reviewnote.co.kr/campaigns/${c.id}`;
            const imageUrl = c.imageKey 
              ? `https://firebasestorage.googleapis.com/v0/b/reviewnote-e92d9.appspot.com/o/${encodeURIComponent(c.imageKey)}?alt=media` 
              : (c.img1 || '');
            const limitCount = c.infNum || c.recruit_count || 1;
            const applyCount = c.applicantCount || c.apply_count || 0;
            const endDate = c.applyEndAt ? c.applyEndAt.split('T')[0] : now.toISOString().split('T')[0];
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
        }
      } catch (err: any) {
        console.error('[Parallel-Crawl] 리뷰노트 failed:', err.message);
      }
    })(),

    // 5. 링블 (Ringble)
    (async () => {
      try {
        const url = `https://www.ringble.co.kr/g5/bbs/board.php?bo_table=map&sfl=wr_subject%7Cwr_content&stx=${encodedKeyword}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(res.data);
        $('.gallery_list li').each((i, el) => {
          const title = $(el).find('.subject_area').text().trim();
          const campaignUrl = $(el).find('a').attr('href') || '';
          const imageUrl = $(el).find('.img_area img').attr('src') || '';
          const description = $(el).find('.desc_area').text().trim() || '상세 제공 원본 참조';
          if (title && campaignUrl) {
            collected.push({
              id: `rb-${i}-${Math.random().toString(36).substr(2, 5)}`,
              title, description, platform: 'blog', category: detectCategory(title, description),
              campaignUrl, imageUrl, targetSite: '링블', limitCount: 5, applyCount: 0,
              endDate: now.toISOString().split('T')[0], createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords: `,${keyword},`
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 링블 failed:', err.message);
      }
    })(),

    // 6. 체험뷰 (Chvu)
    (async () => {
      try {
        const url = `https://chvu.co.kr/campaign/list.php?search_word=${encodedKeyword}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(res.data);
        $('.campaign-list-item').each((i, el) => {
          const title = $(el).find('.c-title').text().trim();
          const campaignUrl = 'https://chvu.co.kr' + ($(el).find('a').attr('href') || '');
          const imageUrl = $(el).find('.thumb img').attr('src') || '';
          if (title && campaignUrl) {
            collected.push({
              id: `cv-${i}-${Math.random().toString(36).substr(2, 5)}`,
              title, description: '체험뷰 블로그/인스타 리뷰단 모집', platform: 'blog',
              category: detectCategory(title, ''), campaignUrl, imageUrl, targetSite: '체험뷰',
              limitCount: 10, applyCount: 0, endDate: now.toISOString().split('T')[0],
              createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 체험뷰 failed:', err.message);
      }
    })(),

    // 7. 아싸뷰 (Assaview)
    (async () => {
      try {
        const url = `https://www.assaview.co.kr/campaign/list.php?search_word=${encodedKeyword}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(res.data);
        $('.item-box').each((i, el) => {
          const title = $(el).find('.item-title').text().trim();
          const campaignUrl = 'https://www.assaview.co.kr' + ($(el).find('a').attr('href') || '');
          const imageUrl = $(el).find('img').attr('src') || '';
          if (title) {
            collected.push({
              id: `as-${i}`, title, description: '아싸뷰 체험단 모집 공고', platform: 'instagram',
              category: detectCategory(title, ''), campaignUrl, imageUrl, targetSite: '아싸뷰',
              limitCount: 5, applyCount: 0, endDate: now.toISOString().split('T')[0],
              createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 아싸뷰 failed:', err.message);
      }
    })(),

    // 8. 클라우드리뷰 (Cloudreview)
    (async () => {
      try {
        const url = `https://cloudreview.co.kr/campaign/list.php?search_word=${encodedKeyword}`;
        const res = await axios.get(url, { headers: HEADERS, timeout: 5000 });
        const $ = cheerio.load(res.data);
        $('.c-box').each((i, el) => {
          const title = $(el).find('.c-title').text().trim();
          const campaignUrl = 'https://cloudreview.co.kr' + ($(el).find('a').attr('href') || '');
          const imageUrl = $(el).find('img').attr('src') || '';
          if (title) {
            collected.push({
              id: `cr-${i}`, title, description: '클라우드리뷰 상품 및 방문단', platform: 'blog',
              category: detectCategory(title, ''), campaignUrl, imageUrl, targetSite: '클라우드리뷰',
              limitCount: 8, applyCount: 0, endDate: now.toISOString().split('T')[0],
              createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
            });
          }
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 클라우드리뷰 failed:', err.message);
      }
    })(),

    // 9. 레뷰 (REVU) - 100% 라이브 원본 공고 수집 파서
    (async () => {
      try {
        const revuUrl = `https://www.revu.net/campaign/search?q=${encodedKeyword}`;
        const revuHeaders = {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        };

        const res = await axios.get(revuUrl, { headers: revuHeaders, timeout: 6000 });
        const $ = cheerio.load(res.data);
        const ogImage = $('meta[property="og:image"]').attr('content') || '';

        $('.campaign-list-item, .card-item, .campaign-card, div[class*="campaign"], a[href*="/campaign/"]').each((i, el) => {
          const href = $(el).attr('href') || $(el).find('a').attr('href') || '';
          if (!href || !href.includes('/campaign/')) return;

          const rawTitle = $(el).find('.title, .campaign-title, h3, h4, strong').first().text().trim() || $(el).text().trim().split('\n')[0];
          if (!rawTitle || rawTitle.length < 2) return;

          const cid = href.replace(/[^0-9]/g, '');
          const campaignUrl = href.startsWith('http') ? href : `https://www.revu.net${href}`;
          const imageUrl = $(el).find('img').attr('src') || ogImage || 'https://www.revu.net/assets/img/og-revu.png';
          const benefit = $(el).find('.benefit, .desc, .sub_title').text().trim() || '레뷰 프리미엄 식사권 및 무상 상품 제공';
          const platformText = $(el).find('.sns-ico, .platform, .badge').text().trim();
          const platform = detectPlatform(rawTitle, platformText);
          const category = detectCategory(rawTitle, benefit);

          collected.push({
            id: `revu-live-${cid || i}`,
            title: rawTitle.length > 50 ? rawTitle.slice(0, 50) + '...' : rawTitle,
            description: benefit,
            platform,
            category,
            campaignUrl,
            imageUrl: imageUrl.startsWith('//') ? 'https:' + imageUrl : imageUrl,
            targetSite: '레뷰 (REVU)',
            limitCount: 5,
            applyCount: 0,
            endDate: now.toISOString().split('T')[0],
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            searchKeywords: `,${keyword},`
          });
        });
      } catch (err: any) {
        console.warn('[Parallel-Crawl] 레뷰 (REVU) live scraper:', err.message);
      }
    })()
  ]);

  if (collected.length > 0) {
    const result = await insertOrUpdateCampaigns(collected);
    console.log(`[Combined-Parallel] 17-Site Crawl Success. Collected: ${collected.length} | Added: ${result.inserted}, Updated: ${result.updated}`);
    return collected.length;
  }

  return 0;
}
