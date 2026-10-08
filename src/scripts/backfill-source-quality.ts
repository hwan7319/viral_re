import { getDB } from '../lib/db';
import { koreanDate } from '../lib/campaign-values';
import { classifyCampaignCategory } from '../lib/category_classifier';
import { scrapeDetailBenefit } from '../lib/detail-scraper';

type Row = { id: string; title: string; description: string; category: string; campaignUrl: string; targetSite: string; endDate: string; updatedAt: string };
const DETAIL_SITES = new Set(['리뷰플레이스', '링블', '디너의여왕', '아싸뷰']);
const concurrency = Math.max(1, Math.min(6, Number(process.env.BACKFILL_CONCURRENCY || 4)));

function needsBenefit(row: Row) {
  const title = row.title.trim();
  const description = row.description.trim();
  return !description || description === title || description.startsWith(`${title} 체험 혜택`) || description.endsWith(' 체험 혜택');
}

async function main() {
  const db = await getDB();
  const today = koreanDate();
  const rows = await db.all<Row[]>(
    `SELECT id, title, description, category, campaignUrl, targetSite, endDate, updatedAt
       FROM campaigns
      WHERE endDate >= ? OR (endDate = '' AND updatedAt >= datetime('now', '-48 hours'))`,
    [today],
  );
  const candidates = rows.filter(row => DETAIL_SITES.has(row.targetSite) && needsBenefit(row));
  let benefitsFixed = 0;
  let categoriesFixed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < candidates.length) {
      const row = candidates[cursor++];
      try {
        const benefit = await scrapeDetailBenefit(row.campaignUrl, row.targetSite);
        if (benefit && benefit.trim() !== row.title.trim()) {
          await db.run('UPDATE campaigns SET description = ?, dataSource = ?, updatedAt = ? WHERE id = ?', [benefit.trim(), 'detail', new Date().toISOString(), row.id]);
          benefitsFixed++;
        }
      } catch (error) {
        console.warn(`[quality-backfill] ${row.targetSite} ${row.id} skipped:`, error instanceof Error ? error.message : error);
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));

  for (const row of rows) {
    const nextCategory = classifyCampaignCategory(row.title, row.description);
    if (nextCategory !== 'etc' && nextCategory !== row.category) {
      await db.run('UPDATE campaigns SET category = ?, updatedAt = ? WHERE id = ?', [nextCategory, new Date().toISOString(), row.id]);
      categoriesFixed++;
    }
  }
  console.log(JSON.stringify({ activeRows: rows.length, benefitCandidates: candidates.length, benefitsFixed, categoriesFixed }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
