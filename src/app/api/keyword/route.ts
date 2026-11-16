import { GET as analyzeKeyword } from '@/lib/keyword-engine';
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
let active = 0;

function keywordServiceConfigurationError(): string | null {
  const missing: string[] = [];
  if (!process.env.NAVER_CLIENT_ID || !process.env.NAVER_CLIENT_SECRET) missing.push('네이버 블로그 검색 API');
  const searchAdKey = process.env.NAVER_SEARCHAD_API_KEY || process.env.NAVER_SEARCHAD_ACCESS_LICENSE;
  if (!process.env.NAVER_SEARCHAD_CUSTOMER_ID || !searchAdKey || !process.env.NAVER_SEARCHAD_SECRET_KEY) missing.push('네이버 검색광고 API');
  return missing.length ? `${missing.join(', ')} 설정이 누락되었습니다. 관리자에게 문의해주세요.` : null;
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get('query') || '';
  if (!query.trim() || query.length > 100) return NextResponse.json({ success: false, error: '검색어는 1~100자로 입력해주세요.' }, { status: 400 });
  const configurationError = keywordServiceConfigurationError();
  if (configurationError) return NextResponse.json({ success: false, error: configurationError }, { status: 503 });
  if (active >= 2) return NextResponse.json({ success: false, error: '분석 요청이 많습니다. 잠시 후 다시 시도해주세요.' }, { status: 429 });
  active++;
  try { return await analyzeKeyword(request); } finally { active--; }
}
