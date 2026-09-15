import { NextRequest, NextResponse } from 'next/server';
import { newState, signValue } from '@/lib/auth';
import { oauthConfig } from '@/lib/oauth';
export async function GET(_request: NextRequest, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  const config = oauthConfig(provider);
  if (!config) return new NextResponse('현재 이 소셜 로그인은 설정되지 않았습니다. 관리자에게 문의해주세요.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  const state = newState();
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirect, response_type: 'code', scope: config.scope, state }).toString();
  const response = NextResponse.redirect(url);
  response.cookies.set('oauth_state', signValue({ state, provider, exp: Date.now() + 600000 }), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 600 });
  return response;
}
