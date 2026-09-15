import { scrapeDetailMission, scrapeDetailBenefit, scrapeDetailCounts } from './detail-scraper';
import { getCampaignById, insertOrUpdateCampaigns } from './db';
const pending = new Map<string, Promise<unknown>>();
const cache = new Map<string, { time: number; data: unknown }>();
export async function refreshCampaignDetail(id: string) {
  const now = Date.now();
  for (const [key, entry] of cache) if (now - entry.time > 300000) cache.delete(key);
  if (cache.has(id)) return cache.get(id)!.data;
  if (pending.has(id)) return pending.get(id);
  if (pending.size >= 3) throw new Error('DETAIL_BUSY');
  const task = (async () => {
    const campaign = await getCampaignById(id);
    if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
    const [mission, realBenefit, counts] = await Promise.all([
      scrapeDetailMission(campaign.campaignUrl, campaign.targetSite),
      scrapeDetailBenefit(campaign.campaignUrl, campaign.targetSite),
      scrapeDetailCounts(campaign.campaignUrl, campaign.targetSite, campaign.title),
    ]);
    await insertOrUpdateCampaigns([{ ...campaign, mission: mission || campaign.mission, description: realBenefit || campaign.description, applyCount: counts.applyCount ?? campaign.applyCount, limitCount: counts.limitCount ?? campaign.limitCount }]);
    const data = { success: true, mission: mission || campaign.mission || null, realBenefit: realBenefit || campaign.description || null, applyCount: counts.applyCount ?? campaign.applyCount, limitCount: counts.limitCount ?? campaign.limitCount };
    if (cache.size >= 500) cache.delete(cache.keys().next().value!);
    cache.set(id, { time: now, data });
    return data;
  })();
  pending.set(id, task);
  try { return await task; } finally { pending.delete(id); }
}
