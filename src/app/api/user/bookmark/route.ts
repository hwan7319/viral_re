import { NextRequest, NextResponse } from 'next/server';
import { toggleUserBookmark, getUserBookmarks } from '@/lib/db';

// 🔑 POST: 사용자 북마크(찜) 상태를 SQLite DB에 토글 저장 및 동기화
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, campaignId } = body;

    if (!userId || !campaignId) {
      return NextResponse.json(
        { success: false, error: '인증 유저 ID 또는 캠페인 ID가 없습니다.' },
        { status: 400 }
      );
    }

    // 1. DB 북마크 토글 실행
    const result = await toggleUserBookmark(userId, campaignId);

    // 2. 토글 완료 후의 최종 전체 북마크 목록을 가져와 동기화
    const updatedBookmarks = await getUserBookmarks(userId);

    return NextResponse.json({
      success: true,
      active: result.active,
      bookmarks: updatedBookmarks
    });
  } catch (error: any) {
    console.error('[API User Bookmark Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
