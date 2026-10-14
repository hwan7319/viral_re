import Link from 'next/link';
import styles from './TrustContent.module.css';

const resources = [
  ['01', '모집 유형 비교', '방문·배송 공고의 예약, 구매, 등록 기한을 나눠 확인합니다.', '/insights/visit-delivery'],
  ['02', '플랫폼별 미션', '블로그·인스타그램·릴스·숏폼의 필수 조건을 살펴봅니다.', '/insights/platform-guide'],
  ['03', '지원 전 체크', '마감일, 비용, 일정, 원본 정책을 확인하는 순서입니다.', '/insights/application-checklist'],
  ['04', '데이터 표시 기준', '확인 가능한 정보와 확인 불가 정보의 기준을 설명합니다.', '/insights/data-standards'],
] as const;

export default function TrustContent() {
  return <section aria-labelledby="service-guide-title" className={styles.section}>
    <div className={styles.shell}>
      <div className={styles.top}>
        <div>
          <p className={styles.eyebrow}>VIRALRE FIELD GUIDE</p>
          <h2 id="service-guide-title" className={styles.title}>공고를 찾는 것에서<br />좋은 지원을 고르는 것까지.</h2>
          <p className={styles.copy}>혜택만 비교하면 예약 조건, 자부담, 콘텐츠 등록 기한을 놓치기 쉽습니다. 바이럴리는 공고 탐색 뒤에 필요한 판단 기준까지 함께 제공합니다.</p>
        </div>
        <div className={styles.steps} aria-label="이용 순서">
          <div className={styles.step}><b>1</b><span>조건으로 공고를 빠르게 좁히기</span></div>
          <div className={styles.step}><b>2</b><span>혜택·마감일·미션 함께 비교하기</span></div>
          <div className={styles.step}><b>3</b><span>원본 공고에서 최종 조건 확인하기</span></div>
        </div>
      </div>
      <div className={styles.grid}>
        {resources.map(([number, title, description, href]) => <Link key={href} href={href} className={styles.card}>
          <span className={styles.number}>{number}</span><strong>{title} <span aria-hidden>↗</span></strong><span>{description}</span>
        </Link>)}
      </div>
      <div className={styles.links}><Link href="/insights">이용 자료 전체 보기</Link><Link href="/methodology">데이터 수집·검증 원칙</Link></div>
    </div>
  </section>;
}
