import type { Campaign } from '../../db';
import { fetchRevuLiveCampaigns } from '../../revu_live_scraper';
export async function scrape(keyword: string): Promise<Campaign[]> {
  try {
    const rows = await fetchRevuLiveCampaigns();
    const normalized = keyword.trim().toLowerCase();
    if (!normalized) return rows as Campaign[];
    return rows.filter(row => [row.title, row.description, row.location, row.mission]
      .some(value => String(value || '').toLowerCase().includes(normalized))) as Campaign[];
  } catch (error) {
    console.warn('[Parallel-Crawl] 레뷰 (REVU) live API failed:', error instanceof Error ? error.message : error);
    return [];
  }
}
