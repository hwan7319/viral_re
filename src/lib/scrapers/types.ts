export interface ScrapedCampaign {
  id: string;
  title: string;
  description: string;
  platform: string;
  category: string;
  location?: string;
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
  /** The site's taxonomy as published; never replace it with our display label. */
  sourceCategory?: string;
  categoryEvidence?: 'source-category' | 'detail-text' | 'list-text' | 'title' | 'unclassified' | 'legacy';
  categoryConfidence?: 'high' | 'medium' | 'low' | 'none';
  categoryRuleVersion?: string;
  mission?: string;
}

export interface SiteScraper {
  siteName: string;
  scrapeList(keyword?: string): Promise<ScrapedCampaign[]>;
  scrapeDetailBenefit?(url: string): Promise<string | undefined>;
  scrapeDetailMission?(url: string): Promise<string | undefined>;
}
