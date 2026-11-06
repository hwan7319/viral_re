import Link from 'next/link';
import styles from './ServiceValue.module.css';

const benefits = [
  ['13개 공개 출처', '여러 체험단 사이트의 공개 모집 정보를 한 번에 탐색합니다.'],
  ['5가지 조건 검색', '모집유형·카테고리·플랫폼·지역·출처를 함께 조합합니다.'],
  ['원본 기준 확인', '마감일·혜택·미션은 원본 공고 링크에서 최종 확인할 수 있습니다.'],
] as const;

export default function ServiceValue({ currentCount }: { currentCount: number }) {
  return <section className={styles.section} aria-labelledby="service-value-title">
    <div className={styles.copy}>
      <p className={styles.eyebrow}>ONE SEARCH, CLEARER CHOICES</p>
      <h1 id="service-value-title">흩어진 체험단 공고를<br />같은 기준으로 비교하세요.</h1>
      <p>바이럴리는 공개된 모집 정보를 모아, 지원 전에 필요한 조건을 빠르게 비교하도록 돕습니다. 신청과 최종 조건 확인은 언제나 원본 공고에서 진행합니다.</p>
      <div className={styles.actions}>
        <Link href="/about">서비스가 하는 일</Link>
        <Link href="/methodology">수집·검증 기준</Link>
      </div>
    </div>
    <div className={styles.metrics}>
      <div className={styles.current}><span>현재 조건에 맞는 공고</span><strong>{currentCount.toLocaleString()}<small>개</small></strong></div>
      {benefits.map(([title, description]) => <div className={styles.metric} key={title}>
        <strong>{title}</strong><span>{description}</span>
      </div>)}
    </div>
  </section>;
}
