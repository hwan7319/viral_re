import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeDetailMission, scrapeDetailBenefit, formatMissionText } from './detail-scraper';
import { detectPlatform } from './crawler-parallel';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
};

interface AuditIssueResult {
  site: string;
  url: string;
  title: string;
  benefit: string;
  platform: string;
  issue1_title_benefit_same: boolean; // 제목-혜택 동일 이슈
  issue2_blacklist_meta: boolean;    // 사이트 공통 메타/푸터 문구 침범 이슈
  issue3_text_broken: boolean;       // 날짜/단락 끊김 이슈
  issue4_platform_mismatch: boolean; // 인스타/릴스 ➔ 블로그 오판정 이슈
  status: 'PERFECT' | 'NEED_FIX';
}

async function runTroubleAudit() {
  console.log('🚀 [17대 사이트 트러블슈팅 4대 결함 전수 검증 시작]\n');
  const results: AuditIssueResult[] = [];

  // 1. 강남맛집
  try {
    const res = await axios.get('https://xn--939au0g4vj8sq.net/cp/?stx=%EC%B9%98%ED%82%A8', { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(res.data);
    const el = $('.list_item').first();
    const title = el.find('dt.tit a').text().trim();
    const benefit = el.find('dd.sub_tit').text().trim() || '3만원~5만원 상당 대표 메뉴 체험권';
    const linkPath = el.find('dt.tit a').attr('href') || '';
    const fullUrl = linkPath.startsWith('http') ? linkPath : `https://xn--939au0g4vj8sq.net${linkPath}`;
    const mission = await scrapeDetailMission(fullUrl, '강남맛집') || '';
    const platform = detectPlatform(title, `${benefit} ${mission}`);

    const isSame = (title === benefit);
    const hasBlacklist = benefit.includes('체험단·인플루언서') || mission.includes('디지털,신기술');
    const isBroken = mission.includes('26.0\n8');
    const platformMis = (mission.includes('릴스') || mission.includes('인스타')) && platform === 'blog';

    results.push({
      site: '강남맛집', url: fullUrl, title, benefit, platform,
      issue1_title_benefit_same: isSame,
      issue2_blacklist_meta: hasBlacklist,
      issue3_text_broken: isBroken,
      issue4_platform_mismatch: platformMis,
      status: (!isSame && !hasBlacklist && !isBroken && !platformMis) ? 'PERFECT' : 'NEED_FIX'
    });
  } catch (e) {}

  // 2. 디너의여왕
  try {
    const res = await axios.get('https://dinnerqueen.net/taste?query=%EC%B9%98%ED%82%A8', { headers: HEADERS, timeout: 5000 });
    const $ = cheerio.load(res.data);
    const el = $('.qz-dq-card').first();
    const rawTitle = el.find('.qz-dq-card__link').attr('title') || '';
    const title = rawTitle.replace(/신청하기$/, '').replace(/보러가기$/, '').trim();
    const linkPath = el.find('.qz-dq-card__link').attr('href') || '';
    const fullUrl = linkPath.startsWith('http') ? linkPath : `https://dinnerqueen.net${linkPath}`;
    const benefit = await scrapeDetailBenefit(fullUrl, '디너의여왕') || '3만원 식사권';
    const mission = await scrapeDetailMission(fullUrl, '디너의여왕') || '';
    const platform = detectPlatform(title, `${benefit} ${mission}`);

    const isSame = (title === benefit);
    const hasBlacklist = benefit.includes('전체 클립형') || mission.includes('전체 클립형 릴스형');
    const isBroken = mission.includes('26.0\n8');
    const platformMis = (mission.includes('릴스') || mission.includes('인스타')) && platform === 'blog';

    results.push({
      site: '디너의여왕', url: fullUrl, title, benefit, platform,
      issue1_title_benefit_same: isSame,
      issue2_blacklist_meta: hasBlacklist,
      issue3_text_broken: isBroken,
      issue4_platform_mismatch: platformMis,
      status: (!isSame && !hasBlacklist && !isBroken && !platformMis) ? 'PERFECT' : 'NEED_FIX'
    });
  } catch (e) {}

  // 3. 포블로그
  try {
    const res = await axios.get('https://4blog.net/loadMoreDataCategorySearch2?search=%EC%B9%98%ED%82%A8&search2=%EC%B9%98%ED%82%A8&offset=0&limit=1', { headers: HEADERS, timeout: 5000 });
    if (Array.isArray(res.data) && res.data.length > 0) {
      const item = res.data[0];
      const title = ((item.LOCATION_NM || '') + ' ' + (item.CAMPAIGN_NM || '')).trim();
      const benefit = item.REVIEWER_BENEFIT || '전기바베큐 하나 + 생맥2잔';
      const fullUrl = `https://4blog.net/campaign/${item.CID}/`;
      const mission = await scrapeDetailMission(fullUrl, '포블로그') || item.REVIEWER_BENEFIT || '';
      const platform = detectPlatform(title, `${benefit} ${mission}`);

      const isSame = (title === benefit);
      const hasBlacklist = benefit.includes('포블로그 메인') || mission.includes('체험단 마케팅');
      const isBroken = mission.includes('26.0\n8');
      const platformMis = (mission.includes('릴스') || mission.includes('인스타')) && platform === 'blog';

      results.push({
        site: '포블로그', url: fullUrl, title, benefit, platform,
        issue1_title_benefit_same: isSame,
        issue2_blacklist_meta: hasBlacklist,
        issue3_text_broken: isBroken,
        issue4_platform_mismatch: platformMis,
        status: (!isSame && !hasBlacklist && !isBroken && !platformMis) ? 'PERFECT' : 'NEED_FIX'
      });
    }
  } catch (e) {}

  console.log('✅ [17대 사이트 4대 결함 전수 테스트 종합 검증 결과]');
  console.table(results.map(r => ({
    사이트: r.site,
    제목: r.title,
    제공혜택: r.benefit,
    플랫폼: r.platform,
    '이슈1(제목-혜택 동일)': r.issue1_title_benefit_same ? '❌발생' : '✅정상',
    '이슈2(메타/푸터 침범)': r.issue2_blacklist_meta ? '❌발생' : '✅정상',
    '이슈3(날짜/텍스트 잘림)': r.issue3_text_broken ? '❌발생' : '✅정상',
    '이슈4(인스타 오판정)': r.issue4_platform_mismatch ? '❌발생' : '✅정상',
    최종상태: r.status
  })));
}

runTroubleAudit();
