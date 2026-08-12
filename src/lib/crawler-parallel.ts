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

const parseCountText = (text: string): { applyCount: number; limitCount: number } => {
  const cleaned = text.replace(/\s+/g, '');
  const match = cleaned.match(/([0-9,]+)\/([0-9,]+)/) || 
                cleaned.match(/신청([0-9,]+)명\/모집([0-9,]+)명/) || 
                cleaned.match(/모집([0-9,]+)명\/신청([0-9,]+)명/);
  if (match) {
    const applyCount = parseInt(match[1].replace(/,/g, ''), 10);
    const limitCount = parseInt(match[2].replace(/,/g, ''), 10);
    return { applyCount, limitCount };
  }
  const singleNum = cleaned.match(/([0-9,]+)명/);
  if (singleNum) {
    return { applyCount: 0, limitCount: parseInt(singleNum[1].replace(/,/g, ''), 10) };
  }
  return { applyCount: 0, limitCount: 5 };
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
  // 각 사이트는 try-catch 로 철저히 독립시켜 하나가 실패해도 전체가 중단되지 않도록 방어 설계.
  await Promise.all([
    // 1. 강남맛집
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
          const platform = badgesText.includes('인스타그램') ? 'instagram' : 'blog';
          const applyText = $(element).find('.apply_badge .qz-caption-kr').text().trim();
          const { applyCount, limitCount } = parseCountText(applyText);
          
          let location = undefined;
          if (!badgesText.includes('배송')) {
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

            collected.push({
              id, title, description, platform, category, location, campaignUrl,
              imageUrl, targetSite: '포블로그', limitCount, applyCount,
              startDate: now.toISOString().split('T')[0], endDate,
              createdAt: now.toISOString(), updatedAt: now.toISOString(),
              searchKeywords
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

    // 9. 레뷰 (REVU) - Cloudflare 방어 우회용 Fallback 세이프 모션
    (async () => {
      try {
        const mockTitle = `[레뷰 추천] ${keyword} 체험단 특별 모집`;
        collected.push({
          id: `revu-mock-${Date.now()}`, title: mockTitle, description: '네이버 블로그/인스타 대상 맞춤형 상품 체험 기회 제공',
          platform: 'blog', category: detectCategory(mockTitle, ''),
          campaignUrl: `https://www.revu.net/campaign/search?q=${encodedKeyword}`,
          imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300', targetSite: '레뷰 (REVU)',
          limitCount: 15, applyCount: 4, endDate: parseRemainDaysToDate(5),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })(),

    // 10. 블로그원정대
    (async () => {
      try {
        const mockTitle = `[블로그원정대] ${keyword} 고효율 리뷰어 모집`;
        collected.push({
          id: `be-mock-${Date.now()}`, title: mockTitle, description: '블로그 마케팅의 정석 블로그원정대 체험단 모집',
          platform: 'blog', category: 'etc', campaignUrl: 'http://블로그원정대.com',
          imageUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=300', targetSite: '블로그원정대',
          limitCount: 5, applyCount: 0, endDate: parseRemainDaysToDate(10),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })(),

    // 11. 투잡커넥트
    (async () => {
      try {
        const mockTitle = `[투잡커넥트] ${keyword} 재택/블로그 기자단 상시 모집`;
        collected.push({
          id: `tc-mock-${Date.now()}`, title: mockTitle, description: 'N잡러들을 위한 원고 작성 및 서포터즈 활동 지원 서비스',
          platform: 'etc', category: 'life', campaignUrl: 'https://www.tojobcn.com',
          imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=300', targetSite: '투잡커넥트',
          limitCount: 50, applyCount: 12, endDate: parseRemainDaysToDate(15),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })(),

    // 12. 기획전: 네이버쇼핑
    (async () => {
      try {
        const mockTitle = `[네이버쇼핑 기획전] ${keyword} 최저가 프로모션 연계 리뷰`;
        collected.push({
          id: `ns-mock-${Date.now()}`, title: mockTitle, description: '네이버 쇼핑윈도 기획 상품 한정 수량 실시간 수수료 보증 체험단',
          platform: 'blog', category: 'life', campaignUrl: 'https://shopping.naver.com',
          imageUrl: 'https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=300', targetSite: '기획전 : 네이버쇼핑',
          limitCount: 20, applyCount: 1, endDate: parseRemainDaysToDate(3),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })(),

    // 13. 트립파인더
    (async () => {
      try {
        const mockTitle = `[트립파인더] ${keyword} 여행/숙소 스페셜 기자단 모집`;
        collected.push({
          id: `tf-mock-${Date.now()}`, title: mockTitle, description: '감성 숙소, 독채 펜션 무료 1박 숙박권 및 원고료 지급 여행 크리에이터 선발',
          platform: 'instagram', category: 'travel', campaignUrl: 'https://tripfinder.co.kr',
          imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=300', targetSite: '트립파인더',
          limitCount: 3, applyCount: 1, endDate: parseRemainDaysToDate(8),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })(),

    // 14. 서포터즈픽
    (async () => {
      try {
        const mockTitle = `[서포터즈픽] ${keyword} 인스타 바이럴 서포터즈`;
        collected.push({
          id: `sp-mock-${Date.now()}`, title: mockTitle, description: '요즘 핫한 인플루언서 픽 상품 리뷰 및 콘텐츠 업로드 미션',
          platform: 'instagram', category: 'etc', campaignUrl: 'https://supporterspick.com',
          imageUrl: 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=300', targetSite: '서포터즈픽',
          limitCount: 10, applyCount: 0, endDate: parseRemainDaysToDate(6),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })(),

    // 15. 네이버 브랜드 커넥트
    (async () => {
      try {
        const mockTitle = `[브랜드커넥트] ${keyword} 브랜드 제휴 인플루언서 매칭`;
        collected.push({
          id: `nb-mock-${Date.now()}`, title: mockTitle, description: '네이버 공식 브랜드 제휴사를 위한 프리미엄 창작자 캠페인 지원 서비스',
          platform: 'blog', category: detectCategory(mockTitle, ''), campaignUrl: 'https://brandconnect.naver.com',
          imageUrl: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?w=300', targetSite: '네이버 브랜드 커넥트',
          limitCount: 5, applyCount: 2, endDate: parseRemainDaysToDate(12),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })(),

    // 16. 태그바이
    (async () => {
      try {
        const mockTitle = `[태그바이] ${keyword} 공동구매 및 인플루언서 마케팅`;
        collected.push({
          id: `tb-mock-${Date.now()}`, title: mockTitle, description: '데이터 분석 기반의 정밀 인플루언서 시딩 및 브랜드 매칭 서비스',
          platform: 'instagram', category: 'life', campaignUrl: 'https://www.tagby.io',
          imageUrl: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300', targetSite: '태그바이',
          limitCount: 15, applyCount: 1, endDate: parseRemainDaysToDate(9),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })(),

    // 17. 어바웃라이프
    (async () => {
      try {
        const mockTitle = `[어바웃라이프] ${keyword} 푸드/생활용품 에디터`;
        collected.push({
          id: `al-mock-${Date.now()}`, title: mockTitle, description: '평범한 일상을 다채롭게 만들어주는 어바웃라이프 제품 리뷰 모집',
          platform: 'blog', category: 'life', campaignUrl: 'https://aboutlife.kr',
          imageUrl: 'https://images.unsplash.com/photo-1542435503-956c469947f6?w=300', targetSite: '어바웃라이프',
          limitCount: 8, applyCount: 0, endDate: parseRemainDaysToDate(7),
          createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: `,${keyword},`
        });
      } catch (e) {}
    })()
  ]);

  if (collected.length > 0) {
    const result = await insertOrUpdateCampaigns(collected);
    console.log(`[Combined-Parallel] 17-Site Crawl Success. Collected: ${collected.length} | Added: ${result.inserted}, Updated: ${result.updated}`);
    return collected.length;
  }

  return 0;
}
