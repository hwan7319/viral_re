import { NextRequest, NextResponse } from 'next/server';
import { verifyValue, setSession } from '@/lib/auth';
import { exchangeIdentity, oauthConfig } from '@/lib/oauth';
export async function GET(request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const config = oauthConfig(provider);
  const state = verifyValue(request.cookies.get('oauth_state')?.value || '');
  const code = request.nextUrl.searchParams.get('code');
  if (!config || !code || !state || state.provider !== provider || state.state !== request.nextUrl.searchParams.get('state')) return NextResponse.json({ success: false, error: 'Invalid OAuth callback' }, { status: 400 });
  try {
    const user = await exchangeIdentity(provider, code, String(state.state));
    const response = NextResponse.redirect(config.origin);
    setSession(response, user.id);
    response.cookies.set('oauth_state', '', { path: '/api/auth', maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ success: false, error: '소셜 계정을 확인하지 못했습니다. 다시 로그인해주세요.' }, { status: 401 });
  }
}
