import { crawlKeywordOnDemandParallel } from './crawler-parallel';
import { queryCampaigns } from './db';
import axios from 'axios';

const recent = new Map<string, number>();
let active = false;
const COOLDOWN = 180000;
export function reserveKeywordCrawl(keyword: string): boolean {
  const key = keyword.trim().toLowerCase();
  const now = Date.now();
  for (const [k, time] of recent) if (now - time >= COOLDOWN) recent.delete(k);
  if (!key || key.length > 100 || active || recent.has(key)) return false;
  recent.set(key, now);
  active = true;
  return true;
}
export async function runKeywordCrawl(keyword: string) {
  try {
    await crawlKeywordOnDemandParallel(keyword);
    const destination = process.env.SYNC_TARGET_URL;
    const secret = process.env.SYNC_SECRET_KEY || process.env.CRON_SECRET;
    if (destination && secret) {
      const campaigns = await queryCampaigns({ search: keyword });
      for (let offset = 0; offset < campaigns.length; offset += 500) {
        await axios.post(destination, { campaigns: campaigns.slice(offset, offset + 500) }, { timeout: 10000, headers: { Authorization: `Bearer ${secret}` } });
      }
    }
  } finally { releaseCrawl(); }
}

export function releaseCrawl() { active = false; }
