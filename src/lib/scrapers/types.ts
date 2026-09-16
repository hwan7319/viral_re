export interface ScrapedCampaign {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  campaignUrl: string;
  imageUrl: string;
  targetSite: string;
  limitCount: number;
  applyCount: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  dataSource?: 'list' | 'detail' | 'api';
  mission?: string;
}

export interface SiteScraper {
  siteName: string;
  scrapeList(keyword?: string): Promise<ScrapedCampaign[]>;
  scrapeDetailBenefit?(url: string): Promise<string | undefined>;
  scrapeDetailMission?(url: string): Promise<string | undefined>;
}
