import type { Campaign } from './campaign-api';

// Navigation only passes a stable campaign ID. Keep the already-rendered list
// row in memory so the detail screen never has to guess from a different first
// page of results. A future deep-link API can replace this cache lookup.
const campaignsById = new Map<string, Campaign>();

export function cacheCampaigns(campaigns: Campaign[]) {
  campaigns.forEach(campaign => campaignsById.set(campaign.id, campaign));
}

export function getCachedCampaign(id: string) {
  return campaignsById.get(id) ?? null;
}
