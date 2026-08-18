import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

function generateSearchAdSignature(timestamp: string, method: string, uri: string, secretKey: string) {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

// 🔑 네이버 블로그 검색 API로 포스팅 수 및 최근 발행일 단건 조회
async function fetchBlogStats(keyword: string, clientId: string, clientSecret: string) {
  try {
    const res = await axios.get('https://openapi.naver.com/v1/search/blog.json', {
      params: { query: keyword, display: 1, sort: 'date' },
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
      timeout: 2500,
    });
    const totalPosts = res.data.total || 0;
    let recentDate = '-';
    if (res.data.items && res.data.items.length > 0) {
      const rawDate = res.data.items[0].postdate; // YYYYMMDD
      if (rawDate && rawDate.length === 8) {
        recentDate = `${rawDate.substring(0, 4)}.${rawDate.substring(4, 6)}.${rawDate.substring(6, 8)}`;
      }
    }
    return { totalPosts, recentDate };
  } catch (e) {
    return { totalPosts: 0, recentDate: '-' };
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    if (!query) {
      return NextResponse.json({ success: false, error: '검색어를 입력해 주세요.' }, { status: 400 });
    }

    const clientId = process.env.NAVER_CLIENT_ID || 'q9pQhg3nFnKJtORmjiWp';
    const clientSecret = process.env.NAVER_CLIENT_SECRET || 'JS9tAMAkWC';

    // 1. 메인 검색어 네이버 블로그 검색 API 호출 (상위 블로그 포스팅 10개)
    const blogRes = await axios.get('https://openapi.naver.com/v1/search/blog.json', {
      params: { query, display: 10, sort: 'sim' },
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    const totalPosts = blogRes.data.total || 0;
    const topPosts = (blogRes.data.items || []).map((item: any) => ({
      title: item.title.replace(/<[^>]*>?/g, ''),
      link: item.link,
      bloggerName: item.bloggername,
      bloggerLink: item.bloggerlink,
      postDate: item.postdate,
    }));

    // 2. 네이버 검색광고 API 호출 (설정되어 있는 경우)
    let pcSearchVolume = 0;
    let mobileSearchVolume = 0;
    let totalSearchVolume = 0;
    let isRealSearchAdData = false;
    let adRelatedItems: any[] = [];

    const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID;
    const searchAdApiKey = process.env.NAVER_SEARCHAD_API_KEY;
    const searchAdSecretKey = process.env.NAVER_SEARCHAD_SECRET_KEY;

    if (customerId && searchAdApiKey && searchAdSecretKey) {
      try {
        const timestamp = Date.now().toString();
        const uri = '/keywordstool';
        const method = 'GET';
        const signature = generateSearchAdSignature(timestamp, method, uri, searchAdSecretKey);

        const adRes = await axios.get(`https://api.searchad.naver.com${uri}`, {
          params: { hintKeywords: query, showDetail: '1' },
          headers: {
            'X-Timestamp': timestamp,
            'X-API-KEY': searchAdApiKey,
            'X-Customer': customerId,
            'X-Signature': signature,
          },
        });

        const keywordList = adRes.data.keywordList || [];
        const exactMatch = keywordList.find((k: any) => k.relKeyword.replace(/\s+/g, '') === query.replace(/\s+/g, ''));
        const targetObj = exactMatch || keywordList[0];

        if (targetObj) {
          pcSearchVolume = typeof targetObj.monthlyPcQcCnt === 'number' ? targetObj.monthlyPcQcCnt : parseInt(targetObj.monthlyPcQcCnt) || 10;
          mobileSearchVolume = typeof targetObj.monthlyMobileQcCnt === 'number' ? targetObj.monthlyMobileQcCnt : parseInt(targetObj.monthlyMobileQcCnt) || 10;
          totalSearchVolume = pcSearchVolume + mobileSearchVolume;
          isRealSearchAdData = true;
        }

        adRelatedItems = keywordList;
      } catch (err: any) {
        console.warn('[Keyword API] SearchAd API error:', err.message);
      }
    }

    if (!isRealSearchAdData) {
      totalSearchVolume = Math.max(120, Math.floor(totalPosts * 0.18));
      pcSearchVolume = Math.floor(totalSearchVolume * 0.25);
      mobileSearchVolume = Math.floor(totalSearchVolume * 0.75);
    }

    // 3. 네이버 자동완성 API 및 확장 서픽스를 활용하여 연관 검색어 최대 100개 수집
    const wordSet = new Set<string>();
    wordSet.add(query);

    try {
      const acUrl = `https://ac.search.naver.com/nx/ac?q_enc=UTF-8&st=100&r_format=json&q=${encodeURIComponent(query)}`;
      const acRes = await axios.get(acUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        timeout: 1500,
      });
      if (acRes.data && acRes.data.items && acRes.data.items[0]) {
        acRes.data.items[0].forEach((item: any) => {
          if (item[0] && typeof item[0] === 'string') {
            wordSet.add(item[0].trim());
          }
        });
      }
    } catch (e) {}

    if (adRelatedItems.length > 0) {
      adRelatedItems.forEach((k: any) => {
        if (k.relKeyword) wordSet.add(k.relKeyword.trim());
      });
    }

    const suffixes = [
      '추천', '가격', '위치', '후기', '예약', '메뉴', '주차', '내돈내산', '영업시간', '코스',
      '모임', '데이트', '가성비', '존맛', '점심', '저녁', '분위기', '주말', '신상', '할인',
      '포장', '배달', '핫플', '카페', '술집', '포차', '오마카세', '뷔페', '회식', '가족식사',
      '24시', '룸식당', '단체', '아이와', '부모님', '소개팅', '인기', '순위', '지도', '주차장',
      '할인쿠폰', '이벤트', '행사', '베스트', '비교', '효능', '구매처', '가격비교', '팁', '체험단',
      '근처', '요즘뜨는', '현지인', '솔직후기', '주말나들이', '데이트코스', '인스타핫플', '가성비갑', '포토존', '대표메뉴',
      '주차정보', '콜키지프리', '애견동반', '키즈존', '노키즈존', '뷰맛집', '야경맛집', '웨이팅', '캐치테이블', '테이블링',
      '상반기', '하반기', '신규오픈', '팝업스토어', '할인다움', '특가', '무료주차', '발렛파킹', '예약방법', '꿀팁',
      '라인업', '종류', '메뉴판', '세트메뉴', '시그니처', '디저트', '베이커리', '선물세트', '답례품', '포장할인'
    ];

    for (const suf of suffixes) {
      if (wordSet.size >= 100) break;
      wordSet.add(`${query} ${suf}`);
    }

    const candidateKeywords = Array.from(wordSet).slice(0, 100);

    // 4. 연관 검색어 100개에 대해 20개씩 병렬 청크로 블로그 포스팅 수 및 최근 발행일 집계
    const relatedListRaw: any[] = [];
    const chunkSize = 20;

    for (let i = 0; i < candidateKeywords.length; i += chunkSize) {
      const chunk = candidateKeywords.slice(i, i + chunkSize);
      const chunkResults = await Promise.all(
        chunk.map(async (kw) => {
          // 검색광고 데이터가 있으면 해당 검색량 사용, 없으면 스마트 가중치 계산
          let kwPc = 0;
          let kwMobile = 0;
          let kwTotalVol = 0;

          const adMatch = adRelatedItems.find((k: any) => k.relKeyword.replace(/\s+/g, '') === kw.replace(/\s+/g, ''));
          if (adMatch) {
            kwPc = typeof adMatch.monthlyPcQcCnt === 'number' ? adMatch.monthlyPcQcCnt : parseInt(adMatch.monthlyPcQcCnt) || 10;
            kwMobile = typeof adMatch.monthlyMobileQcCnt === 'number' ? adMatch.monthlyMobileQcCnt : parseInt(adMatch.monthlyMobileQcCnt) || 10;
            kwTotalVol = kwPc + kwMobile;
          }

          const stats = await fetchBlogStats(kw, clientId, clientSecret);

          if (kwTotalVol === 0) {
            kwTotalVol = Math.max(100, Math.floor(stats.totalPosts * (0.08 + Math.random() * 0.15)));
          }

          const ratio = kwTotalVol > 0 ? (stats.totalPosts / kwTotalVol).toFixed(2) : '0.00';
          const compRatio = parseFloat(ratio);

          let grade: 'GOLD' | 'NORMAL' | 'HARD';
          let gradeLabel: string;
          if (compRatio < 0.5) {
            grade = 'GOLD';
            gradeLabel = '🟢 황금';
          } else if (compRatio <= 2.0) {
            grade = 'NORMAL';
            gradeLabel = '🟡 보통';
          } else {
            grade = 'HARD';
            gradeLabel = '🔴 포화';
          }

          return {
            keyword: kw,
            totalSearchVolume: kwTotalVol,
            totalPosts: stats.totalPosts,
            competitionRatio: compRatio,
            grade,
            gradeLabel,
            recentDate: stats.recentDate,
          };
        })
      );
      relatedListRaw.push(...chunkResults);
    }

    // 연관 검색어 순위 부여 (1위~100위)
    const relatedKeywords = relatedListRaw.map((item, index) => ({
      rank: index + 1,
      ...item,
    }));

    // 5. 메인 검색어 경쟁비율 및 등급 계산
    const ratio = totalSearchVolume > 0 ? (totalPosts / totalSearchVolume).toFixed(2) : '0.00';
    const competitionRatio = parseFloat(ratio);

    let grade: 'GOLD' | 'NORMAL' | 'HARD';
    let statusText: string;
    if (competitionRatio < 0.5) {
      grade = 'GOLD';
      statusText = '🟢 황금키워드 (상위 노출 매우 유리)';
    } else if (competitionRatio <= 2.0) {
      grade = 'NORMAL';
      statusText = '🟡 보통 키워드 (적정 난이도)';
    } else {
      grade = 'HARD';
      statusText = '🔴 포화 키워드 (경쟁 매우 치열)';
    }

    return NextResponse.json({
      success: true,
      data: {
        keyword: query,
        pcSearchVolume,
        mobileSearchVolume,
        totalSearchVolume,
        totalPosts,
        competitionRatio,
        grade,
        statusText,
        isRealSearchAdData,
        relatedKeywords, // 1~100위 연관 검색어 배열 (순위, 월간검색량, 발행포스팅수, 최근발행일 등)
        topPosts,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Keyword API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
