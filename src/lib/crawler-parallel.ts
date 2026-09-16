import { insertOrUpdateCampaigns, logCrawling, type Campaign } from './db';
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
const scrapers = [
  ['강남맛집', gangnam], ['디너의여왕', dinnerqueen], ['포블로그', fourblog], ['리뷰노트', reviewnote],
  ['클라우드리뷰', cloudreview], ['레뷰', revu], ['미블', mible], ['링블', ringble_categories],
  ['놀러와체험단', cometoplay], ['모블', modublog], ['아싸뷰', assaview_pages], ['오마이블로그', ohmyblog],
  ['리뷰플레이스', reviewplace],
] as const;

export type SourceCollectionResult = {
  targetSite: string;
  status: 'SUCCESS' | 'EMPTY' | 'FAILED';
  collectedCount: number;
  durationMs: number;
  errorMessage?: string;
};

export async function collectCampaignsWithReport(keyword: string, recordHealth = false, excludedSites: readonly string[] = []): Promise<{ campaigns: Campaign[]; sources: SourceCollectionResult[] }> {
  const outcomes: SourceCollectionResult[] = [];
  const collected = new Map<string, Campaign>();
  const scheduledScrapers = scrapers.filter(([targetSite]) => !excludedSites.includes(targetSite));
  // Limit concurrent sites, not the number of returned campaigns.
  for (let offset = 0; offset < scheduledScrapers.length; offset += 3) {
    const results = await Promise.all(scheduledScrapers.slice(offset, offset + 3).map(async ([targetSite, scrape]) => {
      const started = Date.now();
      try {
        const campaigns = await scrape(keyword);
        return { targetSite, campaigns, report: { targetSite, status: campaigns.length ? 'SUCCESS' as const : 'EMPTY' as const, collectedCount: campaigns.length, durationMs: Date.now() - started } };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { targetSite, campaigns: [], report: { targetSite, status: 'FAILED' as const, collectedCount: 0, durationMs: Date.now() - started, errorMessage } };
      }
    }));
    for (const { campaigns, report } of results) {
      outcomes.push(report);
      if (report.status === 'FAILED') console.error(`Site scraper failed (${report.targetSite})`, report.errorMessage);
      for (const campaign of campaigns) {
        const previous = collected.get(campaign.id);
        collected.set(campaign.id, { ...previous, ...campaign, description: campaign.description && campaign.description !== campaign.title ? campaign.description : previous?.description || '', endDate: campaign.endDate || previous?.endDate || '' });
      }
    }
  }
  if (recordHealth) {
    await Promise.all(outcomes.map(result => logCrawling(result.targetSite, result.status, result.collectedCount, result.errorMessage)));
  }
  return { campaigns: [...collected.values()], sources: outcomes };
}

export async function collectCampaigns(keyword: string): Promise<Campaign[]> {
  return (await collectCampaignsWithReport(keyword)).campaigns;
}
export async function crawlKeywordOnDemandParallel(keyword: string): Promise<number> {
  const collected = await collectCampaigns(keyword);
  if (collected.length) await insertOrUpdateCampaigns(collected);
  return collected.length;
}
