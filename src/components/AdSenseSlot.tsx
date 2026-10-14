'use client';

import { useEffect, useRef } from 'react';

interface AdSenseSlotProps {
  client?: string;
  /** AdSense에서 발급한 실제 광고 단위 ID. 없으면 광고 요청을 보내지 않는다. */
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  layoutKey?: string;
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export default function AdSenseSlot({
  client = 'ca-pub-7845901609549313',
  slot,
  format = 'auto',
  layoutKey,
  style,
  className = '',
}: AdSenseSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    // 승인 전이거나 광고 단위가 설정되지 않았을 때는 빈 ins와 광고 요청을 만들지 않는다.
    if (!slot || isLoaded.current) return;

    let frameId = 0;
    let observer: ResizeObserver | undefined;
    const loadAd = () => {
      const element = adRef.current;
      if (!element || isLoaded.current || element.clientWidth === 0 || element.dataset.adsbygoogleStatus) return;
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        isLoaded.current = true;
        observer?.disconnect();
      } catch (error) {
        // AdSense가 이미 처리한 DOM에는 재요청하지 않는다. 실제 오류는 콘솔에 반복 출력하지 않는다.
        if (!element.dataset.adsbygoogleStatus) console.warn('AdSense 광고 단위를 불러오지 못했습니다.', error);
      }
    };

    observer = new ResizeObserver(loadAd);
    if (adRef.current) observer.observe(adRef.current);
    frameId = window.requestAnimationFrame(loadAd);
    return () => {
      window.cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [slot]);

  // 실제 슬롯 ID가 배포 환경에 설정되기 전에는 광고 영역을 렌더링하지 않는다.
  if (!slot) return null;

  return (
    <div className={`adsense-wrapper ${className}`} style={{ width: '100%', overflow: 'hidden', ...style }}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '1px' }}
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        data-full-width-responsive="true"
      />
    </div>
  );
}
