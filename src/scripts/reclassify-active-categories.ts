import { getDB } from '../lib/db';
import { koreanDate } from '../lib/campaign-values';
import { classifyCampaignCategory } from '../lib/category_classifier';

async function main() {
  const db = await getDB();
  const rows = await db.all<{ id: string; title: string; description: string; category: string }[]>(
    `SELECT id, title, description, category FROM campaigns
     WHERE endDate >= ? OR (endDate = '' AND updatedAt >= datetime('now', '-48 hours'))`, [koreanDate()],
  );
  let changed = 0;
  for (const row of rows) {
    const category = classifyCampaignCategory(row.title, row.description);
    if (category !== row.category) {
      await db.run('UPDATE campaigns SET category = ?, updatedAt = ? WHERE id = ?', [category, new Date().toISOString(), row.id]);
      changed++;
    }
  }
  console.log(JSON.stringify({ examined: rows.length, changed }, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
