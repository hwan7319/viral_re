import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import sqlite3 from 'sqlite3';
import { scrapeDetailBenefit } from './detail-scraper';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

async function fixAllTitleAndDescription() {
  const filePath = path.join(process.cwd(), 'data', 'campaigns.json');
  const items = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  console.log(`🚀 Auditing & fixing title vs description for ${items.length} items across all platforms...`);

  let countFixed = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const targetSite = item.targetSite || '';

    // 1. 미블 (Mible) 특수 정제
    if (targetSite === '미블') {
      let rawText = item.title || item.description || '';
      if (rawText.includes('**')) {
        const parts = rawText.split('**');
        const benefitPart = parts[0].trim();
        // Extract location/store if possible
        const locMatch = benefitPart.match(/^(\[[^\]]+\]|[가-힣]+\s+[가-힣]+구|[가-힣]+\s+[가-힣]+동|[가-힣]+\s+[가-힣]+면|[가-힣]+\s+[가-힣]+읍)\s*(.*)/);
        if (locMatch) {
          const locStr = locMatch[1];
          const restStr = locMatch[2];
          item.title = `${locStr} ${restStr.split(' ')[0]}`.trim();
          item.description = benefitPart;
        } else {
          item.description = benefitPart;
        }
        countFixed++;
      }
    }

    // 2. 제목과 제공혜택이 100% 동일한 항목 탐색 및 개별 파싱
    if (item.title && item.description && item.title === item.description) {
      // (A) 놀러와체험단: #태그 또는 .etc_list2 정제
      if (targetSite === '놀러와체험단') {
        if (item.title.includes('#')) {
          const parts = item.title.split('#');
          item.title = parts[0].trim();
          item.description = parts.slice(1).map((t: string) => `#${t.trim()}`).join(' ');
          countFixed++;
        }
      }
      // (B) 모블 (Modublog): 타이틀과 상세 내용 분리
      else if (targetSite === '모블') {
        const bracketMatch = item.title.match(/^(\[[^\]]+\]\s*[^\[\s]+)/);
        if (bracketMatch) {
          const shortTitle = bracketMatch[1].trim();
          const restBenefit = item.title.replace(shortTitle, '').trim();
          if (restBenefit.length > 2) {
            item.title = shortTitle;
            item.description = restBenefit;
            countFixed++;
          }
        }
      }

      // (C) 라이브 스크레이퍼로 실시간 제공혜택 가져오기 (리뷰플레이스, 링블, 클라우드리뷰 등)
      if (item.title === item.description) {
        try {
          const liveBenefit = await scrapeDetailBenefit(item.campaignUrl, targetSite);
          if (liveBenefit && liveBenefit !== item.title && liveBenefit.length > 2) {
            item.description = liveBenefit;
            countFixed++;
          }
        } catch (e) {}
      }
    }

    // 3. 글로벌 텍스트 샌니타이징 (제목 및 설명 내 신청/모집 인원 문구 제거)
    const sanitize = (text: string) => {
      if (!text) return text;
      return text
        .replace(/(?:오늘\s*마감|\d+\s*일\s*남음|D-Day|D-\d+|\d+\s*시간\s*남음)?\s*신청\s*\d+\s*(?:명)?\s*[\/\,\~]\s*모집\s*\d+\s*(?:명)?/gi, '')
        .replace(/\s*(?:신청|지원)\s*\d+\s*(?:명)?\s*[\/\,\~]\s*모집\s*\d+\s*(?:명)?/gi, '')
        .replace(/\s*(?:신청|지원)\s*\d+\s*(?:명)?/gi, '')
        .replace(/(?:오늘\s*마감|\d+\s*일\s*남음|D-Day)\s*/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    item.title = sanitize(item.title);
    item.description = sanitize(item.description);

    if ((i + 1) % 1000 === 0) {
      console.log(`Processed ${i + 1}/${items.length} items...`);
    }
  }

  console.log(`✅ Successfully fixed ${countFixed} items!`);

  // Write back to files
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  fs.writeFileSync(path.join(process.cwd(), 'campaigns.json'), JSON.stringify(items, null, 2), 'utf-8');
  console.log('✅ Saved updated snapshot JSON files!');

  // Update SQLite DB
  const dbPath = path.join(process.cwd(), 'data', 'review-moa.db');
  const db = new sqlite3.Database(dbPath);
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    const stmt = db.prepare('UPDATE campaigns SET title = ?, description = ? WHERE id = ?');
    for (const item of items) {
      stmt.run(item.title, item.description, item.id);
    }
    stmt.finalize();
    db.run('COMMIT', () => {
      console.log('✅ Local SQLite DB successfully updated!');
      db.close();
    });
  });
}

fixAllTitleAndDescription();
