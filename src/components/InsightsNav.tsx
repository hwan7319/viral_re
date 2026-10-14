import Link from 'next/link';

const articles = [
  { href: '/insights/visit-delivery', title: '방문형·배송형 공고 비교' },
  { href: '/insights/platform-guide', title: '플랫폼별 미션 확인법' },
  { href: '/insights/application-checklist', title: '지원 전 체크리스트' },
  { href: '/insights/data-standards', title: '데이터 표시 기준' },
];

export function InsightsNav() {
  return <nav aria-label="체험단 이용 자료" style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
    <strong style={{ display: 'block', marginBottom: 10 }}>바이럴리 이용 자료</strong>
    <ul style={{ display: 'grid', gap: 8, paddingLeft: 20 }}>
      {articles.map(article => <li key={article.href}><Link href={article.href} style={{ color: '#2563eb', textDecoration: 'underline' }}>{article.title}</Link></li>)}
    </ul>
  </nav>;
}
