import { NextResponse } from 'next/server';
import { getTrendingKeywords } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const keywords = await getTrendingKeywords();
    return NextResponse.json({ success: true, source: 'search_logs', updatedAt: new Date().toISOString(), data: keywords.map((item, index) => ({ ...item, rank: index + 1, tagType: 'same', tagLabel: '-', isNew: false })) });
  } catch { return NextResponse.json({ success: false, data: [], error: '검색어 통계 조회 실패' }, { status: 503 }); }
}
