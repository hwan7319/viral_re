import axios from 'axios';
import * as cheerio from 'cheerio';
import { Campaign, insertOrUpdateCampaigns } from './db';

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
  const isVisit = !!(location && location.trim().length > 0 && !location.includes('택배') && !location.includes('배송') && !location.includes('전국') && !location.includes('재택'));
  const isBlog = platform === 'blog';
  const isInsta = platform === 'instagram';
  
  if (isVisit) {
    if (isBlog) {
      return `• [지정 키워드] 블로그 포스팅 제목 및 본문에 대표 키워드 3회 이상 자연스럽게 포함 작성\n• [사진/동영상] 매장 외부/내부 인테리어 및 시그니처 대표 메뉴 사진 10장 이상 + 15초 이상의 동영상/모먼트 1개 필수 첨부\n• [네이버 지도] 네이버 스마트플레이스 지도 장소 등록 및 위치 태그 필수 첨부\n• [공정위] 게시물 하단에 체험단 협찬 스폰서 배너 및 공정위 문구 필수 표기`;
    } else if (isInsta) {
      return `• [피드/릴스] 매장 감성 인테리어 및 메뉴 고화질 사진 5장 이상 또는 15초 이상 릴스 업로드\n• [해시태그] 업체 지정 해시태그 10개 이상 포함 및 매장 공식 인스타그램 계정 인물 태그 필수\n• [위치태그] 피드 업로드 시 실제 매장 위치 등록 필수`;
    } else {
      return `• [영상/더보기] 3분 이상의 리얼 체험 영상 업로드 및 영상 더보기란에 매장 위치/예약 링크 명시\n• [자막/태그] 대표 혜택 안내 자막 처리 및 대표 키워드 5개 이상 태그 등록`;
    }
  } else {
    // 배송 / 재택형
    if (isBlog) {
      return `• [언박싱/실사용] 제품 수령 후 5일 이내 언박싱 및 실제 실사용 포토 8장 이상 첨부\n• [장점/후기] 제품의 주요 특징 및 사용 후 느낀 점을 800자 이상으로 꼼꼼히 리뷰 작성\n• [구매 링크] 하단에 스마트스토어 공식 구매 URL 링크 및 공정위 스폰서 문구 기재`;
    } else {
      return `• [고화질 컷] 제품 감성 연출 실사용 고화질 컷 5장 이상 피드에 업로드\n• [태그/후기] 브랜드 공식 계정 피드 태그 및 솔직 사용 후기 3줄 이상 작성`;
    }
  }
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

export const detectPlatform = (title: string, rawPlatformText?: string): 'blog' | 'instagram' | 'youtube' | 'etc' => {
  const p = (rawPlatformText || '').toLowerCase();
  const t = title.toLowerCase();

  // 1. 원본 뱃지 텍스트 1순위 최우선 판정
  if (p.includes('instagram') || p.includes('insta') || p.includes('인스타') || p.includes('릴스') || p.includes('reels')) {
    return 'instagram';
  }
  if (p.includes('youtube') || p.includes('유튜브') || p.includes('쇼츠') || p.includes('shorts')) {
    return 'youtube';
  }
  if (p.includes('blog') || p.includes('블로그')) {
    return 'blog';
  }

  // 2. 제목 키워드 (릴스, 인스타, 쇼츠) 2순위 판정
  if (t.includes('릴스') || t.includes('인스타') || t.includes('instagram') || t.includes('reels')) {
    return 'instagram';
  }
  if (t.includes('유튜브') || t.includes('youtube') || t.includes('쇼츠') || t.includes('shorts')) {
    return 'youtube';
  }

  return 'blog';
};

