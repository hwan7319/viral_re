import type { Campaign } from '../../db';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { deadlineFromText } from '../../campaign-values';
import { getMibleSessionCookie } from '../../mible_auth';
import { HEADERS, detectCategory, detectPlatform } from '../../scraper-utils';

const ORIGIN = 'https://www.mrblog.net';

export async function scrape(keyword: string): Promise<Campaign[]> {
  const now = new Date();
  const collected = new Map<string, Campaign>();
  const session = getMibleSessionCookie();

  const parseCards = (html: string) => {
    const $ = cheerio.load(html);
    $('a[href*="/campaigns/"]').each((_, element) => {
      const href = $(element).attr('href') || '';
      const idMatch = href.match(/\/campaigns\/(\d+)/);
      if (!idMatch) return;
      const rawText = $(element).text().replace(/\s+/g, ' ').trim();
      const title = [$(element).find('.area').text().trim(), $(element).find('.subject').text().trim()]
        .filter(Boolean).join(' ').replace(/\s+/g, ' ').trim() || rawText.replace(/(?:D-Day|\d+일\s*남음).*$/i, '').trim();
      const description = $(element).find('.desc').text().replace(/\s+/g, ' ').trim() || title;
      if (!title || (keyword && !`${title} ${description}`.toLowerCase().includes(keyword.toLowerCase()))) return;

      const id = `mb-${idMatch[1]}`;
      let imageUrl = $(element).find('img').attr('src') || $(element).find('img').attr('data-src') || '';
      if (imageUrl && !imageUrl.startsWith('http')) imageUrl = `${ORIGIN}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
      const applyMatch = rawText.match(/신청\s*([\d,]+)명/);
      const limitMatch = rawText.match(/모집\s*([\d,]+)명/);
      const locationText = $(element).find('.area').clone().children().remove().end().text().replace(/\s+/g, ' ').trim();
      collected.set(id, {
        id, title, description, platform: detectPlatform(rawText, rawText), category: detectCategory(title, description),
        location: locationText || undefined, campaignUrl: `${ORIGIN}/campaigns/${idMatch[1]}`,
        imageUrl: imageUrl || 'https://viral-re.co.kr/icon.png', targetSite: '미블',
        applyCount: applyMatch ? Number(applyMatch[1].replace(/,/g, '')) : 0,
        limitCount: limitMatch ? Number(limitMatch[1].replace(/,/g, '')) : 0,
        startDate: now.toISOString().slice(0, 10), endDate: deadlineFromText(rawText, now),
        createdAt: now.toISOString(), updatedAt: now.toISOString(), searchKeywords: keyword ? `,${keyword},` : undefined,
      });
    });
  };

  try {
    const searchUrl = keyword ? `${ORIGIN}/campaigns/search?query=${encodeURIComponent(keyword)}` : ORIGIN;
    const initial = await axios.get(searchUrl, { headers: { ...HEADERS, Cookie: `laravel_session=${session}` }, timeout: 6000 });
    parseCards(initial.data);
    if (keyword) {
      const setCookies: string[] = initial.headers['set-cookie'] || [];
      const xsrf = setCookies.find(value => value.includes('XSRF-TOKEN='))?.split('XSRF-TOKEN=')[1].split(';')[0] || '';
      const updatedSession = setCookies.find(value => value.includes('laravel_session='))?.split('laravel_session=')[1].split(';')[0] || session;
      const csrf = cheerio.load(initial.data)('meta[name="csrf-token"]').attr('content') || '';
      for (let page = 1; page <= 5; page++) {
        const response = await axios.get(`${ORIGIN}/xhr/campaigns?page=${page}&query=${encodeURIComponent(keyword)}`, {
          headers: { ...HEADERS, Accept: 'application/json, text/javascript, */*; q=0.01', 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrf, 'X-XSRF-TOKEN': xsrf ? decodeURIComponent(xsrf) : csrf, Referer: searchUrl, Cookie: `XSRF-TOKEN=${xsrf}; laravel_session=${updatedSession}` },
          timeout: 6000,
        });
        const html = response.data?.html || '';
        if (!html) break;
        parseCards(html);
        if (Number(response.data?.count || 0) < 24) break;
      }
    }
  } catch (error) {
    console.warn('[Parallel-Crawl] 미블 (Mible) failed:', error instanceof Error ? error.message : error);
  }
  return [...collected.values()];
}
