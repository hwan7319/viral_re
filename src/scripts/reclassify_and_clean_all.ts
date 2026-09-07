import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { detectPlatform } from '../lib/crawler-parallel';

const sanitizeCampaignText = (text: string): string => {
  if (!text) return '';
  let cleaned = text;
  
  // [레뷰 추천], [레뷰], [디너의여왕], [강남맛집], [아싸뷰], [클라우드리뷰], [네이버쇼핑 기획전], [링블], [리뷰노트], [체험뷰] 등 출처 태그 패턴 제거
  cleaned = cleaned.replace(/^\[(레뷰|레뷰 추천|디너의여왕|강남맛집|강남|아싸뷰|클라우드리뷰|링블|네이버|네이버쇼핑|네이버쇼핑 기획전|뷰티|체험단|모집|리뷰노트|투잡커넥트|체험뷰|미블)[^\]]*\]\s*/gi, '');
  cleaned = cleaned.replace(/\[(레뷰|디너의여왕|강남맛집|아싸뷰|클라우드리뷰|링블|리뷰노트|투잡커넥트|체험뷰|미블)[^\]]*\]/gi, '');
  
  // 🔑 [제공 혜택 영역 내 신청/모집 인원 문구 완전 제거] (명, 콜론, 슬래시 여부 무관)
  cleaned = cleaned
    .replace(/(?:D-Day|D-\d+|\d+\s*일\s*남음|\d+\s*시간\s*남음)?\s*신청\s*:?\s*\d+\s*명?\s*[\/\,\~\:]\s*모집\s*:?\s*\d+\s*명?/gi, '')
    .replace(/(?:D-Day|D-\d+|\d+\s*일\s*남음|\d+\s*시간\s*남음)?\s*모집\s*:?\s*\d+\s*명?\s*[\/\,\~\:]\s*신청\s*:?\s*\d+\s*명?/gi, '')
    .replace(/신청\s*:?\s*\d+\s*명?\s*[\/]\s*모집\s*:?\s*\d+\s*명?/gi, '')
    .replace(/모집\s*:?\s*\d+\s*명?\s*[\/]\s*신청\s*:?\s*\d+\s*명?/gi, '')
    .replace(/\s*(?:신청|지원)\s*:?\s*\d+\s*명?(?:\s*[\/]\s*(?:모집|정원)\s*:?\s*\d+\s*명?)?/gi, '')
    .replace(/\s*(?:모집|정원)\s*:?\s*\d+\s*명?(?:\s*[\/]\s*(?:신청|지원)\s*:?\s*\d+\s*명?)?/gi, '')
    .replace(/\s*D-Day\s*/gi, ' ')
    .replace(/\s*\d+\s*일\s*남음\s*/gi, ' ')
    .replace(/\(\s*\)/g, '')
    .replace(/\s+/g, ' ');

  return cleaned.trim();
};

async function run() {
  const jsonPath = path.join(process.cwd(), 'data', 'campaigns.json');
  const dbPath = path.join(process.cwd(), 'data', 'review-moa.db');

  if (!fs.existsSync(jsonPath)) {
    console.error('campaigns.json not found!');
    return;
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(raw);
  console.log(`Processing ${data.length} campaigns from JSON...`);

  let platformChanges = 0;
  let descChanges = 0;

  const updatedData = data.map((c: any) => {
    const cleanDesc = sanitizeCampaignText(c.description || '');
    const cleanTitle = c.title || '';
    const newPlatform = detectPlatform(cleanTitle, `${c.rawPlatform || ''} ${c.description || ''} ${c.targetSite || ''}`);

    if (cleanDesc !== c.description) descChanges++;
    if (newPlatform !== c.platform) platformChanges++;

    return {
      ...c,
      description: cleanDesc,
      platform: newPlatform
    };
  });

  console.log(`JSON processing complete:`);
  console.log(` - Description cleaned: ${descChanges}`);
  console.log(` - Platform re-classified: ${platformChanges}`);

  fs.writeFileSync(jsonPath, JSON.stringify(updatedData, null, 2), 'utf8');
  console.log(`Saved updated data/campaigns.json`);

  if (fs.existsSync(dbPath)) {
    console.log(`Updating SQLite DB at ${dbPath}...`);
    const db = await open({ filename: dbPath, driver: sqlite3.Database });
    await db.run('BEGIN TRANSACTION');

    for (const c of updatedData) {
      await db.run(
        'UPDATE campaigns SET description = ?, platform = ? WHERE id = ?',
        [c.description, c.platform, c.id]
      );
    }

    await db.run('COMMIT');
    console.log(`SQLite DB updated successfully!`);
    await db.close();
  }
}

run().catch(console.error);
