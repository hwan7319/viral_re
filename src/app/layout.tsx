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
  title: 'viral_re (바이럴리) | 블로그 & SNS 체험단 통합 검색 플랫폼',
  description: '레뷰, 디너의여왕, 강남맛집 등 40여 개 체험단 플랫폼의 모든 정보를 한 곳에서! 카테고리별, 지역별, 플랫폼별 실시간 스마트 통합 필터로 나에게 딱 맞는 체험단을 찾아보세요.',
  keywords: ['체험단', '블로그체험단', '인스타그램체험단', '체험단모아보기', '인플렉서', '다나와체험단', '마케팅', 'viral_re', '바이럴리'],
  authors: [{ name: 'viral_re Team' }],
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
