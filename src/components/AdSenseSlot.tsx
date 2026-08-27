'use client';

import { useEffect, useRef } from 'react';

interface AdSenseSlotProps {
  client?: string;
  slot?: string;
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal' | 'vertical';
  layoutKey?: string;
  style?: React.CSSProperties;
  className?: string;
}

export default function AdSenseSlot({
  client = 'ca-pub-7845901609549313',
  slot,
  format = 'auto',
  layoutKey,
  style,
  className = '',
}: AdSenseSlotProps) {
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    try {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isLoaded.current = true;
      }
    } catch (err) {
      console.error('Google AdSense load error:', err);
    }
  }, []);

  return (
    <div className={`adsense-wrapper ${className}`} style={{ width: '100%', overflow: 'hidden', ...style }}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', minHeight: '90px' }}
        data-ad-client={client}
        {...(slot ? { 'data-ad-slot': slot } : {})}
        data-ad-format={format}
        {...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {})}
        data-full-width-responsive="true"
      />
    </div>
  );
}
