import { NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

function generateSearchAdSignature(timestamp: string, method: string, uri: string, secretKey: string) {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
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

    // 1. 네이버 블로그 검색 API 호출 (총 포스팅 문서 수 & 상위 블로그 목록)
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
    let relatedKeywords: string[] = [];
    let isRealSearchAdData = false;

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

        relatedKeywords = keywordList.slice(0, 15).map((k: any) => k.relKeyword);
      } catch (err: any) {
        console.warn('[Keyword API] SearchAd API error:', err.message);
      }
    }

    // 🔑 검색광고 API 키가 없는 경우: 문서 수 기반 스마트 예상 검색량 계산
    if (!isRealSearchAdData) {
      totalSearchVolume = Math.max(100, Math.floor(totalPosts * 0.15));
      pcSearchVolume = Math.floor(totalSearchVolume * 0.25);
      mobileSearchVolume = Math.floor(totalSearchVolume * 0.75);
      relatedKeywords = [query, `${query} 추천`, `${query} 가격`, `${query} 위치`, `${query} 후기`, `${query} 예약`, `${query} 메뉴`];
    }

    // 3. 경쟁도 비율 계산 (총 문서 수 / 총 검색량)
    const ratio = totalSearchVolume > 0 ? (totalPosts / totalSearchVolume).toFixed(2) : '0.00';
    const competitionRatio = parseFloat(ratio);

    // 4. 키워드 등급/상태 평가
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
        relatedKeywords,
        topPosts,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Keyword API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
