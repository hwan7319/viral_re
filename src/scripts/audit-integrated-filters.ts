/**
 * Production-data contract audit for every public campaign filter.
 * Run against the same DATA_DIR as the application:
 *   npx tsx src/scripts/audit-integrated-filters.ts
 */
import { CATEGORY_GROUP_MAP, getDB, queryCampaigns, type Campaign } from '../lib/db';

const sidos = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '강원', '제주', '충북', '충남', '전북', '전남', '경북', '경남', '세종'];
const platforms = ['blog', 'clip', 'blog+clip', 'instagram', 'blog+instagram', 'youtube', 'tiktok', 'coupang', 'etc'];
const issues: string[] = [];

function active(c: Campaign) {
  return !!c;
}
function matchesPlatform(c: Campaign, requested: string) {
  if (requested === 'blog') return ['blog', 'blog+clip', 'blog+instagram', 'naver+instagram'].includes(c.platform);
  if (requested === 'clip') return ['clip', 'blog+clip'].includes(c.platform);
  if (requested === 'instagram') return ['instagram', 'blog+instagram', 'naver+instagram'].includes(c.platform);
  if (requested === 'blog+instagram') return ['blog+instagram', 'naver+instagram'].includes(c.platform);
  return c.platform === requested;
}
function isVisit(c: Campaign) {
  const location = (c.location || '').trim();
  return !!location && !/(배송|전국|재택|택배|온라인)/.test(`${c.title} ${c.description} ${location} ${c.mission || ''}`);
}
function matchesLocation(c: Campaign, requested: string) {
  const location = (c.location || '').toLowerCase();
  const normalized = requested.toLowerCase();
  const stem = normalized.replace(/(특별자치시|특별자치도|광역시|직할시|특별시|자치도|도|시)$/, '');
  return location.includes(normalized) || (stem.length >= 2 && location.includes(stem));
}
function audit(name: string, rows: Campaign[], predicate: (row: Campaign) => boolean) {
  const invalid = rows.filter(row => !predicate(row));
  if (invalid.length) issues.push(`${name}: ${invalid.length} invalid (${invalid.slice(0, 3).map(row => row.id).join(', ')})`);
  return { count: rows.length, invalid: invalid.length };
}

async function main() {
  await getDB();
  const all = await queryCampaigns({});
  const categories = Object.fromEntries(await Promise.all(Object.keys(CATEGORY_GROUP_MAP).map(async category => {
    const rows = await queryCampaigns({ category });
    const allowed = new Set(CATEGORY_GROUP_MAP[category] || [category]);
    return [category, audit(`category:${category}`, rows, row => allowed.has(row.category))];
  })));
  const platformResults = Object.fromEntries(await Promise.all(platforms.map(async platform => {
    const rows = await queryCampaigns({ platform });
    return [platform, audit(`platform:${platform}`, rows, row => matchesPlatform(row, platform))];
  })));
  const recruitment = Object.fromEntries(await Promise.all(['visit', 'delivery'].map(async type => {
    const rows = await queryCampaigns({ type });
    return [type, audit(`type:${type}`, rows, row => type === 'visit' ? isVisit(row) : /(배송|전국|재택|택배|온라인)/.test(`${row.title} ${row.description} ${row.location || ''} ${row.mission || ''}`))];
  })));
  const regions = Object.fromEntries(await Promise.all(sidos.map(async location => {
    const rows = await queryCampaigns({ location });
    return [location, audit(`location:${location}`, rows, row => matchesLocation(row, location))];
  })));
  const db = await getDB();
  const sourceRows = await db.all<{ targetSite: string }[]>('SELECT DISTINCT targetSite FROM campaigns WHERE targetSite IS NOT NULL AND targetSite != "" ORDER BY targetSite');
  const sources = Object.fromEntries(await Promise.all(sourceRows.map(async ({ targetSite }) => {
    const rows = await queryCampaigns({ targetSite });
    return [targetSite, audit(`source:${targetSite}`, rows, row => row.targetSite === targetSite)];
  })));

  const summary = { active: all.filter(active).length, categories, platforms: platformResults, recruitment, regions, sources, issueCount: issues.length, issues };
  console.log(JSON.stringify(summary, null, 2));
  if (issues.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
