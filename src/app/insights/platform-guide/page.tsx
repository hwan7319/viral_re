import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentPage';
import { InsightsNav } from '@/components/InsightsNav';

export const metadata: Metadata = { title: '블로그·릴스·인스타그램 체험단 미션 확인법 | 바이럴리', description: '플랫폼별 체험단 공고에서 콘텐츠 형식, 필수 문구, 등록 기한을 확인하는 방법입니다.' };

export default function PlatformGuidePage() {
  return <ContentPage title="플랫폼별 체험단 미션, 이렇게 읽으세요" description="같은 혜택이라도 게시 플랫폼과 콘텐츠 형식에 따라 준비 시간과 필요한 자료가 달라집니다.">
    <p><strong>최종 업데이트: 2026년 10월 14일</strong></p>
    <h2>블로그 공고</h2>
    <p>사진 수, 글 분량, 지도·링크 삽입, 제목과 본문의 필수 키워드를 확인합니다. 검색 노출을 보장한다는 표현보다 실제로 작성 가능한 주제인지와 수정 요청 범위를 먼저 판단하세요.</p>
    <h2>인스타그램·릴스·숏폼 공고</h2>
    <p>피드, 릴스, 스토리 중 무엇을 요구하는지 구분합니다. 영상 길이, 자막·음원 사용 조건, 태그·해시태그, 공동 게시 여부, 게시 유지 기간을 확인해야 합니다. 계정 공개 여부나 팔로워 수 같은 자격 조건도 원문에 명시될 수 있습니다.</p>
    <h2>복수 플랫폼 공고</h2>
    <p>블로그와 인스타그램을 함께 요구하면 각 채널의 게시 기한이 같은지 확인하세요. 한 플랫폼만 가능한 경우에는 지원 전에 출처 사이트의 안내를 확인하는 편이 안전합니다. 바이럴리의 플랫폼 필터는 공개된 공고 문구를 정리한 탐색 도구이며, 최종 미션은 원본 공고가 기준입니다.</p>
    <h2>지원 전 질문 세 가지</h2>
    <ul><li>내 채널 형식과 공고의 요구 형식이 일치하는가?</li><li>필수 키워드·태그·수정 요청 범위를 지킬 수 있는가?</li><li>게시 후 유지 기간과 등록 기한을 확인했는가?</li></ul>
    <InsightsNav />
  </ContentPage>;
}
