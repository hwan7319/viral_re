import { GET as analyzeKeyword } from '@/lib/keyword-engine';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
let active = 0;
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('query') || '';
  if (!query.trim() || query.length > 100) return NextResponse.json({ success: false, error: '검색어는 1~100자로 입력해주세요.' }, { status: 400 });
  if (active >= 2) return NextResponse.json({ success: false, error: '분석 요청이 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  active++;
  try { return await analyzeKeyword(request); } finally { active--; }
}
