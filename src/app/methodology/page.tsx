import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentPage';
export const metadata: Metadata = { title: '데이터 수집 및 검증 원칙 | 바이럴리', description: '바이럴리의 공개 공고 데이터 수집, 갱신, 검증 및 표시 원칙입니다.' };
export default function MethodologyPage() { return <ContentPage title="데이터 수집과 검증 원칙" description="바이럴리는 공개된 체험단 공고를 출처별 규칙에 따라 수집하고, 확인 근거를 함께 관리합니다.">
  <h2>수집 범위</h2><p>공개 목록과 상세 페이지에서 제목, 플랫폼, 지역, 제공 혜택, 마감일, 모집 인원 등 공고 비교에 필요한 항목을 수집합니다. 로그인·결제·비공개 정보는 수집하지 않습니다.</p>
  <h2>갱신과 검증</h2><p>전체 출처 동기화는 정기적으로 실행되며, 출처별 수집 성공 여부와 수집 건수를 기록합니다. 상세 페이지나 공식 API로 확인된 데이터는 목록 정보보다 높은 검증 기준으로 보존합니다.</p>
  <h2>제한 사항</h2><p>원본 출처의 화면 변경, 접속 제한, 공고 삭제에 따라 정보가 지연되거나 비어 있을 수 있습니다. 바이럴리는 누락된 값을 임의의 날짜나 숫자로 채우지 않으며, 신청의 최종 기준은 원본 공고입니다.</p>
</ContentPage>; }
