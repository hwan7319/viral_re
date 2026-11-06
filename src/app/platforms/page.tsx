import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentPage';

export const metadata: Metadata = {
  title: '체험단 플랫폼 비교 | 바이럴리',
  description: '바이럴리가 공개 공고를 비교하는 체험단 출처와 원본 확인 방법을 안내합니다.',
};

const platforms = [
  ['레뷰', '맛집·제품 등 다양한 공개 모집 공고를 제공하는 체험단 플랫폼입니다.', 'https://www.revu.net/campaign/search'],
  ['디너의여왕', '외식·방문형 공고를 중심으로 모집 정보를 확인할 수 있습니다.', 'https://dinnerqueen.net/taste'],
  ['리뷰노트', '지역·카테고리별 공개 체험단 공고를 탐색할 수 있습니다.', 'https://www.reviewnote.co.kr/'],
  ['리뷰플레이스', '방문·제품·콘텐츠 유형별 모집 공고를 확인할 수 있습니다.', 'https://www.reviewplace.co.kr/pr/'],
  ['강남맛집', '지역 기반의 공개 체험단 모집 공고를 확인할 수 있습니다.', 'https://xn--939au0g4vj8sq.net/cp/'],
  ['포블로그', '블로그와 SNS 체험단 모집 공고를 확인할 수 있습니다.', 'https://www.4blog.net/'],
  ['클라우드리뷰', '여러 플랫폼의 공개 캠페인을 운영하는 체험단 사이트입니다.', 'https://cloudreview.co.kr/'],
  ['링블', '방문·배송형 등 공개 캠페인 모집 정보를 제공합니다.', 'https://www.ringble.co.kr/'],
  ['놀러와체험단', '지역 기반 방문형과 제품 관련 공고를 확인할 수 있습니다.', 'https://www.cometoplay.kr/'],
  ['미블', '블로그·SNS 채널 대상의 공개 체험단 공고를 제공합니다.', 'https://www.mrblog.net/'],
  ['아싸뷰', '다양한 플랫폼과 유형의 공개 모집 공고를 확인할 수 있습니다.', 'https://assaview.co.kr/'],
  ['모블', '공개 모집 공고와 신청 조건을 안내하는 체험단 사이트입니다.', 'https://www.modublog.co.kr/'],
  ['오마이블로그', '블로그 체험단 공개 모집 정보를 확인할 수 있습니다.', 'https://ohmyblog.co.kr/'],
] as const;

export default function PlatformsPage() {
  return <ContentPage title="어느 체험단 사이트를 비교하나요?" description="출처마다 모집 유형, 표시 방식, 신청 조건이 다릅니다. 바이럴리는 공개 공고를 같은 검색 화면에서 찾을 수 있게 정리하고, 지원은 원본 사이트에서 진행하도록 안내합니다.">
    <p><strong>최종 업데이트: 2026년 10월 29일</strong></p>
    <h2>출처별 비교가 필요한 이유</h2>
    <p>같은 ‘맛집 체험단’이라도 플랫폼마다 모집 기간, 제공 혜택, 예약 방식, 지원 채널, 콘텐츠 등록 기한의 표기 방식이 다를 수 있습니다. 바이럴리에서는 조건을 먼저 좁힌 뒤, 지원 직전에 원본 공고를 열어 최신 상태와 세부 규정을 확인할 수 있습니다.</p>
    <h2>현재 비교 가능한 공개 출처</h2>
    <ul>
      {platforms.map(([name, description, url]) => <li key={name}><strong>{name}</strong> — {description} <a href={url} target="_blank" rel="noreferrer">원본 사이트 열기</a></li>)}
    </ul>
    <h2>원본 공고에서 확인할 항목</h2>
    <ol>
      <li>모집 마감일과 실제 접수 가능 상태</li>
      <li>방문 예약, 구매·배송비, 초과 금액 등 비용 조건</li>
      <li>지원 채널, 사진·영상 수, 필수 키워드와 콘텐츠 등록 기한</li>
      <li>선정·취소·개인정보 처리 등 출처별 운영 정책</li>
    </ol>
    <p>바이럴리는 신청을 대행하거나 선정 결과를 보장하지 않습니다. 출처가 공개한 정보와 원본 공고를 기준으로 판단해 주세요.</p>
  </ContentPage>;
}
