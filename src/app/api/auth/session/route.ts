import { NextRequest, NextResponse } from 'next/server';
import { upsertUser, getUserBookmarks } from '@/lib/db';

// 🔑 POST: 사용자 로그인/회원가입 처리 및 DB 동기화
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, email, avatar, provider } = body;

    if (!id || !name || !email || !provider) {
      return NextResponse.json(
        { success: false, error: '필수 회원 정보가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 1. DB에 유저 정보 저장 또는 업데이트 (Upsert)
    const savedUser = await upsertUser({
      id,
      name,
      email,
      avatar: avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      provider
    });

    // 2. 해당 사용자의 기존 DB 북마크(찜) 목록 조회
    const bookmarks = await getUserBookmarks(savedUser.id);

    return NextResponse.json({
      success: true,
      user: savedUser,
      bookmarks
    });
  } catch (error: any) {
    console.error('[API Auth Session Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