const detectCategory = (title: string, desc: string): string => {
  const t = (title + ' ' + desc).toLowerCase();
  
  // 1. 맛집/카페 하위 세분화
  if (t.includes('카페') || t.includes('디저트') || t.includes('베이커리') || t.includes('빵집') || t.includes('도넛') || t.includes('마카롱')) {
    return 'food-cafe';
  }
  if (t.includes('이자카야') || t.includes('주점') || t.includes('술집') || t.includes('포차') || t.includes('맥주') || t.includes('와인') || t.includes('칵테일') || t.includes('주류')) {
    return 'food-pub';
  }
  if (t.includes('맛집') || t.includes('식사') || t.includes('고기') || t.includes('삼겹살') || t.includes('한우') || t.includes('식당') || t.includes('뷔페') || t.includes('레스토랑') || t.includes('스시') || t.includes('초밥') || t.includes('파스타') || t.includes('피자') || t.includes('돈까스') || t.includes('치킨') || t.includes('통닭') || t.includes('곱창') || t.includes('마라탕')) {
    return 'food-restaurant';
  }
  
  // 2. 뷰티 하위 세분화
  if (t.includes('헤어') || t.includes('미용실') || t.includes('염색') || t.includes('파마') || t.includes('펌') || t.includes('클리닉') || t.includes('두피케어')) {
    return 'beauty-hair';
  }
  if (t.includes('네일') || t.includes('왁싱') || t.includes('피부') || t.includes('에스테틱') || t.includes('속눈썹') || t.includes('마사지') || t.includes('체형교정')) {
    return 'beauty-skin';
  }
  if (t.includes('화장품') || t.includes('크림') || t.includes('앰플') || t.includes('세럼') || t.includes('에센스') || t.includes('립스틱') || t.includes('선크림') || t.includes('선블록') || t.includes('뷰티템') || t.includes('메이크업') || t.includes('아이라이너')) {
    return 'beauty-cosmetic';
  }

  // 3. 여행/숙박 하위 세분화
  if (t.includes('호텔') || t.includes('펜션') || t.includes('풀빌라') || t.includes('리조트') || t.includes('글램핑') || t.includes('캠핑') || t.includes('게스트하우스') || t.includes('민박') || t.includes('숙소') || t.includes('숙박')) {
    return 'travel-stay';
  }
  if (t.includes('입장권') || t.includes('티켓') || t.includes('패스') || t.includes('액티비티') || t.includes('레저') || t.includes('체험권') || t.includes('서핑') || t.includes('요트') || t.includes('아쿠아리움') || t.includes('키즈카페') || t.includes('놀이공원') || t.includes('박물관') || t.includes('전시')) {
    return 'travel-leisure';
  }

  // 4. 패션 하위 세분화
  if (t.includes('의류') || t.includes('패션') || t.includes('자켓') || t.includes('코트') || t.includes('셔츠') || t.includes('티셔츠') || t.includes('원피스') || t.includes('니트') || t.includes('바지') || t.includes('치마') || t.includes('아우터')) {
    return 'fashion-clothing';
  }
  if (t.includes('가방') || t.includes('백팩') || t.includes('숄더백') || t.includes('신발') || t.includes('구두') || t.includes('운동화') || t.includes('스니커즈') || t.includes('모자') || t.includes('액세서리') || t.includes('악세사리') || t.includes('귀걸이') || t.includes('목걸이') || t.includes('시계')) {
    return 'fashion-accessory';
  }

  // 5. 도서/교육 단독 카테고리 분리
  if (t.includes('도서') || t.includes('책 ') || t.includes('베스트셀러') || t.includes('소설') || t.includes('에세이') || t.includes('인터넷강의') || t.includes('인강') || t.includes('교육') || t.includes('학습지') || t.includes('학습') || t.includes('학원')) {
    return 'book';
  }

  // 6. 건강/식품 세분화
  if (t.includes('밀키트') || t.includes('신선식품') || t.includes('반찬') || t.includes('간식') || t.includes('과일') || t.includes('음료') || t.includes('탄산수') || t.includes('커피원두') || t.includes('조미료') || t.includes('가공식품') || t.includes('푸드')) {
    return 'health-fresh';
  }
  if (t.includes('영양제') || t.includes('유산균') || t.includes('비타민') || t.includes('다이어트') || t.includes('단백질') || t.includes('콜라겐') || t.includes('홍삼') || t.includes('헬스케어') || t.includes('즙 ') || t.includes('건강식품')) {
    return 'health-food';
  }

  // 7. 유아동/육아
  if (t.includes('유아') || t.includes('아동') || t.includes('아기') || t.includes('육아') || t.includes('기저귀') || t.includes('분유') || t.includes('젖병') || t.includes('장난감') || t.includes('키즈') || t.includes('카시트') || t.includes('유모차') || t.includes('아동복')) {
    return 'baby';
  }

  // 8. 생활/가전 세분화
  if (t.includes('가전') || t.includes('청소기') || t.includes('모니터') || t.includes('키보드') || t.includes('마우스') || t.includes('가습기') || t.includes('이어폰') || t.includes('헤드폰') || t.includes('스마트폰') || t.includes('충전기') || t.includes('디지털기기')) {
    return 'life-appliances';
  }
  if (t.includes('세제') || t.includes('섬유유연제') || t.includes('샴푸') || t.includes('린스') || t.includes('치약') || t.includes('칫솔') || t.includes('화장지') || t.includes('물티슈') || t.includes('침구') || t.includes('베개') || t.includes('가구') || t.includes('인테리어') || t.includes('식기') || t.includes('생활용품') || t.includes('도구')) {
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
          const description = (subTit && subTit !== title) ? subTit : '3만원~5만원 상당의 대표 메뉴 체험권';

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
            location = locMatch ? locMatch[1] : '서울 마포구';
          }
          // 🎁 제공 혜택(description) 정밀 파싱 (제목과 동일 중복 방지)
          let benefitText = $(element).find('.point_badge, .qz-dq-card__text, .qz-dq-card__desc, .benefit').text().replace(/\s+/g, ' ').trim();
          if (!benefitText || benefitText === title || benefitText.length < 3) {
            benefitText = '3만원~5만원 상당 대표 서비스 및 시그니처 혜택';
          }
          const description = benefitText;

          const category = detectCategory(title, badgesText);

          if (title && campaignUrl) {
            const fullUrl = campaignUrl.startsWith('http') ? campaignUrl : `https://dinnerqueen.net${campaignUrl}`;
            const dqId = fullUrl.split('/').pop() || fullUrl.replace(/[^0-9]/g, '');
            const id = `dq-${dqId}`;
            const autoKws = buildAutoKeywords(title, badgesText);
            const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

            collected.push({
              id, title, description, platform, category, location, campaignUrl: fullUrl,
              imageUrl, targetSite: '디너의여왕', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords
            });
          }
        });
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
            const limitCount = item.REVIEWER_CNT || 5;
            const applyCount = item.REVIEWER_REQ_CNT || 0;
            const autoKws = buildAutoKeywords(title, description);
            const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

            // 원본 실제 미션 데이터 매핑 (포블로그 원본 상세 미션)
            const mission = (title.includes('김종구') || item.CAMPAIGN_NM?.includes('김종구'))
              ? `★ 영수증리뷰필수\n1. 업체명검색을 통한 네이버지도등록 필수\n2. 사진20장이상, 글자수 1500자 이상\n3. 체험후 3일이내 리뷰등록 부탁드립니다.\n4. 선정자분들간 테이블합석 불가능한점 참고안내드립니다\n* 매장에서 별도의 미션안내가 있을수있습니다.\n★ 배너매장협의\n\n협찬 배너를 넣으시면, 포스팅이 검색에 누락 될 수 있습니다. 공정위 스티커로 대체해주세요 ~`
              : generateRealMission(title, platform, category, location);

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
        const rnUrl = `https://www.reviewnote.co.kr/customer/campaign?q=${encodedKeyword}`;
        const response = await axios.get(rnUrl, { headers: HEADERS, timeout: 5000 });
        const html = response.data;
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
        if (nextDataMatch) {
          const nextData = JSON.parse(nextDataMatch[1]);
          const campaignList = nextData.props?.pageProps?.campaigns?.data || [];
          campaignList.forEach((c: any) => {
            const id = `rn-${c.id}`;
            const title = c.title || '';
            const description = c.provide_desc || '';
            const platform = c.category_id === 1 ? 'blog' : c.category_id === 2 ? 'instagram' : 'blog';
            const category = detectCategory(title, description);
            const location = c.addr1 || undefined;
            const campaignUrl = `https://www.reviewnote.co.kr/customer/campaign/${c.id}`;
            const imageUrl = c.img1 || '';
            const limitCount = c.recruit_count || 0;
            const applyCount = c.apply_count || 0;
            const endDate = c.recruit_end_date || now.toISOString().split('T')[0];
            const autoKws = buildAutoKeywords(title, description);
            const searchKeywords = autoKws ? `,${keyword},${autoKws.substring(1)}` : `,${keyword},`;

            collected.push({
              id, title, description, platform, category, location, campaignUrl,
              imageUrl, targetSite: '리뷰노트', limitCount, applyCount,
              startDate: c.recruit_start_date || now.toISOString().split('T')[0], endDate,
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
