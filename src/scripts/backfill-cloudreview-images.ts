import axios from 'axios';
import { getDB } from '../lib/db';
import { HEADERS } from '../lib/scraper-utils';
import { parseCloudReviewMainImage } from '../lib/scrapers/search/cloudreview';

const placeholderPattern = '%insta_symbol.png%';
const concurrency = 5;

async function main() {
  const db = await getDB();
  db.configure('busyTimeout', 10_000);
  const campaigns = await db.all<{ id: string; campaignUrl: string }[]>(
    `SELECT id, campaignUrl FROM campaigns
     WHERE targetSite = '클라우드리뷰' AND imageUrl LIKE ?`,
    [placeholderPattern],
  );
  let index = 0;
  let updated = 0;
  let unavailable = 0;
  const resolved: Array<{ id: string; imageUrl: string }> = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (index < campaigns.length) {
      const campaign = campaigns[index++];
      try {
        const response = await axios.get(campaign.campaignUrl, { headers: HEADERS, timeout: 8_000 });
        const imageUrl = parseCloudReviewMainImage(String(response.data || ''));
        if (!imageUrl) {
          unavailable += 1;
          continue;
        }
        resolved.push({ id: campaign.id, imageUrl });
      } catch {
        unavailable += 1;
      }
    }
  }));
  // SQLite permits one writer. Keep network collection parallel but serialize
  // writes so a temporary lock cannot be mistaken for a missing source image.
  for (const campaign of resolved) {
    await db.run('UPDATE campaigns SET imageUrl = ?, updatedAt = ? WHERE id = ?', [campaign.imageUrl, new Date().toISOString(), campaign.id]);
    updated += 1;
  }
  console.log(JSON.stringify({ scanned: campaigns.length, updated, unavailable }));
  process.exit(unavailable ? 1 : 0);
}

main().catch(error => { console.error(error); process.exit(1); });
