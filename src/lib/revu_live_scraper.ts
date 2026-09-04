import axios from 'axios';

export interface RevuLiveCampaign {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  location: string | null;
  campaignUrl: string;
  imageUrl: string;
  targetSite: string;
  limitCount: number;
  applyCount: number;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchRevuLiveCampaigns(): Promise<RevuLiveCampaign[]> {
  console.log('🔍 [REVU SCRAPER] 레뷰 (REVU) 100% 라이브 원본 공고 수집 시작 (Weble API)...');

  const baseRoutes = ['deadline', 'high-selection', 'premier'];
  const rawItemsMap = new Map<number, any>();

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Origin': 'https://www.revu.net',
    'Referer': 'https://www.revu.net/'
  };

  if (process.env.REVU_AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.REVU_AUTH_TOKEN}`;
    console.log('🔑 [REVU SCRAPER] Authenticated session token detected. Fetching full authorized Revu feed...');

    // 인증 토큰이 설정된 경우 전용 전체 목록 API 페이징 수집 (최대 20페이지)
    for (let page = 1; page <= 20; page++) {
      try {
        const url = `https://api.weble.net/v1/campaigns?limit=100&page=${page}`;
        const res = await axios.get(url, { headers, timeout: 7000 });
        const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
        if (!items || items.length === 0) break;

        items.forEach((item: any) => {
          if (item && item.id) {
            rawItemsMap.set(item.id, item);
          }
        });
      } catch (e: any) {
        break;
      }
    }
  }

  // 1. 다중 큐레이션 라우트 크롤링 (Multi-page deep scraping)
  for (const route of baseRoutes) {
    for (let page = 1; page <= 5; page++) {
      try {
        const url = `https://api.weble.net/v1/campaigns/${route}?limit=50&page=${page}`;
        const res = await axios.get(url, { headers, timeout: 7000 });
        const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
        if (!items || items.length === 0) break;

        items.forEach((item: any) => {
          if (item && item.id) {
            rawItemsMap.set(item.id, item);
          }
        });
      } catch (e: any) {
        break;
      }
    }
  }

  // 2. 실시간 트렌딩 섹션 수집
  try {
    const res = await axios.get('https://api.weble.net/v1/campaigns/trending', { headers, timeout: 5000 });
    const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
    items.forEach((item: any) => {
      if (item && item.id) {
        rawItemsMap.set(item.id, item);
      }
    });
  } catch (e: any) {}

  const results: RevuLiveCampaign[] = [];
  const now = new Date();

  rawItemsMap.forEach((item, id) => {
    const rawTitle = item.item || item.title || '레뷰 프리미엄 체험단';
    const rawReward = item.campaignData?.reward || item.brief || '무상 제공 및 식사권 지원';
    const point = item.campaignData?.point || 0;
    const venueName = item.venue?.name;

    let reward = rawReward;
    const pointStr = point > 0 ? (point >= 10000 ? `${point / 10000}만원` : `${point.toLocaleString()}P`) : '';

    if (rawReward === '레뷰 포인트' || rawReward === '포인트') {
      if (venueName) {
        reward = `${venueName} 매장이용권 + 레뷰 포인트 ${pointStr}`.trim();
      } else {
        reward = `레뷰 포인트 ${pointStr}`.trim();
      }
    } else if (point > 0) {
      if (!rawReward.includes(pointStr) && pointStr) {
        reward = `${rawReward} + 레뷰 포인트 ${pointStr}`.trim();
      }
    }

    const thumbnail = item.thumbnail || 'https://www.revu.net/assets/img/og-revu.png';
    const media = (item.media || '').toLowerCase();
    const limitCount = item.reviewerLimit || 5;
    const applyCount = item.campaignStats?.requestCount || 0;
    const endDate = item.requestEndedOn ? item.requestEndedOn.split(' ')[0] : new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    // Platform matching
    let platform = 'blog';
    if (media.includes('insta') || rawTitle.includes('릴스') || rawTitle.includes('인스타')) {
      platform = 'instagram';
    } else if (media.includes('youtube') || rawTitle.includes('쇼츠') || rawTitle.includes('유튜브')) {
      platform = 'youtube';
    } else if (media.includes('clip') || rawTitle.includes('클립')) {
      platform = 'naver-clip';
    }

    // Category matching
    let category = 'food-korean';
    const catStr = (item.category || []).join(' ');
    if (catStr.includes('카페') || rawTitle.includes('카페') || rawTitle.includes('디저트')) category = 'food-cafe';
    else if (catStr.includes('맛집') || rawTitle.includes('식당') || rawTitle.includes('고기') || rawTitle.includes('푸드')) category = 'food-korean';
    else if (catStr.includes('주점') || rawTitle.includes('술집') || rawTitle.includes('이자카야') || rawTitle.includes('바')) category = 'food-pub';
    else if (catStr.includes('화장품') || catStr.includes('뷰티') || rawTitle.includes('뷰티') || rawTitle.includes('화장품')) category = 'beauty-cosmetic';
    else if (catStr.includes('헤어') || catStr.includes('미용') || rawTitle.includes('헤어')) category = 'beauty-hair';
    else if (catStr.includes('여행') || catStr.includes('숙박') || rawTitle.includes('펜션') || rawTitle.includes('호텔')) category = 'travel-stay';

    // Location extraction
    let location: string | null = null;
    if (item.localTag && item.localTag.length > 0) {
      location = item.localTag[0];
    } else if (item.venue?.addressFirst) {
      const match = item.venue.addressFirst.match(/(서울|경기|인천|부산|대구|대전|광주|제주|강원|충북|충남|전북|전남|경북|경남)\s*([가-힣]+)/);
      if (match) location = `${match[1]} ${match[2]}`;
    }

    results.push({
      id: `revu-live-${id}`,
      title: rawTitle,
      description: reward,
      platform,
      category,
      location,
      campaignUrl: `https://www.revu.net/campaign/${id}`,
      imageUrl: thumbnail,
      targetSite: '레뷰 (REVU)',
      limitCount,
      applyCount,
      endDate,
      createdAt: item.createdAt || now.toISOString(),
      updatedAt: item.updatedAt || now.toISOString()
    });
  });

  console.log(`✅ [REVU SCRAPER] 레뷰 (REVU) 실시간 실데이터 ${results.length}건 파싱 성공!`);
  return results;
}
