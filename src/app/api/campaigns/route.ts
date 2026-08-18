import { NextRequest, NextResponse } from 'next/server';
import { queryCampaigns, logSearchQuery, getTotalCampaignCount } from '@/lib/db';
import { crawlKeywordOnDemandParallel } from '@/lib/crawler-parallel';
import axios from 'axios';

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
    const type = searchParams.get('type') || 'all'; // all, visit, delivery

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
          // 🔑 Vercel/서버리스 환경 Non-blocking UX 최적화:
          // 클라이언트에게 바로 응답을 쏜 후 백그라운드에서 크롤링이 이루어지도록 넌블로킹 비동기로 실행
          console.log(`[API-Hybrid] [Serverless-Async] Triggering background parallel crawl for "${search}"...`);
          
          // 백그라운드 마이크로태스크로 분리하여 컨테이너 Freeze 방지 및 빠른 API 응답 보장
          Promise.resolve().then(async () => {
            try {
              await crawlKeywordOnDemandParallel(search);
              console.log(`[API-Hybrid] Serverless parallel crawl background success for "${search}"`);
            } catch (err: any) {
              console.error(`[API-Hybrid] Serverless parallel crawl background failed for "${search}":`, err.message);
            }
          });
        } else {
          // 🔑 로컬 맥북 환경: 기존과 동일하게 넌블로킹 백그라운드로 실행해 고속 응답력 보장
          console.log(`[API-Hybrid] [Local-Async] Triggering background parallel crawlers for "${search}"...`);
          crawlKeywordOnDemandParallel(search).then(async () => {
            console.log(`[API-Hybrid] Background parallel crawl success for "${search}"`);
            
            // 🔑 [하이브리드 동기화 브리지] 로컬 수집 후 Vercel 서버로 최신 데이터 동기화 Push 격발!
            try {
              const freshData = await queryCampaigns({ search });
              if (freshData.length > 0) {
                console.log(`[API-Sync-Bridge] Pushing ${freshData.length} fresh campaigns for "${search}" to Vercel...`);
                axios.post('https://viral-re.vercel.app/api/sync', { campaigns: freshData }, { timeout: 6000 })
                  .then(syncRes => {
                    console.log(`[API-Sync-Bridge] Vercel sync complete:`, syncRes.data);
                  })
                  .catch(syncErr => {
                    console.error(`[API-Sync-Bridge] Pushing data failed:`, syncErr.message);
                  });
              }
            } catch (err: any) {
              console.error(`[API-Sync-Bridge] Failed to fetch fresh data for sync:`, err.message);
            }
          }).catch((err) => {
            console.error(`[API-Hybrid] Background parallel crawl failed for "${search}":`, err.message);
          });
        }

        lastCrawlTimeMap.set(search, now);
        isCrawlingTriggered = true;
      }
    }

    // 2. 로컬 SQLite DB 및 전체 건수 동시 조회
    const [campaigns, totalDBCount] = await Promise.all([
      queryCampaigns({ search, platform, category, location, targetSite, sortBy, type }),
      getTotalCampaignCount()
    ]);

    return NextResponse.json({
      success: true,
      totalDBCount,
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
