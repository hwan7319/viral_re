import { crawlKeywordOnDemandParallel, crawlKeywordOnDemandWithReport, MAINTAINED_CRAWLER_SITES } from './crawler-parallel';
import { filterValues, getCrawlingHealth, queryCampaigns, type Campaign } from './db';
import axios from 'axios';

const recent = new Map<string, number>();
let active = false;
const waitingForSlot: Array<() => void> = [];
const COOLDOWN = 180000;
const FILTER_COOLDOWN = 20 * 60_000;
const FILTER_SOURCE_LIMIT = 3;
const FILTER_FALLBACK_SITES = ['리뷰플레이스', '링블', '클라우드리뷰'];
const JOB_STATUS_TTL = 20 * 60_000;

export type KeywordCrawlStatus = {
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  collectedCount?: number;
  failedSources?: string[];
  error?: string;
};

const keywordJobs = new Map<string, KeywordCrawlStatus>();

const keywordKey = (keyword: string) => keyword.trim().toLowerCase();

function pruneJobState(now = Date.now()) {
  for (const [key, job] of keywordJobs) {
    if (job.status === 'completed' || job.status === 'failed') {
      const timestamp = Date.parse(job.completedAt || job.startedAt);
      if (Number.isFinite(timestamp) && now - timestamp >= JOB_STATUS_TTL) keywordJobs.delete(key);
    }
  }
}

async function acquireCrawlSlot() {
  if (!active) {
    active = true;
    return;
  }
  await new Promise<void>(resolve => waitingForSlot.push(resolve));
}

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
  const key = keywordKey(keyword);
  const now = Date.now();
  for (const [k, time] of recent) if (now - time >= COOLDOWN) recent.delete(k);
  pruneJobState(now);
  if (!key || key.length > 100 || recent.has(key)) return false;
  recent.set(key, now);
  keywordJobs.set(key, { status: 'queued', startedAt: new Date(now).toISOString() });
  return true;
}

export function getKeywordCrawlStatus(keyword: string): KeywordCrawlStatus | null {
  pruneJobState();
  const job = keywordJobs.get(keywordKey(keyword));
  return job ? { ...job } : null;
}

export function reserveFilterCrawl(filters: FilterCrawlFilters): boolean {
  const key = `filters:${filterCrawlKey(filters)}`;
  const now = Date.now();
  for (const [recentKey, time] of recent) if (now - time >= FILTER_COOLDOWN) recent.delete(recentKey);
  if (!hasDetailedFilters(filters) || recent.has(key)) return false;
  recent.set(key, now);
  return true;
}

export function cancelFilterCrawl(filters: FilterCrawlFilters) {
  recent.delete(`filters:${filterCrawlKey(filters)}`);
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
  const key = keywordKey(keyword);
  const job = keywordJobs.get(key);
  await acquireCrawlSlot();
  if (job) keywordJobs.set(key, { ...job, status: 'running' });
  try {
    const { collectedCount, sources } = await crawlKeywordOnDemandWithReport(keyword);
    await forwardCampaigns(await queryCampaigns({ search: keyword }));
    const current = keywordJobs.get(key);
    if (current) keywordJobs.set(key, {
      ...current,
      status: 'completed',
      collectedCount,
      failedSources: sources.filter(source => source.status === 'FAILED').map(source => source.targetSite),
      completedAt: new Date().toISOString(),
    });
    return collectedCount;
  } catch (error) {
    // A failed attempt must not hide a source outage behind the normal keyword
    // cooldown. The next user search can queue a retry immediately.
    recent.delete(key);
    const current = keywordJobs.get(key);
    if (current) keywordJobs.set(key, {
      ...current,
      status: 'failed',
      completedAt: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally { releaseCrawl(); }
}

export async function runFilterCrawl(filters: FilterCrawlFilters, plannedSites?: readonly string[]) {
  await acquireCrawlSlot();
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

export function reserveExclusiveCrawl(): boolean {
  if (active || waitingForSlot.length) return false;
  active = true;
  return true;
}

export function releaseCrawl() {
  const next = waitingForSlot.shift();
  if (next) {
    next();
    return;
  }
  active = false;
}
