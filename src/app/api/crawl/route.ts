import { NextResponse } from 'next/server';
import { runCrawlerCore } from '@/lib/crawler-core';

// 전역 동시성 제어 및 쿨타임 변수 (메모리 싱글톤)
let isCrawlingActive = false;
let lastCrawlSuccessTime = 0;
const GLOBAL_CRAWL_COOLTIME_MS = 60 * 1000; // 60초(1분) 쿨타임

export async function POST() {
  try {
    const now = Date.now();

    // 1. Concurrency Lock: 이미 크롤링이 진행 중인 경우 즉각 차단
    if (isCrawlingActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'busy',
          message: '현재 다른 사용자에 의해 실시간 수집이 이미 진행 중입니다. 잠시 후 다시 시도해 주세요.' 
        },
        { status: 429 } // Too Many Requests
      );
    }

    // 2. Global Cooltime Lock: 마지막 성공으로부터 1분이 경과하지 않은 경우 우회 응답
    if (now - lastCrawlSuccessTime < GLOBAL_CRAWL_COOLTIME_MS) {
      const remainingSec = Math.ceil((GLOBAL_CRAWL_COOLTIME_MS - (now - lastCrawlSuccessTime)) / 1000);
      return NextResponse.json({
        success: true,
        message: `최근 1분 이내에 수집된 데이터가 이미 최신 상태로 유지 중입니다. (${remainingSec}초 후 재수집 가능)`,
        inserted: 0,
        updated: 0,
        isMock: false,
        duration: '0s',
        timestamp: new Date().toISOString()
      });
    }

    // 3. 락 활성화 및 크롤러 구동
    isCrawlingActive = true;
    const startTime = Date.now();
    
    let result;
    try {
      result = await runCrawlerCore();
      lastCrawlSuccessTime = Date.now(); // 성공 시각 갱신
    } finally {
      isCrawlingActive = false; // 예외/성공 여부 상관없이 반드시 락 해제
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    return NextResponse.json({
      success: true,
      message: '크롤링 작업이 성공적으로 완료되었습니다.',
      inserted: result.inserted,
      updated: result.updated,
      isMock: result.isMock,
      duration: `${duration}s`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Crawl API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
