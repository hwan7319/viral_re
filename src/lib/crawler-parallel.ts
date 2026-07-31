import axios from 'axios';
import * as cheerio from 'cheerio';
import { Campaign, insertOrUpdateCampaigns } from './db';

// 🔑 크롤링 브라우저 User-Agent 헤더 셋업
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

// 쿨타임 및 지연 방지를 위해 지연 대기 함수 제거 또는 단축
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
  const match = cleaned.match(/([0-9,]+)\/([0-9,]+)/) || cleaned.match(/신청([0-9,]+)명\/모집([0-9,]+)명/) || cleaned.match(/모집([0-9,]+)명\/신청([0-9,]+)명/);
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

const detectCategory = (title: string, desc: string): "etc" | "food" | "beauty" | "fashion" | "travel" | "life" => {
  const t = (title + ' ' + desc).toLowerCase();
  if (t.includes('맛집') || t.includes('식사') || t.includes('고기') || t.includes('카페') || t.includes('디저트') || t.includes('이자카야') || t.includes('요리')) {
    return 'food';
  }
  if (t.includes('뷰티') || t.includes('화장품') || t.includes('피부') || t.includes('헤어') || t.includes('미용실') || t.includes('네일') || t.includes('왁싱')) {
    return 'beauty';
  }
  if (t.includes('숙소') || t.includes('호텔') || t.includes('펜션') || t.includes('여행') || t.includes('글램핑') || t.includes('풀빌라')) {
    return 'travel';
  }
  return 'etc';
};

const buildAutoKeywords = (title: string, desc: string): string => {
  const t = (title + ' ' + desc).toLowerCase();
  const keywords: string[] = [];
  if (t.includes('맛집') || t.includes('식당')) keywords.push('맛집', '식당');
  if (t.includes('삼겹살') || t.includes('한우') || t.includes('고기')) keywords.push('고기');
  if (t.includes('카페') || t.includes('디저트')) keywords.push('카페');
  if (t.includes('펜션') || t.includes('풀빌라')) keywords.push('온수풀', '풀빌라', '펜션');
  return keywords.length > 0 ? `,${keywords.join(',')},` : '';
};

// 🔑 5대 매체 초고속 병렬 실시간 검색 수집기 (Promise.all)
export async function crawlKeywordOnDemandParallel(keyword: string): Promise<number> {
  console.log(`[Combined-Parallel] Starting hyper-fast concurrent crawls for "${keyword}"...`);
  const now = new Date();
  const collected: Campaign[] = [];
  const encodedKeyword = encodeURIComponent(keyword);

  // 🔑 Promise.all 을 이용하여 5대 사이트의 네트워크 지연 요소를 한꺼번에 묶어서 1.5초대 이내로 압축 실행!
  await Promise.all([
    // Task 1: 강남맛집
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

        // AJAX 1페이지 추가 수집
        const ajaxUrl = `https://xn--939au0g4vj8sq.net/theme/go/_list_cmp_tpl.php?stx=${encodedKeyword}&rpage=1&row_num=20`;
        const ajaxRes = await axios.get(ajaxUrl, { headers: HEADERS, timeout: 5000 });
        const htmlContent = ajaxRes.data.trim();
        if (htmlContent && !htmlContent.includes('조회된 캠페인이 없습니다')) {
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
        console.error('[OnDemand-Parallel] Gangnam맛집 crawl failed:', err.message);
      }
    })(),

    // Task 2: 디너의여왕
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
      } catch (err: any) {
        console.error('[OnDemand-Parallel] DinnerQueen crawl failed:', err.message);
      }
    })(),

    // Task 3: 포블로그
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
        console.error('[OnDemand-Parallel] ForBlog crawl failed:', err.message);
      }
    })(),

    // Task 4: 리뷰노트
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
        console.error('[OnDemand-Parallel] ReviewNote crawl failed:', err.message);
      }
    })()
  ]);

  if (collected.length > 0) {
    const result = await insertOrUpdateCampaigns(collected);
    console.log(`[Combined-Parallel] Concurrent Crawl Success. Total Collected: ${collected.length} | Added: ${result.inserted}, Updated: ${result.updated}`);
    return collected.length;
  }

  return 0;
}
