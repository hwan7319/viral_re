import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentPage';
import { InsightsNav } from '@/components/InsightsNav';

export const metadata: Metadata = { title: '체험단 지원 전 체크리스트 | 바이럴리', description: '마감일, 모집 정원, 비용, 예약, 콘텐츠 등록 기한을 확인하는 체험단 지원 체크리스트입니다.' };

export default function ApplicationChecklistPage() {
  return <ContentPage title="지원 버튼을 누르기 전, 다섯 가지를 확인하세요" description="혜택만 보고 지원하면 예약 비용이나 콘텐츠 등록 조건을 놓치기 쉽습니다.">
    <p><strong>최종 업데이트: 2026년 10월 14일</strong></p>
    <h2>1. 아직 모집 중인가요?</h2><p>목록의 마감일은 비교를 위한 정보입니다. 조기 마감, 인원 충원, 원본 수정이 가능하므로 지원 직전에 원본 상세의 접수 상태를 확인하세요.</p>
    <h2>2. 제공 범위와 본인 부담은 무엇인가요?</h2><p>제공 금액·상품 수량뿐 아니라 초과 금액, 배송비, 예약금, 동반 인원 제한을 함께 읽습니다. ‘구매 후 리뷰’ 방식이라면 구매와 환급 조건을 분리해 확인해야 합니다.</p>
    <h2>3. 일정에 맞나요?</h2><p>방문 가능일, 배송 수령일, 게시물 등록 기한을 달력에 옮겨 봅니다. 휴무일이나 예약 불가 시간은 원본에서만 확인되는 경우가 많습니다.</p>
    <h2>4. 내 채널이 조건에 맞나요?</h2><p>요구 플랫폼, 공개 계정 여부, 콘텐츠 형식, 사진·영상 수, 필수 문구를 확인합니다. 지키기 어려운 조건이 있다면 지원 전에 출처 사이트의 문의 채널로 확인하세요.</p>
    <h2>5. 원본 정책을 읽었나요?</h2><p>선정, 취소, 개인정보 처리, 후기 미등록 시 조치 등은 공고 출처가 운영합니다. 바이럴리는 신청을 대행하지 않으므로 원본 규정을 기준으로 판단해야 합니다.</p>
    <InsightsNav />
  </ContentPage>;
}
