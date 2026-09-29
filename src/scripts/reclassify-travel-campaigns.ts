import { koreanDate } from '../lib/campaign-values';
import { classifyCampaignCategory } from '../lib/category_classifier';
import { getDB } from '../lib/db';

const apply = process.argv.includes('--apply');

async function main() {
  const db = await getDB();
  const today = koreanDate();
  const rows = await db.all<Array<{ id: string; title: string; description: string; category: string }>>(
    `SELECT id, title, description, category FROM campaigns
     WHERE category IN ('travel', 'travel-leisure')
       AND (endDate >= ? OR (endDate = '' AND datetime(updatedAt) >= datetime('now', '-2 days')))`,
    [today],
  );
  const changes = rows.map(row => ({ ...row, nextCategory: classifyCampaignCategory(row.title, row.description) }))
    .filter(row => row.category !== row.nextCategory);
  if (apply) {
    for (const row of changes) {
      await db.run('UPDATE campaigns SET category = ?, updatedAt = ? WHERE id = ?', [row.nextCategory, new Date().toISOString(), row.id]);
    }
  }
  const byTarget = Object.fromEntries(['travel', 'travel-leisure', 'culture', 'hobby', 'food-korean', 'food-cafe', 'food-pub', 'etc']
    .map(category => [category, changes.filter(row => row.nextCategory === category).length])
    .filter(([, count]) => count));
  console.log(JSON.stringify({ mode: apply ? 'applied' : 'dry-run', scanned: rows.length, changes: changes.length, byTarget, examples: changes.slice(0, 20).map(({ id, title, category, nextCategory }) => ({ id, title, category, nextCategory })) }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
