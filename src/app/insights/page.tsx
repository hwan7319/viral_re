import type { Metadata } from 'next';
import Link from 'next/link';
import { ContentPage } from '@/components/ContentPage';
import styles from './Insights.module.css';

export const metadata: Metadata = {
  title: '체험단 이용 자료 | 바이럴리',
  description: '방문형·배송형, 플랫폼별 미션, 지원 전 확인 사항과 공고 데이터 표시 기준을 정리한 바이럴리 이용 자료입니다.',
};

const articles = [
  ['01', '방문형·배송형 공고 비교', '매장 방문, 예약, 추가 비용과 배송·구매 조건을 같은 기준으로 확인하는 방법입니다.', '/insights/visit-delivery'],
  ['02', '플랫폼별 미션 확인법', '블로그·인스타그램·릴스·숏폼 공고에서 요구 사항을 놓치지 않는 방법입니다.', '/insights/platform-guide'],
  ['03', '지원 전 체크리스트', '마감일, 모집 정원, 비용, 콘텐츠 등록 기한을 확인하는 실전 순서입니다.', '/insights/application-checklist'],
  ['04', '데이터 표시 기준', '마감일·지원 현황·경쟁률이 표시되는 조건과 확인 불가의 의미를 설명합니다.', '/insights/data-standards'],
] as const;

export default function InsightsPage() {
  return <ContentPage title="체험단 이용 자료" description="공고를 빠르게 찾고, 내 채널과 일정에 맞는 지원인지 판단하는 데 필요한 기준을 정리했습니다.">
    <div className={styles.heroNote}><span><strong>UPDATED · 2026.10.14</strong><br />바이럴리의 공고 비교 기준과 원본 확인 원칙을 바탕으로 작성했습니다.</span><Link href="/methodology">수집 원칙 보기 →</Link></div>
    <p>체험단은 제공 혜택만으로 판단하기 어렵습니다. 방문 가능 시간, 구매·예약 조건, 콘텐츠 형식, 등록 기한처럼 실제 지원 결과에 영향을 주는 정보를 함께 읽어야 합니다. 아래 자료는 원본 공고를 최종 기준으로 두고, 바이럴리 검색 화면을 활용해 조건을 비교하는 방법을 안내합니다.</p>
    <div className={styles.grid}>
      {articles.map(([index, title, description, href]) => <Link key={href} href={href} className={styles.card}>
        <span className={styles.index}>GUIDE {index}</span><h2>{title}</h2><p>{description}</p><span className={styles.action}>자료 읽기 →</span>
      </Link>)}
    </div>
    <aside className={styles.standard}><h2>원본 공고를 다시 확인해야 하는 이유</h2><p>출처 사이트는 모집을 조기 마감하거나, 혜택·예약·미션 조건을 수정할 수 있습니다. 바이럴리는 공개 정보를 비교하기 쉽게 정리하지만 신청·선정·혜택 지급은 원본 출처가 담당합니다. 따라서 지원 버튼을 누르기 전에는 반드시 원본 링크에서 접수 상태와 세부 조건을 확인해야 합니다.</p></aside>
  </ContentPage>;
}
