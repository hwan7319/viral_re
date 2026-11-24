/**
 * Read-only API contract QA for the detailed search panel.
 *
 * It sends the same repeated query parameters as the browser and compares the
 * API count/first page against queryCampaigns. `crawl=false` is mandatory so
 * this audit cannot start an external collection job.
 *
 * Usage:
 *   DATA_DIR=/path/to/data QA_BASE_URL=http://127.0.0.1:3000 \
 *     node --import tsx src/scripts/audit-api-filter-contract.ts
 */
import { queryCampaigns } from '../lib/db';

type FilterKey = 'category' | 'platform' | 'type' | 'location' | 'targetSite';
type Filters = Partial<Record<FilterKey, string[]>>;

const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';
const categories = [
  'food-korean', 'food-western', 'food-japanese', 'food-chinese', 'food-cafe', 'food-pub', 'food-snack', 'food-meat', 'food-omakase',
  'beauty-cosmetics', 'beauty-salon', 'beauty-spa', 'beauty-body', 'health-fitness', 'health-food', 'health-medical',
  'service-fortune', 'accommodation', 'travel', 'culture', 'fashion-clothing', 'fashion-accessory', 'baby', 'life-goods', 'health-fresh',
  'life-appliances', 'life-auto', 'pet', 'book', 'hobby', 'etc',
];
const platforms = ['blog', 'clip', 'instagram', 'youtube', 'tiktok', 'coupang'];
const regions = ['서울', '경기', '부산', '대구', '제주'];
const sourceSamples = ['리뷰플레이스', '클라우드리뷰', '링블', '디너의여왕', '아싸뷰'];

function key(filters: Filters) {
  return (Object.keys(filters) as FilterKey[]).sort().map(name => `${name}=${filters[name]!.join(',')}`).join('&') || 'all';
}

function makeCases(): Filters[] {
  const output: Filters[] = [{}];
  for (const category of categories) output.push({ category: [category] });
  for (const platform of platforms) output.push({ platform: [platform] });
  for (const type of ['visit', 'delivery']) output.push({ type: [type] });
  for (const location of regions) output.push({ location: [location] });
  for (const targetSite of sourceSamples) output.push({ targetSite: [targetSite] });
  // Multi-select uses OR inside a panel. These include non-adjacent choices
  // to catch accidental parsing as AND or loss of repeated URL parameters.
  output.push(
    { category: ['food-korean', 'culture'] },
    { platform: ['blog', 'instagram'] },
    { type: ['visit', 'delivery'] },
    { location: ['서울', '제주'] },
    { targetSite: ['리뷰플레이스', '링블'] },
  );
  // Pair and triple intersections exercise the "within group OR / between
  // groups AND" contract that the detailed search UI relies on.
  for (const category of categories) {
    output.push({ category: [category], platform: ['blog'], type: ['visit'] });
    output.push({ category: [category], location: ['서울'], targetSite: ['리뷰플레이스'] });
  }
  for (const platform of platforms) output.push({ platform: [platform], type: ['delivery'], location: ['경기'] });
  return output;
}

async function audit(filters: Filters) {
  const params = new URLSearchParams({ crawl: 'false', limit: '60', offset: '0', sortBy: 'latest' });
  for (const [name, values] of Object.entries(filters)) for (const value of values!) params.append(name, value);
  const expected = await queryCampaigns({ ...filters, sortBy: 'latest' });
  const response = await fetch(`${baseUrl}/api/campaigns?${params}`);
  if (!response.ok) throw new Error(`${key(filters)}: HTTP ${response.status}`);
  const body = await response.json() as { success: boolean; totalCount: number; data: Array<{ id: string }> };
  if (!body.success) throw new Error(`${key(filters)}: success=false`);
  const expectedIds = expected.slice(0, 60).map(item => item.id);
  const actualIds = body.data.map(item => item.id);
  if (body.totalCount !== expected.length || actualIds.join('|') !== expectedIds.join('|')) {
    throw new Error(`${key(filters)}: expected ${expected.length}/${expectedIds.join(',')} got ${body.totalCount}/${actualIds.join(',')}`);
  }
}

async function main() {
  const cases = makeCases();
  const failures: string[] = [];
  for (const filters of cases) {
    try { await audit(filters); } catch (error) { failures.push(error instanceof Error ? error.message : String(error)); }
  }
  console.log(JSON.stringify({ baseUrl, cases: cases.length, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
