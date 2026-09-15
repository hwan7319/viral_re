import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDB, type User } from './db';

export const SESSION_COOKIE = 'viral_session';
const MAX_AGE = 7 * 86400;
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('Session authentication is not configured');
  return value;
}
export function signValue(value: object): string {
  const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${payload}.${createHmac('sha256', secret()).update(payload).digest('base64url')}`;
}
export function verifyValue(token: string): Record<string, unknown> | null {
  try {
    const [payload, signature, extra] = token.split('.');
    if (!payload || !signature || extra) return null;
    const expected = createHmac('sha256', secret()).update(payload).digest();
    const actual = Buffer.from(signature, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(expected, actual)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return typeof data.exp === 'number' && data.exp > Date.now() ? data : null;
  } catch { return null; }
}
export function setSession(response: NextResponse, userId: string) {
  response.cookies.set(SESSION_COOKIE, signValue({ sub: userId, exp: Date.now() + MAX_AGE * 1000 }), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: MAX_AGE,
  });
}
export async function authenticatedUser(request: NextRequest): Promise<User | null> {
  const value = verifyValue(request.cookies.get(SESSION_COOKIE)?.value || '');
  if (!value || typeof value.sub !== 'string') return null;
  return await (await getDB()).get<User>('SELECT * FROM users WHERE id = ?', [value.sub]) || null;
}
export function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
  return origin === expected;
}
export function authorizeJob(request: NextRequest, purpose: 'SYNC' | 'CRAWL'): NextResponse | null {
  const key = process.env[`${purpose}_SECRET_KEY`] || process.env.CRON_SECRET;
  if (!key) return NextResponse.json({ success: false, error: 'Service authentication is not configured' }, { status: 503 });
  const provided = request.headers.get('authorization') || request.headers.get(`x-${purpose.toLowerCase()}-secret`) || '';
  const token = provided.startsWith('Bearer ') ? provided.slice(7) : provided;
  const a = Buffer.from(token), b = Buffer.from(key);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  return null;
}
export const newState = () => randomBytes(32).toString('base64url');
