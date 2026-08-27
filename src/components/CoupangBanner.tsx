'use client';

import { useMemo } from 'react';

interface CoupangBannerProps {
  id?: number;
  template?: string;
  trackingCode?: string;
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export default function CoupangBanner({
  id = 1023017,
  template = 'carousel',
  trackingCode = 'AF5060942',
  width = '100%',
  height = '140',
  className = '',
  style,
}: CoupangBannerProps) {
  const iframeSrcDoc = useMemo(() => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: transparent; display: flex; justify-content: center; align-items: center; }
  </style>
</head>
<body>
  <script src="https://ads-partners.coupang.com/g.js"></script>
  <script>
    try {
      new PartnersCoupang.G({"id":${id},"template":"${template}","trackingCode":"${trackingCode}","width":"100%","height":"${height}","tsource":""});
    } catch(e) {}
  </script>
</body>
</html>`;
  }, [id, template, trackingCode, height]);

  return (
    <div
      className={`coupang-banner-wrapper ${className}`}
      style={{
        width: '100%',
        margin: '28px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '16px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        padding: '16px 12px 12px 12px',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      <div style={{ width: '100%', maxWidth: '100%', display: 'flex', justifyContent: 'center' }}>
        <iframe
          srcDoc={iframeSrcDoc}
          width="100%"
          height={typeof height === 'number' ? `${height}px` : height === '140' ? '140' : height}
          frameBorder="0"
          scrolling="no"
          referrerPolicy="unsafe-url"
          style={{
            border: 'none',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '100%',
            height: '140px',
            backgroundColor: 'transparent',
          }}
        />
      </div>

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
