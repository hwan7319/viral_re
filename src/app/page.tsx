'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Campaign } from '@/lib/db';

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
  filled?: boolean;
}

// SVG 아이콘 컴포넌트 모음 (IconProps 프로퍼티 타입 지원)
const Icons = {
  Search: ({ className, style }: IconProps = {}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: '1.25rem', height: '1.25rem', ...style }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
    </svg>
  ),
  Refresh: ({ className, style }: IconProps = {}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: '1.25rem', height: '1.25rem', ...style }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  Heart: ({ filled, className, style }: IconProps = {}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={{ width: '1.25rem', height: '1.25rem', ...style }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  ),
  MapPin: ({ className, style }: IconProps = {}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: '1rem', height: '1rem', display: 'inline-block', verticalAlign: 'text-bottom', ...style }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  ),
  ExternalLink: ({ className, style }: IconProps = {}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: '1rem', height: '1rem', ...style }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  ),
  Sun: ({ className, style }: IconProps = {}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: '1.25rem', height: '1.25rem', ...style }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M5.25 12h2.25m9 0h2.25m-11.25 6.75 1.5-1.5m9.75-9.75 1.5-1.5m-12.75 0 1.5 1.5m9.75 9.75 1.5 1.5M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
    </svg>
  ),
  Moon: ({ className, style }: IconProps = {}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: '1.25rem', height: '1.25rem', ...style }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  ),
  Close: ({ className, style }: IconProps = {}) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: '1.5rem', height: '1.5rem', ...style }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
};

// 🟢 네이버 블로그 공식 아이콘 컴포넌트 (초록 사각형 안의 흰색 B)
const NaverBlogIcon = ({ size = 16 }: { size?: number }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: '#03C75A',
    color: '#ffffff',
    fontWeight: 900,
    fontSize: `${size * 0.68}px`,
    borderRadius: `${Math.max(3, Math.floor(size * 0.25))}px`,
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    lineHeight: 1,
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(3, 199, 90, 0.35)',
    userSelect: 'none'
  }}>
    B
  </span>
);

// 🎬 네이버 클립 공식 클립(Paperclip) 아이콘 컴포넌트
const NaverClipIcon = ({ size = 16 }: { size?: number }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: '#03C75A',
    borderRadius: `${Math.max(3, Math.floor(size * 0.25))}px`,
    flexShrink: 0,
    boxShadow: '0 1px 3px rgba(3, 199, 90, 0.35)',
    userSelect: 'none'
  }}>
    <svg width={size * 0.68} height={size * 0.68} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  </span>
);

// 🎨 카테고리별 세련된 벡터 SVG 아이콘 매핑
const CategorySvgIcons: Record<string, React.ReactNode> = {
  'food-restaurant': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  ),
  'food-foreign': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 22 22 22 12 2" />
      <line x1="12" y1="6" x2="12" y2="18" />
    </svg>
  ),
  'food-cafe': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" />
    </svg>
  ),
  'food-pub': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 22h8M12 15v7M17 3l-5 7-5-7h10z" />
    </svg>
  ),
  'beauty-cosmetics': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  'beauty-salon': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
    </svg>
  ),
  'beauty-spa': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  'health-fitness': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h11M6.5 17.5h11M3 10v4M21 10v4M6.5 4v16M17.5 4v16" />
    </svg>
  ),
  'health-food': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 20.5l10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7zM8.5 8.5l7 7" />
    </svg>
  ),
  'accommodation': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16M2 8h20v12M2 17h20M6 8v9" />
    </svg>
  ),
  'travel': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3.5c-.5-.5-2.5 0-4 1.5L13.5 8.5 5.3 6.7c-.9-.2-1.8.3-2.1 1.2l-.4 1.3 5.4 3.2-3.3 3.3-2.7-.6-1.4 1.4 3.7 2.2 2.2 3.7 1.4-1.4-.6-2.7 3.3-3.3 3.2 5.4 1.3-.4c.9-.3 1.4-1.2 1.2-2.1z" />
    </svg>
  ),
  'culture': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <line x1="12" y1="6" x2="12" y2="18" strokeDasharray="2 2" />
    </svg>
  ),
  'fashion-clothing': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
    </svg>
  ),
  'fashion-accessory': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  'baby': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fb7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  ),
  'life-goods': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#84cc16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  'health-fresh': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    </svg>
  ),
  'life-appliances': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  'pet': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="16" r="4" />
      <circle cx="6" cy="9" r="2" />
      <circle cx="18" cy="9" r="2" />
      <circle cx="9" cy="4" r="2" />
      <circle cx="15" cy="4" r="2" />
    </svg>
  ),
  'book': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
    </svg>
  ),
  'hobby': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.71 1.7-1.63 0-.44-.18-.85-.46-1.16-.27-.31-.44-.73-.44-1.21 0-.92.78-1.7 1.7-1.7h2.5c2.76 0 5-2.24 5-5 0-5.5-4.5-10-10-10z" />
    </svg>
  ),
  'etc': (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// 🧼 출처 사이트 이름([레뷰 추천], [디너의여왕] 등) 중복 제거 헬퍼 함수
const sanitizeCampaignText = (text: string): string => {
  if (!text) return '';
  let cleaned = text;
  
  // [레뷰 추천], [레뷰], [디너의여왕], [강남맛집], [아싸뷰], [클라우드리뷰], [네이버쇼핑 기획전], [링블], [리뷰노트], [체험뷰] 등 출처 태그 패턴 제거
  cleaned = cleaned.replace(/^\[(레뷰|레뷰 추천|디너의여왕|강남맛집|강남|아싸뷰|클라우드리뷰|링블|네이버|네이버쇼핑|네이버쇼핑 기획전|뷰티|체험단|모집|리뷰노트|투잡커넥트|체험뷰|미블)[^\]]*\]\s*/gi, '');
  cleaned = cleaned.replace(/\[(레뷰|디너의여왕|강남맛집|아싸뷰|클라우드리뷰|링블|리뷰노트|투잡커넥트|체험뷰|미블)[^\]]*\]/gi, '');
  
  return cleaned.trim();
};

// 🎁 실제 구체적인 제공 혜택 텍스트 정제 헬퍼 함수
const sanitizeOfferDescription = (desc: string, title: string): string => {
  let cleaned = sanitizeCampaignText(desc);
  const cleanTitle = sanitizeCampaignText(title);

  if (!cleaned) return cleanTitle || '상세 제공 혜택 원본 참조';

  // 불필요한 관용성 수거 안구 문구 정제 (예: "가이드라인 참고 부탁드립니다!")
  cleaned = cleaned
    .replace(/가이드라인\s*참고.*$/gi, '')
    .replace(/상세정보\s*원본\s*참조.*$/gi, '')
    .trim();

  // D-day / 신청자수 등의 부모 카드 텍스트가 통째 오추출된 경우 필터링
  const isCardJunk = (cleaned.includes('신청') && cleaned.includes('모집')) || /^D-\d+/.test(cleaned);
  if (isCardJunk) {
    return cleanTitle || '상세 제공 혜택 원본 참조';
  }

  return cleaned || cleanTitle;
};

// 📋 실제 업체 미션 안내 헬퍼 함수
const generateRealMission = (title: string, platform: string, category: string, location?: string): string => {
  return '';
};

// 🧼 줄바꿈, 텍스트 정렬, 앞머리 기호 정밀 가독성 정제 엔진
const formatMissionText = (text: string): string => {
  if (!text) return '';
  let cleaned = text;

  // 0. 범용 플랫폼 템플릿 문구 자동 필터링 (업체 커스텀 미션만 정밀 추출)
  cleaned = cleaned
    .replace(/1\.\s*사진을 정성껏 다양하게 찍어 주세요\.?/g, '')
    .replace(/2\.\s*동영상을 포함하여 사진은 최소 15장 이상 사용해주세요\.?/g, '')
    .replace(/3\.\s*하단에 지도 위치 링크를 꼭 넣어주세요\.?/g, '')
    .replace(/4\.\s*텍스트 1,000자 이상 서술해주세요\.?/g, '')
    .replace(/5\.\s*리뷰 작성 시, 제목과 본문 내용에 지정된 키워드.*?\./g, '')
    .replace(/6\.\s*참고해 주세요\.?/g, '')
    .replace(/- 인스타, 페이스북 등 SNS에 함께 리뷰 가능하신 분들의 선정 확률이 더 높습니다\.?/g, '')
    .replace(/※ 캠페인 미션이 지켜지지 않을 시 수정 요청이 있을 수 있습니다\.?/g, '')
    .trim();

  if (!cleaned) return '';

  // 1. HTML 태그 정제 및 엔티티 치환
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');
  cleaned = cleaned.replace(/<\/(p|li|div|h[1-6])>/gi, '\n');
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned
    .replace(/&nbsp;/gi, ' ')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&');

  // 2. 부자연스러운 숫자/날짜 사이 중간 줄바꿈 복원
  cleaned = cleaned.replace(/([0-9]+\.[0-9]*)\n([0-9]+)/g, '$1$2');

  // 3. 줄 단위 분석 및 앞머리 기호 정제
  const lines = cleaned.split('\n');
  const formattedLines: string[] = [];

  for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;

    if (/^[•\-\*★✔◈※▶\s]+$/.test(trimmed)) continue;

    trimmed = trimmed.replace(/^([•\-\*★✔◈※▶]\s*)+/g, (match) => {
      const symbol = match.trim()[0];
      return symbol ? `${symbol} ` : '';
    });

    const hasPrefix = /^[0-9]+\.|\d+[\.\)]|^[•\-\*★✔◈※▶#]/.test(trimmed);
    if (!hasPrefix && trimmed.length > 2) {
      trimmed = `• ${trimmed}`;
    }

    formattedLines.push(trimmed);
  }

  let result = formattedLines.join('\n');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
};

const SIDO_QUICK_TABS = [
  { key: 'all', label: '전국' },
  { key: '서울', label: '서울' },
  { key: '경기', label: '경기' },
  { key: '인천', label: '인천' },
  { key: '부산', label: '부산' },
  { key: '대구', label: '대구' },
  { key: '광주', label: '광주' },
  { key: '대전', label: '대전' },
  { key: '울산', label: '울산' },
  { key: '강원', label: '강원' },
  { key: '충북', label: '충북' },
  { key: '충남', label: '충남' },
  { key: '전북', label: '전북' },
  { key: '전남', label: '전남' },
  { key: '경북', label: '경북' },
  { key: '경남', label: '경남' },
  { key: '제주', label: '제주' }
];

