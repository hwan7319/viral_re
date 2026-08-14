import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export const dynamic = 'force-dynamic';

const DEFAULT_NAVER_TRENDING = [
  '강남맛집',
  '후지필름 카메라',
  '제주도 여행',
  '스마트폰 추천',
  '주식 시황',
  '날씨 정보',
  '인기 영화',
  '신작 게임',
  '주요 뉴스',
  '캠핑 용품'
];

// 🔑 GET /api/naver-trending: 네이버 / 실시간 이슈 검색 랭킹 1~10위 전용 반환
export async function GET(req: NextRequest) {
  try {
    const liveKeywords: string[] = [];

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
      console.warn('[Naver Trending API] Signal.bz fetch skipped:', e.message);
    }

    const mergedList: string[] = [];
    const addedSet = new Set<string>();

    liveKeywords.forEach(kw => {
      if (kw && !addedSet.has(kw)) {
        mergedList.push(kw);
        addedSet.add(kw);
      }
    });

    for (const defWord of DEFAULT_NAVER_TRENDING) {
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
    console.error('[API Naver Trending Error]:', error);
    const fallbackList = DEFAULT_NAVER_TRENDING.map((word, index) => ({
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
