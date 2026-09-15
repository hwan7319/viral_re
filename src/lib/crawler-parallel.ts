import { insertOrUpdateCampaigns, type Campaign } from './db';
import { scrape as gangnam } from './scrapers/search/gangnam';
import { scrape as dinnerqueen } from './scrapers/search/dinnerqueen';
import { scrape as fourblog } from './scrapers/search/fourblog';
import { scrape as reviewnote } from './scrapers/search/reviewnote';
import { scrape as cloudreview } from './scrapers/search/cloudreview';
import { scrape as revu } from './scrapers/search/revu';
import { scrape as mible } from './scrapers/search/mible';
import { scrape as ringble_categories } from './scrapers/search/ringble_categories';
import { scrape as cometoplay } from './scrapers/search/cometoplay';
import { scrape as modublog } from './scrapers/search/modublog';
import { scrape as assaview_pages } from './scrapers/search/assaview_pages';
import { scrape as ohmyblog } from './scrapers/search/ohmyblog';
import { ReviewPlaceScraper } from './scrapers/06_reviewplace';
export { detectPlatform, generateRealMission } from './scraper-utils';
// Keep one current implementation per source. The retired Ringble/AssaView URLs
// returned 404 and previously made a healthy source look like a partial failure.
const reviewplace = (keyword: string) => ReviewPlaceScraper.scrapeList(keyword);
const scrapers = [gangnam, dinnerqueen, fourblog, reviewnote, cloudreview, revu, mible, ringble_categories, cometoplay, modublog, assaview_pages, ohmyblog, reviewplace];
export async function collectCampaigns(keyword: string): Promise<Campaign[]> {
  const collected = new Map<string, Campaign>();
  // Limit concurrent sites, not the number of returned campaigns.
  for (let offset = 0; offset < scrapers.length; offset += 3) {
    const results = await Promise.allSettled(scrapers.slice(offset, offset + 3).map(scrape => scrape(keyword)));
    for (const result of results) {
      if (result.status === 'rejected') { console.error('Site scraper failed', result.reason); continue; }
      for (const campaign of result.value) {
        const previous = collected.get(campaign.id);
        collected.set(campaign.id, { ...previous, ...campaign, description: campaign.description && campaign.description !== campaign.title ? campaign.description : previous?.description || '', endDate: campaign.endDate || previous?.endDate || '' });
      }
    }
  }
  return [...collected.values()];
}
export async function crawlKeywordOnDemandParallel(keyword: string): Promise<number> {
  const collected = await collectCampaigns(keyword);
  if (collected.length) await insertOrUpdateCampaigns(collected);
  return collected.length;
}
