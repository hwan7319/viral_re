import { NextRequest, NextResponse } from 'next/server';
import { getTrendingKeywords } from '@/lib/db';

export const dynamic = 'force-dynamic';

// 🔑 체험단 & 바이럴 마케팅 전용 인기 검색어 고정 데이터세트 (메인 체험단 검색 및 필터링 전용)
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

export async function GET(req: NextRequest) {
  try {
    // 1. DB에서 최근 24시간 실제 유저 체험단 검색 로그 집계 조회
    const dbTrending = await getTrendingKeywords();

    const mergedList: string[] = [];
    const addedSet = new Set<string>();

    // DB 실데이터 사용자 검색 키워드 우선 배치
    dbTrending.forEach(item => {
      const trimmed = item.word.trim();
      if (trimmed && !addedSet.has(trimmed)) {
        mergedList.push(trimmed);
        addedSet.add(trimmed);
      }
    });

    // 10개가 찰 때까지 체험단 전용 시그니처 검색어로 순위 채움
    for (const defWord of DEFAULT_TRENDING) {
      if (mergedList.length >= 10) break;
      if (!addedSet.has(defWord)) {
        mergedList.push(defWord);
        addedSet.add(defWord);
      }
    }

    const trendingList = mergedList.slice(0, 10).map((word, index) => {
      const rank = index + 1;
      let tagType: 'hot' | 'new' | 'up' | 'same' = 'same';
      let tagLabel = '-';

      if (rank === 1) {
        tagType = 'hot';
        tagLabel = '🔥 HOT';
      } else if (rank <= 3) {
        tagType = 'up';
        tagLabel = `▲ ${4 - rank}`;
      } else if (index === 4 || index === 7) {
        tagType = 'new';
        tagLabel = 'NEW';
      } else {
        tagType = 'same';
        tagLabel = '-';
      }

      return {
        rank,
        word,
        tagType,
        tagLabel,
        isNew: tagType === 'new'
      };
    });

    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString(),
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
      word,
      tagType: 'same' as const,
      tagLabel: '-'
    }));
    return NextResponse.json({
      success: true,
      updatedAt: new Date().toISOString(),
      data: fallbackList
    });
  }
}
