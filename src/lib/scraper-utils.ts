import { deadlineFromText } from './campaign-values';
import { classifyCampaignCategory } from './category_classifier';
import axios from 'axios';
import * as cheerio from 'cheerio';



// 🔑 크롤링 브라우저 User-Agent 헤더 셋업 (우회 성능 향상)
export const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

export const parseDdayToDate = deadlineFromText;

export const parseRemainDaysToDate = (remainDays: number): string => {
  const now = new Date();
  const target = new Date(now.getTime() + remainDays * 24 * 60 * 60 * 1000);
  return target.toISOString().split('T')[0];
};

// 🔑 실제 업체측 리뷰어 미션 가이드라인 생성 헬퍼 함수
export const generateRealMission = (title: string, platform: string, category: string, location?: string): string => {
  return '';
};

export const parseCountText = (text: string): { applyCount: number; limitCount: number } => {
  if (!text) return { applyCount: 0, limitCount: 0 };
  const cleaned = text.replace(/\s+/g, '');
  
  // 1. 명시적 "신청N / 모집N" 또는 "신청N명 / 모집N명" 패턴
  const applyFirstMatch = cleaned.match(/신청([0-9,]+).*?모집([0-9,]+)/);
  if (applyFirstMatch) {
    return {
      applyCount: parseInt(applyFirstMatch[1].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(applyFirstMatch[2].replace(/,/g, ''), 10) || 0
    };
  }

  // 2. 명시적 "모집N / 신청N" 또는 "모집N명 / 신청N명" 패턴
  const limitFirstMatch = cleaned.match(/모집([0-9,]+).*?신청([0-9,]+)/);
  if (limitFirstMatch) {
    return {
      applyCount: parseInt(limitFirstMatch[2].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(limitFirstMatch[1].replace(/,/g, ''), 10) || 0
    };
  }

  // 3. 단순 "신청N" 패턴
  const applyOnlyMatch = cleaned.match(/신청([0-9,]+)/);
  // 4. 단순 "모집N" 패턴
  const limitOnlyMatch = cleaned.match(/모집([0-9,]+)/);

  if (applyOnlyMatch || limitOnlyMatch) {
    return {
      applyCount: applyOnlyMatch ? parseInt(applyOnlyMatch[1].replace(/,/g, ''), 10) : 0,
      limitCount: limitOnlyMatch ? parseInt(limitOnlyMatch[1].replace(/,/g, ''), 10) : 0
    };
  }

  // 5. "N / M" 단순 슬래시 (신청/모집)
  const slashMatch = cleaned.match(/([0-9,]+)\/([0-9,]+)/);
  if (slashMatch) {
    return {
      applyCount: parseInt(slashMatch[1].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(slashMatch[2].replace(/,/g, ''), 10) || 0
    };
  }

  return { applyCount: 0, limitCount: 0 };
};

export const detectPlatform = (title: string, rawPlatformText?: string): 'blog' | 'clip' | 'blog+clip' | 'blog+instagram' | 'instagram' | 'youtube' | 'tiktok' | 'coupang' | 'etc' => {
  const t = (title || '').toLowerCase();
  const p = (rawPlatformText || '').toLowerCase();
  const combined = `${t} ${p}`;

  // 1. Coupang
  if (combined.includes('쿠팡') || combined.includes('coupang')) {
    return 'coupang';
  }

  const hasBlog = combined.includes('blog') || combined.includes('블로그') || combined.includes('네이버');
  const hasInsta = combined.includes('릴스') || combined.includes('인스타') || combined.includes('instagram') || combined.includes('reels') || combined.includes('insta');
  const hasClip = combined.includes('clip') || combined.includes('클립');

  // 2. Both Blog/Naver and Instagram/Reels (Requires explicit multiplatform tag or title)
  if (
    combined.includes('블로그+인스타') || combined.includes('인스타+블로그') ||
    combined.includes('블로그&인스타') || combined.includes('네이버+인스타') ||
    combined.includes('릴스+블로그') || combined.includes('블로그+릴스') ||
    combined.includes('블로그 및 인스타') || combined.includes('블로그와 인스타') ||
    (combined.includes('[블로그]') && combined.includes('[인스타]')) ||
    (combined.includes('[블로그]') && combined.includes('[릴스]'))
  ) {
    return 'blog+instagram';
  }

  // 3. TikTok
  if (combined.includes('틱톡') || combined.includes('tiktok')) return 'tiktok';

  // 4. Instagram / Reels
  if (hasInsta) {
    return 'instagram';
  }

  // 5. YouTube / Shorts
  if (combined.includes('쇼츠') || combined.includes('유튜브') || combined.includes('youtube') || combined.includes('shorts')) {
    return 'youtube';
  }

  // 6. Naver Clip / Blog
  if (hasBlog && hasClip) return 'blog+clip';
  if (hasClip) return 'clip';
  if (hasBlog) return 'blog';

  return 'blog';
};

export const detectCategory = (title: string, desc: string): string => classifyCampaignCategory(title, desc);

export const buildAutoKeywords = (title: string, desc: string): string => {
  const t = (title + ' ' + desc).toLowerCase();
  const keywords: string[] = [];
  if (t.includes('맛집') || t.includes('식당')) keywords.push('맛집');
  if (t.includes('삼겹살') || t.includes('한우') || t.includes('고기')) keywords.push('고기');
  if (t.includes('카페') || t.includes('디저트')) keywords.push('카페');
  if (t.includes('펜션') || t.includes('풀빌라')) keywords.push('펜션');
  return keywords.length > 0 ? `,${keywords.join(',')},` : '';
};

