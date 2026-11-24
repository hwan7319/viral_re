import { crawlKeywordOnDemandParallel, MAINTAINED_CRAWLER_SITES } from './crawler-parallel';
import { filterValues, getCrawlingHealth, queryCampaigns, type Campaign } from './db';
import axios from 'axios';

const recent = new Map<string, number>();
let active = false;
const COOLDOWN = 180000;
const FILTER_COOLDOWN = 20 * 60_000;
const FILTER_SOURCE_LIMIT = 3;
const FILTER_FALLBACK_SITES = ['리뷰플레이스', '링블', '클라우드리뷰'];

export type FilterCrawlFilters = {
  platform?: string | string[];
  category?: string | string[];
  location?: string | string[];
  targetSite?: string | string[];
  type?: string | string[];
};

const canonicalValues = (value: FilterCrawlFilters[keyof FilterCrawlFilters]) =>
  [...new Set(filterValues(value))].sort();

export function hasDetailedFilters(filters: FilterCrawlFilters): boolean {
  return ['platform', 'category', 'location', 'targetSite', 'type']
    .some(key => canonicalValues(filters[key as keyof FilterCrawlFilters]).length > 0);
}

export function filterCrawlKey(filters: FilterCrawlFilters): string {
  return ['platform', 'category', 'location', 'targetSite', 'type']
    .map(key => `${key}:${canonicalValues(filters[key as keyof FilterCrawlFilters]).join(',')}`)
    .join('|');
}

/**
 * Conditions cannot be sent faithfully to every partner site: most only expose
 * a keyword/list page.  We therefore use conditions to select *which sources*
 * to refresh and apply the exact conditions again in our database afterwards.
 */
export async function planFilterCrawl(filters: FilterCrawlFilters, currentMatches?: readonly Campaign[]): Promise<string[]> {
  const requestedSites = canonicalValues(filters.targetSite)
    .filter(site => MAINTAINED_CRAWLER_SITES.includes(site as typeof MAINTAINED_CRAWLER_SITES[number]));
  let planned = requestedSites;
  if (!planned.length) {
    const matches = currentMatches || await queryCampaigns({ ...filters, sortBy: 'latest' });
    const sourceCounts = new Map<string, number>();
    for (const campaign of matches) {
      if (MAINTAINED_CRAWLER_SITES.includes(campaign.targetSite as typeof MAINTAINED_CRAWLER_SITES[number])) {
        sourceCounts.set(campaign.targetSite, (sourceCounts.get(campaign.targetSite) || 0) + 1);
      }
    }
    const candidates = [...sourceCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([site]) => site)
      .slice(0, FILTER_SOURCE_LIMIT);
    planned = candidates.length ? candidates : FILTER_FALLBACK_SITES;
  }

  // A source collected very recently is already current enough for a
  // filter-only browse.  A later condition change still has its own cooldown.
  const health = await getCrawlingHealth();
  const lastRun = new Map(health.map(item => [item.targetSite, Date.parse(item.executedAt)]));
  const staleAfter = Date.now() - FILTER_COOLDOWN;
  return planned.filter(site => !lastRun.get(site) || (lastRun.get(site) || 0) < staleAfter);
}
export function reserveKeywordCrawl(keyword: string): boolean {
  const key = keyword.trim().toLowerCase();
  const now = Date.now();
  for (const [k, time] of recent) if (now - time >= COOLDOWN) recent.delete(k);
  if (!key || key.length > 100 || active || recent.has(key)) return false;
  recent.set(key, now);
  active = true;
  return true;
}

export function reserveFilterCrawl(filters: FilterCrawlFilters): boolean {
  const key = `filters:${filterCrawlKey(filters)}`;
  const now = Date.now();
  for (const [recentKey, time] of recent) if (now - time >= FILTER_COOLDOWN) recent.delete(recentKey);
  if (!hasDetailedFilters(filters) || active || recent.has(key)) return false;
  recent.set(key, now);
  active = true;
  return true;
}

export function cancelFilterCrawl(filters: FilterCrawlFilters) {
  recent.delete(`filters:${filterCrawlKey(filters)}`);
  releaseCrawl();
}

async function forwardCampaigns(campaigns: Awaited<ReturnType<typeof queryCampaigns>>) {
  const destination = process.env.SYNC_TARGET_URL;
  const secret = process.env.SYNC_SECRET_KEY || process.env.CRON_SECRET;
  if (!destination || !secret) return;
  for (let offset = 0; offset < campaigns.length; offset += 500) {
    await axios.post(destination, { campaigns: campaigns.slice(offset, offset + 500) }, { timeout: 10000, headers: { Authorization: `Bearer ${secret}` } });
  }
}
export async function runKeywordCrawl(keyword: string) {
  try {
    await crawlKeywordOnDemandParallel(keyword);
    await forwardCampaigns(await queryCampaigns({ search: keyword }));
  } finally { releaseCrawl(); }
}

export async function runFilterCrawl(filters: FilterCrawlFilters, plannedSites?: readonly string[]) {
  try {
    const sites = plannedSites ? [...plannedSites] : await planFilterCrawl(filters);
    if (!sites.length) return { sites, collected: 0 };
    // Filter-only refreshes are deliberately recorded per source so the next
    // different condition can reuse their freshness instead of recollecting.
    const collected = await crawlKeywordOnDemandParallel('', sites, true);
    await forwardCampaigns(await queryCampaigns(filters));
    return { sites, collected };
  } finally { releaseCrawl(); }
}

export function releaseCrawl() { active = false; }
