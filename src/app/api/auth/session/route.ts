import { NextRequest, NextResponse } from 'next/server';
import { authenticatedUser, sameOrigin, SESSION_COOKIE } from '@/lib/auth';
import { getUserBookmarks } from '@/lib/db';
export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, user, bookmarks: await getUserBookmarks(user.id) });
}
// Client-supplied identities can never create a session.
export async function POST() {
  return NextResponse.json({ success: false, error: '소셜 로그인으로 인증해주세요.' }, { status: 401 });
}
export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return response;
}
