export type Campaign = {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  location: string;
  campaignUrl: string;
  imageUrl: string;
  targetSite: string;
  limitCount: number;
  applyCount: number;
  endDate: string;
};

export type CrawlStatus = {
  status: 'queued' | 'running' | 'completed' | 'failed';
  collectedCount?: number;
  failedSources?: string[];
};

type CampaignResponse = {
  success: boolean;
  data: Campaign[];
  totalCount: number;
  crawlStatus: CrawlStatus | null;
};

const apiOrigin = (process.env.EXPO_PUBLIC_API_ORIGIN || 'https://viral-re.co.kr').replace(/\/+$/, '');

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`);
  if (!response.ok) throw new Error(`API request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export async function fetchCampaigns(keyword: string, allowCollection: boolean): Promise<CampaignResponse> {
  const params = new URLSearchParams({ limit: '30', offset: '0', sortBy: 'latest' });
  if (keyword) params.set('search', keyword);
  if (!allowCollection) params.set('crawl', 'false');
  return request<CampaignResponse>(`/api/campaigns?${params}`);
}

export async function fetchCrawlStatus(keyword: string): Promise<CrawlStatus | null> {
  const params = new URLSearchParams({ search: keyword, status: 'crawl', crawl: 'false' });
  return (await request<{ success: boolean; crawlStatus: CrawlStatus | null }>(`/api/campaigns?${params}`)).crawlStatus;
}
