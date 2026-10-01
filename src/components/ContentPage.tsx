import Link from 'next/link';

export function ContentPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px 72px', lineHeight: 1.8 }}>
    <Link href="/" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: 700 }}>← 바이럴리 체험단 검색</Link>
    <h1 style={{ margin: '28px 0 8px', fontSize: '2rem' }}>{title}</h1>
    <p style={{ color: '#475569', fontSize: '1.05rem', marginTop: 0 }}>{description}</p>
    <nav aria-label="안내 페이지" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 20, fontSize: '.95rem' }}>
      <Link href="/about">서비스 소개</Link><Link href="/guide">지원 가이드</Link><Link href="/methodology">수집 원칙</Link><Link href="/faq">자주 묻는 질문</Link>
    </nav>
    <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 28, paddingTop: 12 }}>{children}</div>
    <footer style={{ marginTop: 48, borderTop: '1px solid #e2e8f0', paddingTop: 20, color: '#64748b', fontSize: '.9rem' }}>바이럴리 · 문의: <a href="mailto:official@viral-re.com">official@viral-re.com</a></footer>
  </main>;
}
