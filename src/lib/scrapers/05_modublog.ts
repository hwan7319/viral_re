import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedCampaign, SiteScraper } from './types';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

export const ModuBlogScraper: SiteScraper = {
  siteName: '모블',

  async scrapeList(keyword?: string): Promise<ScrapedCampaign[]> {
    const res = await axios.get('https://www.modublog.co.kr', { headers: HEADERS, timeout: 6000 });
    const $ = cheerio.load(res.data);
    const collected: ScrapedCampaign[] = [];
    const now = new Date();

    $('a[href*="/product/"]').each((i, el) => {
      const href = $(el).attr('href') || '';
      const parent = $(el).closest('div, li');
      let rawTitle = $(el).text().trim().replace(/\s+/g, ' ') || parent.text().trim().replace(/\s+/g, ' ');
      if (keyword && !rawTitle.toLowerCase().includes(keyword.toLowerCase())) return;

      let img = $(el).find('img').attr('src') || parent.find('img').attr('src') || '';
      if (img && img.startsWith('//')) img = 'https:' + img;
      if (img && !img.startsWith('http')) img = `https://www.modublog.co.kr${img.startsWith('/') ? '' : '/'}${img}`;

      const numMatch = href.match(/\/product\/(\d+)/);
      const cpId = numMatch ? numMatch[1] : `${i}`;

      if (rawTitle && rawTitle.length > 3) {
        collected.push({
          id: `mb-${cpId}`,
          title: rawTitle.slice(0, 60),
          description: '',
          platform: 'blog',
          category: 'general',
          campaignUrl: href.startsWith('http') ? href : `https://www.modublog.co.kr${href.startsWith('/') ? '' : '/'}${href}`,
          imageUrl: img || 'https://viral-re.co.kr/icon.png',
          targetSite: '모블',
          limitCount: 5,
          applyCount: 0,
          startDate: now.toISOString().split('T')[0],
          endDate: new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0],
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });
      }
    });

    return collected;
  },

  async scrapeDetailBenefit(url: string): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 6000 });
      const $ = cheerio.load(res.data);
      const container = $('#bo_v_con').length ? $('#bo_v_con') : $('.view-content').length ? $('.view-content') : $('body');
      
      container.find('script, style, iframe').remove();

      const rawHtml = container.html() || '';
      const text = rawHtml
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      let isBenefitSection = false;
      const benefitLines: string[] = [];

      for (const line of lines) {
        if (/^제공\s*내역|^제공내역|^제공\s*혜택|^제공혜택/i.test(line)) {
          isBenefitSection = true;
          const rest = line.replace(/^제공\s*내역|^제공내역|^제공\s*혜택|^제공혜택/i, '').trim();
          if (rest && rest.length > 1) {
            benefitLines.push(rest.replace(/^[\-\*•\:]\s*/, ''));
          }
          continue;
        }

        if (isBenefitSection) {
          if (/^(?:체험\s*방법|체험\s*시간|유의\s*사항|미션\s*사항|키워드|안내\s*사항|주의\s*사항)/i.test(line)) {
            break;
          }
          let clean = line.replace(/^[\-\*•\:]\s*/, '').replace(/\[클릭\]|\[참고\]/g, '').trim();
          if (clean) {
            benefitLines.push(clean);
          }
        }
      }

      if (benefitLines.length > 0) {
        return benefitLines.join('\n');
      }
    } catch (e) {}
    return undefined;
  },

  async scrapeDetailMission(url: string): Promise<string | undefined> {
    try {
      const res = await axios.get(url, { headers: HEADERS, timeout: 6000 });
      const $ = cheerio.load(res.data);
      const container = $('#bo_v_con').length ? $('#bo_v_con') : $('.view-content').length ? $('.view-content') : $('body');
      
      container.find('script, style, iframe').remove();

      const rawHtml = container.html() || '';
      const text = rawHtml
        .replace(/<\/p>/gi, '\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/tr>/gi, '\n')
        .replace(/<\/h[1-6]>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&gt;/g, '>')
        .replace(/&lt;/g, '<')
        .replace(/&amp;/g, '&');

      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      const sections: { title: string; lines: string[] }[] = [];
      let currentSection: { title: string; lines: string[] } | null = null;

      for (const line of lines) {
        if (/g5_|dataLayer|gtag|alert\(|wcs_/i.test(line)) continue;

        if (/^(?:제공내역|제공\s*내역|체험방법|체험방법&시간|체험방법\s*및\s*시간|유의사항|유의\s*사항|미션사항|미션\s*사항|키워드)/i.test(line)) {
          let sectionTitle = line.trim();
          if (sectionTitle.includes('제공')) sectionTitle = '🎁 [제공내역]';
          else if (sectionTitle.includes('체험방법')) sectionTitle = '⏰ [체험방법 & 시간]';
          else if (sectionTitle.includes('유의')) sectionTitle = '⚠️ [유의사항]';
          else if (sectionTitle.includes('미션')) sectionTitle = '📋 [미션사항]';
          else sectionTitle = `📌 [${sectionTitle}]`;

          currentSection = { title: sectionTitle, lines: [] };
          sections.push(currentSection);
          continue;
        }

        if (currentSection) {
          let clean = line.replace(/^[\-\*•\:]\s*/, '').replace(/\[클릭\]|\[참고\]/g, '').trim();
          if (clean) {
            currentSection.lines.push(`• ${clean}`);
          }
        } else {
          let clean = line.replace(/^[\-\*•\:]\s*/, '').replace(/\[클릭\]|\[참고\]/g, '').trim();
          if (clean && clean.length > 3) {
            if (!currentSection) {
              currentSection = { title: '📌 [상세 안내 및 가이드라인]', lines: [] };
              sections.push(currentSection);
            }
            currentSection.lines.push(`• ${clean}`);
          }
        }
      }

      if (sections.length > 0) {
        return sections.map(s => `${s.title}\n${s.lines.join('\n')}`).join('\n\n');
      }
    } catch (e) {}
    return undefined;
  }
};
