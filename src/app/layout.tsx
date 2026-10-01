import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const notoSansKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-noto-sans-kr',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'viral_re (바이럴리) | 블로그 & SNS 체험단 통합 검색 플랫폼',
  description: '주요 체험단 사이트의 공개 공고를 카테고리, 지역, 플랫폼, 마감일 기준으로 비교하는 통합 탐색 서비스입니다.',
  keywords: ['체험단', '블로그체험단', '인스타그램체험단', '체험단모아보기', '체험단 검색', '체험단 가이드', '바이럴리'],
  authors: [{ name: 'viral_re Team' }],
  other: {
    'google-adsense-account': 'ca-pub-7845901609549313',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${notoSansKr.variable}`} data-theme="light">
      <head>
        <meta name="google-adsense-account" content="ca-pub-7845901609549313" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7845901609549313"
          crossOrigin="anonymous"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  var theme = savedTheme || 'light';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
