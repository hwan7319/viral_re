import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
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
};

export const metadata: Metadata = {
  title: '체험픽 (cheheumpick) | 블로그 & SNS 체험단 프리미엄 큐레이션 마켓플레이스',
  description: '17대 검증된 체험단 플랫폼의 라이브 체험단을 한눈에 검색하고 큐레이션 받으세요. 실시간 스마트 필터와 정밀 데이터 기반 체험단 큐레이션.',
  keywords: ['체험픽', 'cheheumpick', '체험단', '블로그체험단', '인스타그램체험단', '체험단모아보기', '마켓플레이스'],
  authors: [{ name: 'cheheumpick Team' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${inter.variable} ${notoSansKr.variable}`} data-theme="light">
      <head>
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
