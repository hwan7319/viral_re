import { NextRequest, NextResponse } from 'next/server';
import { getTrendingKeywords } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 기본 고정 데모 인기 키워드 리스트 (DB 로그가 부족할 때 순위를 보장하기 위한 스티키 병합용)
const DEFAULT_TRENDING = [
  '강남 맛집',
  '수분 크림',
  '치킨',
  '제주도 펜션',
  '삼겹살',
  '아이패드',
  '피부관리',
  '애견 동반 카페',
  '오마카세',
  '헤어 클리닉'
];

// 🔑 GET /api/trending: DB 검색 로그 기반 실시간 인기 검색어 1~10위 산출 반환
export async function GET(req: NextRequest) {
  try {
    // 1. DB에서 최근 24시간 실시간 검색 로그 집계 조회
    const dbTrending = await getTrendingKeywords();

    // 2. 병합(Merge) 로직: DB 결과에 있는 키워드 우선 배치 후, 10개가 안 차면 기본 리스트로 순위 채움
    const mergedList: string[] = [];
    const addedSet = new Set<string>();

    // DB 통계 키워드 먼저 추가
    dbTrending.forEach(item => {
      const trimmed = item.word.trim();
      if (trimmed && !addedSet.has(trimmed)) {
        mergedList.push(trimmed);
        addedSet.add(trimmed);
      }
    });

    // 10개가 찰 때까지 기본 키워드 채워 넣기
    for (const defWord of DEFAULT_TRENDING) {
      if (mergedList.length >= 10) break;
      if (!addedSet.has(defWord)) {
        mergedList.push(defWord);
        addedSet.add(defWord);
      }
    }

    // 3. 1위부터 10위까지 객체 구조로 매핑 포맷팅 (신규 진입 키워드 isNew 플래그 부여)
    const trendingList = mergedList.map((word, index) => {
      const isDbWord = dbTrending.some(d => d.word.trim() === word);
      // DB 수집 데이터 또는 2위, 5위, 8위 항목에 NEW 효과 부여
      const isNew = isDbWord || index === 1 || index === 4 || index === 7;
      return {
        rank: index + 1,
        word,
        isNew
      };
    });

    return NextResponse.json({
      success: true,
      data: trendingList
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });

  } catch (error: any) {
    console.error('[API Trending Error]:', error);
    const fallbackList = DEFAULT_TRENDING.map((word, index) => ({
      rank: index + 1,
      word
    }));
    return NextResponse.json({
      success: true,
      data: fallbackList
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}
