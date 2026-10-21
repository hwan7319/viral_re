import axios from 'axios';
import { getKeywordBlogSnapshots, recordKeywordBlogSnapshot } from './db';

export interface BlogStats {
  totalPosts: number;
  monthlyPosts: number | null;
  monthlyPostsIsLowerBound: boolean;
  monthlyPostsEstimated: boolean;
  monthlyPostsMethod: 'verified' | 'sample' | 'model' | 'history';
  monthlyPostsSampleDays: number;
  monthlyPostsSampleSize: number;
  recentDate: string;
  available: boolean;
}

interface BlogItem {
  postdate?: string;
}

const DAY_MS = 86_400_000;
const cache = new Map<string, { time: number; data: BlogStats }>();

const parsePostDate = (value: string): number => {
  if (!/^\d{8}$/.test(value)) return Number.NaN;
  return Date.parse(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00Z`);
};

const sampleWindow = (items: BlogItem[]) => {
  const dates = items
    .map(item => parsePostDate(item.postdate || ''))
    .filter((timestamp): timestamp is number => Number.isFinite(timestamp));
  if (dates.length === 0) return { days: 0, size: 0 };
  const newest = Math.max(...dates);
  const oldest = Math.min(...dates);
  return { days: Math.max(1, Math.floor((newest - oldest) / DAY_MS) + 1), size: dates.length };
};

const median = (values: number[]) => {
  const sorted = values.filter(value => Number.isFinite(value) && value >= 0).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

/**
 * Initial model for a new keyword. It combines the observed recent cadence
 * with a corpus-scale prior instead of treating a single 100-item API page as
 * an entire day. Values are rounded only to tens and always remain labelled
 * as a Viral-re estimate until daily observations accumulate.
 */
export function estimateInitialMonthlyPosts(totalPosts: number, samplePosts: number, sampleDays: number): number {
  const safeDays = Math.max(1, sampleDays);
  const sampleMonthly = (samplePosts * 30) / safeDays;
  const corpusPriorMonthly = Math.max(30, Math.min(50_000, Math.sqrt(Math.max(0, totalPosts)) * 2.25));
  const sampleWeight = Math.min(0.7, 0.1 + (safeDays / 30));
  const estimate = sampleMonthly * sampleWeight + corpusPriorMonthly * (1 - sampleWeight);
  return Math.max(samplePosts, Math.round(estimate / 10) * 10);
}

// The result is exact only when the sample reaches beyond the 30-day boundary
// or contains every result returned by Naver.
export function summarizeBlogSample(total: number, items: BlogItem[], now = new Date()): BlogStats {
  const cutoff = new Date(now.getTime() - 30 * DAY_MS).toISOString().slice(0, 10).replaceAll('-', '');
  const dates = items.map(item => item.postdate || '').filter(date => /^\d{8}$/.test(date));
  const complete = total === 0 || total <= items.length || dates.some(date => date < cutoff);
  const recent = dates[0];
  const sample = sampleWindow(items);
  return {
    totalPosts: total,
    monthlyPosts: complete ? dates.filter(date => date >= cutoff).length : null,
    monthlyPostsIsLowerBound: false,
    monthlyPostsEstimated: false,
    monthlyPostsMethod: 'verified',
    monthlyPostsSampleDays: sample.days,
    monthlyPostsSampleSize: sample.size,
    recentDate: recent ? `${recent.slice(0, 4)}.${recent.slice(4, 6)}.${recent.slice(6, 8)}` : '-',
    available: true,
  };
}

export function summarizeAvailableMonthlyPosts(total: number, items: BlogItem[], now = new Date()): BlogStats {
  const exact = summarizeBlogSample(total, items, now);
  if (exact.monthlyPosts !== null || total === 0) return exact;

  const cutoff = now.getTime() - 30 * DAY_MS;
  const observedRecentPosts = items.filter(item => {
    const timestamp = parsePostDate(item.postdate || '');
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  }).length;
  if (observedRecentPosts === 0) return exact;

  // Naver returns newest posts first and caps a query at 1,000 results. For a
  // short sample, use a blended initial model rather than 100 * 30 / 1.
  const sample = sampleWindow(items);
  if (sample.days < 7) {
    return {
      ...exact,
      monthlyPosts: estimateInitialMonthlyPosts(total, observedRecentPosts, sample.days),
      monthlyPostsEstimated: true,
      monthlyPostsMethod: 'model',
      monthlyPostsSampleDays: sample.days,
      monthlyPostsSampleSize: sample.size,
    };
  }
  const observedDays = sample.days;
  const monthlyEstimate = Math.min(total, Math.max(observedRecentPosts, Math.round((observedRecentPosts * 30) / observedDays)));

  return {
    ...exact,
    monthlyPosts: monthlyEstimate,
    monthlyPostsIsLowerBound: false,
    monthlyPostsEstimated: true,
    monthlyPostsMethod: 'sample',
    monthlyPostsSampleDays: sample.days,
    monthlyPostsSampleSize: sample.size,
  };
}

async function applyHistory(keyword: string, stats: BlogStats, now = new Date()): Promise<BlogStats> {
  if (!stats.available || stats.totalPosts <= 0 || stats.monthlyPosts === null) return stats;
  const observedOn = now.toISOString().slice(0, 10);
  try {
    const history = await getKeywordBlogSnapshots(keyword);
    const chronological = history.filter(row => row.observedOn < observedOn).reverse();
    const dailyGrowth = chronological.slice(1).map((row, index) => {
      const previous = chronological[index];
      const days = Math.max(1, Math.round((Date.parse(`${row.observedOn}T00:00:00Z`) - Date.parse(`${previous.observedOn}T00:00:00Z`)) / DAY_MS));
      return (row.totalPosts - previous.totalPosts) / days;
    }).filter(value => value >= 0);
    const dailyMedian = dailyGrowth.length >= 3 ? median(dailyGrowth) : null;
    if (dailyMedian !== null) {
      const historyMonthly = dailyMedian * 30;
      stats = {
        ...stats,
        monthlyPosts: Math.round(((historyMonthly * 0.7) + (stats.monthlyPosts * 0.3)) / 10) * 10,
        monthlyPostsEstimated: true,
        monthlyPostsMethod: 'history',
      };
    }
    void recordKeywordBlogSnapshot(keyword, {
      observedOn,
      totalPosts: stats.totalPosts,
      samplePosts: stats.monthlyPostsSampleSize,
      sampleDays: stats.monthlyPostsSampleDays,
    });
  } catch {
    // Persistence must not make an external keyword API response fail.
  }
  return stats;
}

async function fetchPage(keyword: string, clientId: string, clientSecret: string, start: number) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await axios.get('https://openapi.naver.com/v1/search/blog.json', {
        params: { query: keyword, display: 100, start, sort: 'date' },
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
        timeout: 4000,
      });
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (attempt === 2 || (status !== 429 && (status === undefined || status < 500))) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw new Error('Naver blog request failed');
}

export async function fetchBlogStats(
  keyword: string,
  clientId: string,
  clientSecret: string,
  maxPages = 1,
): Promise<BlogStats> {
  const pageLimit = Math.max(1, Math.min(10, Math.trunc(maxPages)));
  const key = `${clientId}:${keyword}:${pageLimit}`;
  const now = Date.now();
  for (const [cacheKey, entry] of cache) {
    if (now - entry.time > 600_000) cache.delete(cacheKey);
  }
  const entry = cache.get(key);
  if (entry) return entry.data;

  if (clientId && clientSecret) {
    try {
      const items: BlogItem[] = [];
      let total = 0;
      for (let page = 0; page < pageLimit; page += 1) {
        const response = await fetchPage(keyword, clientId, clientSecret, page * 100 + 1);
        if (!Number.isFinite(response.data.total) || !Array.isArray(response.data.items)) {
          throw new Error('Invalid blog response');
        }
        total = response.data.total;
        items.push(...response.data.items);
        const summary = summarizeBlogSample(total, items);
        if (summary.monthlyPosts !== null || response.data.items.length < 100) break;
      }

      const data = await applyHistory(keyword, summarizeAvailableMonthlyPosts(total, items));
      if (cache.size >= 1_000) cache.delete(cache.keys().next().value!);
      cache.set(key, { time: now, data });
      return data;
    } catch {
      // API failures remain distinct from a measured zero.
    }
  }

  return {
    totalPosts: 0,
    monthlyPosts: null,
    monthlyPostsIsLowerBound: false,
    monthlyPostsEstimated: false,
    monthlyPostsMethod: 'verified',
    monthlyPostsSampleDays: 0,
    monthlyPostsSampleSize: 0,
    recentDate: '-',
    available: false,
  };
}
