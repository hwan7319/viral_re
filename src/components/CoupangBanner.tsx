'use client';

import { useEffect, useRef } from 'react';

interface CoupangBannerProps {
  id?: number;
  template?: string;
  trackingCode?: string;
  width?: string | number;
  height?: string | number;
  bannerUrl?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function CoupangBanner({
  id = 1023017,
  template = 'carousel',
  trackingCode = 'AF5060942',
  width = '680',
  height = '140',
  bannerUrl,
  className = '',
  style,
}: CoupangBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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
      return;
    }

    const loadCoupangWidget = () => {
      try {
        // @ts-ignore
        if (window.PartnersCoupang && window.PartnersCoupang.G) {
          if (containerRef.current) {
            containerRef.current.innerHTML = '';
          }
          // @ts-ignore
          new window.PartnersCoupang.G({
            id,
            template,
            trackingCode,
            width: String(width),
            height: String(height),
            tsource: '',
          });
        }
      } catch (err) {
        console.error('Coupang Partners widget init error:', err);
      }
    };

    const scriptId = 'coupang-partners-g-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://ads-partners.coupang.com/g.js';
      script.async = true;
      script.onload = loadCoupangWidget;
      document.head.appendChild(script);
    } else {
      // If script is already loaded
      loadCoupangWidget();
    }
  }, [id, template, trackingCode, width, height, bannerUrl]);

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
        overflow: 'hidden',
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
      ) : (
        <div
          ref={containerRef}
          style={{
            width: '100%',
            maxWidth: '100%',
            minHeight: typeof height === 'number' ? `${height}px` : `${height}px`,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        />
      )}

      {/* 공정위 문구 준수 (Fair Trade Commission Compliance) */}
      <span
        style={{
          marginTop: '8px',
          fontSize: '0.72rem',
          color: 'var(--text-tertiary, #94a3b8)',
          textAlign: 'center',
        }}
      >
        이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </span>
    </div>
  );
}
