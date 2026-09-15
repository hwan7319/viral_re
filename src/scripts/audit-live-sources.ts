import type { Campaign } from '../lib/db';
import { scrape as gangnam } from '../lib/scrapers/search/gangnam';
import { scrape as dinnerqueen } from '../lib/scrapers/search/dinnerqueen';
import { scrape as fourblog } from '../lib/scrapers/search/fourblog';
import { scrape as reviewnote } from '../lib/scrapers/search/reviewnote';
import { scrape as chvu } from '../lib/scrapers/search/chvu';
import { scrape as cloudreview } from '../lib/scrapers/search/cloudreview';
import { scrape as revu } from '../lib/scrapers/search/revu';
import { scrape as mible } from '../lib/scrapers/search/mible';
import { scrape as ringble } from '../lib/scrapers/search/ringble_categories';
import { scrape as cometoplay } from '../lib/scrapers/search/cometoplay';
import { scrape as modublog } from '../lib/scrapers/search/modublog';
import { scrape as assaview } from '../lib/scrapers/search/assaview_pages';

const keyword = process.argv[2] === '--all' ? '' : (process.argv[2] || '맛집');
const timeoutMs = 45_000;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const sources: Array<[string, string, (keyword: string) => Promise<Campaign[]>]> = [
  ['강남맛집', 'gangnam', gangnam],
  ['디너의여왕', 'dinnerqueen', dinnerqueen],
  ['포블로그', 'fourblog', fourblog],
  ['리뷰노트', 'reviewnote', reviewnote],
  ['체험뷰', 'chvu', chvu],
  ['클라우드리뷰', 'cloudreview', cloudreview],
  ['레뷰', 'revu', revu],
  ['미블', 'mible', mible],
  ['링블', 'ringble_categories', ringble],
  ['놀러와체험단', 'cometoplay', cometoplay],
  ['모블', 'modublog', modublog],
  ['아싸뷰', 'assaview_pages', assaview],
];

function validHttpUrl(value: string) {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}

async function audit([site, module, scrape]: typeof sources[number]) {
  const started = Date.now();
  try {
    const rows = await Promise.race([
      scrape(keyword),
      new Promise<Campaign[]>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${timeoutMs}ms`)), timeoutMs)),
    ]);
    const uniqueIds = new Set(rows.map(row => row.id));
    const valid = rows.filter(row => row.id && row.title && validHttpUrl(row.campaignUrl));
    return {
      site, module, status: rows.length > 0 && valid.length === rows.length && uniqueIds.size === rows.length ? 'PASS' : 'FAIL',
      durationMs: Date.now() - started, count: rows.length, uniqueIds: uniqueIds.size,
      validCoreFields: valid.length,
      withLocation: rows.filter(row => !!row.location?.trim()).length,
      withKnownDeadline: rows.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.endDate)).length,
      activeDeadline: rows.filter(row => row.endDate >= today).length,
      platforms: Object.fromEntries([...new Set(rows.map(row => row.platform))].sort().map(value => [value, rows.filter(row => row.platform === value).length])),
      sample: rows.slice(0, 2).map(row => ({ id: row.id, title: row.title, url: row.campaignUrl, endDate: row.endDate })),
    };
  } catch (error) {
    return { site, module, status: 'ERROR', durationMs: Date.now() - started, count: 0, error: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const results: Awaited<ReturnType<typeof audit>>[] = [];
  for (let index = 0; index < sources.length; index += 3) {
    results.push(...await Promise.all(sources.slice(index, index + 3).map(audit)));
  }
  console.log(`AUDIT_JSON=${JSON.stringify({ auditedAt: new Date().toISOString(), keyword, today, results })}`);
  process.exit(results.some(result => result.status !== 'PASS') ? 1 : 0);
}

main().catch(error => { console.error(error); process.exit(1); });