// 💻📱 상단 가로 롤링 배너 광고 샘플 슬라이드 데이터
const AD_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '화장품 & 에스테틱 프리미엄 뷰티 체험단 모집',
    desc: '신상 크림부터 유명 네일숍 왁싱케어권까지 무상 혜택 대모집!',
    link: 'https://viral-re.vercel.app'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '동네 한우 & 삼겹살 맛집 탐방단 모집',
    desc: '푸짐한 고기 식사권과 디저트 혜택! 맛집 블로거라면 지금 신청하세요.',
    link: 'https://viral-re.vercel.app'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '럭셔리 독채 풀빌라 무료 숙박권 찬스',
    desc: '이번 주말은 오션뷰 힐링! SNS 전용 여행 크리에이터 선착순 매칭 중입니다.',
    link: 'https://viral-re.vercel.app'
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '최신 IT 기기 / 이어폰 리뷰 원정대',
    desc: '아이패드 및 스마트폰 주변기기 무상 대여 체험 및 우수자 경품 증정!',
    link: 'https://viral-re.vercel.app'
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '가을 신상 데일리 캐주얼 패션 협찬',
    desc: '스타일리시한 니트와 아우터 무상 제공! 블로그 & 인스타 마케터 선착순 마감.',
    link: 'https://viral-re.vercel.app'
  }
];

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // ⏳ 실시간 글로벌 타임스탬프 동기화 카운트다운 타이머 (새로고침 F5 시에도 초시간 초기화 없음!)
  const SYNC_INTERVAL_SEC = 60;
  
  const setNextSyncTimestamp = useCallback(() => {
    const nextTarget = Date.now() + SYNC_INTERVAL_SEC * 1000;
    if (typeof window !== 'undefined') {
      localStorage.setItem('viral_re_next_sync_target', nextTarget.toString());
    }
    return nextTarget;
  }, []);

  const getRemainingSyncSeconds = useCallback(() => {
    if (typeof window === 'undefined') return SYNC_INTERVAL_SEC;
    let targetStr = localStorage.getItem('viral_re_next_sync_target');
    let target = targetStr ? parseInt(targetStr, 10) : 0;
    
    if (!target || isNaN(target)) {
      target = setNextSyncTimestamp();
    }
    
    const diffSec = Math.ceil((target - Date.now()) / 1000);
    return Math.max(0, diffSec);
  }, [setNextSyncTimestamp]);

  const [syncCountdown, setSyncCountdown] = useState<number>(SYNC_INTERVAL_SEC);
  const [isSyncingData, setIsSyncingData] = useState<boolean>(false);

  const triggerManualSync = useCallback(async () => {
    setIsSyncingData(true);
    setNextSyncTimestamp();
    try {
      const res = await fetch(`/api/campaigns?t=${Date.now()}`);
      const data = await res.json();
      const fetchedList = (data && (data.data || data.campaigns)) || [];

      if (Array.isArray(fetchedList) && fetchedList.length > 0) {
        setCampaigns(prevList => {
          // 🔑 스마트 인메모리 병합 (Smart Merge): 인플레이스 수치만 조용히 갱신
          const prevMap = new Map(prevList.map(item => [item.id, item]));
          return fetchedList.map(newItem => {
            const existing = prevMap.get(newItem.id);
            if (!existing) return newItem;
            return {
              ...existing,
              ...newItem,
              mission: newItem.mission || existing.mission,
              description: newItem.description || existing.description
            };
          });
        });
      }
    } catch (e) {
      console.warn('Auto sync failed:', e);
    } finally {
      setIsSyncingData(false);
      setSyncCountdown(SYNC_INTERVAL_SEC);
    }
  }, [setNextSyncTimestamp]);

  useEffect(() => {
    // 🔑 마운트 시점에 글로벌 타임스탬프 기준으로 남아있는 실제 초시간 즉시 계산
    setSyncCountdown(getRemainingSyncSeconds());

    const timer = setInterval(() => {
      const rem = getRemainingSyncSeconds();
      setSyncCountdown(rem);

      if (rem <= 0) {
        setNextSyncTimestamp();
        triggerManualSync();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [getRemainingSyncSeconds, setNextSyncTimestamp, triggerManualSync]);
  
  // 검색 & 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState(''); // 사용자가 타이핑 중인 입력창 상태
  const [isSearchFocused, setIsSearchFocused] = useState(false); // 검색창 포커스 여부
  const [currentTrendIndex, setCurrentTrendIndex] = useState(0); // 롤링 중인 검색어 인덱스
  const [isTrendDropdownOpen, setIsTrendDropdownOpen] = useState(false); // 실시간 검색어 팝업 여부
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true); // 최근 검색 기록 허용 여부
  const [isTypeOpen, setIsTypeOpen] = useState(false); // 모집유형 상세검색 아코디언 토글
  const [isPlatformOpen, setIsPlatformOpen] = useState(false); // 플랫폼 상세검색 아코디언 토글
  const [trendingKeywords, setTrendingKeywords] = useState<{ rank: number; word: string; isNew?: boolean }[]>([]); // 🔑 실시간 인기 검색어 상태
  const [activePlatform, setActivePlatform] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeLocation, setActiveLocation] = useState('all');
  const [selectedSido, setSelectedSido] = useState('all'); // 광역시도 선택 상태
  const [selectedSigungu, setSelectedSigungu] = useState('all'); // 시군구 선택 상태
  const [hoveredSido, setHoveredSido] = useState('all'); // 마우스 호버 중인 시도 상태
  const [isLocationOpen, setIsLocationOpen] = useState(false); // 지역 상세검색 아코디언 토글
  const [activeSite, setActiveSite] = useState('all');
  const [activeType, setActiveType] = useState('all'); // 'all' | 'visit' | 'delivery'

  const [isCategoryOpen, setIsCategoryOpen] = useState(false); // 카테고리 상세검색 아코디언 토글
  const [sortBy, setSortBy] = useState('latest');

  // 상세 모달 상태
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [isMissionLoading, setIsMissionLoading] = useState(false);

  // 🔍 상세 모달 오픈 시 각 사이트별 원본 상세 미션 가이드라인 실시간 스크레이핑 렌더링
  useEffect(() => {
    if (selectedCampaign && selectedCampaign.campaignUrl) {
      // 🔑 미션 데이터가 이미 존재하면 로딩 스피너를 보여주지 않고 즉시 0초 표출!
      if (!selectedCampaign.mission) {
        setIsMissionLoading(true);
      }

      fetch(`/api/campaign-detail?url=${encodeURIComponent(selectedCampaign.campaignUrl)}&targetSite=${encodeURIComponent(selectedCampaign.targetSite)}&id=${encodeURIComponent(selectedCampaign.id)}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const newApply = data.applyCount !== undefined ? data.applyCount : undefined;
            const newLimit = data.limitCount !== undefined ? data.limitCount : undefined;
            const newBenefit = data.realBenefit || undefined;
            const newMission = data.mission || undefined;

            setSelectedCampaign(prev => prev ? {
              ...prev,
              mission: newMission || prev.mission,
              description: (newBenefit && newBenefit !== prev.title) ? newBenefit : prev.description,
              applyCount: newApply !== undefined ? newApply : prev.applyCount,
              limitCount: newLimit !== undefined ? newLimit : prev.limitCount
            } : null);

            // 🔑 목록 카드 state (campaigns) 도 실시간 100% 동기화 갱신하여 목록 수치와 상세 수치 일치 보장!
            setCampaigns(prevList => prevList.map(item => {
              if (item.id === selectedCampaign.id) {
                return {
                  ...item,
                  mission: newMission || item.mission,
                  description: (newBenefit && newBenefit !== item.title) ? newBenefit : item.description,
                  applyCount: newApply !== undefined ? newApply : item.applyCount,
                  limitCount: newLimit !== undefined ? newLimit : item.limitCount
                };
              }
              return item;
            }));
          }
        })
        .catch(err => console.error('Failed to load detail mission:', err))
        .finally(() => setIsMissionLoading(false));
    }
  }, [selectedCampaign?.id]);
  
  // 모바일 하단 플로팅 앵커 광고 노출 상태
  const [showStickyAd, setShowStickyAd] = useState(true);

  // 우측 하단 탑 버튼(Scroll to Top) 노출 상태
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 스크롤 감지 및 탑 버튼 제어
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 💻📱 필터 hover 딜레이 타이머 (탭→패널 갭 통과시 닫힘 방지)
  const filterCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFilterAreaEnter = () => {
    if (filterCloseTimer.current) {
      clearTimeout(filterCloseTimer.current);
      filterCloseTimer.current = null;
    }
  };

  const handleFilterAreaLeave = () => {
    filterCloseTimer.current = setTimeout(() => {
      setIsTypeOpen(false);
      setIsCategoryOpen(false);
      setIsPlatformOpen(false);
      setIsLocationOpen(false);
    }, 350);
  };

  // 💻📱 실시간 검색어 팝업 hover 딜레이 타이머
  const trendCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTrendAreaEnter = () => {
    if (trendCloseTimer.current) {
      clearTimeout(trendCloseTimer.current);
      trendCloseTimer.current = null;
    }
    setIsTrendDropdownOpen(true);
  };

  const handleTrendAreaLeave = () => {
    trendCloseTimer.current = setTimeout(() => {
      setIsTrendDropdownOpen(false);
    }, 250);
  };

  // 💻📱 필터바 & 상세 패널 통합 렌더러 (얇은 알약 칩셋 + 1회 클릭 호출 바텀시트)
  const renderFilterContainer = () => {
    return (
      <div 
        className="filter-container-wrap"
        style={{ width: '100%', position: 'relative', zIndex: (isTypeOpen || isCategoryOpen || isPlatformOpen || isLocationOpen) ? 8000 : 100, marginBottom: '28px', textAlign: 'left' }}
        onMouseEnter={handleFilterAreaEnter}
        onMouseLeave={handleFilterAreaLeave}
      >
        {/* 💻📱 모바일용 바텀시트 딤드 오버레이 (자식 노드 편입) */}
        {(isTypeOpen || isCategoryOpen || isPlatformOpen || isLocationOpen) && (
          <div 
            className="mobile-backdrop"
            onClick={() => {
              setIsTypeOpen(false);
              setIsCategoryOpen(false);
              setIsPlatformOpen(false);
              setIsLocationOpen(false);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(2px)',
              zIndex: 900,
              display: 'none'
            }}
          />
        )}
        {/* 탭바 영역 */}
        <div className="filter-bar-wrap" style={{ marginTop: '0', position: 'relative', zIndex: 2100 }}>
          <div className="filter-bar-scroll" style={{ justifyContent: 'flex-start' }}>
            
            {/* 1. 모집 유형 탭 */}
            <button
              type="button"
              className={`filter-tab ${isTypeOpen || activeType !== 'all' ? 'active' : ''}`}
              onMouseEnter={() => {
                handleFilterAreaEnter();
                setIsTypeOpen(true);
                setIsCategoryOpen(false);
                setIsPlatformOpen(false);
                setIsLocationOpen(false);
              }}
              onClick={() => handleTabClick('type')}
            >
              <span className="filter-tab-img">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-type)' }}>
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M7 8h10M7 12h10M7 16h6" />
                  <defs>
                    <linearGradient id="grad-type" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span>
                {activeType === 'all' ? '모집 유형' :
                  activeType === 'visit' ? '방문형' : '배송형'}
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isTypeOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* 2. 카테고리 탭 */}
            <button
              type="button"
              className={`filter-tab ${isCategoryOpen || activeCategory !== 'all' ? 'active' : ''}`}
              onMouseEnter={() => {
                handleFilterAreaEnter();
                setIsCategoryOpen(true);
                setIsTypeOpen(false);
                setIsPlatformOpen(false);
                setIsLocationOpen(false);
              }}
              onClick={() => handleTabClick('category')}
            >
              <span className="filter-tab-img">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-cat)' }}>
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <defs>
                    <linearGradient id="grad-cat" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span>
                {activeCategory === 'all' ? '카테고리' :
                  activeCategory === 'food-restaurant' ? '한식/맛집' :
                  activeCategory === 'food-foreign' ? '양식/일식/중식' :
                  activeCategory === 'food-cafe' ? '카페/디저트' :
                  activeCategory === 'food-pub' ? '술집/주점' :
                  activeCategory === 'beauty-cosmetics' ? '화장품' :
                  activeCategory === 'beauty-salon' ? '헤어/네일' :
                  activeCategory === 'beauty-spa' ? '피부/에스테틱' :
                  activeCategory === 'health-fitness' ? '헬스/피트니스' :
                  activeCategory === 'health-food' ? '영양제/건강식품' :
                  activeCategory === 'accommodation' ? '숙박' :
                  activeCategory === 'travel' ? '여행/레저' :
                  activeCategory === 'culture' ? '문화/공연' :
                  activeCategory === 'fashion-clothing' ? '의류/패션' :
                  activeCategory === 'fashion-accessory' ? '패션잡화' :
                  activeCategory === 'baby' ? '유아/육아' :
                  activeCategory === 'life-goods' ? '생활용품' :
                  activeCategory === 'health-fresh' ? '밀키트/식품' :
                  activeCategory === 'life-appliances' ? '가전/디지털' :
                  activeCategory === 'pet' ? '반려동물' :
                  activeCategory === 'book' ? '도서/교육' :
                  activeCategory === 'hobby' ? '취미/클래스' : '기타'}
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isCategoryOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* 3. 플랫폼 탭 */}
            <button
              type="button"
              className={`filter-tab ${isPlatformOpen || activePlatform !== 'all' ? 'active' : ''}`}
              onMouseEnter={() => {
                handleFilterAreaEnter();
                setIsPlatformOpen(true);
                setIsTypeOpen(false);
                setIsCategoryOpen(false);
                setIsLocationOpen(false);
              }}
              onClick={() => handleTabClick('platform')}
            >
              <span className="filter-tab-img">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-plat)' }}>
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  <defs>
                    <linearGradient id="grad-plat" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span>
                {activePlatform === 'all' ? '플랫폼' :
                  activePlatform === 'blog' ? '네이버 블로그' :
                  activePlatform === 'clip' ? '네이버 클립' :
                  activePlatform === 'instagram' ? '인스타그램' :
                  activePlatform === 'youtube' ? '유튜브' : '기타'}
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isPlatformOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* 4. 지역 탭 */}
            <button
              type="button"
              className={`filter-tab ${isLocationOpen || activeLocation !== 'all' ? 'active' : ''}`}
              onMouseEnter={() => {
                handleFilterAreaEnter();
                setIsLocationOpen(true);
                setIsTypeOpen(false);
                setIsCategoryOpen(false);
                setIsPlatformOpen(false);
              }}
              onClick={() => handleTabClick('location')}
            >
              <span className="filter-tab-img">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-loc)' }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                  <defs>
                    <linearGradient id="grad-loc" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
              <span>
                {activeLocation === 'all' ? '지역 검색' :
                  selectedSigungu !== 'all' ? `${selectedSido} ${selectedSigungu}` : selectedSido}
              </span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isLocationOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>

            {/* 전체 초기화 단추 */}
            {(activeType !== 'all' || activeCategory !== 'all' || activePlatform !== 'all' || activeLocation !== 'all') && (
              <button
                type="button"
                className="filter-tab"
                onClick={() => {
                  setActiveType('all'); setActiveCategory('all'); setActivePlatform('all');
                  setActiveLocation('all'); setSelectedSido('all'); setSelectedSigungu('all');
                  setIsTypeOpen(false); setIsCategoryOpen(false); setIsPlatformOpen(false); setIsLocationOpen(false);
                }}
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              >
                <span>초기화</span>
              </button>
            )}
          </div>
        </div>

        {/* 모집 유형 상세 패널 */}
        {isTypeOpen && (
          <div className="filter-panel-wrap" style={{ display: 'flex', justifyContent: 'flex-start' }} onMouseEnter={handleFilterAreaEnter}>
            <div className="filter-chip-row" style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {[
                { 
                  key: 'all', 
                  label: '전체 유형', 
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-all-type)' }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M21 12H3M12 3v18" />
                      <defs><linearGradient id="grad-all-type" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#4f46e5" /><stop offset="100%" stopColor="#06b6d4" /></linearGradient></defs>
                    </svg>
                  )
                },
                { 
                  key: 'visit', 
                  label: '방문형', 
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-visit)' }}>
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                      <defs><linearGradient id="grad-visit" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                    </svg>
                  )
                },
                { 
                  key: 'delivery', 
                  label: '배송형', 
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-delivery)' }}>
                      <rect x="1" y="3" width="15" height="13" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                      <defs><linearGradient id="grad-delivery" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                    </svg>
                  )
                }
              ].map(t => (
                <button type="button" key={t.key} className={`filter-desktop-icon ${activeType === t.key ? 'active' : ''}`} onClick={() => { setActiveType(activeType === t.key ? 'all' : t.key); setIsTypeOpen(false); }}>
                  <span className="filter-desktop-icon-img">{t.icon}</span>
                  <span className="filter-desktop-icon-text">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 카테고리 상세 패널 */}
        {isCategoryOpen && (
          <div className="filter-panel-wrap" onMouseEnter={handleFilterAreaEnter}>
            <div className="filter-chip-row" style={{ maxWidth: '1200px', margin: '0 auto', justifyContent: 'flex-start', gap: '20px' }}>
              {/* 맛집/음식 */}
              <div style={{ width: '100%', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  🍽️ 맛집 / 디저트 / 주점
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'flex-start' }}>
                  {[
                    { key: 'food-restaurant', label: '한식/맛집' },
                    { key: 'food-foreign', label: '양식/일식/중식' },
                    { key: 'food-cafe', label: '카페/디저트' },
                    { key: 'food-pub', label: '술집/주점' },
                  ].map(c => (
                    <button type="button" key={c.key} className={`filter-desktop-icon ${activeCategory === c.key ? 'active' : ''}`} onClick={() => { setActiveCategory(activeCategory === c.key ? 'all' : c.key); setIsCategoryOpen(false); }}>
                      <span className="filter-desktop-icon-img">{CategorySvgIcons[c.key]}</span>
                      <span className="filter-desktop-icon-text">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* 뷰티/미용/헬스 */}
              <div style={{ width: '100%', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  ✨ 뷰티 / 미용 / 헬스
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'flex-start' }}>
                  {[
                    { key: 'beauty-cosmetics', label: '화장품/스킨케어' },
                    { key: 'beauty-salon', label: '헤어/네일/속눈썹' },
                    { key: 'beauty-spa', label: '피부/에스테틱' },
                    { key: 'health-fitness', label: '헬스/피트니스' },
                    { key: 'health-food', label: '영양제/건강식품' },
                  ].map(c => (
                    <button type="button" key={c.key} className={`filter-desktop-icon ${activeCategory === c.key ? 'active' : ''}`} onClick={() => { setActiveCategory(activeCategory === c.key ? 'all' : c.key); setIsCategoryOpen(false); }}>
                      <span className="filter-desktop-icon-img">{CategorySvgIcons[c.key]}</span>
                      <span className="filter-desktop-icon-text">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* 여행/숙박/문화 */}
              <div style={{ width: '100%', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  🧭 여행 / 숙박 / 문화
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'flex-start' }}>
                  {[
                    { key: 'accommodation', label: '숙박 (호텔/펜션)' },
                    { key: 'travel', label: '여행/레저/관광' },
                    { key: 'culture', label: '문화/공연/전시' },
                  ].map(c => (
                    <button type="button" key={c.key} className={`filter-desktop-icon ${activeCategory === c.key ? 'active' : ''}`} onClick={() => { setActiveCategory(activeCategory === c.key ? 'all' : c.key); setIsCategoryOpen(false); }}>
                      <span className="filter-desktop-icon-img">{CategorySvgIcons[c.key]}</span>
                      <span className="filter-desktop-icon-text">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* 패션/생활/디지털/기타 */}
              <div style={{ width: '100%', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  🛍️ 패션 / 생활 / 디지털 / 펫 / 기타
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'flex-start' }}>
                  {[
                    { key: 'fashion-clothing', label: '의류/패션' },
                    { key: 'fashion-accessory', label: '신발/가방/잡화' },
                    { key: 'baby', label: '유아동/육아' },
                    { key: 'life-goods', label: '생활용품/인테리어' },
                    { key: 'health-fresh', label: '밀키트/신선식품' },
                    { key: 'life-appliances', label: '가전/디지털' },
                    { key: 'pet', label: '반려동물/애견' },
                    { key: 'book', label: '도서/교육' },
                    { key: 'hobby', label: '취미/클래스' },
                    { key: 'etc', label: '기타' },
                  ].map(c => (
                    <button type="button" key={c.key} className={`filter-desktop-icon ${activeCategory === c.key ? 'active' : ''}`} onClick={() => { setActiveCategory(activeCategory === c.key ? 'all' : c.key); setIsCategoryOpen(false); }}>
                      <span className="filter-desktop-icon-img">{CategorySvgIcons[c.key]}</span>
                      <span className="filter-desktop-icon-text">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 플랫폼 상세 패널 */}
        {isPlatformOpen && (
          <div className="filter-panel-wrap" onMouseEnter={handleFilterAreaEnter}>
            <div className="filter-chip-row" style={{ display: 'flex', gap: '16px', justifyContent: 'flex-start', flexWrap: 'wrap' }}>
              {[
                { 
                  key: 'all', 
                  label: '전체 플랫폼', 
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-all-plat)' }}>
                      <circle cx="12" cy="12" r="10" />
                      <path d="M8 12h8M12 8v8" />
                      <defs><linearGradient id="grad-all-plat" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
                    </svg>
                  )
                },
                { 
                  key: 'blog', 
                  label: '네이버 블로그', 
                  icon: <NaverBlogIcon size={26} />
                },
                { 
                  key: 'clip', 
                  label: '네이버 클립', 
                  icon: <NaverClipIcon size={26} />
                },
                { 
                  key: 'instagram', 
                  label: '인스타그램', 
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-insta11)' }}>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      <defs><linearGradient id="grad-insta11" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f9ce71" /><stop offset="50%" stopColor="#ee2a7b" /><stop offset="100%" stopColor="#6228d7" /></linearGradient></defs>
                    </svg>
                  )
                },
                { 
                  key: 'youtube', 
                  label: '유튜브', 
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-youtube-plat)' }}>
                      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
                      <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" />
                      <defs><linearGradient id="grad-youtube-plat" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FF0000" /><stop offset="100%" stopColor="#cc0000" /></linearGradient></defs>
                    </svg>
                  )
                },
                { 
                  key: 'etc', 
                  label: '기타 플랫폼', 
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-plat-etc)' }}>
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                      <defs><linearGradient id="grad-plat-etc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#9ca3af" /><stop offset="100%" stopColor="#4b5563" /></linearGradient></defs>
                    </svg>
                  )
                }
              ].map(p => (
                <button type="button" key={p.key} className={`filter-desktop-icon ${activePlatform === p.key ? 'active' : ''}`} onClick={() => { setActivePlatform(activePlatform === p.key ? 'all' : p.key); setIsPlatformOpen(false); }}>
                  <span className="filter-desktop-icon-img">
                    {p.icon}
                  </span>
                  <span className="filter-desktop-icon-text">{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 지역 상세 패널 */}
        {isLocationOpen && (
          <div className="filter-panel-wrap" onMouseEnter={handleFilterAreaEnter}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div className="region-two-col">
                {/* 좌: 시도 목록 */}
                <div className="region-sido-list" onMouseLeave={() => setHoveredSido(selectedSido !== 'all' ? selectedSido : 'all')}>
                  <button
                    type="button"
                    className={`region-sido-btn ${selectedSido === 'all' ? 'active' : ''}`}
                    onClick={() => { setSelectedSido('all'); setSelectedSigungu('all'); setIsLocationOpen(false); }}
                  >
                    전국
                  </button>
                  {[
                    '서울','경기','인천','부산','대구','대전','광주','울산','강원',
                    '충북','충남','전북','전남','경북','경남','제주','세종'
                  ].map(sido => (
                    <button
                      type="button"
                      key={sido}
                      className={`region-sido-btn ${selectedSido === sido ? 'active' : ''}`}
                      onMouseEnter={() => setHoveredSido(sido)}
                      onClick={() => {
                        setSelectedSido(sido);
                        setSelectedSigungu('all');
                        if (!LOCATIONS_MAP[sido] || LOCATIONS_MAP[sido].length === 0) {
                          setIsLocationOpen(false);
                        }
                      }}
                    >
                      {sido}
                    </button>
                  ))}
                </div>
                {/* 우: 시군구 칩 */}
                <div className="region-sigungu-wrap" style={{ justifyContent: 'flex-start' }}>
                  <div style={{ width: '100%', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '1.2rem' }}>📍</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {hoveredSido !== 'all' ? hoveredSido : selectedSido === 'all' ? '전국' : selectedSido} 지역 상세 설정
                    </span>
                  </div>
                  {(hoveredSido !== 'all' && LOCATIONS_MAP[hoveredSido]?.length > 0
                    ? LOCATIONS_MAP[hoveredSido]
                    : selectedSido !== 'all' && LOCATIONS_MAP[selectedSido]?.length > 0
                      ? LOCATIONS_MAP[selectedSido]
                      : []
                  ).length > 0 ? (
                    <>
                      <button
                        type="button"
                        className={`filter-chip ${selectedSigungu === 'all' ? 'active' : ''}`}
                        style={{ fontSize: '0.82rem', padding: '5px 12px' }}
                        onClick={() => { setSelectedSigungu('all'); setIsLocationOpen(false); }}
                      >
                        {hoveredSido !== 'all' ? hoveredSido : selectedSido} 전체
                      </button>
                      {(hoveredSido !== 'all' && LOCATIONS_MAP[hoveredSido]?.length > 0
                        ? LOCATIONS_MAP[hoveredSido]
                        : LOCATIONS_MAP[selectedSido] || []
                      ).map(sigungu => (
                        <button
                          type="button"
                          key={sigungu}
                          className={`filter-chip ${selectedSigungu === sigungu && selectedSido === (hoveredSido !== 'all' ? hoveredSido : selectedSido) ? 'active' : ''}`}
                          style={{ fontSize: '0.82rem', padding: '5px 12px' }}
                          onClick={() => {
                            const targetSido = hoveredSido !== 'all' ? hoveredSido : selectedSido;
                            setSelectedSido(targetSido);
                            setSelectedSigungu(sigungu);
                            setIsLocationOpen(false);
                          }}
                        >
                          {sigungu}
                        </button>
                      ))}
                    </>
                  ) : (
                    <div style={{ padding: '24px 16px', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                      좌측에서 지역을 선택하세요
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 필터 외부 영역 클릭 시 드롭다운 닫기 핸들러
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.filter-container-wrap')) {
        setIsTypeOpen(false);
        setIsCategoryOpen(false);
        setIsPlatformOpen(false);
        setIsLocationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleTabClick = (tab: 'type' | 'category' | 'platform' | 'location') => {
    setIsTypeOpen(tab === 'type' ? !isTypeOpen : false);
    setIsCategoryOpen(tab === 'category' ? !isCategoryOpen : false);
    setIsPlatformOpen(tab === 'platform' ? !isPlatformOpen : false);
    setIsLocationOpen(tab === 'location' ? !isLocationOpen : false);
  };

  // 상단 광고 캐러셀 인덱스 상태
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // 상단 광고 자동 롤링 효과 (4초 간격)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % AD_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // 🔒 상세 모달 팝업 오픈 시 배경 스크롤 고정 및 슬라이드 방지
  useEffect(() => {
    if (selectedCampaign) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedCampaign]);

  const handlePrevAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentAdIndex((prev) => (prev - 1 + AD_SLIDES.length) % AD_SLIDES.length);
  };

  const handleNextAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentAdIndex((prev) => (prev + 1) % AD_SLIDES.length);
  };

  // 다크모드 상태
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // 소셜 로그인 및 사용자 세션 상태
  const [user, setUser] = useState<{ name: string; email: string; avatar: string; provider: string } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // 프론트엔드 성능 최적화: 초기 노출 카드 제한 및 더보기 페이징
  const [visibleCount, setVisibleCount] = useState(12);

  // 🔑 키워드마스터 모달 및 분석 데이터 상태
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [keywordQuery, setKeywordQuery] = useState('');
  const [keywordData, setKeywordData] = useState<any>(null);
  const [isKeywordLoading, setIsKeywordLoading] = useState(false);
  const [keywordSortField, setKeywordSortField] = useState<'rank' | 'keyword' | 'volume' | 'posts' | 'ratio' | 'date'>('rank');
  const [keywordSortOrder, setKeywordSortOrder] = useState<'asc' | 'desc'>('asc');

  // 🔑 키워드마스터 결과 동적 정렬 (검색량순, 포스팅순, 황금키워드순, 기본순위순)
  const processedRelatedKeywords = useMemo(() => {
    if (!keywordData || !keywordData.relatedKeywords) return [];
    const list = [...keywordData.relatedKeywords];
    list.sort((a: any, b: any) => {
      let valA: any = a[keywordSortField];
      let valB: any = b[keywordSortField];

      if (keywordSortField === 'rank') {
        valA = a.rank;
        valB = b.rank;
      } else if (keywordSortField === 'keyword') {
        valA = a.keyword;
        valB = b.keyword;
      } else if (keywordSortField === 'volume') {
        valA = a.totalSearchVolume;
        valB = b.totalSearchVolume;
      } else if (keywordSortField === 'posts') {
        valA = a.totalPosts;
        valB = b.totalPosts;
      } else if (keywordSortField === 'ratio') {
        valA = a.competitionRatio;
        valB = b.competitionRatio;
      } else if (keywordSortField === 'date') {
        valA = a.recentDate;
        valB = b.recentDate;
      }

      if (typeof valA === 'string') {
        return keywordSortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return keywordSortOrder === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [keywordData, keywordSortField, keywordSortOrder]);

  // ⚡ 키워드마스터 지표 클릭 도움말 툴팁 팝업 상태 (volume, ratio)
  const [activeKeywordGuideTooltip, setActiveKeywordGuideTooltip] = useState<'volume' | 'ratio' | null>(null);

  // ⚡ 네이버 실시간 급상승 키워드 1분 자동 동기화 상태 (키워드마스터 전용)
  const [liveTrendingList, setLiveTrendingList] = useState<any[]>([]);
  const [lastTrendingUpdate, setLastTrendingUpdate] = useState<string>('');

  const fetchLiveTrending = useCallback(async () => {
    try {
      const res = await fetch('/api/naver-trending');
      const json = await res.json();
      if (json.success && json.data) {
        setLiveTrendingList(json.data);
        setLastTrendingUpdate(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (e) {
      console.warn('Failed to fetch naver trending keywords:', e);
    }
  }, []);

  useEffect(() => {
    fetchLiveTrending();
    const interval = setInterval(() => {
      fetchLiveTrending();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchLiveTrending]);

  // 🔒 모달 오픈 시 배경 윈도우 스크롤 차단 (Body Scroll Lock)
  useEffect(() => {
    if (isKeywordModalOpen || selectedCampaign || isLoginModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isKeywordModalOpen, selectedCampaign, isLoginModalOpen]);

  // 키워드 연관검색어 100위 더보기 상태 (기본 20개 노출)
  const [relatedVisibleCount, setRelatedVisibleCount] = useState(20);

  // 키워드 분석 실행 함수
  const analyzeKeyword = async (targetQuery: string) => {
    const q = targetQuery.trim();
    if (!q) return;
    setKeywordQuery(q);
    setRelatedVisibleCount(20);
    setIsKeywordLoading(true);
    setIsKeywordModalOpen(true);

    try {
      const res = await fetch(`/api/keyword?query=${encodeURIComponent(q)}`);
      const json = await res.json();
      if (json.success) {
        setKeywordData(json.data);
      } else {
        showToast(json.error || '키워드 분석에 실패했습니다.', 'error');
      }
    } catch (e: any) {
      showToast('키워드 분석 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsKeywordLoading(false);
    }
  };

  // 공고 제목에서 핵심 키워드 정제 추출 함수
  const extractCoreKeyword = (title: string) => {
    return title
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .replace(/신청하기|보러가기|체험단|포토체험단|즉시제공|랜덤픽/g, '')
      .trim()
      .split(/\s+/)[0] || title;
  };

  // 🔑 무한 스크롤(Infinite Scroll) - IntersectionObserver Callback Ref 및 윈도우 스크롤 이중 이중 보장
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMoreRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();

    if (node) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCount((prev) => prev + 12);
          }
        },
        { threshold: 0, rootMargin: '600px' }
      );
      observerRef.current.observe(node);
    }
  }, []);

  // 윈도우 스크롤 감지 백업 보장 (다양한 브라우저 환경 및 스크롤바 조작 시 즉각 반응)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const handleScroll = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 700) {
          setVisibleCount((prev) => prev + 12);
        }
      }, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 검색 히스토리 상태
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [placeholderText, setPlaceholderText] = useState('식당명, 제품명, 지역명 등을 검색해보세요');

  // 모바일 화면 크기에 따라 검색창 플레이스홀더 문구 반응형 최적화
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setPlaceholderText('식당, 제품, 지역명 검색');
      } else {
        setPlaceholderText('식당명, 제품명, 지역명 등을 검색해보세요');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 광역시도/시군구 선택이 바뀔 때 activeLocation 상태 동기화 처리
  useEffect(() => {
    if (selectedSido === 'all') {
      setActiveLocation('all');
    } else {
      if (selectedSigungu === 'all') {
        setActiveLocation(selectedSido);
      } else {
        setActiveLocation(`${selectedSido} ${selectedSigungu}`);
      }
    }
  }, [selectedSido, selectedSigungu]);

  // 컴포넌트 마운트 시 초기 설정
  useEffect(() => {
    // 테마 설정 가져오기
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // 최근 검색어 가져오기
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
    }

    // 최근 검색 저장 여부 가져오기
    const savedHistoryEnabled = localStorage.getItem('isHistoryEnabled');
    if (savedHistoryEnabled !== null) {
      setIsHistoryEnabled(savedHistoryEnabled === 'true');
    }



    fetchTrendingKeywords();
    fetchCampaigns();

    // 🔑 소셜 로그인 가상 세션 메신저 리스너 등록 + 백엔드 DB 세션 연동
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'MOCK_LOGIN_SUCCESS') {
        const loggedUser = event.data.user;
        
        try {
          // 1. 소셜 ID 임의 고유 생성 (이메일 기반)
          const mockId = `${loggedUser.provider.toLowerCase()}_${loggedUser.email.replace(/[^a-zA-Z0-9]/g, '')}`;
          
          // 2. 백엔드 DB에 세션 등록/가입 호출
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: mockId,
              name: loggedUser.name,
              email: loggedUser.email,
              avatar: loggedUser.avatar,
              provider: loggedUser.provider
            })
          });
          
          const result = await res.json();
          if (result.success) {
            setUser(result.user);
            setIsLoginModalOpen(false);
            showToast(`${result.user.name}님, 성공적으로 로그인되었습니다 (회원 DB 연동 완료)`, 'success');
          } else {
            showToast('회원 세션 등록에 실패했습니다.', 'error');
          }
        } catch (error) {
          console.error(error);
          showToast('회원 연동 중 오류가 발생했습니다.', 'error');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 🔑 소셜 로그인 팝업 창 트리거 및 가상 흐름 연출
  const handleSocialLogin = (provider: string) => {
    const mockProfiles: Record<string, { name: string; email: string; avatar: string }> = {
      google: {
        name: '홍길동 (Google)',
        email: 'gildong.hong@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
      },
      naver: {
        name: '네이버 사용자',
        email: 'naver_user@naver.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
      },
      kakao: {
        name: '라이언 (Kakao)',
        email: 'ryan.kakao@kakao.com',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80'
      },
      instagram: {
        name: '인플루언서 (Insta)',
        email: 'influencer@instagram.com',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80'
      }
    };

    // 🔑 4대 소셜 로그인 실 API 공식 OAuth2 연동 대응 (각 소셜의 인가 코드 요청 주소로 진짜 팝업창 열기)
    if (provider === 'kakao' || provider === 'naver' || provider === 'google' || provider === 'instagram') {
      let authUrl = '';
      let windowName = '';
      
      if (provider === 'kakao') {
        const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || 'your_kakao_client_id';
        const redirectUri = encodeURIComponent('http://localhost:3030/api/auth/callback/kakao');
        authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
        windowName = 'KakaoSocialLogin';
      } else if (provider === 'naver') {
        const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || 'your_naver_client_id';
        const redirectUri = encodeURIComponent('http://localhost:3030/api/auth/callback/naver');
        authUrl = `https://nid.naver.com/oauth2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=naver_state`;
        windowName = 'NaverSocialLogin';
      } else if (provider === 'google') {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your_google_client_id';
        const redirectUri = encodeURIComponent('http://localhost:3030/api/auth/callback/google');
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email`;
        windowName = 'GoogleSocialLogin';
      } else if (provider === 'instagram') {
        const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID || 'your_instagram_client_id';
        const redirectUri = encodeURIComponent('http://localhost:3030/api/auth/callback/instagram');
        authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
        windowName = 'InstagramSocialLogin';
      }

      const popup = window.open(
        authUrl,
        windowName,
        'width=460,height=580,top=150,left=150,resizable=no,scrollbars=no,status=no'
      );
      if (!popup) {
        showToast('팝업 차단이 감지되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    const selected = mockProfiles[provider];
    const popup = window.open(
      '',
      'MockSocialLogin',
      'width=460,height=580,top=150,left=150,resizable=no,scrollbars=no,status=no'
    );

    if (!popup) {
      showToast('팝업 차단이 감지되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
      return;
    }

    const providerNames: Record<string, string> = {
      google: 'Google',
      naver: 'Naver',
      kakao: 'KakaoTalk',
      instagram: 'Instagram'
    };
    const providerColors: Record<string, string> = {
      google: '#ffffff',
      naver: '#03c75a',
      kakao: '#fee500',
      instagram: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #bc1888)'
    };
    const textColors: Record<string, string> = {
      google: '#3c4043',
      naver: '#ffffff',
      kakao: '#191919',
      instagram: '#ffffff'
    };

    const popupHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${providerNames[provider]} 소셜 로그인</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
          }
          .container {
            text-align: center;
            padding: 30px;
            border-radius: 20px;
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            max-width: 360px;
            width: 80%;
          }
          .logo {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: ${providerColors[provider]};
            color: ${textColors[provider]};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 800;
            margin: 0 auto 24px;
            box-shadow: 0 0 20px rgba(255,255,255,0.1);
          }
          .spinner {
            width: 36px;
            height: 36px;
            border: 4px solid rgba(255,255,255,0.1);
            border-top: 4px solid #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 {
            font-size: 1.25rem;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          p {
            color: #94a3b8;
            font-size: 0.85rem;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">${providerNames[provider][0]}</div>
          
          <!-- 1. 로딩 스테이지 -->
          <div id="loadingStage">
            <h2>${providerNames[provider]} 연동 중</h2>
            <p>보안 세션을 생성하고 있습니다...</p>
            <div class="spinner"></div>
          </div>

          <!-- 2. 실제 데이터 입력 폼 스테이지 (기본 숨김) -->
          <div id="formStage" style="display: none; animation: fadeIn 0.3s ease-out;">
            <h2>${providerNames[provider]} 연동 성공</h2>
            <p style="margin-bottom: 20px; font-size: 0.8rem; color: #94a3b8;">사용하실 정보를 직접 기입해 주세요.</p>
            
            <div style="text-align: left;">
              <label style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 6px; font-weight: 700;">사용자 이름 / 닉네임</label>
              <input type="text" id="userName" value="${selected.name}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #1e293b; color: #fff; box-sizing: border-box; margin-bottom: 12px; outline: none; font-size: 0.9rem;" />
              
              <label style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 6px; font-weight: 700;">이메일 주소</label>
              <input type="email" id="userEmail" value="${selected.email}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #1e293b; color: #fff; box-sizing: border-box; margin-bottom: 20px; outline: none; font-size: 0.9rem;" />
            </div>

            <button id="btnSubmit" style="width: 100%; padding: 12px; border-radius: 8px; background: #6366f1; color: #fff; font-weight: 700; border: none; cursor: pointer; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(99,102,241,0.3);">
              간편 로그인 완료하기
            </button>
          </div>

        </div>
        <script>
          // 1.2초 후 폼 스테이지로 스위칭
          setTimeout(() => {
            document.getElementById('loadingStage').style.display = 'none';
            document.getElementById('formStage').style.display = 'block';
          }, 1200);

          // 완료 제출 이벤트 바인딩
          const btn = document.getElementById('btnSubmit');
          btn.addEventListener('click', () => {
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            
            if (!name || !email) {
              alert('이름과 이메일을 모두 입력해 주세요.');
              return;
            }

            window.opener.postMessage({
              type: 'MOCK_LOGIN_SUCCESS',
              user: {
                name: name,
                email: email,
                avatar: '${selected.avatar}',
                provider: '${providerNames[provider]}'
              }
            }, '*');
            window.close();
          });
        </script>
      </body>
      </html>
    `;

    popup.document.write(popupHtml);
    popup.document.close();
  };

  // 테마 변경 토글
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // 🔑 실시간 인기 검색어 패칭
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false); // 마운팅 체크용 빈 상태

  const fetchTrendingKeywords = async () => {
    try {
      const res = await fetch('/api/trending');
      const result = await res.json();
      if (result.success) {
        setTrendingKeywords(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch trending keywords:', error);
    }
  };

  // 캠페인 데이터 패칭
  const fetchCampaigns = async () => {
    setLoading(true);
    fetchTrendingKeywords(); // 검색 조회 시 실시간 인기 검색어 통계도 자동 갱신
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        platform: activePlatform,
        category: activeCategory,
        location: activeLocation,
        targetSite: 'all', // 수집처별 제외 요구사항에 의거하여 항상 'all'로 고정 전달
        sortBy: sortBy,
        type: activeType,
      });

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      const result = await res.json();
      
      if (result.success) {
        setCampaigns(result.data);
        setVisibleCount(12); // 필터 변경 시 1페이지부터 노출되도록 초기화

        // 🔑 백그라운드 수집이 유발된 경우 2.2초 뒤 무소음 화면 갱신 실행 (Non-blocking UX)
        if (result.isCrawlingTriggered) {
          showToast('신규 체험단을 실시간 매칭하는 중입니다... 잠시만 기다려주세요.', 'info');
          setTimeout(async () => {
            try {
              const resSilent = await fetch(`/api/campaigns?${params.toString()}`);
              const resultSilent = await resSilent.json();
              if (resultSilent.success) {
                setCampaigns(resultSilent.data);
                showToast('실시간 신규 체험단 매칭이 완료되었습니다!', 'success');
              }
            } catch (err) {
              console.error('Silent refetch failed:', err);
            }
          }, 2200);
        }
      } else {
        showToast('데이터를 가져오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 검색 및 필터 파라미터가 변경될 때마다 자동 페칭
  useEffect(() => {
    fetchCampaigns();
  }, [searchTerm, activePlatform, activeCategory, activeLocation, activeType, sortBy]);



  // 실시간 검색어 롤링 타이머 (3초 간격)
  useEffect(() => {
    if (trendingKeywords.length === 0) return;
    const timer = setInterval(() => {
      setCurrentTrendIndex((prev) => (prev + 1) % Math.min(10, trendingKeywords.length));
    }, 3000);
    return () => clearInterval(timer);
  }, [trendingKeywords]);

  // 최근 검색 기록 ON/OFF 변경 시 로컬 스토리지 동기화
  useEffect(() => {
    localStorage.setItem('isHistoryEnabled', String(isHistoryEnabled));
  }, [isHistoryEnabled]);

  // 🕒 검색어 히스토리에 추가 (최대 5개 FIFO 제한)
  const addSearchHistory = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    if (!isHistoryEnabled) return; // 저장 기능이 꺼져있으면 기록 안함
    
    // 중복 제거 및 리스트의 맨 앞에 배치 (최대 5개)
    const nextHistory = [trimmed, ...searchHistory.filter(kw => kw !== trimmed)].slice(0, 5);
    setSearchHistory(nextHistory);
    localStorage.setItem('searchHistory', JSON.stringify(nextHistory));
  };

  // 🕒 검색어 히스토리에서 단일 삭제
  const removeHistoryItem = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 칩 클릭 검색 방지
    const nextHistory = searchHistory.filter(kw => kw !== keyword);
    setSearchHistory(nextHistory);
    localStorage.setItem('searchHistory', JSON.stringify(nextHistory));
  };

  // 🕒 검색어 히스토리 전체 삭제
  const clearAllHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
    showToast('최근 검색어가 모두 삭제되었습니다.', 'info');
  };

  // 실시간 크롤링 요청 트리거
  const triggerCrawling = async () => {
    if (crawling) return;
    setCrawling(true);
    showToast('각 플랫폼의 신규 데이터를 크롤링 중입니다...', 'info');
    
    try {
      const res = await fetch('/api/crawl', { method: 'POST' });
      const result = await res.json();
      
      if (result.success) {
        showToast(`수집 완료! 신규: ${result.inserted}개, 갱신: ${result.updated}개`, 'success');
        fetchCampaigns();
      } else {
        showToast('크롤링 중 서버 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('크롤링 서버 연결 실패', 'error');
    } finally {
      setCrawling(false);
    }
  };

  // 토스트 팝업 제어
  const showToast = (message: string, type: 'success' | 'info' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // 남은 마감일 계산 함수 (D-Day)
  const calculateDday = (endDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘마감';
    if (diffDays < 0) return '마감됨';
    return `D-${diffDays}`;
  };

  // 필터링 적용된 최종 리스트 (즐겨찾기 전용 처리)
  const displayedCampaigns = campaigns;

  // 지역 목록 목록 데이터 (광역시도 및 시군구 상세 세분화)
  const LOCATIONS_MAP: Record<string, string[]> = {
    '서울': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '경기': ['수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '김포시', '광명시', '광주시', '군포시', '오산시', '하남시', '이천시', '구리시', '양주시', '안성시', '포천시', '의왕시', '여주시', '동두천시', '양평군', '가평군', '연천군'],
    '인천': ['중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
    '부산': ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
    '대구': ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'],
    '대전': ['동구', '중구', '서구', '유성구', '대덕구'],
    '광주': ['동구', '서구', '남구', '북구', '광산구'],
    '울산': ['중구', '남구', '동구', '북구', '울주군'],
    '강원': ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
    '제주': ['제주시', '서귀포시'],
    '충북': ['청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
    '충남': ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
    '전북': ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
    '전남': ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
    '경북': ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
    '경남': ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
    '세종': ['세종특별자치시']
  };
  // 출처 사이트 목록 (실제 온디맨드 크롤링 수집 및 테스트가 완료된 핵심 5대 매체)
  const TARGET_SITES = ['레뷰 (REVU)', '디너의여왕', '리뷰노트', '포블로그', '강남맛집'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Header (글래스모피즘 헤더) */}
      <header className="glass-panel" style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src="/logo.png" 
            alt="viral_re logo" 
            style={{ 
              height: '38px', 
              width: 'auto', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              cursor: 'pointer'
            }}
            onClick={() => window.location.reload()}
          />
          <span className="integrator-badge" style={{
            fontSize: '0.72rem',
            padding: '4px 8px',
            backgroundColor: '#334155',
            color: '#ffffff',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 800,
            whiteSpace: 'nowrap'
          }}>
            INTEGRATOR v1.0
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <button
            onClick={() => {
              setKeywordQuery('');
              setKeywordData(null);
              setIsKeywordModalOpen(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '0.82rem',
              fontWeight: 800,
              borderRadius: 'var(--radius-md)',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: '1.5px solid #4338ca',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
            title="네이버 키워드 월간 검색량 & 블로그 경쟁도 실시간 분석"
          >
            <span>🔑 키워드마스터</span>
          </button>
          <div style={{ position: 'relative' }}>
            <div 
              className="mobile-hide-sync-badge"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: '7px 16px',
                fontSize: '0.84rem',
                fontWeight: 800,
                borderRadius: '9999px',
                backgroundColor: isSyncingData ? '#1e3a8a' : '#0f172a',
                color: '#ffffff',
                border: isSyncingData ? '2px solid #3b82f6' : '2px solid #10b981',
                boxShadow: isSyncingData ? '0 2px 10px rgba(59, 130, 246, 0.4)' : '0 2px 10px rgba(16, 185, 129, 0.3)',
                whiteSpace: 'nowrap',
                cursor: 'default',
                userSelect: 'none',
                transition: 'all 0.2s ease'
              }}
              title="실시간 60초 자동 동기화 상태 표시 전용 뱃지 (스팸 클릭 서버 부하 방지)"
            >
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isSyncingData ? '#60a5fa' : '#34d399',
                boxShadow: isSyncingData ? '0 0 8px #60a5fa' : '0 0 8px #34d399'
              }} />
              <span style={{ color: '#ffffff', fontWeight: 800 }}>
                {isSyncingData ? (
                  <span style={{ color: '#93c5fd' }}>동기화 중...</span>
                ) : (
                  <>
                    자동 동기화 <strong style={{ color: '#34d399', fontWeight: 900, fontSize: '0.88rem' }}>{syncCountdown}초 전</strong> 🟢
                  </>
                )}
              </span>
            </div>
          </div>

          {/* 🔑 로그인 버튼 및 아바타 드롭다운 */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="user-avatar-btn"
                title={`${user.name} network`}
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </button>
              
              {isUserDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}님</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setUser(null);
                      setIsUserDropdownOpen(false);
                      showToast('성공적으로 로그아웃되었습니다.', 'info');
                    }}
                    className="user-dropdown-item danger"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="premium-button-primary header-login-btn"
              style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}
            >
              <span className="login-btn-text-desktop">로그인 / 회원가입</span>
              <span className="login-btn-text-mobile" style={{ display: 'none' }}>로그인</span>
            </button>
          )}

          <button 
            onClick={toggleTheme}
            style={{
              width: '40px', height: '40px',
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)',
              transition: 'var(--transition-smooth)'
            }}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
          </button>
        </div>
      </header>

      {/* 2. Hero Section - compact & modern */}
      <section style={{
        padding: '48px 24px 28px',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, var(--bg-secondary) 0%, transparent 100%)',
        borderBottom: '1px solid var(--border-color)',
        position: 'relative',
        zIndex: 200
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '8px', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            블로그 & SNS 체험단 <span className="text-gradient">실시간 모아보기</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '1rem' }}>
            여러 플랫폼의 활성 체험단을 한 곳에서 찾아보세요.
          </p>

          {/* 검색 & 실시간 검색어 가로 정렬 영역 - 포커스 시 zIndex 99999 격상 */}
          <div className="hero-search-wrapper" style={{ marginTop: '24px', position: 'relative', zIndex: (isSearchFocused || isTrendDropdownOpen) ? 99999 : 50 }}>
            {/* 좌측/가운데: 통합 검색창 (최근검색어 레이어 팝업 포함) */}
            <div className="hero-search-box" style={{ position: 'relative', zIndex: isSearchFocused ? 99999 : 1 }}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchTerm(searchInput);
                  addSearchHistory(searchInput);
                  setIsSearchFocused(false);
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}
                className="glass-panel" 
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '6px 8px 6px 16px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: 'var(--shadow-lg)',
                  border: isSearchFocused ? '1px solid var(--accent)' : '1px solid var(--border-focus)',
                  transition: 'var(--transition-smooth)',
                  flexWrap: 'nowrap',
                  width: '100%',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                <Icons.Search />
                <input 
                  type="text" 
                  placeholder={placeholderText}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    padding: '8px 12px', fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    minWidth: 0,
                    outline: 'none'
                  }}
                />
                {searchInput && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
                    }}
                    style={{ color: 'var(--text-tertiary)', marginRight: '8px', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                    title="검색어 초기화"
                  >
                    <Icons.Close />
                  </button>
                )}
                <button
                  type="submit"
                  className="premium-button-primary"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  검색
                </button>
              </form>

              {/* 최근검색어 팝업 (네이버 스타일: 포커스 시 노출 - 100% Solid 불투명 배경 & zIndex 최상위) */}
              {isSearchFocused && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-secondary)',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                    zIndex: 99999,
                    opacity: 1,
                    textAlign: 'left',
                    overflow: 'hidden'
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {!isHistoryEnabled ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      최근 검색어 저장 기능이 꺼져 있습니다.
                    </div>
                  ) : searchHistory.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      최근 검색 기록이 없습니다.
                    </div>
                  ) : (
                    <div>
                      <div style={{ padding: '12px 16px 6px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                        최근 검색어
                      </div>
                      <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0', maxHeight: '220px', overflowY: 'auto' }}>
                        {searchHistory.map((hist, idx) => (
                          <li 
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 16px',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                            className="dropdown-item-hover"
                            onClick={() => {
                              setSearchInput(hist);
                              setSearchTerm(hist);
                              addSearchHistory(hist);
                              setIsSearchFocused(false);
                            }}
                          >
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {hist}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeHistoryItem(hist, e);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-tertiary)',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.78rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => setIsHistoryEnabled(!isHistoryEnabled)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, padding: '2px 0' }}
                    >
                      {isHistoryEnabled ? '최근검색어 끄기' : '최근검색어 켜기'}
                    </button>
                    <button
                      type="button"
                      onClick={clearAllHistory}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, padding: '2px 0' }}
                    >
                      전체 삭제
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 우측 끝: 실시간 인기 검색어 롤링 위젯 */}
            <div 
              className="hero-trend-widget"
              style={{ width: '180px', height: '46px', position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)' }}
              onMouseEnter={handleTrendAreaEnter}
              onMouseLeave={handleTrendAreaLeave}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0',
                  height: '46px',
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'flex-end',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', height: '46px', flex: 1, position: 'relative', justifyContent: 'flex-end' }}>
                  {trendingKeywords.length > 0 ? (
                    <div 
                      key={currentTrendIndex}
                      className="animate-trend-slide-up"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        width: '100%',
                        height: '46px',
                        margin: 0,
                        padding: 0,
                        boxSizing: 'border-box',
                        justifyContent: 'flex-end'
                      }}
                      onClick={() => {
                        const item = trendingKeywords[currentTrendIndex];
                        if (item) {
                          setSearchInput(item.word);
                          setSearchTerm(item.word);
                          addSearchHistory(item.word);
                        }
                      }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        background: (currentTrendIndex + 1) === 1 ? 'linear-gradient(135deg,#ffd700,#ffa500)' : (currentTrendIndex + 1) === 2 ? 'linear-gradient(135deg,#c0c0c0,#a9a9a9)' : (currentTrendIndex + 1) === 3 ? 'linear-gradient(135deg,#cd7f32,#b87333)' : 'var(--bg-tertiary)',
                        color: (currentTrendIndex + 1) === 3 ? '#fff' : '#000',
                        flexShrink: 0
                      }}>
                        {currentTrendIndex + 1}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', flex: '0 1 auto' }}>
                        {trendingKeywords[currentTrendIndex]?.word}
                      </span>
                      {trendingKeywords[currentTrendIndex]?.isNew && (
                        <span 
                          style={{
                            fontSize: '0.6rem',
                            fontWeight: 900,
                            color: '#ffffff',
                            background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                            padding: '1px 5px',
                            borderRadius: '9999px',
                            letterSpacing: '0.5px',
                            lineHeight: 1.2,
                            boxShadow: '0 2px 6px rgba(244, 63, 94, 0.4)',
                            flexShrink: 0,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          NEW
                        </span>
                      )}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>인기 검색어 로딩 중...</span>
                  )}
                </div>
              </div>

              {/* 실시간 전체 순위 팝업 레이어 (불투명 고체 배경으로 100% 가림 처리) */}
              {isTrendDropdownOpen && trendingKeywords.length > 0 && (
                <div 
                  className="animate-fade-in"
                  onMouseEnter={handleTrendAreaEnter}
                  onMouseLeave={handleTrendAreaLeave}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 2px)',
                    right: 0,
                    width: '240px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 16px 40px rgba(0,0,0,0.22)',
                    zIndex: 9999,
                    padding: '12px 0',
                    textAlign: 'left',
                    opacity: 1
                  }}
                >
                  <div style={{ padding: '0 16px 8px 16px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔥</span> 실시간 인기 검색어
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {trendingKeywords.slice(0, 10).map((item, idx) => (
                      <li 
                        key={item.word}
                        className="dropdown-item-hover"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'background 0.15s'
                        }}
                        onClick={() => {
                          setSearchInput(item.word);
                          setSearchTerm(item.word);
                          addSearchHistory(item.word);
                          setIsTrendDropdownOpen(false);
                        }}
                      >
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          background: item.rank === 1 ? 'linear-gradient(135deg,#ffd700,#ffa500)' : item.rank === 2 ? 'linear-gradient(135deg,#c0c0c0,#a9a9a9)' : item.rank === 3 ? 'linear-gradient(135deg,#cd7f32,#b87333)' : 'var(--bg-tertiary)',
                          color: item.rank === 3 ? '#fff' : '#000',
                          flexShrink: 0
                        }}>
                          {item.rank}
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: item.rank <= 3 ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {item.word}
                        </span>
                        {(item as any).tagType === 'hot' ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444', flexShrink: 0, marginLeft: 'auto' }}>
                            🔥 HOT
                          </span>
                        ) : (item as any).tagType === 'up' ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#3b82f6', flexShrink: 0, marginLeft: 'auto' }}>
                            {(item as any).tagLabel || '▲'}
                          </span>
                        ) : (item as any).tagType === 'new' ? (
                          <span 
                            style={{
                              fontSize: '0.6rem',
                              fontWeight: 900,
                              color: '#ffffff',
                              background: 'linear-gradient(135deg, #10b981, #059669)',
                              padding: '1px 5px',
                              borderRadius: '9999px',
                              letterSpacing: '0.5px',
                              flexShrink: 0,
                              marginLeft: 'auto'
                            }}
                          >
                            NEW
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 'auto' }}>
                            -
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* 모집유형 ~ 지역검색 필터 바 영역 (검색창 아래배치!) */}
          <div style={{ marginTop: '24px' }}>
            {renderFilterContainer()}
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard Body */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        
        {/* 💻📱 상단 가로형 반응형 배너 광고 (Auto-rolling Carousel Ad Slot) */}
        <div 
          className="glass-panel ad-header-banner" 
          onClick={() => window.open(AD_SLIDES[currentAdIndex].link, '_blank')}
          style={{
            margin: '0 auto 32px auto',
            width: '100%',
            minHeight: '240px',
            borderRadius: 'var(--radius-md)',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `url(${AD_SLIDES[currentAdIndex].image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.5s ease-in-out',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          {/* 가독성을 위한 어두운 레이어 (Dark Overlay) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.3) 100%)',
            zIndex: 1
          }} />

          <span style={{
            position: 'absolute', top: '8px', left: '12px',
            fontSize: '0.55rem', fontWeight: 900, color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: '3px',
            lineHeight: 1, zIndex: 2
          }}>AD</span>
          
          <div style={{ 
            position: 'relative', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            padding: '36px 48px', width: '100%', gap: '16px', flexWrap: 'wrap',
            minHeight: '240px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {AD_SLIDES[currentAdIndex].title}
                </h4>
                <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.5, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {AD_SLIDES[currentAdIndex].desc}
                </p>
              </div>
            </div>
          </div>

          {/* 🔢 캐러셀 수동 및 자동 롤링 컨트롤러 (화살표 & 페이지번호) */}
          <div style={{
            position: 'absolute', bottom: '8px', right: '16px',
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            color: '#ffffff',
            fontSize: '0.8rem',
            zIndex: 3,
            userSelect: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)'
          }}>
            <button 
              type="button" 
              onClick={handlePrevAd} 
              style={{ 
                border: 'none', background: 'transparent', color: '#ffffff', 
                cursor: 'pointer', padding: '0 6px', fontWeight: 900, fontSize: '0.8rem' 
              }}
              title="이전 광고"
            >
              ◀
            </button>
            <span style={{ fontWeight: 800, letterSpacing: '0.5px' }}>
              {currentAdIndex + 1} / {AD_SLIDES.length}
            </span>
            <button 
              type="button" 
              onClick={handleNextAd} 
              style={{ 
                border: 'none', background: 'transparent', color: '#ffffff', 
                cursor: 'pointer', padding: '0 6px', fontWeight: 900, fontSize: '0.8rem' 
              }}
              title="다음 광고"
            >
              ▶
            </button>
          </div>
        </div>
        


        {/* 검색조건과 검색결과 사이의 모던 구분선 */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '36px 0 28px 0' }} />

        {/* 4. Results List Section */}

        <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0', marginBottom: '24px' }}>
          <div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              검색 결과 <span style={{ color: 'var(--accent)' }}>{displayedCampaigns.length}</span>건
            </span>
          </div>

          {/* 정렬 셀렉터 */}
          <div className="sort-buttons-wrapper" style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'latest', label: '최신등록순' },
              { key: 'endDate', label: '마감임박순' },
              { key: 'popular', label: '경쟁률순' }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setSortBy(item.key)}
                style={{
                  fontSize: '0.85rem', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                  fontWeight: sortBy === item.key ? 700 : 500,
                  color: sortBy === item.key ? 'var(--accent)' : 'var(--text-secondary)',
                  backgroundColor: sortBy === item.key ? 'var(--accent-light)' : 'transparent',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 로딩 스켈레톤 상태 */}
        {loading ? (
          <div className="campaign-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="glass-panel" style={{
                borderRadius: 'var(--radius-md)', height: '360px', overflow: 'hidden',
                animation: 'pulse 1.5s infinite ease-in-out'
              }}>
                <div style={{ height: '180px', backgroundColor: 'var(--border-color)' }} />
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ height: '18px', backgroundColor: 'var(--border-color)', width: '40%', borderRadius: '4px' }} />
                  <div style={{ height: '24px', backgroundColor: 'var(--border-color)', width: '90%', borderRadius: '4px' }} />
                  <div style={{ height: '16px', backgroundColor: 'var(--border-color)', width: '60%', borderRadius: '4px' }} />
                  <div style={{ height: '32px', backgroundColor: 'var(--border-color)', marginTop: '20px', borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayedCampaigns.length === 0 ? (
          /* 빈 화면 상태 (세련된 모던 검색 돋보기 일러스트 & 3D 뱃지) */
          <div className="glass-panel animate-fade-in" style={{
            padding: '80px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)',
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)'
          }}>
            <div style={{
              width: '100px',
              height: '100px',
              margin: '0 auto 24px auto',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(236, 72, 153, 0.12) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 12px 32px rgba(99, 102, 241, 0.15)'
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-empty-search)' }}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
                <line x1="8" y1="11" x2="14" y2="11" />
                <defs>
                  <linearGradient id="grad-empty-search" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
              조건에 맞는 체험단이 없습니다
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', fontSize: '0.95rem', lineHeight: 1.5 }}>
              선택하신 필터 옵션이나 검색어에 일치하는 모집 건이 없습니다.<br />
              다른 검색어로 재검색하거나 필터를 초기화해 보세요.
            </p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setSearchInput('');
                setActiveType('all');
                setActiveCategory('all');
                setActivePlatform('all');
                setActiveLocation('all');
                setSelectedSido('all');
                setSelectedSigungu('all');
                setActiveSite('all');
              }}
              className="premium-button-primary"
              style={{ margin: '0 auto', padding: '10px 24px', fontSize: '0.9rem' }}
            >
              전체 필터 초기화하기
            </button>
          </div>
        ) : (
          /* 실제 리스트 카드 렌더링 */
          <>
            {/* 1. 상단 2개 라인 (카드 8개) */}
            <div className="campaign-grid">
              {displayedCampaigns.slice(0, Math.min(8, visibleCount)).map((c) => {
                const dday = calculateDday(c.endDate);
                const competitionRate = c.limitCount > 0 ? (c.applyCount / c.limitCount).toFixed(1) : '0';
                const ratePercent = Math.min(100, Math.floor((c.applyCount / c.limitCount) * 100));

                let ddayColor = 'var(--success)';
                if (dday === '오늘마감' || dday === 'D-1' || dday === 'D-2') ddayColor = 'var(--danger)';
                else if (dday.startsWith('D-') && parseInt(dday.substring(2)) <= 5) ddayColor = 'var(--warning)';
                else if (dday === '마감됨') ddayColor = 'var(--text-tertiary)';

                return (
                  <article 
                    key={c.id} 
                    className="premium-card animate-fade-in"
                    onClick={() => setSelectedCampaign(c)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 카드 썸네일 영역 */}
                    <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
                      <img 
                        src={c.imageUrl} 
                        alt={c.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          transition: 'transform 0.4s ease'
                        }}
                        className="card-image-hover"
                      />
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                        {c.platform === 'blog' ? (
                          <span className="badge badge-blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <NaverBlogIcon size={13} />
                            <span>블로그</span>
                          </span>
                        ) : c.platform === 'clip' ? (
                          <span className="badge badge-clip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#03C75A', color: '#ffffff' }}>
                            <NaverClipIcon size={13} />
                            <span>클립</span>
                          </span>
                        ) : c.platform === 'blog+clip' ? (
                          <span className="badge badge-blog-clip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#03C75A', color: '#ffffff' }}>
                            <NaverBlogIcon size={13} />
                            <NaverClipIcon size={13} />
                            <span>블로그·클립</span>
                          </span>
                        ) : c.platform === 'instagram' ? (
                          <span className="badge badge-instagram" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span>📸</span>
                            <span>Insta</span>
                          </span>
                        ) : c.platform === 'youtube' ? (
                          <span className="badge badge-youtube" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span>▶️</span>
                            <span>YouTube</span>
                          </span>
                        ) : (
                          <span className={`badge badge-${c.platform}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span>🌐</span>
                            <span>Etc</span>
                          </span>
                        )}
                      </div>
                      <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff',
                        fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: 'var(--radius-sm)'
                      }}>
                        {c.targetSite}
                      </div>
                      <div style={{
                        position: 'absolute', bottom: '12px', left: '12px',
                        backgroundColor: ddayColor, color: '#ffffff',
                        fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: 'var(--radius-full)'
                      }}>
                        {dday}
                      </div>
                    </div>

                    {/* 카드 내용 영역 */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        {c.location && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>
                            <Icons.MapPin /> {c.location}
                          </div>
                        )}
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {sanitizeCampaignText(c.title)}
                        </h3>
                        <div style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          border: '1px solid rgba(99, 102, 241, 0.22)',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: '2px', letterSpacing: '0.3px' }}>
                              제공 혜택
                            </span>
                            <span style={{ 
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              display: '-webkit-box', 
                              WebkitLineClamp: 3, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden', 
                              lineHeight: 1.4,
                              wordBreak: 'keep-all'
                            }} title={sanitizeOfferDescription(c.description, c.title)}>
                              {sanitizeOfferDescription(c.description, c.title)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          <span>지원현황 <strong>{c.applyCount}</strong> / {c.limitCount}명</span>
                          <span style={{ fontWeight: 700, color: parseFloat(competitionRate) >= 1 ? 'var(--danger)' : 'var(--success)' }}>
                            경쟁률 {competitionRate}:1
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${ratePercent}%`, height: '100%',
                            backgroundColor: parseFloat(competitionRate) >= 1 ? 'var(--danger)' : 'var(--accent)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* 💻📱 인피드 가로형 띠 배너 광고 (3라인 통째로 100% 너비로 삽입) */}
            {displayedCampaigns.length > 8 && (
              <div 
                className="glass-panel" 
                onClick={() => window.open('https://viral-re.vercel.app', '_blank')}
                style={{
                  margin: '32px 0',
                  width: '100%',
                  minHeight: '220px',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundImage: `url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&h=200&q=80)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px dashed var(--accent)',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  zIndex: 1
                }} />
                
                <div style={{
                  position: 'relative', zIndex: 2, padding: '36px 48px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', color: '#ffffff', flexWrap: 'wrap', gap: '16px',
                  minHeight: '220px'
                }}>
                  <div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 900, color: '#ffffff',
                      backgroundColor: 'var(--accent)', padding: '3px 8px', borderRadius: '4px',
                      marginRight: '10px', verticalAlign: 'middle'
                    }}>IN-FEED AD</span>
                    <h4 style={{ fontSize: '1.45rem', fontWeight: 800, display: 'inline-block', margin: 0, verticalAlign: 'middle', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      내 블로그 노출 순위 수직 상승 비법서 무상 배포!
                    </h4>
                    <p style={{ fontSize: '0.95rem', opacity: 0.9, marginTop: '8px', marginBottom: 0, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      최신 C-Rank 로직 분석 및 상위 노출에 최적화된 소제목/키워드 배치 가이드를 단독 공개합니다.
                    </p>
                  </div>
                  <div className="premium-button-primary" style={{ fontSize: '0.85rem', padding: '12px 24px', borderRadius: 'var(--radius-sm)' }}>
                    비법서 다운로드하기
                  </div>
                </div>
              </div>
            )}

            {/* 2. 하단 3번째 라인 이후 (카드 9번째부터 끝까지) */}
            {visibleCount > 8 && displayedCampaigns.length > 8 && (
              <div className="campaign-grid" style={{ marginTop: '0' }}>
                {displayedCampaigns.slice(8, visibleCount).map((c) => {
                  const dday = calculateDday(c.endDate);
                  const competitionRate = c.limitCount > 0 ? (c.applyCount / c.limitCount).toFixed(1) : '0';
                  const ratePercent = Math.min(100, Math.floor((c.applyCount / c.limitCount) * 100));

                  let ddayColor = 'var(--success)';
                  if (dday === '오늘마감' || dday === 'D-1' || dday === 'D-2') ddayColor = 'var(--danger)';
                  else if (dday.startsWith('D-') && parseInt(dday.substring(2)) <= 5) ddayColor = 'var(--warning)';
                  else if (dday === '마감됨') ddayColor = 'var(--text-tertiary)';

                  return (
                    <article 
                      key={c.id} 
                      className="premium-card animate-fade-in"
                      onClick={() => setSelectedCampaign(c)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* 카드 썸네일 영역 */}
                      <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
                        <img 
                          src={c.imageUrl} 
                          alt={c.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            transition: 'transform 0.4s ease'
                          }}
                          className="card-image-hover"
                        />
                        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                          {c.platform === 'blog' ? (
                            <span className="badge badge-blog" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <NaverBlogIcon size={13} />
                              <span>블로그</span>
                            </span>
                          ) : c.platform === 'clip' ? (
                            <span className="badge badge-clip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#03C75A', color: '#ffffff' }}>
                              <NaverClipIcon size={13} />
                              <span>클립</span>
                            </span>
                          ) : c.platform === 'blog+clip' ? (
                            <span className="badge badge-blog-clip" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#03C75A', color: '#ffffff' }}>
                              <NaverBlogIcon size={13} />
                              <NaverClipIcon size={13} />
                              <span>블로그·클립</span>
                            </span>
                          ) : c.platform === 'instagram' ? (
                            <span className="badge badge-instagram" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>📸</span>
                              <span>Insta</span>
                            </span>
                          ) : c.platform === 'youtube' ? (
                            <span className="badge badge-youtube" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>▶️</span>
                              <span>YouTube</span>
                            </span>
                          ) : (
                            <span className={`badge badge-${c.platform}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span>🌐</span>
                              <span>Etc</span>
                            </span>
                          )}
                        </div>
                        <div style={{
                          position: 'absolute', top: '12px', right: '12px',
                          backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff',
                          fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: 'var(--radius-sm)'
                        }}>
                          {c.targetSite}
                        </div>
                        <div style={{
                          position: 'absolute', bottom: '12px', left: '12px',
                          backgroundColor: ddayColor, color: '#ffffff',
                          fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: 'var(--radius-full)'
                        }}>
                          {dday}
                        </div>
                      </div>

                      {/* 카드 내용 영역 */}
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          {c.location && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>
                              <Icons.MapPin /> {c.location}
                            </div>
                          )}
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '10px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {sanitizeCampaignText(c.title)}
                          </h3>
                        <div style={{
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)',
                          marginBottom: '14px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          border: '1px solid rgba(99, 102, 241, 0.22)',
                          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(236, 72, 153, 0.08) 100%)'
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--accent)', display: 'block', marginBottom: '2px', letterSpacing: '0.3px' }}>
                              제공 혜택
                            </span>
                            <span style={{ 
                              fontSize: '0.85rem',
                              fontWeight: 700,
                              color: 'var(--text-primary)',
                              display: '-webkit-box', 
                              WebkitLineClamp: 3, 
                              WebkitBoxOrient: 'vertical', 
                              overflow: 'hidden', 
                              lineHeight: 1.4,
                              wordBreak: 'keep-all'
                            }} title={sanitizeOfferDescription(c.description, c.title)}>
                              {sanitizeOfferDescription(c.description, c.title)}
                            </span>
                          </div>
                        </div>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <span>지원현황 <strong>{c.applyCount}</strong> / {c.limitCount}명</span>
                            <span style={{ fontWeight: 700, color: parseFloat(competitionRate) >= 1 ? 'var(--danger)' : 'var(--success)' }}>
                              경쟁률 {competitionRate}:1
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{
                              width: `${ratePercent}%`, height: '100%',
                              backgroundColor: parseFloat(competitionRate) >= 1 ? 'var(--danger)' : 'var(--accent)',
                              borderRadius: 'var(--radius-full)',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

          {/* 🔑 무한 스크롤(Infinite Scroll) 스크롤 감지 센티널 바 */}
          {displayedCampaigns.length > visibleCount && (
            <div 
              ref={loadMoreRef}
              style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center',
                padding: '36px 0', 
                gap: '8px',
                color: 'var(--text-tertiary)',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <Icons.Refresh className="animate-spin" style={{ width: '16px', height: '16px' }} />
              <span>체험단 정보 자동으로 더 불러오는 중... ({visibleCount} / {displayedCampaigns.length}개 표출 중)</span>
            </div>
          )}
          </>
        )}
      </main>

      {/* 5. Campaign Detail Modal (캠페인 상세 모달 - 최상단 겹침 방지 zIndex 99999) */}
      {selectedCampaign && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '16px'
        }} onClick={() => setSelectedCampaign(null)}>
          <div 
            className="glass-panel animate-fade-in" 
            style={{
              maxWidth: '650px', width: '100%', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden', boxShadow: 'var(--shadow-premium)',
              backgroundColor: 'var(--bg-secondary)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* 닫기 X 아이콘 (데스크톱 탑승용) */}
            <button 
              onClick={() => setSelectedCampaign(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px', zIndex: 10,
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                border: 'none', cursor: 'pointer'
              }}
            >
              <Icons.Close />
            </button>

            {/* 스크롤러 내부 상단 영역 */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
              {/* 모달 이미지 */}
              <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                <img 
                  src={selectedCampaign.imageUrl} 
                  alt={selectedCampaign.title}
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                  padding: '20px 20px 12px 20px', color: '#ffffff'
                }}>
                  {selectedCampaign.platform === 'blog' ? (
                    <span className="badge badge-blog" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <NaverBlogIcon size={14} />
                      <span>네이버 블로그</span>
                    </span>
                  ) : selectedCampaign.platform === 'clip' ? (
                    <span className="badge badge-clip" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#03C75A', color: '#ffffff' }}>
                      <NaverClipIcon size={14} />
                      <span>네이버 클립</span>
                    </span>
                  ) : selectedCampaign.platform === 'blog+clip' ? (
                    <span className="badge badge-blog-clip" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#03C75A', color: '#ffffff' }}>
                      <NaverBlogIcon size={14} />
                      <NaverClipIcon size={14} />
                      <span>네이버 블로그 + 클립 (둘 다 필수)</span>
                    </span>
                  ) : selectedCampaign.platform === 'instagram' ? (
                    <span className="badge badge-instagram" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>📸</span>
                      <span>인스타그램</span>
                    </span>
                  ) : selectedCampaign.platform === 'youtube' ? (
                    <span className="badge badge-youtube" style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>▶️</span>
                      <span>유튜브</span>
                    </span>
                  ) : (
                    <span className={`badge badge-${selectedCampaign.platform}`} style={{ marginBottom: '8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span>🌐</span>
                      <span>{selectedCampaign.platform}</span>
                    </span>
                  )}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 500, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                    {sanitizeCampaignText(selectedCampaign.title)}
                  </h3>
                </div>
              </div>

              {/* 모달 본문 내용 */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 제공 혜택 */}
                <div style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--accent-light)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--accent)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    제공 혜택
                  </h4>
                  <p style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>
                    {sanitizeOfferDescription(selectedCampaign.description, selectedCampaign.title)}
                  </p>
                </div>

                {/* 기본 정보 테이블 */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                  padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>모집 정원</span>
                    <span style={{ fontWeight: 400, fontSize: '0.875rem' }}>{selectedCampaign.limitCount}명 (현재 {selectedCampaign.applyCount}명 신청)</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>수집 플랫폼</span>
                    <span style={{ fontWeight: 400, fontSize: '0.875rem' }}>{selectedCampaign.targetSite}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>모집 마감일</span>
                    <span style={{ fontWeight: 400, fontSize: '0.875rem' }}>{selectedCampaign.endDate}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>체험 방식</span>
                    <span style={{ fontWeight: 400, fontSize: '0.875rem' }}>
                      {selectedCampaign.location ? `방문 체험 (${selectedCampaign.location})` : '재택/배송형'}
                    </span>
                  </div>
                </div>

                {/* 실제 업체 측 리뷰어 미션 & 가이드라인 안내 */}
                <div style={{
                  padding: '18px 20px',
                  backgroundColor: 'var(--bg-tertiary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)'
                }}>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--accent)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📋</span> 업체 원본 필수 미션 & 가이드라인
                  </h4>
                  {isMissionLoading && !selectedCampaign.mission ? (
                    <div style={{ fontSize: '0.83rem', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 0' }}>
                      <Icons.Refresh className="animate-spin" /> 해당 사이트의 원본 상세 미션 가이드라인을 실시간 파싱 중입니다...
                    </div>
                  ) : selectedCampaign.mission ? (
                    <div style={{
                      fontSize: '0.875rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.75,
                      whiteSpace: 'pre-line',
                      wordBreak: 'keep-all',
                      maxHeight: '320px',
                      overflowY: 'auto',
                      paddingRight: '8px',
                      fontWeight: 400
                    }}>
                      {formatMissionText(selectedCampaign.mission)}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.83rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6 }}>
                      ※ 원본 상세 미션 및 가이드라인은 아래 [실제 캠페인 신청하러 가기] 버튼을 누르시면 해당 업체 상세 화면에서 바로 확인하실 수 있습니다.
                    </p>
                  )}
                </div>

                {/* 🔑 이 공고 전용 황금키워드 & SEO 분석 버튼 */}
                <button
                  onClick={() => {
                    const kw = extractCoreKeyword(selectedCampaign.title);
                    analyzeKeyword(kw);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                    color: '#d97706',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    fontWeight: 500,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>⚡ 이 공고 네이버 황금키워드 & 검색량 분석하기</span>
                </button>

              </div>
            </div>

            {/* 풋터 플로팅 고정 영역 (닫기 + 신청하러 가기) */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              padding: '12px 20px',
              display: 'flex', gap: '10px',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
              zIndex: 5
            }}>
              <button 
                onClick={() => setSelectedCampaign(null)}
                className="premium-button-secondary" 
                style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                닫기
              </button>

              <a 
                href={selectedCampaign.campaignUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="premium-button-primary"
                style={{ flex: 2, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                캠페인 신청하러 가기
                <Icons.ExternalLink />
              </a>
            </div>

          </div>
        </div>
      )}

      {/* 6. Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 110,
          padding: '12px 20px', borderRadius: 'var(--radius-md)',
          color: '#ffffff', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: 'var(--shadow-lg)',
          backgroundColor: toast.type === 'success' ? 'var(--success)' : toast.type === 'error' ? 'var(--danger)' : 'var(--accent)',
          animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'success' && '✅ '}
          {toast.type === 'error' && '🚨 '}
          {toast.type === 'info' && '💡 '}
          {toast.message}
        </div>
      )}

      {/* 🔑 7. Keyword Master Modal (키워드마스터 SEO 분석 모달) */}
      {isKeywordModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999999,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '16px'
        }}>
          <div className="glass-panel" style={{
            width: '95%', maxWidth: '880px', maxHeight: '94vh',
            backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border-color)',
            position: 'relative'
          }}>
            {/* 헤더 */}
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              backgroundColor: 'var(--bg-tertiary)'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                  키워드마스터
                </h3>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  (네이버 검색량 & 경쟁도 분석)
                </span>
              </div>
              <button 
                onClick={() => setIsKeywordModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', padding: '4px' }}
              >
                <Icons.Close />
              </button>
            </div>

            {/* 검색 입력바 (모바일 단일 행 완벽 밀착 레이아웃) */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  analyzeKeyword(keywordQuery);
                }}
                style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}
              >
                <input 
                  type="text"
                  value={keywordQuery}
                  onChange={(e) => setKeywordQuery(e.target.value)}
                  placeholder="분석할 키워드를 입력하세요"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem',
                    fontWeight: 600
                  }}
                />
                <button
                  type="submit"
                  disabled={isKeywordLoading}
                  className="premium-button-primary"
                  style={{
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  {isKeywordLoading ? '분석 중...' : '키워드 조회'}
                </button>
              </form>
            </div>

            {/* 결과 본문 */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {isKeywordLoading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                  <Icons.Refresh className="animate-spin" style={{ width: '32px', height: '32px', margin: '0 auto 16px auto', color: 'var(--accent)' }} />
                  <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
                    네이버 공식 수치 & 연관검색어 100위 실시간 분석 중...
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    월간 검색량, 블로그 포스팅 수, 최근 발행일을 정밀 집계하고 있습니다.
                  </p>
                </div>
              ) : keywordData ? (
                <>
                  {/* 📊 지표 카운트 개별 1행 카드 레이아웃 (좌: 타이틀/세부, 우: 총계 수치) */}
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '12px' }}>
                      {/* 1. 월간 총 검색량 카드 */}
                      <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>월간 총 검색량</span>
                            <button
                              type="button"
                              onClick={() => setActiveKeywordGuideTooltip(prev => prev === 'volume' ? null : 'volume')}
                              style={{
                                background: 'none', border: 'none', padding: '0 4px', cursor: 'pointer',
                                fontSize: '0.82rem', color: activeKeywordGuideTooltip === 'volume' ? '#4f46e5' : 'var(--text-tertiary)',
                                opacity: 0.85, transition: 'transform 0.15s ease, color 0.15s ease'
                              }}
                              title="클릭 시 월간 총 검색량 산출 기준 안내"
                            >
                              ℹ️
                            </button>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>(PC {keywordData.pcSearchVolume.toLocaleString()} / 모바일 {keywordData.mobileSearchVolume.toLocaleString()})</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                            <span style={{ fontSize: '1.28rem', fontWeight: 900, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{keywordData.totalSearchVolume.toLocaleString()}</span>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent)' }}>회</span>
                          </div>
                        </div>
                        {activeKeywordGuideTooltip === 'volume' && (
                          <div style={{
                            padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid #4f46e5', fontSize: '0.74rem', color: 'var(--text-primary)', lineHeight: 1.5,
                            animation: 'fadeIn 0.15s ease-in-out'
                          }}>
                            📌 <strong>월간 총 검색량 기준:</strong> 최근 30일간 네이버 PC 및 모바일 검색창에서 조회된 통합 실데이터입니다.
                          </div>
                        )}
                      </div>

                      {/* 2. 총 블로그 포스팅 수 카드 */}
                      <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>총 블로그 포스팅 수</span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>(네이버 누적 등록 문서)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                          <span style={{ fontSize: '1.28rem', fontWeight: 900, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{keywordData.totalPosts.toLocaleString()}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>건</span>
                        </div>
                      </div>

                      {/* 3. 경쟁비율 카드 */}
                      <div style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', backgroundColor: keywordData.grade === 'GOLD' ? 'rgba(16, 185, 129, 0.08)' : keywordData.grade === 'NORMAL' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${keywordData.grade === 'GOLD' ? 'rgba(16, 185, 129, 0.3)' : keywordData.grade === 'NORMAL' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>경쟁비율 (문서 ÷ 검색량)</span>
                            <button
                              type="button"
                              onClick={() => setActiveKeywordGuideTooltip(prev => prev === 'ratio' ? null : 'ratio')}
                              style={{
                                background: 'none', border: 'none', padding: '0 4px', cursor: 'pointer',
                                fontSize: '0.82rem', color: activeKeywordGuideTooltip === 'ratio' ? '#10b981' : 'var(--text-tertiary)',
                                opacity: 0.85, transition: 'transform 0.15s ease, color 0.15s ease'
                              }}
                              title="클릭 시 경쟁비율 산출공식 안내"
                            >
                              ℹ️
                            </button>
                            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: keywordData.grade === 'GOLD' ? '#10b981' : keywordData.grade === 'NORMAL' ? '#d97706' : '#ef4444', whiteSpace: 'nowrap' }}>{keywordData.statusText}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', flexShrink: 0 }}>
                            <span style={{ fontSize: '1.28rem', fontWeight: 900, color: keywordData.grade === 'GOLD' ? '#10b981' : keywordData.grade === 'NORMAL' ? '#d97706' : '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{keywordData.competitionRatio}</span>
                          </div>
                        </div>
                        {activeKeywordGuideTooltip === 'ratio' && (
                          <div style={{
                            padding: '8px 12px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--bg-secondary)',
                            border: `1px solid ${keywordData.grade === 'GOLD' ? '#10b981' : keywordData.grade === 'NORMAL' ? '#f59e0b' : '#ef4444'}`,
                            fontSize: '0.74rem', color: 'var(--text-primary)', lineHeight: 1.5,
                            animation: 'fadeIn 0.15s ease-in-out'
                          }}>
                            📌 <strong>경쟁비율 산출공식:</strong> 포스팅 문서 수 ÷ 월간 총 검색량 (수치가 1.0 미만인 🟢 황금키워드는 검색량 대비 글수가 적어 상위 노출에 매우 유리합니다).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 🔍 연관 검색어 정밀 랭킹 섹션 */}
                  <div style={{
                    padding: '16px 18px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 2px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                          🔍 연관 검색어 랭킹 리스트
                        </h4>
                        <div>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: '#4f46e5',
                            color: '#ffffff',
                            display: 'inline-block'
                          }}>
                            총 {keywordData.relatedKeywords?.length || 0}개 수집
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="mobile-hide-copy-tags"
                        onClick={() => {
                          const tagText = (keywordData.relatedKeywords || []).map((k: any) => `#${k.keyword}`).join(' ');
                          navigator.clipboard.writeText(tagText);
                          showToast('연관 검색어 태그가 클립보드에 복사되었습니다!', 'success');
                        }}
                        style={{
                          padding: '6px 14px', fontSize: '0.78rem', fontWeight: 700,
                          borderRadius: 'var(--radius-sm)', backgroundColor: '#4f46e5', color: '#fff',
                          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                          boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)'
                        }}
                      >
                        태그 전체 복사 📋
                      </button>
                    </div>

                    {/* 💻📱 가독성 극대화 가로 스크롤 & 고정 최소폭 정렬 테이블 */}
                    <div style={{
                      overflowX: 'auto',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      margin: '0 2px 12px 2px',
                      backgroundColor: 'var(--bg-primary)'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: '600px' }}>
                        <thead>
                          <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', userSelect: 'none' }}>
                            <th 
                              onClick={() => {
                                if (keywordSortField === 'rank') setKeywordSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                else { setKeywordSortField('rank'); setKeywordSortOrder('asc'); }
                              }}
                              style={{ padding: '12px 10px', width: '60px', textAlign: 'center', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              순위 {keywordSortField === 'rank' ? (keywordSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                            <th 
                              onClick={() => {
                                if (keywordSortField === 'keyword') setKeywordSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                else { setKeywordSortField('keyword'); setKeywordSortOrder('asc'); }
                              }}
                              style={{ padding: '12px 14px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              연관 검색어 {keywordSortField === 'keyword' ? (keywordSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                            <th 
                              onClick={() => {
                                if (keywordSortField === 'volume') setKeywordSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                else { setKeywordSortField('volume'); setKeywordSortOrder('desc'); }
                              }}
                              style={{ padding: '12px 14px', width: '120px', textAlign: 'right', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              월간 총 검색량 {keywordSortField === 'volume' ? (keywordSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                            <th 
                              onClick={() => {
                                if (keywordSortField === 'posts') setKeywordSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                else { setKeywordSortField('posts'); setKeywordSortOrder('asc'); }
                              }}
                              style={{ padding: '12px 14px', width: '120px', textAlign: 'right', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              블로그 포스팅 수 {keywordSortField === 'posts' ? (keywordSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                            <th 
                              onClick={() => {
                                if (keywordSortField === 'ratio') setKeywordSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                else { setKeywordSortField('ratio'); setKeywordSortOrder('asc'); }
                              }}
                              style={{ padding: '12px 10px', width: '110px', textAlign: 'center', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              경쟁비율 {keywordSortField === 'ratio' ? (keywordSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                            <th 
                              onClick={() => {
                                if (keywordSortField === 'date') setKeywordSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                                else { setKeywordSortField('date'); setKeywordSortOrder('desc'); }
                              }}
                              style={{ padding: '12px 10px', width: '95px', textAlign: 'center', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}
                            >
                              최근 발행일 {keywordSortField === 'date' ? (keywordSortOrder === 'asc' ? '▲' : '▼') : '↕'}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(processedRelatedKeywords || []).slice(0, relatedVisibleCount).map((item: any) => (
                            <tr 
                              key={item.rank}
                              style={{
                                borderBottom: '1px solid var(--border-color)',
                                backgroundColor: item.rank % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-secondary)',
                                transition: 'background-color 0.15s ease'
                              }}
                            >
                              <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <span style={{
                                  fontSize: '0.74rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px',
                                  backgroundColor: item.rank <= 3 ? '#4f46e5' : 'var(--bg-secondary)',
                                  color: item.rank <= 3 ? '#ffffff' : 'var(--text-primary)',
                                  border: item.rank <= 3 ? 'none' : '1px solid var(--border-color)',
                                  display: 'inline-block', minWidth: '44px', whiteSpace: 'nowrap'
                                }}>
                                  {item.rank}위
                                </span>
                              </td>
                              <td style={{ padding: '10px 12px', verticalAlign: 'middle', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <button
                                  type="button"
                                  onClick={() => analyzeKeyword(item.keyword)}
                                  style={{
                                    background: 'none', border: 'none', padding: 0,
                                    color: 'var(--accent)', fontWeight: 700, cursor: 'pointer',
                                    fontSize: '0.84rem', textDecoration: 'underline', textAlign: 'left'
                                  }}
                                  title="클릭 시 이 연관검색어로 분석"
                                >
                                  {item.keyword}
                                </button>
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' }}>
                                {item.totalSearchVolume.toLocaleString()}회
                              </td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 500, color: 'var(--text-secondary)', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' }}>
                                {item.totalPosts.toLocaleString()}건
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <span style={{
                                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 'var(--radius-full)',
                                  backgroundColor: item.grade === 'GOLD' ? 'rgba(16, 185, 129, 0.15)' : item.grade === 'NORMAL' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: item.grade === 'GOLD' ? '#10b981' : item.grade === 'NORMAL' ? '#d97706' : '#ef4444',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {item.competitionRatio} ({item.gradeLabel})
                                </span>
                              </td>
                              <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.74rem', verticalAlign: 'middle', fontVariantNumeric: 'tabular-nums' }}>
                                {item.recentDate}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 20개씩 더보기 버튼 (최대 35개/100개 노출) */}
                    {relatedVisibleCount < (keywordData.relatedKeywords?.length || 0) && (
                      <button
                        onClick={() => setRelatedVisibleCount((prev) => Math.min(prev + 20, 100))}
                        className="premium-button-secondary"
                        style={{
                          width: '100%', padding: '10px', fontSize: '0.85rem', fontWeight: 700,
                          backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)',
                          color: 'var(--accent)', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <span>연관 검색어 더보기 ➕</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontWeight: 500 }}>
                          (현재 {Math.min(relatedVisibleCount, keywordData.relatedKeywords.length)} / {keywordData.relatedKeywords.length}개 표시 중)
                        </span>
                      </button>
                    )}
                  </div>

                  {/* 🏆 네이버 블로그 상위 노출 랭킹 (Top 10) 정밀 정렬 리스트 */}
                  <div style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)'
                  }}>
                    <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', marginTop: 0 }}>
                      🏆 네이버 블로그 상위 노출 랭킹
                    </h4>
                    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-sm)', padding: '2px 0' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '560px' }}>
                      {keywordData.topPosts.map((post: any, idx: number) => (
                        <a 
                          key={idx}
                          href={post.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'var(--bg-primary)',
                            textDecoration: 'none',
                            border: '1px solid var(--border-color)',
                            transition: 'border-color 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, marginRight: '16px' }}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '4px',
                              backgroundColor: idx < 3 ? '#4f46e5' : 'var(--bg-secondary)',
                              color: idx < 3 ? '#ffffff' : 'var(--text-primary)',
                              border: idx < 3 ? 'none' : '1px solid var(--border-color)',
                              minWidth: '44px',
                              width: '44px',
                              textAlign: 'center',
                              flexShrink: 0,
                              whiteSpace: 'nowrap'
                            }}>
                              {idx + 1}위
                            </span>
                            <span style={{
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              minWidth: 0,
                              display: 'block'
                            }} title={post.title}>
                              {post.title}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                            <span 
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--accent)',
                                maxWidth: '120px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                display: 'inline-block'
                              }}
                              title={post.bloggerName}
                            >
                              {post.bloggerName}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                              {post.postDate}
                            </span>
                          </div>
                        </a>
                      ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
                  <span style={{ fontSize: '2rem', display: 'block', marginBottom: '8px' }}>🔑</span>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-secondary)' }}>
                    분석하고 싶은 키워드를 입력해 주세요.
                  </p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    월간 검색량, 블로그 포스팅 수, 1~100위 연관 검색어 수치 및 최근 발행일을 한눈에 분석해 드립니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Footer */}
      <footer style={{
        marginTop: 'auto', padding: '32px 24px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        textAlign: 'center', color: 'var(--text-tertiary)',
        fontSize: '0.85rem'
      }}>
        <p style={{ marginBottom: '8px' }}>
          &copy; {new Date().getFullYear()} viral_re. All rights reserved.
        </p>
        <p>
          본 사이트는 각 블로그 체험단 사이트의 공개 데이터를 기술적 프로토타입 목적으로 연동/시연하는 애그리게이터 데모 웹 사이트입니다.
        </p>
      </footer>

      {/* 📱 모바일 전용 하단 고정 플로팅 앵커 배너 (Bottom Sticky Anchor Ad) */}
      {showStickyAd && (
        <div 
          className="mobile-only-ad-sticky" 
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
            height: '56px', backgroundColor: 'var(--bg-secondary)',
            borderTop: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          {/* 닫기 버튼 */}
          <button 
            onClick={() => setShowStickyAd(false)} 
            style={{
              position: 'absolute', top: '-10px', right: '12px',
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)', cursor: 'pointer', zIndex: 10,
              color: 'var(--text-secondary)'
            }}
          >
            ✕
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.55rem', fontWeight: 900, border: '1px solid var(--border-color)', padding: '1px 4px', borderRadius: '3px', color: 'var(--text-tertiary)' }}>AD</span>
            <div style={{ textAlign: 'left', overflow: 'hidden' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>인플루언서 제휴 문의 폭주! VIP 선착순 등록</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>조기 마감 임박! 지금 무료 프리패스 신청하기</p>
            </div>
          </div>
          <a 
            href="https://viral-re.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="premium-button-primary" 
            style={{ padding: '6px 12px', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
          >
            이동
          </a>
        </div>
      )}

      {/* 🔑 소셜 로그인 모달 */}
      {isLoginModalOpen && (
        <div className="social-modal-overlay" onClick={() => setIsLoginModalOpen(false)}>
          <div className="social-modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="social-modal-close" onClick={() => setIsLoginModalOpen(false)}>
              ✕
            </button>
            
            {/* 로그인 헤더 트렌디 감성 이미지 배너 */}
            <div style={{ width: 'calc(100% + 32px)', height: '100px', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', overflow: 'hidden', margin: '-24px -16px 20px -16px', position: 'relative' }}>
              <img 
                src="https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?auto=format&fit=crop&w=400&h=100&q=80" 
                alt="Login Header" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%)' }} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
                소셜 로그인 / 회원가입
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                체험단 목록을 연동하고 나만의 북마크를 관리해 보세요!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* 카카오톡 */}
              <button onClick={() => handleSocialLogin('kakao')} className="social-login-btn btn-kakao">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: '8px' }}>
                  <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.553 1.7 4.792 4.248 5.992-.17.618-.613 2.227-.702 2.573-.11.438.163.432.342.31 1.758-1.196 2.45-1.7 2.766-1.927.42.062.853.097 1.346.097 4.97 0 9-3.186 9-7.115C21 6.185 16.97 3 12 3z"/>
                </svg>
                카카오로 시작하기
              </button>

              {/* 네이버 */}
              <button onClick={() => handleSocialLogin('naver')} className="social-login-btn btn-naver">
                <span style={{ fontWeight: 900, fontSize: '1.2rem', marginRight: '14px', marginLeft: '4px' }}>N</span>
                네이버로 시작하기
              </button>

              {/* 구글 */}
              <button onClick={() => handleSocialLogin('google')} className="social-login-btn btn-google">
                <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '8px' }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.23-.66-.35-1.36-.35-2.09z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Google 계정으로 시작하기
              </button>

              {/* 인스타그램 */}
              <button onClick={() => handleSocialLogin('instagram')} className="social-login-btn btn-instagram">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: '8px' }}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                Instagram으로 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💻📱 우측 하단 최상단 탑 버튼 (Scroll to Top) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.35)';
          }}
          title="맨 위로 이동"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      )}

      {/* CSS Pulse 애니메이션용 style 정의 */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .card-image-hover:hover {
          transform: scale(1.05);
        }

        /* ─── 필터탭 호버/활성 강제 오버라이드 ─── */
        .filter-tab {
          font-size: 0.95rem !important;
          font-weight: 500 !important;
          transition: background-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease !important;
        }
        .filter-tab:hover {
          background-color: #e8eaf6 !important;
          color: #3730a3 !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 6px 16px rgba(99,102,241,0.18) !important;
          border: none !important;
        }
        [data-theme="dark"] .filter-tab:hover {
          background-color: rgba(99,102,241,0.18) !important;
          color: #c7d2fe !important;
          box-shadow: 0 6px 16px rgba(99,102,241,0.3) !important;
        }
        .filter-tab.active {
          background-color: #e0e7ff !important;
          color: #4f46e5 !important;
          border: none !important;
          box-shadow: 0 2px 8px rgba(99,102,241,0.15) !important;
        }
        [data-theme="dark"] .filter-tab.active {
          background-color: rgba(99,102,241,0.22) !important;
          color: #a5b4fc !important;
        }
        .filter-tab:hover .filter-tab-img {
          transform: scale(1.12) !important;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        /* 📱 모바일 & 태블릿 디바이스 반응형 완벽 최적화 (768px 이하 & 480px 이하) */
        @media (max-width: 768px) {
          /* 헤더 영역 모바일 맞춤 콤팩트 배치 */
          header {
            padding: 10px 14px !important;
            flex-wrap: nowrap !important;
            gap: 6px !important;
          }
          header img {
            height: 32px !important;
          }
          .integrator-badge {
            display: none !important;
          }
          .mobile-hide-sync-badge,
          .mobile-hide-copy-tags {
            display: none !important;
          }
          header button {
            padding: 5px 10px !important;
            font-size: 0.75rem !important;
          }
          .login-btn-text-desktop {
            display: none !important;
          }
          .login-btn-text-mobile {
            display: inline !important;
            font-size: 0.75rem !important;
            font-weight: 800 !important;
          }

          /* 히어로 검색 배너 축소 */
          section {
            padding: 28px 14px 20px 14px !important;
          }
          section h2 {
            font-size: 1.45rem !important;
            line-height: 1.3 !important;
          }
          section p {
            font-size: 0.82rem !important;
            margin-bottom: 16px !important;
          }

          /* 메인 레이아웃 패딩 */
          main {
            padding: 14px 10px !important;
          }

          /* 가로 터치 스크롤 패널 (플랫폼 & 카테고리 탭) */
          .filter-row {
            display: flex !important;
            overflow-x: auto !important;
            -webkit-overflow-scrolling: touch !important;
            gap: 6px !important;
            padding: 4px 2px 8px 2px !important;
            scrollbar-width: none !important;
          }
          .filter-row::-webkit-scrollbar {
            display: none !important;
          }
          .filter-row button {
            flex-shrink: 0 !important;
            padding: 6px 12px !important;
            font-size: 0.78rem !important;
            white-space: nowrap !important;
          }

          /* 필터 조절 판넬 그리드 1열 스택 */
          .filter-dropdown-grid {
            grid-template-columns: 1fr !important;
            gap: 10px !important;
          }

          /* 카드 그리드 2열 커스텀 레이아웃 */
          .campaign-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .campaign-grid > div {
            min-height: 280px !important;
            height: auto !important;
          }
          .campaign-card-image {
            height: 110px !important;
          }
          .campaign-card-content {
            padding: 8px 10px 10px 10px !important;
          }
          .campaign-card-content h4 {
            font-size: 0.8rem !important;
            line-height: 1.3 !important;
            height: 32px !important;
            margin-bottom: 4px !important;
          }

          /* 키워드마스터 지표 3열 카드 모바일 1열 변환 */
          .keyword-modal-cards {
            grid-template-columns: 1fr !important;
            gap: 8px !important;
          }

          /* 모바일 모달 팝업 레이아웃 뷰포트 맞춤화 */
          div[style*="position: 'fixed'"][style*="zIndex: 1000"],
          div[style*="position: 'fixed'"][style*="zIndex: 99999"] {
            width: 94vw !important;
            max-width: 580px !important;
            max-height: 88vh !important;
            overflow-y: auto !important;
            padding: 16px !important;
            border-radius: 16px !important;
          }
        }

        /* 📱 초소형 모바일 기기 반응형 보정 (480px 이하: iPhone SE, Galaxy 등) */
        @media (max-width: 480px) {
          header {
            padding: 8px 10px !important;
          }
          header img {
            height: 28px !important;
          }
          .campaign-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .campaign-card-image {
            height: 98px !important;
          }
          .campaign-card-content h4 {
            font-size: 0.76rem !important;
            height: 30px !important;
          }
          div[style*="width: '450px'"],
          div[style*="width: '600px'"] {
            width: 95vw !important;
            padding: 16px 12px !important;
          }
        }
      `}</style>

    </div>
  );
}
