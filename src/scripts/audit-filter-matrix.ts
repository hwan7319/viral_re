/**
 * Pairwise / N×N filter-contract audit using the same database as the app.
 *
 * It verifies both intersections across filter groups (AND) and two-value
 * selections inside a group (OR). Run in production with:
 *   DATA_DIR=/path/to/data npm run test:filters:matrix
 */
import { CATEGORY_GROUP_MAP, getDB, queryCampaigns, type Campaign } from '../lib/db';

const platforms = ['blog', 'clip', 'blog+clip', 'instagram', 'blog+instagram', 'youtube', 'tiktok', 'coupang', 'etc'];
const types = ['visit', 'delivery'];
const locations = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '강원', '제주', '충북', '충남', '전북', '전남', '경북', '경남', '세종'];

type Filters = { category?: string[]; platform?: string[]; type?: string[]; location?: string[]; targetSite?: string[] };
type GroupName = keyof Filters;
const issues: string[] = [];
const summary = { cases: 0, rows: 0, emptyCases: 0, invalidRows: 0, byFamily: {} as Record<string, { cases: number; rows: number; empty: number; invalid: number }> };

function pairs(values: string[]) {
  const result: string[][] = [];
  for (let index = 0; index < values.length; index++) for (let next = index + 1; next < values.length; next++) result.push([values[index], values[next]]);
  return result;
}

function matchesPlatform(campaign: Campaign, selected: string[]) {
  return selected.some(value => {
    if (value === 'blog') return ['blog', 'blog+clip', 'blog+instagram', 'naver+instagram'].includes(campaign.platform);
    if (value === 'clip') return ['clip', 'blog+clip'].includes(campaign.platform);
    if (value === 'instagram') return ['instagram', 'blog+instagram', 'naver+instagram'].includes(campaign.platform);
    if (value === 'blog+instagram') return ['blog+instagram', 'naver+instagram'].includes(campaign.platform);
    return campaign.platform === value;
  });
}

function matchesLocation(campaign: Campaign, selected: string[]) {
  const normalizedLocation = (campaign.location || '').toLowerCase().replace(/[\/,]/g, ' ');
  const tokens = normalizedLocation.split(/\s+/).filter(Boolean);
  return selected.some(value => {
    const parts = value.toLowerCase().split(/\s+/);
    const sido = parts[0].replace(/(특별자치시|특별자치도|광역시|직할시|특별시|자치도|도|시)$/, '');
    if (!normalizedLocation.includes(sido)) return false;
    if (parts.length < 2) return true;
    const sigungu = parts[1];
    const stem = sigungu.replace(/(구|군|시)$/, '');
    return tokens.includes(sigungu) || (stem.length >= 2 && tokens.includes(stem));
  });
}

function isDelivery(campaign: Campaign) {
  return /(배송|전국|재택|택배|온라인)/.test(`${campaign.title} ${campaign.description} ${campaign.location || ''} ${campaign.mission || ''}`);
}

function isVisit(campaign: Campaign) {
  return (!!campaign.location?.trim() || /방문\s*안내|방문\s*가능|매장\s*위치|방문\s*주소/.test(campaign.mission || '')) && !isDelivery(campaign);
}

function isMatch(campaign: Campaign, filters: Filters) {
  if (filters.category?.length) {
    const allowed = new Set(filters.category.flatMap(category => CATEGORY_GROUP_MAP[category] || [category]));
    if (!allowed.has(campaign.category)) return false;
  }
  if (filters.platform?.length && !matchesPlatform(campaign, filters.platform)) return false;
  if (filters.location?.length && !matchesLocation(campaign, filters.location)) return false;
  if (filters.targetSite?.length && !filters.targetSite.includes(campaign.targetSite)) return false;
  if (filters.type?.length && !filters.type.some(type => type === 'visit' ? isVisit(campaign) : isDelivery(campaign))) return false;
  return true;
}

async function auditCase(family: string, label: string, filters: Filters) {
  const rows = await queryCampaigns(filters);
  const invalid = rows.filter(row => !isMatch(row, filters));
  const bucket = summary.byFamily[family] ||= { cases: 0, rows: 0, empty: 0, invalid: 0 };
  summary.cases++; summary.rows += rows.length; bucket.cases++; bucket.rows += rows.length;
  if (!rows.length) { summary.emptyCases++; bucket.empty++; }
  if (invalid.length) {
    summary.invalidRows += invalid.length; bucket.invalid += invalid.length;
    issues.push(`${label}: ${invalid.length} invalid (${invalid.slice(0, 3).map(row => row.id).join(', ')})`);
  }
}

async function runLimited<T>(items: T[], worker: (item: T) => Promise<void>, concurrency = 8) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) await worker(items[next++]);
  }));
}

async function main() {
  const db = await getDB();
  const active = await queryCampaigns({});
  const sources = [...new Set(active.map(row => row.targetSite).filter(Boolean))].sort();
  const categories = Object.keys(CATEGORY_GROUP_MAP);
  const dimensions: Array<[GroupName, string[]]> = [
    ['category', categories], ['platform', platforms], ['type', types], ['location', locations], ['targetSite', sources],
  ];
  const tasks: Array<{ family: string; label: string; filters: Filters }> = [];

  // N×N intersections: one value from each pair of filter groups.
  for (let left = 0; left < dimensions.length; left++) for (let right = left + 1; right < dimensions.length; right++) {
    const [leftName, leftValues] = dimensions[left];
    const [rightName, rightValues] = dimensions[right];
    for (const leftValue of leftValues) for (const rightValue of rightValues) {
      tasks.push({ family: `${leftName}×${rightName}`, label: `${leftName}=${leftValue}, ${rightName}=${rightValue}`, filters: { [leftName]: [leftValue], [rightName]: [rightValue] } });
    }
  }
  // Within a group, a multiple selection is an OR union—not an intersection.
  for (const [name, values] of dimensions) for (const selected of pairs(values)) {
    tasks.push({ family: `${name} OR`, label: `${name}=${selected.join(',')}`, filters: { [name]: selected } });
  }
  // Three-group matrix catches accidental precedence/order errors in the API.
  for (const category of categories) for (const platform of platforms) for (const type of types) {
    tasks.push({ family: 'category×platform×type', label: `${category},${platform},${type}`, filters: { category: [category], platform: [platform], type: [type] } });
  }

  await runLimited(tasks, task => auditCase(task.family, task.label, task.filters));
  const report = { active: active.length, sources: sources.length, ...summary, issueCount: issues.length, issues };
  console.log(JSON.stringify(report, null, 2));
  if (issues.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
