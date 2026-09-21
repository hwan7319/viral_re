import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NextRequest } from 'next/server';
import axios from 'axios';
import type { Campaign } from '../../src/lib/db';

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), 'viral-regression-'));
process.env.SESSION_SECRET = 'test-session-secret-with-at-least-32-characters';
process.env.APP_ORIGIN = 'http://localhost:3000';

// Load only after configuring the isolated database. No production snapshots or APIs are touched.
test('regression suite', async t => {
  const db = await import('../../src/lib/db');
  const auth = await import('../../src/lib/auth');
  const { GET: campaigns } = await import('../../src/app/api/campaigns/route');
  const { GET: detail } = await import('../../src/app/api/campaign-detail/route');
  const { POST: sync } = await import('../../src/app/api/sync/route');
  const { POST: session } = await import('../../src/app/api/auth/session/route');
  const { POST: bookmark } = await import('../../src/app/api/user/bookmark/route');
  const { koreanDate, deadlineFromText } = await import('../../src/lib/campaign-values');
  const { summarizeBlogSample, summarizeAvailableMonthlyPosts } = await import('../../src/lib/blog-stats');
  const { calculateRecommendationScore } = await import('../../src/lib/keyword-engine');
  const { parseCloudReviewDetail } = await import('../../src/lib/scrapers/search/cloudreview');
  const { parseReviewPlaceDeadline } = await import('../../src/lib/scrapers/06_reviewplace');
  const { parseReviewPlaceApplicantCounts } = await import('../../src/lib/scrapers/06_reviewplace');
  const { cleanReviewPlaceTitle } = await import('../../src/lib/scrapers/06_reviewplace');
  const { parseComeToPlayDeadline } = await import('../../src/lib/scrapers/search/cometoplay');
  const { reserveKeywordCrawl, releaseCrawl } = await import('../../src/lib/crawl-jobs');
  const fixture = (id: string, changes: Partial<Campaign> = {}): Campaign => ({ id, title: `캠페인 ${id}`, description: '식사권', platform: 'blog', category: 'food', location: '서울 중구', targetSite: '레뷰', campaignUrl: `https://www.revu.net/campaign/${id}`, imageUrl: '', applyCount: 1, limitCount: 5, endDate: '2099-12-31', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...changes });
  const rows = Array.from({ length: 350 }, (_, i) => fixture(`campaign-${String(i).padStart(3, '0')}`));
  rows.push(fixture('expired', { endDate: '2020-01-01' }), fixture('unknown-current', { endDate: '', updatedAt: new Date().toISOString() }), fixture('unknown-stale', { endDate: '', updatedAt: '2020-01-01T00:00:00Z' }), fixture('busan', { location: '부산 중구' }), fixture('negative', { description: '치킨 제외' }), fixture('no-limit', { limitCount: 0, applyCount: 1000 }), fixture('percent', { title: '할인 50%' }));
  await db.insertOrUpdateCampaigns(rows);
  await t.test('trending keywords remain visible before organic search logs accumulate', async () => {
    const initial = await db.getTrendingKeywords();
    assert.equal(initial.length, 10);
    assert.equal(new Set(initial.map(item => item.word)).size, 10);
    assert.ok(initial.every(item => item.count === 0));

    await db.logSearchQuery('신규인기검색어');
    await db.logSearchQuery('신규인기검색어');
    const ranked = await db.getTrendingKeywords();
    assert.deepEqual(ranked[0], { word: '신규인기검색어', count: 2 });
    assert.equal(ranked.length, 10);
  });
  await t.test('source health retains the latest result for each source', async () => {
    await db.logCrawling('테스트 출처', 'FAILED', 0, 'temporary upstream error');
    await db.logCrawling('테스트 출처', 'SUCCESS', 12);
    const health = await db.getCrawlingHealth();
    assert.deepEqual(health.find(item => item.targetSite === '테스트 출처'), {
      targetSite: '테스트 출처', status: 'SUCCESS', collectedCount: 12, errorMessage: null,
      executedAt: health.find(item => item.targetSite === '테스트 출처')?.executedAt,
    });
  });
  await t.test('expired campaigns retain their original deadline and are excluded', async () => {
    assert.equal((await db.getCampaignById('expired'))?.endDate, '2020-01-01');
    assert.equal((await db.queryCampaigns({})).some(c => c.id === 'expired'), false);
  });
  await t.test('currently observed listings without a published deadline remain visible briefly', async () => {
    assert.equal((await db.queryCampaigns({})).some(c => c.id === 'unknown-current'), true);
    assert.equal((await db.queryCampaigns({})).some(c => c.id === 'unknown-stale'), false);
  });
  await t.test('pagination reaches results after 300 and reports full count', async () => {
    const first = await (await campaigns(new NextRequest('http://localhost:3000/api/campaigns?crawl=false&limit=300'))).json();
    assert.equal(first.data.length, 300);
    assert.equal(first.totalCount, rows.length - 2);
    const last = await (await campaigns(new NextRequest('http://localhost:3000/api/campaigns?crawl=false&offset=300&limit=300'))).json();
    assert.equal(last.data.length, first.totalCount - 300);
    assert.equal(last.nextOffset, null);
    assert.equal(new Set([...first.data, ...last.data].map(c => c.id)).size, first.totalCount);
    assert.equal((await campaigns(new NextRequest('http://localhost:3000/api/campaigns?limit=-1'))).status, 400);
  });
  await t.test('SQLite and memory engines match on filters, expiry, and zero-limit sorting', async () => {
    for (const filters of [{}, { location: '서울 중구' }, { search: '치킨' }, { search: '%' }, { search: '_' }, { sortBy: 'popular' }, { type: 'visit' }, { type: 'delivery' }]) {
      const sql = await db.queryCampaigns(filters);
      process.env.VERCEL = '1';
      (globalThis as typeof globalThis & { memoryCampaigns: Campaign[] }).memoryCampaigns = structuredClone(rows);
      try { assert.deepEqual((await db.queryCampaigns(filters)).map(c => c.id), sql.map(c => c.id)); }
      finally { delete process.env.VERCEL; }
    }
  });
  await t.test('concurrent upserts serialize transactions and preserve known deadlines', async () => {
    await Promise.all(Array.from({ length: 10 }, (_, i) => db.insertOrUpdateCampaigns([fixture(`concurrent-${i}`)])));
    await db.insertOrUpdateCampaigns([fixture('concurrent-0', { endDate: '' })]);
    assert.equal((await db.getCampaignById('concurrent-0'))?.endDate, '2099-12-31');
  });
  await t.test('detail provenance is retained when a later list sync arrives', async () => {
    await db.insertOrUpdateCampaigns([fixture('provenance', { dataSource: 'detail' })]);
    await db.insertOrUpdateCampaigns([fixture('provenance', { dataSource: 'list' })]);
    assert.equal((await db.getCampaignById('provenance'))?.dataSource, 'detail');
  });
  await t.test('a missing thumbnail from a later sync does not erase a saved source image', async () => {
    await db.insertOrUpdateCampaigns([fixture('thumbnail', { imageUrl: 'https://images.example.com/original.jpg' })]);
    await db.insertOrUpdateCampaigns([fixture('thumbnail', { imageUrl: 'https://viral-re.co.kr/icon.png' })]);
    assert.equal((await db.getCampaignById('thumbnail'))?.imageUrl, 'https://images.example.com/original.jpg');
  });
  await t.test('sync fails closed and rejects malformed objects', async () => {
    const req = (body: unknown, token = '') => new NextRequest('http://localhost:3000/api/sync', { method: 'POST', headers: { authorization: token, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await sync(req({ campaigns: [] }))).status, 503);
    process.env.SYNC_SECRET_KEY = 'test-only-sync-secret';
    assert.equal((await sync(req({ campaigns: [] }))).status, 401);
    assert.equal((await sync(req({ campaigns: [{ id: 'bad' }] }, 'Bearer test-only-sync-secret'))).status, 400);
    assert.equal((await sync(req({ campaigns: [fixture('synced')] }, 'Bearer test-only-sync-secret'))).status, 200);
  });
  await t.test('client-supplied identities and tampered/expired sessions are rejected', async () => {
    assert.equal((await session()).status, 401);
    assert.equal(auth.verifyValue(auth.signValue({ sub: 'a', exp: Date.now() - 1 })), null);
    assert.equal(auth.verifyValue(auth.signValue({ sub: 'a', exp: Date.now() + 10000 }) + 'x'), null);
  });
  await t.test('bookmarks use signed identity and enforce same origin', async () => {
    await db.upsertUser({ id: 'owner', name: 'Owner', email: 'owner@example.com', provider: 'google', avatar: '' });
    const token = auth.signValue({ sub: 'owner', exp: Date.now() + 100000 });
    const req = (origin: string, cookie: string) => new NextRequest('http://localhost:3000/api/user/bookmark', { method: 'POST', headers: { origin, cookie }, body: JSON.stringify({ userId: 'victim', campaignId: 'campaign-000' }) });
    assert.equal((await bookmark(req('https://attacker.example', `viral_session=${token}`))).status, 403);
    assert.equal((await bookmark(req(process.env.APP_ORIGIN!, ''))).status, 401);
    assert.equal((await bookmark(req(process.env.APP_ORIGIN!, `viral_session=${token}`))).status, 200);
    assert.deepEqual(await db.getUserBookmarks('owner'), ['campaign-000']);
    assert.deepEqual(await db.getUserBookmarks('victim'), []);
  });
  await t.test('detail URL cannot overwrite a different campaign', async () => {
    const response = await detail(new NextRequest('http://localhost:3000/api/campaign-detail?id=campaign-000&url=https://www.revu.net/campaign/other'));
    assert.equal(response.status, 400);
    assert.equal((await db.getCampaignById('campaign-000'))?.description, '식사권');
  });
  await t.test('empty-result crawl cooldown and global concurrency are enforced', () => {
    assert.equal(reserveKeywordCrawl('없는검색어'), true);
    assert.equal(reserveKeywordCrawl('다른검색어'), false);
    releaseCrawl();
    assert.equal(reserveKeywordCrawl('없는검색어'), false);
  });
  await t.test('unknown deadlines and incomplete monthly samples are never fabricated', () => {
    assert.equal(koreanDate(new Date('2026-09-13T16:00:00Z')), '2026-09-14');
    assert.equal(deadlineFromText(''), '');
    assert.equal(deadlineFromText('D+2'), '');
    assert.equal(deadlineFromText('D-2', new Date('2026-09-13T16:00:00Z')), '2026-09-16');
    assert.equal(deadlineFromText('내일마감', new Date('2026-09-13T16:00:00Z')), '2026-09-15');
    assert.equal(summarizeBlogSample(10000, [{ postdate: '20260914' }], new Date('2026-09-14')).monthlyPosts, null);
    assert.equal(summarizeBlogSample(1, [{ postdate: '20260914' }], new Date('2026-09-14')).monthlyPosts, 1);
    const lowerBound = summarizeAvailableMonthlyPosts(10000, [
      { postdate: '20260914' }, { postdate: '20260913' }, { postdate: '20260912' },
    ], new Date('2026-09-14'));
    assert.equal(lowerBound.monthlyPosts, 13);
    assert.equal(lowerBound.monthlyPostsIsLowerBound, false);
    assert.equal(lowerBound.monthlyPostsEstimated, true);
  });
  await t.test('related keyword rank favors relevance and source quality over raw volume alone', () => {
    const directAutocomplete = calculateRecommendationScore('삼겹살', '삼겹살 맛집', 1200, ['autocomplete']);
    const broadContext = calculateRecommendationScore('삼겹살', '음식 추천', 500000, ['context']);
    const directSearchAd = calculateRecommendationScore('삼겹살', '삼겹살 맛집', 1200, ['searchAd']);
    assert.ok(directAutocomplete > broadContext);
    assert.ok(directSearchAd > directAutocomplete);
  });
  await t.test('CloudReview detail keeps its published deadline and applicant counts', () => {
    const detail = parseCloudReviewDetail('캠페인 타입 배송형 모집 기간 26.09.07~26.09.21일 신청자 672/10', 'blog');
    assert.deepEqual(detail, { endDate: '2026-09-21', applyCount: 672, limitCount: 10, platform: 'blog' });
  });
  await t.test('ReviewPlace detail keeps its published recruitment end date', () => {
    const html = '<main>모집기간 09.16 ~ 09.28 리뷰어발표 09.29</main>';
    assert.equal(parseReviewPlaceDeadline(html, new Date('2026-09-16T00:00:00+09:00')), '2026-09-28');
  });
  await t.test('ReviewPlace detail keeps its published applicant and quota counts', () => {
    const html = '<li id="cmp_reviewer">신청한 리뷰어 <em id="cmp_curr_num">0/2</em></li>';
    assert.deepEqual(parseReviewPlaceApplicantCounts(html), { applyCount: 0, limitCount: 2 });
  });
  await t.test('ReviewPlace card badges are excluded from the campaign title', () => {
    assert.equal(cleanReviewPlaceTitle('NEW [기자단] 폰가비 소개 1 / 20명+ 10,000P'), 'NEW [기자단] 폰가비 소개');
    assert.equal(cleanReviewPlaceTitle('NEW [쿠팡] 가글 오늘마감 10,000P'), 'NEW [쿠팡] 가글 10,000P');
  });
  await t.test('ComeToPlay detail keeps its published reviewer application end date', () => {
    const html = '<span><em>리뷰어 신청</em> 09.16 ~ 09.21</span><script>var austDay = new Date(1790002799000);</script>';
    assert.equal(parseComeToPlayDeadline(html, new Date('2026-09-16T00:00:00+09:00')), '2026-09-21');
  });
  await t.test('upstream failures produce unavailable keyword metrics, not invented counts', async () => {
    const original = axios.get;
    axios.get = async () => { throw new Error('Simulated upstream failure'); };
    try {
      const { GET } = await import('../../src/lib/keyword-engine');
      const response = await GET(new Request('http://localhost:3000/api/keyword?query=없는키워드'));
      const payload = await response.json();
      assert.equal(payload.data.totalSearchVolume, null);
      assert.equal(payload.data.totalPosts, null);
      assert.equal(payload.data.monthlyPosts, null);
      assert.equal(payload.data.competitionRatio, null);
      assert.equal(payload.data.grade, 'UNKNOWN');
      assert.deepEqual(payload.data.relatedKeywords, []);
    } finally { axios.get = original; }
  });
  await t.test('OAuth requires signed matching state and verifies provider identity', async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'configured-id';
    process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'configured-secret';
    const { GET } = await import('../../src/app/api/auth/callback/[provider]/route');
    const context = { params: Promise.resolve({ provider: 'google' }) };
    assert.equal((await GET(new NextRequest('http://localhost:3000/api/auth/callback/google?code=x&state=forged'), context)).status, 400);
    const original = globalThis.fetch;
    globalThis.fetch = async (url) => new Response(JSON.stringify(String(url).includes('/token') ? { access_token: 'verified-access-token' } : { sub: 'verified-subject', email: 'verified@example.com', email_verified: true, name: 'Verified' }), { status: 200 });
    try {
      const state = auth.signValue({ state: 'valid', provider: 'google', exp: Date.now() + 10000 });
      const response = await GET(new NextRequest('http://localhost:3000/api/auth/callback/google?code=x&state=valid', { headers: { cookie: `oauth_state=${state}` } }), context);
      assert.equal(response.status, 307);
      const sessionToken = response.cookies.get('viral_session')!.value;
      assert.equal(auth.verifyValue(sessionToken)?.sub, 'google:verified-subject');
    } finally { globalThis.fetch = original; }
  });
  await (await db.getDB()).close();
});
