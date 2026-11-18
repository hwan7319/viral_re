import { getDB } from '../lib/db';
import { koreanDate } from '../lib/campaign-values';
import { resolveCampaignCategory } from '../lib/category_classifier';

/**
 * Backfill category provenance without blindly changing classifications that
 * came from a previous, explicit source parser. Run with --apply only after
 * inspecting the JSON report in the target environment.
 */
async function main() {
  const apply = process.argv.includes('--apply');
  const db = await getDB();
  const rows = await db.all<Array<{
    id: string; title: string; description: string; category: string; sourceCategory?: string;
    dataSource?: 'list' | 'detail' | 'api'; categoryEvidence?: string;
  }>>(
    `SELECT id, title, description, category, sourceCategory, dataSource, categoryEvidence
     FROM campaigns
     WHERE endDate >= ? OR (endDate = '' AND updatedAt >= datetime('now', '-48 hours'))`,
    [koreanDate()],
  );

  const report = { examined: rows.length, changedCategory: 0, provenanceBackfilled: 0, byEvidence: {} as Record<string, number> };
  for (const row of rows) {
    const rawCategories = (row.sourceCategory || '').split(/\s*>\s*|\s*\/\s*/).filter(Boolean);
    const resolved = resolveCampaignCategory({ title: row.title, description: row.description, rawCategories, dataSource: row.dataSource });
    const replaceCategory = row.category === 'etc' || row.category === 'general' || resolved.evidence === 'source-category';
    const nextCategory = replaceCategory ? resolved.category : row.category;
    if (nextCategory !== row.category) report.changedCategory++;
    if (!row.categoryEvidence) report.provenanceBackfilled++;
    report.byEvidence[resolved.evidence] = (report.byEvidence[resolved.evidence] || 0) + 1;

    if (apply) {
      await db.run(
        `UPDATE campaigns SET category = ?, categoryEvidence = ?, categoryConfidence = ?, categoryRuleVersion = ?, sourceCategory = COALESCE(sourceCategory, ?)
         WHERE id = ?`,
        [nextCategory, row.categoryEvidence || resolved.evidence, resolved.confidence, resolved.ruleVersion, resolved.sourceCategory || null, row.id],
      );
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...report }, null, 2));
}

main().catch(error => { console.error(error); process.exit(1); });
