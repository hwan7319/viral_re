import { NextRequest, NextResponse } from 'next/server';
import { queryCampaigns, logSearchQuery } from '@/lib/db';
import { crawlKeywordOnDemand } from '@/lib/crawler-core';

// [중요] Next.js 캐싱 차단: 항상 실시간으로 DB를 직접 조회 및 온디맨드 크롤링 하도록 설정
export const dynamic = 'force-dynamic';

// 검색 키워드별 실시간 크롤링 타임스탬프 (메모리 싱글톤)
const lastCrawlTimeMap = new Map<string, number>();
const CRAWL_COOLTIME_MS = 3 * 60 * 1000; // 3분 쿨타임

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const platform = searchParams.get('platform') || 'all';
    const category = searchParams.get('category') || 'all';
    const location = searchParams.get('location') || 'all';
    const targetSite = searchParams.get('targetSite') || 'all';
    const sortBy = searchParams.get('sortBy') || 'latest'; // latest, endDate, popular

    // 1. [하이브리드 수집] 검색어 캐시 및 쿨타임 최적화 (불필요한 무한 외부 네트워크 요청 방지)
    let isCrawlingTriggered = false;
    if (search) {
      // 🔑 실시간 인기 검색어 집계를 위해 검색 로그를 DB에 비동기 기록
      logSearchQuery(search).catch(err => console.error('Failed to log search:', err));

      const now = Date.now();
      const lastCrawl = lastCrawlTimeMap.get(search) || 0;
      
      // DB에 이미 해당 검색어로 들어온 데이터가 있는지 확인
      const existingCampaigns = await queryCampaigns({ search, platform: 'all', category: 'all', location: 'all', targetSite: 'all', sortBy: 'latest' });

      // 🔑 최적화: 검색결과가 아예 없는 최초 1회이거나, 3분 쿨타임이 경과한 경우에만 외부 크롤러 기동
      if (existingCampaigns.length === 0 || (now - lastCrawl > CRAWL_COOLTIME_MS)) {
        const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER);
        
        if (isServerless) {
          // 🔑 Vercel/서버리스 환경: NextResponse 리턴 즉시 컨테이너가 소멸/Freeze 되므로
          // 반드시 await로 크롤링 완료를 보장하여 인메모리에 데이터를 채운 뒤 아래 query를 실행합니다.
          console.log(`[API-Hybrid] [Serverless-Sync] Executing real-time crawl for "${search}"...`);
          try {
            await crawlKeywordOnDemand(search);
            console.log(`[API-Hybrid] Serverless crawl success for "${search}"`);
          } catch (err: any) {
            console.error(`[API-Hybrid] Serverless crawl failed for "${search}":`, err.message);
          }
        } else {
          // 🔑 로컬 맥북 환경: 기존과 동일하게 넌블로킹 백그라운드로 실행해 고속 응답력 보장
          console.log(`[API-Hybrid] [Local-Async] Triggering background crawlers for "${search}"...`);
          crawlKeywordOnDemand(search).then(() => {
            console.log(`[API-Hybrid] Background crawl success for "${search}"`);
          }).catch((err) => {
            console.error(`[API-Hybrid] Background crawl failed for "${search}":`, err.message);
          });
        }

        lastCrawlTimeMap.set(search, now);
        isCrawlingTriggered = true;
      }
    }

    // 2. 로컬 SQLite DB에서 고속 조회
    let campaigns = await queryCampaigns({
      search,
      platform,
      category,
      location,
      targetSite,
      sortBy
    });

    return NextResponse.json({
      success: true,
      totalCount: campaigns.length,
      data: campaigns,
      isCrawlingTriggered
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
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
