import type { Campaign } from './db';
import type { KeywordCrawlStatus } from './crawl-jobs';

export interface CampaignPage {
  success: boolean;
  data: Campaign[];
  totalCount: number;
  nextOffset: number | null;
  isCrawlingTriggered: boolean;
  crawlStatus: KeywordCrawlStatus | null;
}

export interface KeywordCrawlStatusResponse {
  success: boolean;
  crawlStatus: KeywordCrawlStatus | null;
}

export async function fetchCampaignPage(params: URLSearchParams, signal?: AbortSignal): Promise<CampaignPage> {
  const response = await fetch(`/api/campaigns?${params}`, { signal });
  if (!response.ok) throw new Error('Campaign request failed');
  return response.json();
}

export async function fetchKeywordCrawlStatus(keyword: string, signal?: AbortSignal): Promise<KeywordCrawlStatusResponse> {
  const params = new URLSearchParams({ search: keyword, status: 'crawl', crawl: 'false' });
  const response = await fetch(`/api/campaigns?${params}`, { signal });
  if (!response.ok) throw new Error('Crawl status request failed');
  return response.json();
}
