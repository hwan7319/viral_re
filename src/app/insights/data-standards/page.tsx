import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentPage';
import { InsightsNav } from '@/components/InsightsNav';

export const metadata: Metadata = { title: '체험단 데이터 표시 기준 | 바이럴리', description: '바이럴리가 마감일, 모집 정원, 지원 현황, 경쟁률, 플랫폼을 표시하고 검증하는 기준입니다.' };

export default function DataStandardsPage() {
  return <ContentPage title="공고 데이터는 어떤 기준으로 표시하나요?" description="보기에 좋은 숫자를 만들기보다, 원본에서 확인할 수 있는 정보와 확인할 수 없는 정보를 구분합니다.">
    <p><strong>최종 업데이트: 2026년 10월 14일</strong></p>
    <h2>마감일</h2><p>출처가 공개한 모집 기간, 마감일 또는 D-day를 바탕으로 표시합니다. 선착순처럼 고정 날짜가 없거나 원본에서 확인되지 않는 경우에는 임의 날짜를 만들지 않고 ‘확인 필요’ 또는 ‘확인 불가’로 표시할 수 있습니다.</p>
    <h2>모집 정원·지원 현황·경쟁률</h2><p>모집 정원과 지원자 수가 공개된 경우에만 표시합니다. 두 값이 모두 확인될 때만 경쟁률을 계산합니다. 한 값이라도 없으면 추정 경쟁률을 만들지 않습니다.</p>
    <h2>플랫폼·지역·모집 유형</h2><p>제목, 공개 설명, 위치, 상세 미션의 근거를 함께 확인해 분류합니다. 방문형은 위치 또는 방문 안내가, 배송형은 배송·택배·온라인 같은 명시적 근거가 있을 때만 노출합니다. 근거가 부족한 공고는 해당 필터에서 제외될 수 있습니다.</p>
    <h2>오류를 발견했다면</h2><p>원본 공고의 제목, 출처 사이트, 링크, 화면에서 확인한 내용을 <a href="mailto:official@viral-re.com">official@viral-re.com</a>으로 보내주세요. 공개된 원문과 비교해 수정하고, 같은 유형의 오류가 반복되지 않도록 수집 규칙과 회귀 검증을 보완합니다.</p>
    <InsightsNav />
  </ContentPage>;
}
