import Link from 'next/link';
import styles from './ContentPage.module.css';

export function ContentPage({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <main className={styles.page}>
    <div className={styles.container}>
      <Link href="/" className={styles.back}>← 체험단 검색으로 돌아가기</Link>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>VIRALRE RESOURCE</span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
        <nav aria-label="안내 페이지" className={styles.nav}>
          <Link href="/about">서비스 소개</Link><Link href="/guide">지원 가이드</Link><Link href="/methodology">수집 원칙</Link><Link href="/faq">자주 묻는 질문</Link><Link href="/insights">체험단 이용 자료</Link>
        </nav>
      </header>
      <article className={styles.content}>{children}</article>
      <footer className={styles.footer}><span>바이럴리 · 공개 공고 비교를 위한 정보 탐색 서비스</span><a href="mailto:official@viral-re.com">official@viral-re.com</a></footer>
    </div>
  </main>;
}
