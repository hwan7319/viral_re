import type { Metadata } from 'next';
import { ContentPage } from '@/components/ContentPage';
export const metadata: Metadata = { title: '개인정보처리방침 | 바이럴리', description: '바이럴리 개인정보처리방침' };
export default function PrivacyPage() { return <ContentPage title="개인정보처리방침" description="시행일: 2026년 9월 21일">
  <h2>수집 항목과 목적</h2><p>소셜 로그인 시 제공되는 닉네임, 이메일, 프로필 이미지를 회원 식별과 관심 공고 저장에 사용합니다. 서비스 이용 기록과 쿠키는 보안, 오류 분석, 서비스 품질 개선에 사용합니다.</p>
  <h2>보유 기간과 문의</h2><p>정보는 이용 목적이 달성되거나 회원 탈퇴 시 지체 없이 파기합니다. 개인정보 관련 문의는 official@viral-re.com으로 접수할 수 있습니다.</p>
  <h2>광고 및 쿠키</h2><p>광고 서비스가 적용되는 경우 Google을 포함한 제3자가 쿠키, 웹 비콘, IP 주소 등으로 광고 제공과 측정을 위한 정보를 수집할 수 있습니다. 사용자는 브라우저 설정에서 쿠키를 관리할 수 있으며, Google의 데이터 사용 방식은 Google 파트너 사이트 데이터 안내에서 확인할 수 있습니다.</p>
</ContentPage>; }
