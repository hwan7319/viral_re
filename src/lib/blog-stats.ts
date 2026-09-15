import axios from 'axios';
export interface BlogStats { totalPosts: number; monthlyPosts: number | null; recentDate: string; available: boolean }
// A short latest-post sample cannot prove a monthly total unless it covers the entire window.
export function summarizeBlogSample(total: number, items: Array<{ postdate?: string }>, now = new Date()): BlogStats {
  const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10).replaceAll('-', '');
  const dates = items.map(item => item.postdate || '');
  const valid = dates.every(date => /^\d{8}$/.test(date));
  const complete = total === 0 || (valid && (total <= items.length || dates.some(date => date < cutoff)));
  const recent = dates[0];
  return { totalPosts: total, monthlyPosts: complete ? dates.filter(date => date >= cutoff).length : null, recentDate: recent && /^\d{8}$/.test(recent) ? `${recent.slice(0,4)}.${recent.slice(4,6)}.${recent.slice(6,8)}` : '-', available: true };
}
const cache = new Map<string, { time: number; data: BlogStats }>();
export async function fetchBlogStats(keyword: string, clientId: string, clientSecret: string): Promise<BlogStats> {
  const key = `${clientId}:${keyword}`;
  const now = Date.now();
  for (const [k, entry] of cache) if (now - entry.time > 600000) cache.delete(k);
  const entry = cache.get(key);
  if (entry) return entry.data;
  if (clientId && clientSecret) {
    try {
      const response = await axios.get('https://openapi.naver.com/v1/search/blog.json', { params: { query: keyword, display: 100, sort: 'date' }, headers: { 'X-Naver-Client-Id': clientId, 'X-Naver-Client-Secret': clientSecret }, timeout: 4000 });
      if (!Number.isFinite(response.data.total) || !Array.isArray(response.data.items)) throw new Error('Invalid blog response');
      const data = summarizeBlogSample(response.data.total, response.data.items);
      if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
      cache.set(key, { time: now, data });
      return data;
    } catch { /* Unavailable must remain distinct from a measured zero. */ }
  }
  return { totalPosts: 0, monthlyPosts: null, recentDate: '-', available: false };
}
