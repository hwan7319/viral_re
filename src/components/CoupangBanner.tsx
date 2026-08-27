'use client';

import { useEffect, useRef } from 'react';

interface CoupangBannerProps {
  bannerUrl?: string;
  trackingCode?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export default function CoupangBanner({
  bannerUrl,
  trackingCode = 'AF1234567',
  width = '100%',
  height = '140px',
  className = '',
  style,
}: CoupangBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Inject Coupang script if dynamic script HTML is provided
    if (bannerUrl && bannerUrl.includes('<script')) {
      if (containerRef.current) {
        containerRef.current.innerHTML = bannerUrl;
        const scripts = containerRef.current.querySelectorAll('script');
        scripts.forEach((oldScript) => {
          const newScript = document.createElement('script');
          Array.from(oldScript.attributes).forEach((attr) => {
            newScript.setAttribute(attr.name, attr.value);
          });
          newScript.appendChild(document.createTextNode(oldScript.innerHTML));
          oldScript.parentNode?.replaceChild(newScript, oldScript);
        });
      }
    }
  }, [bannerUrl]);

  return (
    <div
      className={`coupang-banner-wrapper ${className}`}
      style={{
        width: '100%',
        margin: '24px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...style,
      }}
    >
      {bannerUrl && bannerUrl.startsWith('http') ? (
        <iframe
          src={bannerUrl}
          width={width}
          height={height}
          frameBorder="0"
          scrolling="no"
          referrerPolicy="unsafe-url"
          style={{ border: 'none', borderRadius: '8px', maxWidth: '100%' }}
        />
      ) : bannerUrl && bannerUrl.includes('<script') ? (
        <div ref={containerRef} style={{ width: '100%', minHeight: typeof height === 'number' ? `${height}px` : height }} />
      ) : (
        /* 기본 쿠팡 파트너스 추천 배너 위젯 (Coupang Partners Default Banner) */
        <div
          onClick={() =>
            window.open(
              `https://link.coupang.com/a/bCoupangSearch?trackingCode=${trackingCode}`,
              '_blank',
              'noopener,noreferrer'
            )
          }
          style={{
            width: '100%',
            padding: '20px 24px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #e62329 0%, #ca1b21 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(230, 35, 41, 0.25)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                color: '#e62329',
                fontWeight: 900,
                fontSize: '1.2rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              C
            </div>
            <div>
              <h5 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                쿠팡 로켓배송 최저가 특가전
              </h5>
              <p style={{ fontSize: '0.82rem', margin: '4px 0 0 0', color: 'rgba(255, 255, 255, 0.9)' }}>
                오늘의 추천 상품 & 타임딜 혜택을 확인해보세요!
              </p>
            </div>
          </div>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: '#ffffff',
              color: '#ca1b21',
              fontWeight: 800,
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            특가 상품 보기 →
          </button>
        </div>
      )}

      {/* 공정위 문구 준수 (Fair Trade Commission Compliance) */}
      <span
        style={{
          marginTop: '6px',
          fontSize: '0.7rem',
          color: 'var(--text-tertiary, #94a3b8)',
          textAlign: 'center',
        }}
      >
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </span>
    </div>
  );
}
