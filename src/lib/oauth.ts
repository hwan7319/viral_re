import { upsertUser } from './db';
export function oauthConfig(provider: string) {
  const providers: Record<string, { authorize: string; token: string; profile: string; scope: string }> = {
    google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', profile: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email profile' },
    naver: { authorize: 'https://nid.naver.com/oauth2.0/authorize', token: 'https://nid.naver.com/oauth2.0/token', profile: 'https://openapi.naver.com/v1/nid/me', scope: '' },
    kakao: { authorize: 'https://kauth.kakao.com/oauth/authorize', token: 'https://kauth.kakao.com/oauth/token', profile: 'https://kapi.kakao.com/v2/user/me', scope: 'profile_nickname account_email' },
  };
  const config = providers[provider];
  const clientId = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_ID`];
  const clientSecret = process.env[`${provider.toUpperCase()}_OAUTH_CLIENT_SECRET`];
  const origin = process.env.APP_ORIGIN;
  if (!config || !clientId || !clientSecret || !origin || !process.env.SESSION_SECRET || process.env.VERCEL) return null;
  return { ...config, clientId, clientSecret, origin, redirect: `${origin}/api/auth/callback/${provider}` };
}
export async function exchangeIdentity(provider: string, code: string, state: string) {
  const config = oauthConfig(provider);
  if (!config) throw new Error('OAuth provider unavailable');
  const response = await fetch(config.token, { method: 'POST', signal: AbortSignal.timeout(10000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'authorization_code', code, state, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirect }) });
  const tokens = await response.json();
  if (!response.ok || typeof tokens.access_token !== 'string') throw new Error('OAuth exchange failed');
  const profileResponse = await fetch(config.profile, { signal: AbortSignal.timeout(10000), headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const raw = await profileResponse.json();
  if (!profileResponse.ok) throw new Error('OAuth identity verification failed');
  const profile = provider === 'naver' ? raw.response : provider === 'kakao' ? { id: raw.id, email: raw.kakao_account?.email, name: raw.kakao_account?.profile?.nickname, picture: raw.kakao_account?.profile?.profile_image_url } : raw;
  const id = profile?.sub || profile?.id;
  if (!id || !profile.email || (provider === 'google' && profile.email_verified !== true) || (provider === 'kakao' && raw.kakao_account?.is_email_verified !== true)) throw new Error('Verified email required');
  return upsertUser({ id: `${provider}:${id}`, provider, name: profile.name || profile.nickname || '사용자', email: profile.email, avatar: profile.picture || profile.profile_image || '' });
}
