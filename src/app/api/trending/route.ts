import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getTrendingKeywords } from '@/lib/db';

export const dynamic = 'force-dynamic';

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
    const liveKeywords: string[] = [];

    // 1. 실시간 이슈 키워드 API (Signal.bz) 실시간 수집 시도
    try {
      const sigRes = await axios.get('https://api.signal.bz/news/realtime', {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        timeout: 2500,
      });

      if (sigRes.data && Array.isArray(sigRes.data.top10)) {
        sigRes.data.top10.forEach((item: any) => {
          if (item.keyword && typeof item.keyword === 'string') {
            liveKeywords.push(item.keyword.trim());
          }
        });
      }
    } catch (e: any) {
      console.warn('[Trending API] Signal.bz live fetch skipped:', e.message);
    }

    // 2. DB 검색 로그 통계 데이터 수집
    const dbTrending = await getTrendingKeywords();

    const mergedList: string[] = [];
    const addedSet = new Set<string>();

    // ① 실시간 급상승 키워드 우선 수집
    liveKeywords.forEach(kw => {
      if (kw && !addedSet.has(kw)) {
        mergedList.push(kw);
        addedSet.add(kw);
      }
    });

    // ② DB 로그 키워드 수집
    dbTrending.forEach(item => {
      const trimmed = item.word.trim();
      if (trimmed && !addedSet.has(trimmed)) {
        mergedList.push(trimmed);
        addedSet.add(trimmed);
      }
    });

    // ③ 10개 부족 시 기본 고정 키워드 채움
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
