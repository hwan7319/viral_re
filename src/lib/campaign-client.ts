import type { Campaign } from './db';
export interface CampaignPage { success: boolean; data: Campaign[]; totalCount: number; nextOffset: number | null; isCrawlingTriggered: boolean }
export async function fetchCampaignPage(params: URLSearchParams, signal?: AbortSignal): Promise<CampaignPage> {
  const response = await fetch(`/api/campaigns?${params}`, { signal });
  if (!response.ok) throw new Error('Campaign request failed');
  return response.json();
}
