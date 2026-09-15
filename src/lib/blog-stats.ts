import axios from 'axios';

export interface BlogStats {
  totalPosts: number;
  monthlyPosts: number | null;
  monthlyPostsEstimated: boolean;
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

// The result is exact only when the sample reaches beyond the 30-day boundary
// or contains every result returned by Naver.
export function summarizeBlogSample(total: number, items: BlogItem[], now = new Date()): BlogStats {
  const cutoff = new Date(now.getTime() - 30 * DAY_MS).toISOString().slice(0, 10).replaceAll('-', '');
  const dates = items.map(item => item.postdate || '').filter(date => /^\d{8}$/.test(date));
  const complete = total === 0 || total <= items.length || dates.some(date => date < cutoff);
  const recent = dates[0];
  return {
    totalPosts: total,
    monthlyPosts: complete ? dates.filter(date => date >= cutoff).length : null,
    monthlyPostsEstimated: false,
    recentDate: recent ? `${recent.slice(0, 4)}.${recent.slice(4, 6)}.${recent.slice(6, 8)}` : '-',
    available: true,
  };
}

export function estimateMonthlyPostsFromSample(total: number, items: BlogItem[], now = new Date()): BlogStats {
  const exact = summarizeBlogSample(total, items, now);
  if (exact.monthlyPosts !== null || total === 0) return exact;

  const timestamps = items
    .map(item => parsePostDate(item.postdate || ''))
    .filter(Number.isFinite)
    .sort((a, b) => b - a);
  if (timestamps.length === 0) return exact;

  const newest = Math.min(now.getTime(), timestamps[0]);
  const oldest = timestamps[timestamps.length - 1];
  const observedDays = Math.max(1, (newest - oldest) / DAY_MS + 1);
  const projected = Math.round((timestamps.length / observedDays) * 30);

  return {
    ...exact,
    monthlyPosts: Math.min(total, Math.max(timestamps.length, projected)),
    monthlyPostsEstimated: true,
  };
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

      const data = estimateMonthlyPostsFromSample(total, items);
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
    monthlyPostsEstimated: false,
    recentDate: '-',
    available: false,
  };
}
