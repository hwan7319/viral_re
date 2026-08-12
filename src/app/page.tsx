'use client';

import { useState, useEffect } from 'react';
import { Campaign } from '@/lib/db';

// SVG 아이콘 컴포넌트 모음 (외부 패키지 없이 완벽히 구동되도록 인라인 구현)
const Icons = {
  Search: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.25rem', height: '1.25rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.602 10.602Z" />
    </svg>
  ),
  Refresh: ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} style={{ width: '1.25rem', height: '1.25rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  ),
  Heart: ({ filled, className }: { filled?: boolean; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className} style={{ width: '1.25rem', height: '1.25rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  ),
  MapPin: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1rem', height: '1rem', display: 'inline-block', verticalAlign: 'text-bottom' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
    </svg>
  ),
  ExternalLink: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1rem', height: '1rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  ),
  Sun: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.25rem', height: '1.25rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21M5.25 12h2.25m9 0h2.25m-11.25 6.75 1.5-1.5m9.75-9.75 1.5-1.5m-12.75 0 1.5 1.5m9.75 9.75 1.5 1.5M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" />
    </svg>
  ),
  Moon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.25rem', height: '1.25rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
    </svg>
  ),
  Close: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '1.5rem', height: '1.5rem' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  ),
};

const SIDO_QUICK_TABS = [
  { key: 'all', label: '전국' },
  { key: '서울', label: '서울' },
  { key: '경기', label: '경기' },
  { key: '인천', label: '인천' },
  { key: '부산', label: '부산' },
  { key: '대구', label: '대구' },
  { key: '광주', label: '광주' },
  { key: '대전', label: '대전' },
  { key: '울산', label: '울산' },
  { key: '강원', label: '강원' },
  { key: '충북', label: '충북' },
  { key: '충남', label: '충남' },
  { key: '전북', label: '전북' },
  { key: '전남', label: '전남' },
  { key: '경북', label: '경북' },
  { key: '경남', label: '경남' },
  { key: '제주', label: '제주' }
];

// 💻📱 상단 가로 롤링 배너 광고 샘플 슬라이드 데이터
const AD_SLIDES = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '화장품 & 에스테틱 프리미엄 뷰티 체험단 모집',
    desc: '신상 크림부터 유명 네일숍 왁싱케어권까지 무상 혜택 대모집!',
    link: 'https://viral-re.vercel.app'
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '동네 한우 & 삼겹살 맛집 탐방단 모집',
    desc: '푸짐한 고기 식사권과 디저트 혜택! 맛집 블로거라면 지금 신청하세요.',
    link: 'https://viral-re.vercel.app'
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '럭셔리 독채 풀빌라 무료 숙박권 찬스',
    desc: '이번 주말은 오션뷰 힐링! SNS 전용 여행 크리에이터 선착순 매칭 중입니다.',
    link: 'https://viral-re.vercel.app'
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '최신 IT 기기 / 이어폰 리뷰 원정대',
    desc: '아이패드 및 스마트폰 주변기기 무상 대여 체험 및 우수자 경품 증정!',
    link: 'https://viral-re.vercel.app'
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&h=240&q=80',
    title: '가을 신상 데일리 캐주얼 패션 협찬',
    desc: '스타일리시한 니트와 아우터 무상 제공! 블로그 & 인스타 마케터 선착순 마감.',
    link: 'https://viral-re.vercel.app'
  }
];

export default function Home() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  // 검색 & 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState(''); // 사용자가 타이핑 중인 입력창 상태
  const [isSearchFocused, setIsSearchFocused] = useState(false); // 검색창 포커스 여부
  const [currentTrendIndex, setCurrentTrendIndex] = useState(0); // 롤링 중인 검색어 인덱스
  const [isTrendDropdownOpen, setIsTrendDropdownOpen] = useState(false); // 실시간 검색어 팝업 여부
  const [isHistoryEnabled, setIsHistoryEnabled] = useState(true); // 최근 검색 기록 허용 여부
  const [isTypeOpen, setIsTypeOpen] = useState(false); // 모집유형 상세검색 아코디언 토글
  const [isPlatformOpen, setIsPlatformOpen] = useState(false); // 플랫폼 상세검색 아코디언 토글
  const [trendingKeywords, setTrendingKeywords] = useState<{ rank: number; word: string }[]>([]); // 🔑 실시간 인기 검색어 상태
  const [activePlatform, setActivePlatform] = useState('all');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeLocation, setActiveLocation] = useState('all');
  const [selectedSido, setSelectedSido] = useState('all'); // 광역시도 선택 상태
  const [selectedSigungu, setSelectedSigungu] = useState('all'); // 시군구 선택 상태
  const [hoveredSido, setHoveredSido] = useState('all'); // 마우스 호버 중인 시도 상태
  const [isLocationOpen, setIsLocationOpen] = useState(false); // 지역 상세검색 아코디언 토글
  const [activeSite, setActiveSite] = useState('all');
  const [activeType, setActiveType] = useState('all'); // 'all' | 'visit' | 'delivery'
  const [isCategoryOpen, setIsCategoryOpen] = useState(false); // 카테고리 상세검색 아코디언 토글
  const [sortBy, setSortBy] = useState('latest');

  // 상세 모달 상태
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  // 모바일 하단 플로팅 앵커 광고 노출 상태
  const [showStickyAd, setShowStickyAd] = useState(true);

  // 우측 하단 탑 버튼(Scroll to Top) 노출 상태
  const [showScrollTop, setShowScrollTop] = useState(false);

  // 스크롤 감지 및 탑 버튼 제어
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 상단 광고 캐러셀 인덱스 상태
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // 상단 광고 자동 롤링 효과 (4초 간격)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % AD_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handlePrevAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentAdIndex((prev) => (prev - 1 + AD_SLIDES.length) % AD_SLIDES.length);
  };

  const handleNextAd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentAdIndex((prev) => (prev + 1) % AD_SLIDES.length);
  };

  // 다크모드 상태
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // 소셜 로그인 및 사용자 세션 상태
  const [user, setUser] = useState<{ name: string; email: string; avatar: string; provider: string } | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  // 프론트엔드 성능 최적화: 초기 노출 카드 제한 및 더보기 페이징
  const [visibleCount, setVisibleCount] = useState(12);

  // 검색 히스토리 상태
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [placeholderText, setPlaceholderText] = useState('식당명, 제품명, 지역명 등을 검색해보세요');

  // 모바일 화면 크기에 따라 검색창 플레이스홀더 문구 반응형 최적화
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setPlaceholderText('식당, 제품, 지역명 검색');
      } else {
        setPlaceholderText('식당명, 제품명, 지역명 등을 검색해보세요');
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 광역시도/시군구 선택이 바뀔 때 activeLocation 상태 동기화 처리
  useEffect(() => {
    if (selectedSido === 'all') {
      setActiveLocation('all');
    } else {
      if (selectedSigungu === 'all') {
        setActiveLocation(selectedSido);
      } else {
        setActiveLocation(`${selectedSido} ${selectedSigungu}`);
      }
    }
  }, [selectedSido, selectedSigungu]);

  // 컴포넌트 마운트 시 초기 설정
  useEffect(() => {
    // 테마 설정 가져오기
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);

    // 최근 검색어 가져오기
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      try {
        setSearchHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error(e);
      }
    }

    // 최근 검색 저장 여부 가져오기
    const savedHistoryEnabled = localStorage.getItem('isHistoryEnabled');
    if (savedHistoryEnabled !== null) {
      setIsHistoryEnabled(savedHistoryEnabled === 'true');
    }



    fetchTrendingKeywords();
    fetchCampaigns();

    // 🔑 소셜 로그인 가상 세션 메신저 리스너 등록 + 백엔드 DB 세션 연동
    const handleMessage = async (event: MessageEvent) => {
      if (event.data && event.data.type === 'MOCK_LOGIN_SUCCESS') {
        const loggedUser = event.data.user;
        
        try {
          // 1. 소셜 ID 임의 고유 생성 (이메일 기반)
          const mockId = `${loggedUser.provider.toLowerCase()}_${loggedUser.email.replace(/[^a-zA-Z0-9]/g, '')}`;
          
          // 2. 백엔드 DB에 세션 등록/가입 호출
          const res = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: mockId,
              name: loggedUser.name,
              email: loggedUser.email,
              avatar: loggedUser.avatar,
              provider: loggedUser.provider
            })
          });
          
          const result = await res.json();
          if (result.success) {
            setUser(result.user);
            setIsLoginModalOpen(false);
            showToast(`${result.user.name}님, 성공적으로 로그인되었습니다 (회원 DB 연동 완료)`, 'success');
          } else {
            showToast('회원 세션 등록에 실패했습니다.', 'error');
          }
        } catch (error) {
          console.error(error);
          showToast('회원 연동 중 오류가 발생했습니다.', 'error');
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 🔑 소셜 로그인 팝업 창 트리거 및 가상 흐름 연출
  const handleSocialLogin = (provider: string) => {
    const mockProfiles: Record<string, { name: string; email: string; avatar: string }> = {
      google: {
        name: '홍길동 (Google)',
        email: 'gildong.hong@gmail.com',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80'
      },
      naver: {
        name: '네이버 사용자',
        email: 'naver_user@naver.com',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
      },
      kakao: {
        name: '라이언 (Kakao)',
        email: 'ryan.kakao@kakao.com',
        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80'
      },
      instagram: {
        name: '인플루언서 (Insta)',
        email: 'influencer@instagram.com',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&h=150&q=80'
      }
    };

    // 🔑 4대 소셜 로그인 실 API 공식 OAuth2 연동 대응 (각 소셜의 인가 코드 요청 주소로 진짜 팝업창 열기)
    if (provider === 'kakao' || provider === 'naver' || provider === 'google' || provider === 'instagram') {
      let authUrl = '';
      let windowName = '';
      
      if (provider === 'kakao') {
        const clientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || 'your_kakao_client_id';
        const redirectUri = encodeURIComponent('http://localhost:3030/api/auth/callback/kakao');
        authUrl = `https://kauth.kakao.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code`;
        windowName = 'KakaoSocialLogin';
      } else if (provider === 'naver') {
        const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID || 'your_naver_client_id';
        const redirectUri = encodeURIComponent('http://localhost:3030/api/auth/callback/naver');
        authUrl = `https://nid.naver.com/oauth2.0/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=naver_state`;
        windowName = 'NaverSocialLogin';
      } else if (provider === 'google') {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your_google_client_id';
        const redirectUri = encodeURIComponent('http://localhost:3030/api/auth/callback/google');
        authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid%20profile%20email`;
        windowName = 'GoogleSocialLogin';
      } else if (provider === 'instagram') {
        const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID || 'your_instagram_client_id';
        const redirectUri = encodeURIComponent('http://localhost:3030/api/auth/callback/instagram');
        authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`;
        windowName = 'InstagramSocialLogin';
      }

      const popup = window.open(
        authUrl,
        windowName,
        'width=460,height=580,top=150,left=150,resizable=no,scrollbars=no,status=no'
      );
      if (!popup) {
        showToast('팝업 차단이 감지되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    const selected = mockProfiles[provider];
    const popup = window.open(
      '',
      'MockSocialLogin',
      'width=460,height=580,top=150,left=150,resizable=no,scrollbars=no,status=no'
    );

    if (!popup) {
      showToast('팝업 차단이 감지되었습니다. 팝업 허용 후 다시 시도해주세요.', 'error');
      return;
    }

    const providerNames: Record<string, string> = {
      google: 'Google',
      naver: 'Naver',
      kakao: 'KakaoTalk',
      instagram: 'Instagram'
    };
    const providerColors: Record<string, string> = {
      google: '#ffffff',
      naver: '#03c75a',
      kakao: '#fee500',
      instagram: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #bc1888)'
    };
    const textColors: Record<string, string> = {
      google: '#3c4043',
      naver: '#ffffff',
      kakao: '#191919',
      instagram: '#ffffff'
    };

    const popupHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${providerNames[provider]} 소셜 로그인</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: #0f172a;
            color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            overflow: hidden;
          }
          .container {
            text-align: center;
            padding: 30px;
            border-radius: 20px;
            background: rgba(30, 41, 59, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 10px 25px rgba(0,0,0,0.5);
            max-width: 360px;
            width: 80%;
          }
          .logo {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            background: ${providerColors[provider]};
            color: ${textColors[provider]};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            font-weight: 800;
            margin: 0 auto 24px;
            box-shadow: 0 0 20px rgba(255,255,255,0.1);
          }
          .spinner {
            width: 36px;
            height: 36px;
            border: 4px solid rgba(255,255,255,0.1);
            border-top: 4px solid #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          h2 {
            font-size: 1.25rem;
            margin-bottom: 8px;
            letter-spacing: -0.5px;
          }
          p {
            color: #94a3b8;
            font-size: 0.85rem;
            margin: 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">${providerNames[provider][0]}</div>
          
          <!-- 1. 로딩 스테이지 -->
          <div id="loadingStage">
            <h2>${providerNames[provider]} 연동 중</h2>
            <p>보안 세션을 생성하고 있습니다...</p>
            <div class="spinner"></div>
          </div>

          <!-- 2. 실제 데이터 입력 폼 스테이지 (기본 숨김) -->
          <div id="formStage" style="display: none; animation: fadeIn 0.3s ease-out;">
            <h2>${providerNames[provider]} 연동 성공</h2>
            <p style="margin-bottom: 20px; font-size: 0.8rem; color: #94a3b8;">사용하실 정보를 직접 기입해 주세요.</p>
            
            <div style="text-align: left;">
              <label style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 6px; font-weight: 700;">사용자 이름 / 닉네임</label>
              <input type="text" id="userName" value="${selected.name}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #1e293b; color: #fff; box-sizing: border-box; margin-bottom: 12px; outline: none; font-size: 0.9rem;" />
              
              <label style="font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 6px; font-weight: 700;">이메일 주소</label>
              <input type="email" id="userEmail" value="${selected.email}" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #1e293b; color: #fff; box-sizing: border-box; margin-bottom: 20px; outline: none; font-size: 0.9rem;" />
            </div>

            <button id="btnSubmit" style="width: 100%; padding: 12px; border-radius: 8px; background: #6366f1; color: #fff; font-weight: 700; border: none; cursor: pointer; font-size: 0.95rem; box-shadow: 0 4px 12px rgba(99,102,241,0.3);">
              간편 로그인 완료하기
            </button>
          </div>

        </div>
        <script>
          // 1.2초 후 폼 스테이지로 스위칭
          setTimeout(() => {
            document.getElementById('loadingStage').style.display = 'none';
            document.getElementById('formStage').style.display = 'block';
          }, 1200);

          // 완료 제출 이벤트 바인딩
          const btn = document.getElementById('btnSubmit');
          btn.addEventListener('click', () => {
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            
            if (!name || !email) {
              alert('이름과 이메일을 모두 입력해 주세요.');
              return;
            }

            window.opener.postMessage({
              type: 'MOCK_LOGIN_SUCCESS',
              user: {
                name: name,
                email: email,
                avatar: '${selected.avatar}',
                provider: '${providerNames[provider]}'
              }
            }, '*');
            window.close();
          });
        </script>
      </body>
      </html>
    `;

    popup.document.write(popupHtml);
    popup.document.close();
  };

  // 테마 변경 토글
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
  };

  // 🔑 실시간 인기 검색어 패칭
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false); // 마운팅 체크용 빈 상태

  const fetchTrendingKeywords = async () => {
    try {
      const res = await fetch('/api/trending');
      const result = await res.json();
      if (result.success) {
        setTrendingKeywords(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch trending keywords:', error);
    }
  };

  // 캠페인 데이터 패칭
  const fetchCampaigns = async () => {
    setLoading(true);
    fetchTrendingKeywords(); // 검색 조회 시 실시간 인기 검색어 통계도 자동 갱신
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        platform: activePlatform,
        category: activeCategory,
        location: activeLocation,
        targetSite: 'all', // 수집처별 제외 요구사항에 의거하여 항상 'all'로 고정 전달
        sortBy: sortBy,
        type: activeType,
      });

      const res = await fetch(`/api/campaigns?${params.toString()}`);
      const result = await res.json();
      
      if (result.success) {
        setCampaigns(result.data);
        setVisibleCount(12); // 필터 변경 시 1페이지부터 노출되도록 초기화

        // 🔑 백그라운드 수집이 유발된 경우 2.2초 뒤 무소음 화면 갱신 실행 (Non-blocking UX)
        if (result.isCrawlingTriggered) {
          showToast('신규 체험단을 실시간 매칭하는 중입니다... 잠시만 기다려주세요.', 'info');
          setTimeout(async () => {
            try {
              const resSilent = await fetch(`/api/campaigns?${params.toString()}`);
              const resultSilent = await resSilent.json();
              if (resultSilent.success) {
                setCampaigns(resultSilent.data);
                showToast('실시간 신규 체험단 매칭이 완료되었습니다!', 'success');
              }
            } catch (err) {
              console.error('Silent refetch failed:', err);
            }
          }, 2200);
        }
      } else {
        showToast('데이터를 가져오는데 실패했습니다.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('네트워크 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 검색 및 필터 파라미터가 변경될 때마다 자동 페칭
  useEffect(() => {
    fetchCampaigns();
  }, [searchTerm, activePlatform, activeCategory, activeLocation, activeType, sortBy]);



  // 실시간 검색어 롤링 타이머 (3초 간격)
  useEffect(() => {
    if (trendingKeywords.length === 0) return;
    const timer = setInterval(() => {
      setCurrentTrendIndex((prev) => (prev + 1) % Math.min(10, trendingKeywords.length));
    }, 3000);
    return () => clearInterval(timer);
  }, [trendingKeywords]);

  // 최근 검색 기록 ON/OFF 변경 시 로컬 스토리지 동기화
  useEffect(() => {
    localStorage.setItem('isHistoryEnabled', String(isHistoryEnabled));
  }, [isHistoryEnabled]);

  // 🕒 검색어 히스토리에 추가 (최대 5개 FIFO 제한)
  const addSearchHistory = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    if (!isHistoryEnabled) return; // 저장 기능이 꺼져있으면 기록 안함
    
    // 중복 제거 및 리스트의 맨 앞에 배치 (최대 5개)
    const nextHistory = [trimmed, ...searchHistory.filter(kw => kw !== trimmed)].slice(0, 5);
    setSearchHistory(nextHistory);
    localStorage.setItem('searchHistory', JSON.stringify(nextHistory));
  };

  // 🕒 검색어 히스토리에서 단일 삭제
  const removeHistoryItem = (keyword: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 칩 클릭 검색 방지
    const nextHistory = searchHistory.filter(kw => kw !== keyword);
    setSearchHistory(nextHistory);
    localStorage.setItem('searchHistory', JSON.stringify(nextHistory));
  };

  // 🕒 검색어 히스토리 전체 삭제
  const clearAllHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('searchHistory');
    showToast('최근 검색어가 모두 삭제되었습니다.', 'info');
  };

  // 실시간 크롤링 요청 트리거
  const triggerCrawling = async () => {
    if (crawling) return;
    setCrawling(true);
    showToast('각 플랫폼의 신규 데이터를 크롤링 중입니다...', 'info');
    
    try {
      const res = await fetch('/api/crawl', { method: 'POST' });
      const result = await res.json();
      
      if (result.success) {
        showToast(`수집 완료! 신규: ${result.inserted}개, 갱신: ${result.updated}개`, 'success');
        fetchCampaigns();
      } else {
        showToast('크롤링 중 서버 오류가 발생했습니다.', 'error');
      }
    } catch (error) {
      console.error(error);
      showToast('크롤링 서버 연결 실패', 'error');
    } finally {
      setCrawling(false);
    }
  };

  // 토스트 팝업 제어
  const showToast = (message: string, type: 'success' | 'info' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // 남은 마감일 계산 함수 (D-Day)
  const calculateDday = (endDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(0, 0, 0, 0);
    
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘마감';
    if (diffDays < 0) return '마감됨';
    return `D-${diffDays}`;
  };

  // 필터링 적용된 최종 리스트 (즐겨찾기 전용 처리)
  const displayedCampaigns = campaigns;

  // 지역 목록 목록 데이터 (광역시도 및 시군구 상세 세분화)
  const LOCATIONS_MAP: Record<string, string[]> = {
    '서울': ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'],
    '경기': ['수원시', '성남시', '고양시', '용인시', '부천시', '안산시', '안양시', '남양주시', '화성시', '평택시', '의정부시', '시흥시', '파주시', '김포시', '광명시', '광주시', '군포시', '오산시', '하남시', '이천시', '구리시', '양주시', '안성시', '포천시', '의왕시', '여주시', '동두천시', '양평군', '가평군', '연천군'],
    '인천': ['중구', '동구', '미추홀구', '연수구', '남동구', '부평구', '계양구', '서구', '강화군', '옹진군'],
    '부산': ['중구', '서구', '동구', '영도구', '부산진구', '동래구', '남구', '북구', '해운대구', '사하구', '금정구', '강서구', '연제구', '수영구', '사상구', '기장군'],
    '대구': ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'],
    '대전': ['동구', '중구', '서구', '유성구', '대덕구'],
    '광주': ['동구', '서구', '남구', '북구', '광산구'],
    '울산': ['중구', '남구', '동구', '북구', '울주군'],
    '강원': ['춘천시', '원주시', '강릉시', '동해시', '태백시', '속초시', '삼척시', '홍천군', '횡성군', '영월군', '평창군', '정선군', '철원군', '화천군', '양구군', '인제군', '고성군', '양양군'],
    '제주': ['제주시', '서귀포시'],
    '충북': ['청주시', '충주시', '제천시', '보은군', '옥천군', '영동군', '증평군', '진천군', '괴산군', '음성군', '단양군'],
    '충남': ['천안시', '공주시', '보령시', '아산시', '서산시', '논산시', '계룡시', '당진시', '금산군', '부여군', '서천군', '청양군', '홍성군', '예산군', '태안군'],
    '전북': ['전주시', '군산시', '익산시', '정읍시', '남원시', '김제시', '완주군', '진안군', '무주군', '장수군', '임실군', '순창군', '고창군', '부안군'],
    '전남': ['목포시', '여수시', '순천시', '나주시', '광양시', '담양군', '곡성군', '구례군', '고흥군', '보성군', '화순군', '장흥군', '강진군', '해남군', '영암군', '무안군', '함평군', '영광군', '장성군', '완도군', '진도군', '신안군'],
    '경북': ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
    '경남': ['창원시', '진주시', '통영시', '사천시', '김해시', '밀양시', '거제시', '양산시', '의령군', '함안군', '창녕군', '고성군', '남해군', '하동군', '산청군', '함양군', '거창군', '합천군'],
    '세종': ['세종특별자치시']
  };
  // 출처 사이트 목록 (실제 온디맨드 크롤링 수집 및 테스트가 완료된 핵심 5대 매체)
  const TARGET_SITES = ['레뷰 (REVU)', '디너의여왕', '리뷰노트', '포블로그', '강남맛집'];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. Header (글래스모피즘 헤더) */}
      <header className="glass-panel" style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src="/logo.png" 
            alt="viral_re logo" 
            style={{ 
              height: '38px', 
              width: 'auto', 
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              cursor: 'pointer'
            }}
            onClick={() => window.location.reload()}
          />
          <span className="integrator-badge" style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            backgroundColor: 'var(--accent-light)',
            color: 'var(--accent)',
            borderRadius: 'var(--radius-sm)',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}>
            INTEGRATOR v1.0
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative' }}>
          <button 
            onClick={triggerCrawling} 
            disabled={crawling}
            className="premium-button-secondary"
            style={{ 
              padding: '8px 12px', 
              fontSize: '0.8rem', 
              borderRadius: 'var(--radius-md)', 
              borderColor: crawling ? 'var(--text-tertiary)' : 'var(--border-color)',
              opacity: crawling ? 0.7 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Icons.Refresh className={crawling ? 'animate-spin' : ''} />
            <span className="header-btn-text">{crawling ? '수집 중...' : '실시간 수집'}</span>
          </button>

          {/* 🔑 로그인 버튼 및 아바타 드롭다운 */}
          {user ? (
            <div style={{ position: 'relative' }}>
              <button 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="user-avatar-btn"
                title={`${user.name} network`}
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </button>
              
              {isUserDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>
                    <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}님</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', wordBreak: 'break-all' }}>{user.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setUser(null);
                      setIsUserDropdownOpen(false);
                      showToast('성공적으로 로그아웃되었습니다.', 'info');
                    }}
                    className="user-dropdown-item danger"
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="premium-button-primary header-login-btn"
              style={{ padding: '8px 14px', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', whiteSpace: 'nowrap' }}
            >
              <span className="login-btn-text-desktop">로그인 / 회원가입</span>
              <span className="login-btn-text-mobile" style={{ display: 'none' }}>로그인</span>
            </button>
          )}

          <button 
            onClick={toggleTheme}
            style={{
              width: '40px', height: '40px',
              borderRadius: '50%',
              border: '1px solid var(--border-color)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              backgroundColor: 'var(--bg-secondary)',
              transition: 'var(--transition-smooth)'
            }}
            aria-label="Toggle Theme"
          >
            {theme === 'light' ? <Icons.Moon /> : <Icons.Sun />}
          </button>
        </div>
      </header>

      {/* 2. Hero Section - compact & modern */}
      <section style={{
        padding: '48px 24px 28px',
        textAlign: 'center',
        background: 'linear-gradient(to bottom, var(--bg-secondary) 0%, transparent 100%)',
        borderBottom: 'none'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
          <h2 style={{ fontSize: '1.9rem', fontWeight: 800, marginBottom: '8px', lineHeight: 1.3, wordBreak: 'keep-all' }}>
            블로그 & SNS 체험단 <span className="text-gradient">실시간 모아보기</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '1rem' }}>
            여러 플랫폼의 활성 체험단을 한 곳에서 찾아보세요.
          </p>

          {/* 검색 & 실시간 검색어 가로 정렬 영역 - 반응형 클래스 사용 */}
          <div className="hero-search-wrapper">
            {/* 좌측/가운데: 통합 검색창 (최근검색어 레이어 팝업 포함) */}
            <div className="hero-search-box" style={{ position: 'relative' }}>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setSearchTerm(searchInput);
                  addSearchHistory(searchInput);
                  setIsSearchFocused(false);
                  if (document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                }}
                className="glass-panel" 
                style={{
                  display: 'flex', alignItems: 'center',
                  padding: '6px 8px 6px 16px',
                  borderRadius: 'var(--radius-full)',
                  boxShadow: 'var(--shadow-lg)',
                  border: isSearchFocused ? '1px solid var(--accent)' : '1px solid var(--border-focus)',
                  transition: 'var(--transition-smooth)',
                  flexWrap: 'nowrap',
                  width: '100%',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                <Icons.Search />
                <input 
                  type="text" 
                  placeholder={placeholderText}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  style={{
                    flex: 1, border: 'none', background: 'transparent',
                    padding: '8px 12px', fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    minWidth: 0,
                    outline: 'none'
                  }}
                />
                {searchInput && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setSearchTerm('');
                    }}
                    style={{ color: 'var(--text-tertiary)', marginRight: '8px', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                    title="검색어 초기화"
                  >
                    <Icons.Close />
                  </button>
                )}
                <button
                  type="submit"
                  className="premium-button-primary"
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}
                >
                  검색
                </button>
              </form>

              {/* 최근검색어 팝업 (네이버 스타일: 포커스 시 노출) */}
              {isSearchFocused && (
                <div 
                  className="glass-panel" 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                    zIndex: 200,
                    textAlign: 'left',
                    overflow: 'hidden'
                  }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  {!isHistoryEnabled ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      최근 검색어 저장 기능이 꺼져 있습니다.
                    </div>
                  ) : searchHistory.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      최근 검색 기록이 없습니다.
                    </div>
                  ) : (
                    <div>
                      <div style={{ padding: '12px 16px 6px 16px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                        최근 검색어
                      </div>
                      <ul style={{ listStyle: 'none', margin: 0, padding: '6px 0', maxHeight: '220px', overflowY: 'auto' }}>
                        {searchHistory.map((hist, idx) => (
                          <li 
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 16px',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                            className="dropdown-item-hover"
                            onClick={() => {
                              setSearchInput(hist);
                              setSearchTerm(hist);
                              addSearchHistory(hist);
                              setIsSearchFocused(false);
                            }}
                          >
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                              {hist}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeHistoryItem(hist, e);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-tertiary)',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              ✕
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 16px',
                    backgroundColor: 'var(--bg-tertiary)',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.78rem'
                  }}>
                    <button
                      type="button"
                      onClick={() => setIsHistoryEnabled(!isHistoryEnabled)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, padding: '2px 0' }}
                    >
                      {isHistoryEnabled ? '최근검색어 끄기' : '최근검색어 켜기'}
                    </button>
                    <button
                      type="button"
                      onClick={clearAllHistory}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, padding: '2px 0' }}
                    >
                      전체 삭제
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 우측 끝: 실시간 인기 검색어 롤링 위젯 */}
            <div 
              className="hero-trend-widget"
              style={{ width: '180px', height: '46px', right: '-16px' }}
              onMouseEnter={() => setIsTrendDropdownOpen(true)}
              onMouseLeave={() => setIsTrendDropdownOpen(false)}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0',
                  height: '46px',
                  background: 'transparent',
                  border: 'none',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  width: '100%',
                  justifyContent: 'flex-end',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', height: '46px', flex: 1, position: 'relative', justifyContent: 'flex-end' }}>
                  {trendingKeywords.length > 0 ? (
                    <div 
                      key={currentTrendIndex}
                      className="animate-trend-slide-up"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        width: '100%',
                        height: '46px',
                        margin: 0,
                        padding: 0,
                        boxSizing: 'border-box',
                        justifyContent: 'flex-end'
                      }}
                      onClick={() => {
                        const item = trendingKeywords[currentTrendIndex];
                        if (item) {
                          setSearchInput(item.word);
                          setSearchTerm(item.word);
                          addSearchHistory(item.word);
                        }
                      }}
                    >
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        background: (currentTrendIndex + 1) === 1 ? 'linear-gradient(135deg,#ffd700,#ffa500)' : (currentTrendIndex + 1) === 2 ? 'linear-gradient(135deg,#c0c0c0,#a9a9a9)' : (currentTrendIndex + 1) === 3 ? 'linear-gradient(135deg,#cd7f32,#b87333)' : 'var(--bg-tertiary)',
                        color: (currentTrendIndex + 1) === 3 ? '#fff' : '#000',
                        flexShrink: 0
                      }}>
                        {currentTrendIndex + 1}
                      </span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'right', flex: '0 1 auto' }}>
                        {trendingKeywords[currentTrendIndex]?.word}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>인기 검색어 로딩 중...</span>
                  )}
                </div>
              </div>

              {/* 실시간 전체 순위 팝업 레이어 */}
              {isTrendDropdownOpen && trendingKeywords.length > 0 && (
                <div 
                  className="glass-panel animate-fade-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '240px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                    zIndex: 999,
                    padding: '12px 0',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ padding: '0 16px 8px 16px', borderBottom: '1px solid var(--border-color)', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔥</span> 실시간 인기 검색어
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {trendingKeywords.slice(0, 10).map((item, idx) => (
                      <li 
                        key={item.word}
                        className="dropdown-item-hover"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 16px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          transition: 'background 0.15s'
                        }}
                        onClick={() => {
                          setSearchInput(item.word);
                          setSearchTerm(item.word);
                          addSearchHistory(item.word);
                          setIsTrendDropdownOpen(false);
                        }}
                      >
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '18px',
                          height: '18px',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          background: item.rank === 1 ? 'linear-gradient(135deg,#ffd700,#ffa500)' : item.rank === 2 ? 'linear-gradient(135deg,#c0c0c0,#a9a9a9)' : item.rank === 3 ? 'linear-gradient(135deg,#cd7f32,#b87333)' : 'var(--bg-tertiary)',
                          color: item.rank === 3 ? '#fff' : '#000',
                          flexShrink: 0
                        }}>
                          {item.rank}
                        </span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: item.rank <= 3 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.word}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard Body */}
      <main style={{ flex: 1, maxWidth: '1200px', width: '100%', margin: '0 auto', padding: '40px 24px' }}>
        
        {/* 💻📱 상단 가로형 반응형 배너 광고 (Auto-rolling Carousel Ad Slot) */}
        <div 
          className="glass-panel ad-header-banner" 
          onClick={() => window.open(AD_SLIDES[currentAdIndex].link, '_blank')}
          style={{
            margin: '0 auto 32px auto',
            width: '100%',
            minHeight: '240px',
            borderRadius: 'var(--radius-md)',
            position: 'relative',
            overflow: 'hidden',
            backgroundImage: `url(${AD_SLIDES[currentAdIndex].image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 0.5s ease-in-out',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          {/* 가독성을 위한 어두운 레이어 (Dark Overlay) */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.65) 50%, rgba(0,0,0,0.3) 100%)',
            zIndex: 1
          }} />

          <span style={{
            position: 'absolute', top: '8px', left: '12px',
            fontSize: '0.55rem', fontWeight: 900, color: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(255,255,255,0.3)', padding: '2px 6px', borderRadius: '3px',
            lineHeight: 1, zIndex: 2
          }}>AD</span>
          
          <div style={{ 
            position: 'relative', zIndex: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            padding: '36px 48px', width: '100%', gap: '16px', flexWrap: 'wrap',
            minHeight: '240px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: '280px' }}>
              <div style={{ textAlign: 'left' }}>
                <h4 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#ffffff', marginBottom: '8px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {AD_SLIDES[currentAdIndex].title}
                </h4>
                <p style={{ fontSize: '0.95rem', color: '#e2e8f0', lineHeight: 1.5, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {AD_SLIDES[currentAdIndex].desc}
                </p>
              </div>
            </div>
          </div>

          {/* 🔢 캐러셀 수동 및 자동 롤링 컨트롤러 (화살표 & 페이지번호) */}
          <div style={{
            position: 'absolute', bottom: '8px', right: '16px',
            display: 'flex', alignItems: 'center', gap: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-sm)',
            color: '#ffffff',
            fontSize: '0.8rem',
            zIndex: 3,
            userSelect: 'none',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(4px)'
          }}>
            <button 
              type="button" 
              onClick={handlePrevAd} 
              style={{ 
                border: 'none', background: 'transparent', color: '#ffffff', 
                cursor: 'pointer', padding: '0 6px', fontWeight: 900, fontSize: '0.8rem' 
              }}
              title="이전 광고"
            >
              ◀
            </button>
            <span style={{ fontWeight: 800, letterSpacing: '0.5px' }}>
              {currentAdIndex + 1} / {AD_SLIDES.length}
            </span>
            <button 
              type="button" 
              onClick={handleNextAd} 
              style={{ 
                border: 'none', background: 'transparent', color: '#ffffff', 
                cursor: 'pointer', padding: '0 6px', fontWeight: 900, fontSize: '0.8rem' 
              }}
              title="다음 광고"
            >
              ▶
            </button>
          </div>
        </div>
        
        {/* ─── 필터 탭바 + 상세 패널 (sticky, 2025 modern style, 마우스 호버 및 왼쪽 정렬 버전) ─── */}
        <div 
          onMouseLeave={() => {
            setIsTypeOpen(false);
            setIsCategoryOpen(false);
            setIsPlatformOpen(false);
            setIsLocationOpen(false);
          }}
          style={{ width: '100%', position: 'relative', zIndex: 100, marginBottom: '24px' }}
        >
          {/* 탭바 영역 */}
          <div className="filter-bar-wrap" style={{ marginTop: '0' }}>
            <div className="filter-bar-scroll" style={{ justifyContent: 'flex-start' }}>
              
              {/* 1. 모집 유형 탭 */}
              <button
                type="button"
                className={`filter-tab ${isTypeOpen || activeType !== 'all' ? 'active' : ''}`}
                onMouseEnter={() => {
                  setIsTypeOpen(true);
                  setIsCategoryOpen(false);
                  setIsPlatformOpen(false);
                  setIsLocationOpen(false);
                }}
                onClick={() => setIsTypeOpen(prev => !prev)}
              >
                {activeType !== 'all' && <span className="tab-badge">✓</span>}
                <span className="filter-tab-img">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-type)' }}>
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M7 8h10M7 12h10M7 16h6" />
                    <defs>
                      <linearGradient id="grad-type" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  {activeType === 'all' ? '모집 유형' :
                    activeType === 'visit' ? '방문형' : '배송형'}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isTypeOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </span>
              </button>

              {/* 2. 카테고리 탭 */}
              <button
                type="button"
                className={`filter-tab ${isCategoryOpen || activeCategory !== 'all' ? 'active' : ''}`}
                onMouseEnter={() => {
                  setIsCategoryOpen(true);
                  setIsTypeOpen(false);
                  setIsPlatformOpen(false);
                  setIsLocationOpen(false);
                }}
                onClick={() => setIsCategoryOpen(prev => !prev)}
              >
                {activeCategory !== 'all' && <span className="tab-badge">✓</span>}
                <span className="filter-tab-img">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-cat)' }}>
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <defs>
                      <linearGradient id="grad-cat" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  {activeCategory === 'all' ? '카테고리' :
                    activeCategory === 'food-restaurant' ? '식당/맛집' :
                    activeCategory === 'food-cafe' ? '카페/디저트' :
                    activeCategory === 'food-pub' ? '술집/주점' :
                    activeCategory === 'beauty-cosmetics' ? '화장품' :
                    activeCategory === 'beauty-salon' ? '뷰티샵' :
                    activeCategory === 'accommodation' ? '숙박' :
                    activeCategory === 'travel' ? '여행' :
                    activeCategory === 'fashion' ? '패션' :
                    activeCategory === 'baby' ? '유아/육아' :
                    activeCategory === 'life-goods' ? '생활용품' :
                    activeCategory === 'life-appliances' ? '가전/디지털' : '기타'}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isCategoryOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </span>
              </button>

              {/* 3. 미디어 플랫폼 탭 */}
              <button
                type="button"
                className={`filter-tab ${isPlatformOpen || activePlatform !== 'all' ? 'active' : ''}`}
                onMouseEnter={() => {
                  setIsPlatformOpen(true);
                  setIsTypeOpen(false);
                  setIsCategoryOpen(false);
                  setIsLocationOpen(false);
                }}
                onClick={() => setIsPlatformOpen(prev => !prev)}
              >
                {activePlatform !== 'all' && <span className="tab-badge">✓</span>}
                <span className="filter-tab-img">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-plat)' }}>
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    <defs>
                      <linearGradient id="grad-plat" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  {activePlatform === 'all' ? '플랫폼' :
                    activePlatform === 'blog' ? '블로그' :
                    activePlatform === 'instagram' ? '인스타' :
                    activePlatform === 'youtube' ? '유튜브' :
                    activePlatform === 'naver' ? '네이버' : '기타'}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isPlatformOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </span>
              </button>

              {/* 4. 지역 탭 */}
              <button
                type="button"
                className={`filter-tab ${isLocationOpen || activeLocation !== 'all' ? 'active' : ''}`}
                onMouseEnter={() => {
                  setIsLocationOpen(true);
                  setIsTypeOpen(false);
                  setIsCategoryOpen(false);
                  setIsPlatformOpen(false);
                }}
                onClick={() => setIsLocationOpen(prev => !prev)}
              >
                {activeLocation !== 'all' && <span className="tab-badge">✓</span>}
                <span className="filter-tab-img">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-loc)' }}>
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                    <defs>
                      <linearGradient id="grad-loc" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  {activeLocation === 'all' ? '지역 검색' :
                    selectedSigungu !== 'all' ? `${selectedSido} ${selectedSigungu}` : selectedSido}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ transition: 'transform 0.2s', transform: isLocationOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </span>
              </button>

              {/* 전체 초기화 단추 */}
              {(activeType !== 'all' || activeCategory !== 'all' || activePlatform !== 'all' || activeLocation !== 'all') && (
                <button
                  type="button"
                  className="filter-tab"
                  onClick={() => {
                    setActiveType('all'); setActiveCategory('all'); setActivePlatform('all');
                    setActiveLocation('all'); setSelectedSido('all'); setSelectedSigungu('all');
                    setIsTypeOpen(false); setIsCategoryOpen(false); setIsPlatformOpen(false); setIsLocationOpen(false);
                  }}
                  style={{ color: 'var(--danger)' }}
                >
                  <span className="filter-tab-img">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: '#ef4444' }}>
                      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                  </span>
                  <span style={{ marginTop: '2px' }}>초기화</span>
                </button>
              )}
            </div>
          </div>

          {/* 모집 유형 상세 패널 (왼쪽 정렬) */}
          {isTypeOpen && (
            <div className="filter-panel-wrap" style={{ display: 'flex', justifyContent: 'flex-start' }}>
              {/* 맥 OS 스타일 신호등 장식 버튼 */}
              <div style={{ position: 'absolute', top: '14px', left: '16px', display: 'flex', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block' }} />
              </div>
              <div className="filter-chip-row" style={{ justifyContent: 'flex-start', gap: '16px', width: '100%' }}>
                {[
                  { 
                    key: 'all', 
                    label: '전체 유형', 
                    icon: (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-alltype)' }}>
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        <defs><linearGradient id="grad-alltype" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
                      </svg>
                    )
                  },
                  { 
                    key: 'visit', 
                    label: '방문형', 
                    icon: (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-visit)' }}>
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                        <defs><linearGradient id="grad-visit" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                      </svg>
                    )
                  },
                  { 
                    key: 'delivery', 
                    label: '배송형', 
                    icon: (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-delivery)' }}>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                        <line x1="12" y1="22.08" x2="12" y2="12" />
                        <defs><linearGradient id="grad-delivery" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#10b981" /></linearGradient></defs>
                      </svg>
                    )
                  }
                ].map(t => (
                  <button 
                    type="button"
                    key={t.key} 
                    className={`filter-desktop-icon ${activeType === t.key ? 'active' : ''}`} 
                    onClick={() => {
                      setActiveType(t.key);
                      setIsTypeOpen(false);
                    }}
                  >
                    <span className="filter-desktop-icon-img">{t.icon}</span>
                    <span className="filter-desktop-icon-text">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 카테고리 상세 패널 (왼쪽 정렬) */}
          {isCategoryOpen && (
            <div className="filter-panel-wrap">
              {/* 맥 OS 스타일 신호등 장식 버튼 */}
              <div style={{ position: 'absolute', top: '14px', left: '16px', display: 'flex', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block' }} />
              </div>
              <div className="filter-chip-row" style={{ maxWidth: '1200px', margin: '0 auto', justifyContent: 'flex-start', gap: '24px' }}>
                {/* 맛집/음식 */}
                <div style={{ width: '100%', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <img src="/images/emojis/food.jpg" alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                    맛집 / 음식
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-start' }}>
                    {[
                      { 
                        key: 'food-restaurant', 
                        label: '식당/맛집', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-restaurant)' }}>
                            <path d="M3 12h18M5 12a7 7 0 0 0 14 0M12 2v4M9 3v3M15 3v3" />
                            <defs><linearGradient id="grad-restaurant" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#f59e0b" /></linearGradient></defs>
                          </svg>
                        )
                      },
                      { 
                        key: 'food-cafe', 
                        label: '카페/디저트', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-cafe)' }}>
                            <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                            <line x1="6" y1="2" x2="6" y2="4" />
                            <line x1="10" y1="2" x2="10" y2="4" />
                            <line x1="14" y1="2" x2="14" y2="4" />
                            <defs><linearGradient id="grad-cafe" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
                          </svg>
                        )
                      },
                      { 
                        key: 'food-pub', 
                        label: '술집/주점', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-pub)' }}>
                            <path d="M22 3L12 13L2 3M12 13v9M8 22h8" />
                            <defs><linearGradient id="grad-pub" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#f43f5e" /></linearGradient></defs>
                          </svg>
                        )
                      }
                    ].map(c => (
                      <button type="button" key={c.key} className={`filter-desktop-icon ${activeCategory === c.key ? 'active' : ''}`} onClick={() => { setActiveCategory(activeCategory === c.key ? 'all' : c.key); setIsCategoryOpen(false); }}>
                        <span className="filter-desktop-icon-img">{c.icon}</span>
                        <span className="filter-desktop-icon-text">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* 뷰티 */}
                <div style={{ width: '100%', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <img src="/images/emojis/beauty.jpg" alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                    뷰티 / 에스테틱
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-start' }}>
                    {[
                      { 
                        key: 'beauty-cosmetics', 
                        label: '화장품/스킨케어', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-cosme)' }}>
                            <rect x="6" y="10" width="12" height="11" rx="2" />
                            <path d="M9 10V5a3 3 0 0 1 6 0v5" />
                            <line x1="12" y1="10" x2="12" y2="21" />
                            <defs><linearGradient id="grad-cosme" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899" /><stop offset="100%" stopColor="#f472b6" /></linearGradient></defs>
                          </svg>
                        )
                      },
                      { 
                        key: 'beauty-salon', 
                        label: '뷰티샵/에스테틱', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-salon)' }}>
                            <circle cx="6" cy="6" r="3" />
                            <circle cx="6" cy="18" r="3" />
                            <line x1="20" y1="4" x2="8.12" y2="15.88" />
                            <line x1="14.47" y1="14.48" x2="20" y2="20" />
                            <line x1="8.12" y1="8.12" x2="12" y2="12" />
                            <defs><linearGradient id="grad-salon" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#ec4899" /><stop offset="100%" stopColor="#6366f1" /></linearGradient></defs>
                          </svg>
                        )
                      }
                    ].map(c => (
                      <button type="button" key={c.key} className={`filter-desktop-icon ${activeCategory === c.key ? 'active' : ''}`} onClick={() => { setActiveCategory(activeCategory === c.key ? 'all' : c.key); setIsCategoryOpen(false); }}>
                        <span className="filter-desktop-icon-img">{c.icon}</span>
                        <span className="filter-desktop-icon-text">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* 여행/숙박 */}
                <div style={{ width: '100%', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <img src="/images/emojis/travel.jpg" alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                    여행 / 숙박
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-start' }}>
                    {[
                      { 
                        key: 'accommodation', 
                        label: '숙박/호텔', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-accommodation)' }}>
                            <path d="M2 22V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v18M4 22h16M7 8h2M15 8h2M7 13h2M15 13h2M11 18h2" />
                            <defs><linearGradient id="grad-accommodation" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#6366f1" /></linearGradient></defs>
                          </svg>
                        )
                      },
                      { 
                        key: 'travel', 
                        label: '여행/레저', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-travel)' }}>
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            <defs><linearGradient id="grad-travel" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                          </svg>
                        )
                      }
                    ].map(c => (
                      <button type="button" key={c.key} className={`filter-desktop-icon ${activeCategory === c.key ? 'active' : ''}`} onClick={() => { setActiveCategory(activeCategory === c.key ? 'all' : c.key); setIsCategoryOpen(false); }}>
                        <span className="filter-desktop-icon-img">{c.icon}</span>
                        <span className="filter-desktop-icon-text">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* 패션/생활 */}
                <div style={{ width: '100%', marginBottom: '0' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <img src="/images/emojis/fashion.jpg" alt="" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }} />
                    패션 / 생활
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'flex-start' }}>
                    {[
                      { 
                        key: 'fashion', 
                        label: '패션/의류', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-fashion)' }}>
                            <path d="M20.37 4.65a2.22 2.22 0 0 0-3.15 0L12 9.87 7.15 5A2.22 2.22 0 0 0 4 8.18l7.15 7.15a1.2 1.2 0 0 0 1.7 0l7.52-7.53a2.22 2.22 0 0 0 0-3.15z" />
                            <path d="M12 9.87v11" />
                            <defs><linearGradient id="grad-fashion" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#a855f7" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                          </svg>
                        )
                      },
                      { 
                        key: 'baby', 
                        label: '유아동/육아', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-baby)' }}>
                            <circle cx="12" cy="12" r="10" />
                            <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                            <line x1="9" y1="9" x2="9.01" y2="9" />
                            <line x1="15" y1="9" x2="15.01" y2="9" />
                            <defs><linearGradient id="grad-baby" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ec4899" /></linearGradient></defs>
                          </svg>
                        )
                      },
                      { 
                        key: 'life-goods', 
                        label: '생활용품', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-goods)' }}>
                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                            <polyline points="9 22 9 12 15 12 15 22" />
                            <defs><linearGradient id="grad-goods" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                          </svg>
                        )
                      },
                      { 
                        key: 'life-appliances', 
                        label: '가전/디지털', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-appliances)' }}>
                            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                            <line x1="8" y1="21" x2="16" y2="21" />
                            <line x1="12" y1="17" x2="12" y2="21" />
                            <defs><linearGradient id="grad-appliances" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#a855f7" /></linearGradient></defs>
                          </svg>
                        )
                      },
                      { 
                        key: 'etc', 
                        label: '기타', 
                        icon: (
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-etc)' }}>
                            <polyline points="20 12 20 22 4 22 4 12" />
                            <rect x="2" y="7" width="20" height="5" />
                            <line x1="12" y1="22" x2="12" y2="7" />
                            <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                            <defs><linearGradient id="grad-etc" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6b7280" /><stop offset="100%" stopColor="#9ca3af" /></linearGradient></defs>
                          </svg>
                        )
                      }
                    ].map(c => (
                      <button type="button" key={c.key} className={`filter-desktop-icon ${activeCategory === c.key ? 'active' : ''}`} onClick={() => { setActiveCategory(activeCategory === c.key ? 'all' : c.key); setIsCategoryOpen(false); }}>
                        <span className="filter-desktop-icon-img">{c.icon}</span>
                        <span className="filter-desktop-icon-text">{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 미디어 플랫폼 상세 패널 (왼쪽 정렬) */}
          {isPlatformOpen && (
            <div className="filter-panel-wrap" style={{ display: 'flex', justifyContent: 'flex-start' }}>
              {/* 맥 OS 스타일 신호등 장식 버튼 */}
              <div style={{ position: 'absolute', top: '14px', left: '16px', display: 'flex', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block' }} />
              </div>
              <div className="filter-chip-row" style={{ justifyContent: 'flex-start', gap: '16px', width: '100%' }}>
                {[
                  { 
                    key: 'all', 
                    label: '전체 플랫폼', 
                    icon: (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-allplat)' }}>
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                        <defs><linearGradient id="grad-allplat" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient></defs>
                      </svg>
                    )
                  },
                  { key: 'blog', label: '네이버 블로그', icon: null },
                  { key: 'instagram', label: '인스타그램', icon: null },
                  { key: 'youtube', label: '유튜브', icon: null },
                  { 
                    key: 'etc', 
                    label: '기타 플랫폼', 
                    icon: (
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'url(#grad-etcplat)' }}>
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        <defs><linearGradient id="grad-etcplat" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6b7280" /><stop offset="100%" stopColor="#9ca3af" /></linearGradient></defs>
                      </svg>
                    )
                  }
                ].map(p => (
                  <button 
                    type="button"
                    key={p.key} 
                    className={`filter-desktop-icon ${activePlatform === p.key ? 'active' : ''}`} 
                    onClick={() => {
                      setActivePlatform(p.key);
                      setIsPlatformOpen(false);
                    }}
                  >
                    <span className="filter-desktop-icon-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.key === 'blog' && (
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                          <rect width="24" height="24" rx="5" fill="#03C75A"/>
                          <path d="M9.13 16.5H7.5V7.5H9.6L14.7 13.92V7.5H16.3V16.5H14.2L9.13 10.08V16.5Z" fill="white"/>
                        </svg>
                      )}
                      {p.key === 'instagram' && (
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                          <rect width="24" height="24" rx="5" fill="url(#ig11)"/>
                          <path d="M12 7.5C9.515 7.5 7.5 9.515 7.5 12C7.5 14.485 9.515 16.5 12 16.5C14.485 16.5 16.5 14.485 16.5 12C16.5 9.515 14.485 7.5 12 7.5ZM12 15C10.342 15 9 13.658 9 12C9 10.342 10.342 9 12 9C13.658 9 15 10.342 15 12C15 13.658 13.658 15 12 15Z" fill="white"/>
                          <circle cx="17.5" cy="6.5" r="1.1" fill="white"/>
                          <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="white" strokeWidth="1.5"/>
                          <defs><linearGradient id="ig11" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse"><stop stopColor="#F9ED32"/><stop offset="0.25" stopColor="#EE2A7B"/><stop offset="0.75" stopColor="#D2149F"/><stop offset="1" stopColor="#6C24AA"/></linearGradient></defs>
                        </svg>
                      )}
                      {p.key === 'youtube' && (
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                          <rect width="24" height="24" rx="5" fill="#FF0000"/>
                          <path d="M9.8 15.6V8.4L16 12L9.8 15.6Z" fill="white"/>
                        </svg>
                      )}
                      {p.icon}
                    </span>
                    <span className="filter-desktop-icon-text">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 지역 상세 패널 */}
          {isLocationOpen && (
            <div className="filter-panel-wrap">
              {/* 맥 OS 스타일 신호등 장식 버튼 */}
              <div style={{ position: 'absolute', top: '14px', left: '16px', display: 'flex', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ff5f56', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffbd2e', display: 'inline-block' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#27c93f', display: 'inline-block' }} />
              </div>
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div className="region-two-col">
                  {/* 좌: 시도 목록 */}
                  <div className="region-sido-list">
                    <button
                      type="button"
                      className={`region-sido-btn ${selectedSido === 'all' ? 'active' : ''}`}
                      onClick={() => { setSelectedSido('all'); setSelectedSigungu('all'); setIsLocationOpen(false); }}
                    >
                      전국
                    </button>
                    {[
                      '서울','경기','인천','부산','대구','대전','광주','울산','강원',
                      '충북','충남','전북','전남','경북','경남','제주','세종'
                    ].map(sido => (
                      <button
                        type="button"
                        key={sido}
                        className={`region-sido-btn ${selectedSido === sido ? 'active' : ''}`}
                        onMouseEnter={() => setHoveredSido(sido)}
                        onClick={() => {
                          setSelectedSido(sido);
                          setSelectedSigungu('all');
                          if (!LOCATIONS_MAP[sido] || LOCATIONS_MAP[sido].length === 0) {
                            setIsLocationOpen(false);
                          }
                        }}
                      >
                        {sido}
                      </button>
                    ))}
                  </div>
                  {/* 우: 시군구 칩 */}
                  <div className="region-sigungu-wrap" style={{ justifyContent: 'flex-start' }}>
                    <div style={{ width: '100%', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.2rem' }}>📍</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {hoveredSido !== 'all' ? hoveredSido : selectedSido === 'all' ? '전국' : selectedSido} 지역 상세 설정
                      </span>
                    </div>
                    {(hoveredSido !== 'all' && LOCATIONS_MAP[hoveredSido]?.length > 0
                      ? LOCATIONS_MAP[hoveredSido]
                      : selectedSido !== 'all' && LOCATIONS_MAP[selectedSido]?.length > 0
                        ? LOCATIONS_MAP[selectedSido]
                        : []
                    ).length > 0 ? (
                      <>
                        <button
                          type="button"
                          className={`filter-chip ${selectedSigungu === 'all' ? 'active' : ''}`}
                          style={{ fontSize: '0.82rem', padding: '5px 12px' }}
                          onClick={() => { setSelectedSigungu('all'); setIsLocationOpen(false); }}
                        >
                          {hoveredSido !== 'all' ? hoveredSido : selectedSido} 전체
                        </button>
                        {(hoveredSido !== 'all' && LOCATIONS_MAP[hoveredSido]?.length > 0
                          ? LOCATIONS_MAP[hoveredSido]
                          : LOCATIONS_MAP[selectedSido] || []
                        ).map(sigungu => (
                          <button
                            type="button"
                            key={sigungu}
                            className={`filter-chip ${selectedSigungu === sigungu && selectedSido === (hoveredSido !== 'all' ? hoveredSido : selectedSido) ? 'active' : ''}`}
                            style={{ fontSize: '0.82rem', padding: '5px 12px' }}
                            onClick={() => {
                              const targetSido = hoveredSido !== 'all' ? hoveredSido : selectedSido;
                              setSelectedSido(targetSido);
                              setSelectedSigungu(sigungu);
                              setIsLocationOpen(false);
                            }}
                          >
                            {sigungu}
                          </button>
                        ))}
                      </>
                    ) : (
                      <div style={{ padding: '24px 16px', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                        좌측에서 지역을 선택하세요
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 검색조건과 검색결과 사이의 모던 구분선 */}
        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '36px 0 28px 0' }} />

        {/* 4. Results List Section */}

        <div className="results-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0', marginBottom: '24px' }}>
          <div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              검색 결과 <span style={{ color: 'var(--accent)' }}>{displayedCampaigns.length}</span>건
            </span>
          </div>

          {/* 정렬 셀렉터 */}
          <div className="sort-buttons-wrapper" style={{ display: 'flex', gap: '6px' }}>
            {[
              { key: 'latest', label: '최신등록순' },
              { key: 'endDate', label: '마감임박순' },
              { key: 'popular', label: '경쟁률순' }
            ].map(item => (
              <button
                key={item.key}
                onClick={() => setSortBy(item.key)}
                style={{
                  fontSize: '0.85rem', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                  fontWeight: sortBy === item.key ? 700 : 500,
                  color: sortBy === item.key ? 'var(--accent)' : 'var(--text-secondary)',
                  backgroundColor: sortBy === item.key ? 'var(--accent-light)' : 'transparent',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 로딩 스켈레톤 상태 */}
        {loading ? (
          <div className="campaign-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="glass-panel" style={{
                borderRadius: 'var(--radius-md)', height: '360px', overflow: 'hidden',
                animation: 'pulse 1.5s infinite ease-in-out'
              }}>
                <div style={{ height: '180px', backgroundColor: 'var(--border-color)' }} />
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ height: '18px', backgroundColor: 'var(--border-color)', width: '40%', borderRadius: '4px' }} />
                  <div style={{ height: '24px', backgroundColor: 'var(--border-color)', width: '90%', borderRadius: '4px' }} />
                  <div style={{ height: '16px', backgroundColor: 'var(--border-color)', width: '60%', borderRadius: '4px' }} />
                  <div style={{ height: '32px', backgroundColor: 'var(--border-color)', marginTop: '20px', borderRadius: 'var(--radius-sm)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : displayedCampaigns.length === 0 ? (
          /* 빈 화면 상태 */
          <div className="glass-panel" style={{
            padding: '80px 24px', textAlign: 'center', borderRadius: 'var(--radius-lg)'
          }}>
            <div style={{ width: '120px', height: '120px', margin: '0 auto 20px auto', borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <img 
                src="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=200&h=200&q=80" 
                alt="No campaigns found"
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'grayscale(100%)' }}
              />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>조건에 맞는 체험단이 없습니다</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
              필터를 조정하거나 다른 검색어를 입력해 보세요.
            </p>
            <button 
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('all');
                setActivePlatform('all');
                setActiveLocation('all');
                setActiveSite('all');
              }}
              className="premium-button-primary"
              style={{ margin: '0 auto' }}
            >
              필터 초기화하기
            </button>
          </div>
        ) : (
          /* 실제 리스트 카드 렌더링 */
          <>
            {/* 1. 상단 2개 라인 (카드 8개) */}
            <div className="campaign-grid">
              {displayedCampaigns.slice(0, Math.min(8, visibleCount)).map((c) => {
                const dday = calculateDday(c.endDate);
                const competitionRate = c.limitCount > 0 ? (c.applyCount / c.limitCount).toFixed(1) : '0';
                const ratePercent = Math.min(100, Math.floor((c.applyCount / c.limitCount) * 100));

                let ddayColor = 'var(--success)';
                if (dday === '오늘마감' || dday === 'D-1' || dday === 'D-2') ddayColor = 'var(--danger)';
                else if (dday.startsWith('D-') && parseInt(dday.substring(2)) <= 5) ddayColor = 'var(--warning)';
                else if (dday === '마감됨') ddayColor = 'var(--text-tertiary)';

                return (
                  <article 
                    key={c.id} 
                    className="premium-card animate-fade-in"
                    onClick={() => setSelectedCampaign(c)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* 카드 썸네일 영역 */}
                    <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
                      <img 
                        src={c.imageUrl} 
                        alt={c.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover',
                          transition: 'transform 0.4s ease'
                        }}
                        className="card-image-hover"
                      />
                      <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                        <span className={`badge badge-${c.platform}`}>
                          {c.platform === 'blog' ? 'Blog' : c.platform === 'instagram' ? 'Insta' : c.platform === 'youtube' ? 'YouTube' : 'Etc'}
                        </span>
                      </div>
                      <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff',
                        fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: 'var(--radius-sm)'
                      }}>
                        {c.targetSite}
                      </div>
                      <div style={{
                        position: 'absolute', bottom: '12px', left: '12px',
                        backgroundColor: ddayColor, color: '#ffffff',
                        fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: 'var(--radius-full)'
                      }}>
                        {dday}
                      </div>
                    </div>

                    {/* 카드 내용 영역 */}
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                      <div>
                        {c.location && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>
                            <Icons.MapPin /> {c.location}
                          </div>
                        )}
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {c.title}
                        </h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {c.description}
                        </p>
                      </div>
                      <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          <span>지원현황 <strong>{c.applyCount}</strong> / {c.limitCount}명</span>
                          <span style={{ fontWeight: 700, color: parseFloat(competitionRate) >= 1 ? 'var(--danger)' : 'var(--success)' }}>
                            경쟁률 {competitionRate}:1
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                          <div style={{
                            width: `${ratePercent}%`, height: '100%',
                            backgroundColor: parseFloat(competitionRate) >= 1 ? 'var(--danger)' : 'var(--accent)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* 💻📱 인피드 가로형 띠 배너 광고 (3라인 통째로 100% 너비로 삽입) */}
            {displayedCampaigns.length > 8 && (
              <div 
                className="glass-panel" 
                onClick={() => window.open('https://viral-re.vercel.app', '_blank')}
                style={{
                  margin: '32px 0',
                  width: '100%',
                  minHeight: '220px',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative',
                  overflow: 'hidden',
                  backgroundImage: `url(https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&h=200&q=80)`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  border: '1px dashed var(--accent)',
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.55)',
                  zIndex: 1
                }} />
                
                <div style={{
                  position: 'relative', zIndex: 2, padding: '36px 48px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  width: '100%', color: '#ffffff', flexWrap: 'wrap', gap: '16px',
                  minHeight: '220px'
                }}>
                  <div>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 900, color: '#ffffff',
                      backgroundColor: 'var(--accent)', padding: '3px 8px', borderRadius: '4px',
                      marginRight: '10px', verticalAlign: 'middle'
                    }}>IN-FEED AD</span>
                    <h4 style={{ fontSize: '1.45rem', fontWeight: 800, display: 'inline-block', margin: 0, verticalAlign: 'middle', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      내 블로그 노출 순위 수직 상승 비법서 무상 배포!
                    </h4>
                    <p style={{ fontSize: '0.95rem', opacity: 0.9, marginTop: '8px', marginBottom: 0, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                      최신 C-Rank 로직 분석 및 상위 노출에 최적화된 소제목/키워드 배치 가이드를 단독 공개합니다.
                    </p>
                  </div>
                  <div className="premium-button-primary" style={{ fontSize: '0.85rem', padding: '12px 24px', borderRadius: 'var(--radius-sm)' }}>
                    비법서 다운로드하기
                  </div>
                </div>
              </div>
            )}

            {/* 2. 하단 3번째 라인 이후 (카드 9번째부터 끝까지) */}
            {visibleCount > 8 && displayedCampaigns.length > 8 && (
              <div className="campaign-grid" style={{ marginTop: '0' }}>
                {displayedCampaigns.slice(8, visibleCount).map((c) => {
                  const dday = calculateDday(c.endDate);
                  const competitionRate = c.limitCount > 0 ? (c.applyCount / c.limitCount).toFixed(1) : '0';
                  const ratePercent = Math.min(100, Math.floor((c.applyCount / c.limitCount) * 100));

                  let ddayColor = 'var(--success)';
                  if (dday === '오늘마감' || dday === 'D-1' || dday === 'D-2') ddayColor = 'var(--danger)';
                  else if (dday.startsWith('D-') && parseInt(dday.substring(2)) <= 5) ddayColor = 'var(--warning)';
                  else if (dday === '마감됨') ddayColor = 'var(--text-tertiary)';

                  return (
                    <article 
                      key={c.id} 
                      className="premium-card animate-fade-in"
                      onClick={() => setSelectedCampaign(c)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* 카드 썸네일 영역 */}
                      <div style={{ position: 'relative', height: '170px', overflow: 'hidden' }}>
                        <img 
                          src={c.imageUrl} 
                          alt={c.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          style={{
                            width: '100%', height: '100%', objectFit: 'cover',
                            transition: 'transform 0.4s ease'
                          }}
                          className="card-image-hover"
                        />
                        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '6px' }}>
                          <span className={`badge badge-${c.platform}`}>
                            {c.platform === 'blog' ? 'Blog' : c.platform === 'instagram' ? 'Insta' : c.platform === 'youtube' ? 'YouTube' : 'Etc'}
                          </span>
                        </div>
                        <div style={{
                          position: 'absolute', top: '12px', right: '12px',
                          backgroundColor: 'rgba(0,0,0,0.6)', color: '#ffffff',
                          fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: 'var(--radius-sm)'
                        }}>
                          {c.targetSite}
                        </div>
                        <div style={{
                          position: 'absolute', bottom: '12px', left: '12px',
                          backgroundColor: ddayColor, color: '#ffffff',
                          fontSize: '0.75rem', fontWeight: 800, padding: '4px 10px', borderRadius: 'var(--radius-full)'
                        }}>
                          {dday}
                        </div>
                      </div>

                      {/* 카드 내용 영역 */}
                      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                        <div>
                          {c.location && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>
                              <Icons.MapPin /> {c.location}
                            </div>
                          )}
                          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {c.title}
                          </h3>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {c.description}
                          </p>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            <span>지원현황 <strong>{c.applyCount}</strong> / {c.limitCount}명</span>
                            <span style={{ fontWeight: 700, color: parseFloat(competitionRate) >= 1 ? 'var(--danger)' : 'var(--success)' }}>
                              경쟁률 {competitionRate}:1
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{
                              width: `${ratePercent}%`, height: '100%',
                              backgroundColor: parseFloat(competitionRate) >= 1 ? 'var(--danger)' : 'var(--accent)',
                              borderRadius: 'var(--radius-full)',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

          {/* 🔑 더보기 (Load More) 버튼 영역 */}
          {displayedCampaigns.length > visibleCount && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '36px', marginBottom: '12px' }}>
              <button 
                onClick={() => setVisibleCount(visibleCount + 12)}
                className="premium-button-secondary"
                style={{
                  padding: '12px 32px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: 'var(--shadow-md)',
                  borderColor: 'var(--accent)'
                }}
              >
                <span>더 많은 체험단 보기</span>
                <span style={{ 
                  fontSize: '0.8rem', 
                  backgroundColor: 'var(--accent-light)', 
                  color: 'var(--accent)', 
                  padding: '2px 8px', 
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: 800
                }}>
                  +{displayedCampaigns.length - visibleCount}개 남음
                </span>
              </button>
            </div>
          )}
          </>
        )}
      </main>

      {/* 5. Campaign Detail Modal (캠페인 상세 모달) */}
      {selectedCampaign && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '16px'
        }} onClick={() => setSelectedCampaign(null)}>
          <div 
            className="glass-panel animate-fade-in" 
            style={{
              maxWidth: '650px', width: '100%', borderRadius: 'var(--radius-lg)',
              overflow: 'hidden', boxShadow: 'var(--shadow-premium)',
              backgroundColor: 'var(--bg-secondary)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '90vh'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* 닫기 X 아이콘 (데스크톱 탑승용) */}
            <button 
              onClick={() => setSelectedCampaign(null)}
              style={{
                position: 'absolute', top: '16px', right: '16px', zIndex: 10,
                width: '36px', height: '36px', borderRadius: '50%',
                backgroundColor: 'rgba(0,0,0,0.5)', color: '#ffffff',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                border: 'none', cursor: 'pointer'
              }}
            >
              <Icons.Close />
            </button>

            {/* 스크롤러 내부 상단 영역 */}
            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '100px' }}>
              {/* 모달 이미지 */}
              <div style={{ height: '220px', width: '100%', position: 'relative' }}>
                <img 
                  src={selectedCampaign.imageUrl} 
                  alt={selectedCampaign.title}
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                  padding: '20px 20px 12px 20px', color: '#ffffff'
                }}>
                  <span className={`badge badge-${selectedCampaign.platform}`} style={{ marginBottom: '8px' }}>
                    {selectedCampaign.platform}
                  </span>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>
                    {selectedCampaign.title}
                  </h3>
                </div>
              </div>

              {/* 모달 본문 내용 */}
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* 제공 혜택 */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>제공 내역</h4>
                  <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)' }}>
                    {selectedCampaign.description}
                  </p>
                </div>

                {/* 기본 정보 테이블 */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
                  padding: '12px 16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)'
                }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>모집 정원</span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedCampaign.limitCount}명 (현재 {selectedCampaign.applyCount}명 신청)</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>수집 플랫폼</span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedCampaign.targetSite}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>모집 마감일</span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedCampaign.endDate}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block' }}>체험 방식</span>
                    <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      {selectedCampaign.location ? `방문 체험 (${selectedCampaign.location})` : '재택/배송형'}
                    </span>
                  </div>
                </div>

                {/* 가이드 라인 안내 */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>리뷰어 미션 안내</h4>
                  <ul style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <li>제품 수령 후 7일 이내 정해진 포맷에 따라 리뷰 등록</li>
                    <li>사진 최소 5장 이상, 본문 800자 이상 및 지정 키워드 필수 삽입</li>
                    <li>스폰서 배너 및 공정위 문구 필수 기재</li>
                  </ul>
                </div>

              </div>
            </div>

            {/* 풋터 플로팅 고정 영역 (닫기 + 신청하러 가기) */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: 'var(--bg-secondary)',
              borderTop: '1px solid var(--border-color)',
              padding: '12px 20px',
              display: 'flex', gap: '10px',
              boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
              zIndex: 5
            }}>
              <button 
                onClick={() => setSelectedCampaign(null)}
                className="premium-button-secondary" 
                style={{ flex: 1, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                닫기
              </button>

              <a 
                href={selectedCampaign.campaignUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="premium-button-primary"
                style={{ flex: 2, padding: '12px', fontSize: '0.9rem', fontWeight: 700 }}
              >
                캠페인 신청하러 가기
                <Icons.ExternalLink />
              </a>
            </div>

          </div>
        </div>
      )}

      {/* 6. Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 110,
          padding: '12px 20px', borderRadius: 'var(--radius-md)',
          color: '#ffffff', fontWeight: 600, fontSize: '0.9rem',
          boxShadow: 'var(--shadow-lg)',
          backgroundColor: toast.type === 'success' ? 'var(--success)' : toast.type === 'error' ? 'var(--danger)' : 'var(--accent)',
          animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          {toast.type === 'success' && '✅ '}
          {toast.type === 'error' && '🚨 '}
          {toast.type === 'info' && '💡 '}
          {toast.message}
        </div>
      )}

      {/* 7. Footer */}
      <footer style={{
        marginTop: 'auto', padding: '32px 24px',
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        textAlign: 'center', color: 'var(--text-tertiary)',
        fontSize: '0.85rem'
      }}>
        <p style={{ marginBottom: '8px' }}>
          &copy; {new Date().getFullYear()} viral_re. All rights reserved.
        </p>
        <p>
          본 사이트는 각 블로그 체험단 사이트의 공개 데이터를 기술적 프로토타입 목적으로 연동/시연하는 애그리게이터 데모 웹 사이트입니다.
        </p>
      </footer>

      {/* 📱 모바일 전용 하단 고정 플로팅 앵커 배너 (Bottom Sticky Anchor Ad) */}
      {showStickyAd && (
        <div 
          className="mobile-only-ad-sticky" 
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 90,
            height: '56px', backgroundColor: 'var(--bg-secondary)',
            borderTop: '2px solid var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 16px',
            boxShadow: '0 -4px 16px rgba(0,0,0,0.12)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          {/* 닫기 버튼 */}
          <button 
            onClick={() => setShowStickyAd(false)} 
            style={{
              position: 'absolute', top: '-10px', right: '12px',
              width: '20px', height: '20px', borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              fontSize: '0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)', cursor: 'pointer', zIndex: 10,
              color: 'var(--text-secondary)'
            }}
          >
            ✕
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ fontSize: '0.55rem', fontWeight: 900, border: '1px solid var(--border-color)', padding: '1px 4px', borderRadius: '3px', color: 'var(--text-tertiary)' }}>AD</span>
            <div style={{ textAlign: 'left', overflow: 'hidden' }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 800, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>인플루언서 제휴 문의 폭주! VIP 선착순 등록</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>조기 마감 임박! 지금 무료 프리패스 신청하기</p>
            </div>
          </div>
          <a 
            href="https://viral-re.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="premium-button-primary" 
            style={{ padding: '6px 12px', fontSize: '0.72rem', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
          >
            이동
          </a>
        </div>
      )}

      {/* 🔑 소셜 로그인 모달 */}
      {isLoginModalOpen && (
        <div className="social-modal-overlay" onClick={() => setIsLoginModalOpen(false)}>
          <div className="social-modal-container" onClick={(e) => e.stopPropagation()}>
            <button className="social-modal-close" onClick={() => setIsLoginModalOpen(false)}>
              ✕
            </button>
            
            {/* 로그인 헤더 트렌디 감성 이미지 배너 */}
            <div style={{ width: 'calc(100% + 32px)', height: '100px', borderRadius: 'var(--radius-md) var(--radius-md) 0 0', overflow: 'hidden', margin: '-24px -16px 20px -16px', position: 'relative' }}>
              <img 
                src="https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?auto=format&fit=crop&w=400&h=100&q=80" 
                alt="Login Header" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.1) 100%)' }} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>
                소셜 로그인 / 회원가입
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                체험단 목록을 연동하고 나만의 북마크를 관리해 보세요!
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* 카카오톡 */}
              <button onClick={() => handleSocialLogin('kakao')} className="social-login-btn btn-kakao">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: '8px' }}>
                  <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.553 1.7 4.792 4.248 5.992-.17.618-.613 2.227-.702 2.573-.11.438.163.432.342.31 1.758-1.196 2.45-1.7 2.766-1.927.42.062.853.097 1.346.097 4.97 0 9-3.186 9-7.115C21 6.185 16.97 3 12 3z"/>
                </svg>
                카카오로 시작하기
              </button>

              {/* 네이버 */}
              <button onClick={() => handleSocialLogin('naver')} className="social-login-btn btn-naver">
                <span style={{ fontWeight: 900, fontSize: '1.2rem', marginRight: '14px', marginLeft: '4px' }}>N</span>
                네이버로 시작하기
              </button>

              {/* 구글 */}
              <button onClick={() => handleSocialLogin('google')} className="social-login-btn btn-google">
                <svg viewBox="0 0 24 24" width="20" height="20" style={{ marginRight: '8px' }}>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.23-.66-.35-1.36-.35-2.09z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Google 계정으로 시작하기
              </button>

              {/* 인스타그램 */}
              <button onClick={() => handleSocialLogin('instagram')} className="social-login-btn btn-instagram">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ marginRight: '8px' }}>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                Instagram으로 시작하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💻📱 우측 하단 최상단 탑 버튼 (Scroll to Top) */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          style={{
            position: 'fixed',
            bottom: '32px',
            right: '32px',
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--accent)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 500,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(99, 102, 241, 0.35)';
          }}
          title="맨 위로 이동"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      )}

      {/* CSS Pulse 애니메이션용 style 정의 */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        .card-image-hover:hover {
          transform: scale(1.05);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }

        /* 📱 모바일 디바이스 반응형 최적화 (768px 이하) */
        @media (max-width: 768px) {
          /* 헤더 영역 모바일 맞춤 축소 */
          header {
            padding: 10px 12px !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          header h1 {
            font-size: 1.15rem !important;
          }
          header img {
            height: 34px !important;
          }
          .integrator-badge {
            display: none !important;
          }
          .header-btn-text {
            display: none !important;
          }
          .header-login-btn {
            padding: 6px 10px !important;
          }
          .login-btn-text-desktop {
            display: none !important;
          }
          .login-btn-text-mobile {
            display: inline !important;
            font-size: 0.75rem !important;
            font-weight: 700 !important;
          }
          header button {
            padding: 6px 10px !important;
            font-size: 0.75rem !important;
          }

          /* 히어로 배너 영역 패딩 및 폰트 줄이기 */
          section {
            padding: 36px 16px 24px 16px !important;
          }
          section h2 {
            font-size: 1.6rem !important;
            line-height: 1.25 !important;
          }
          section p {
            font-size: 0.85rem !important;
            margin-bottom: 20px !important;
          }

          /* 최근/인기 검색어 가로 라인 간격 다이어트 */
          #searchWrapper {
            margin-top: 12px !important;
          }

          /* 대시보드 메인 영역 */
          main {
            padding: 16px 12px !important;
          }

          /* 필터 판넬 레이아웃 최적화 */
          .glass-panel.animate-fade-in {
            padding: 16px 12px !important;
            gap: 12px !important;
          }

          /* 플랫폼 및 카테고리 가로 스크롤화로 찌그러짐 원천 차단 */
          .filter-row {
            display: flex !important;
            overflow-x: auto !important;
            gap: 6px !important;
            padding-bottom: 4px !important;
            scrollbar-width: none !important;
          }
          .filter-row::-webkit-scrollbar {
            display: none !important;
          }
          .filter-row button {
            flex-shrink: 0 !important;
            padding: 6px 12px !important;
            font-size: 0.8rem !important;
          }

          /* 복합 필터 드롭다운 그리드: 모바일은 1열 스택 */
          .filter-dropdown-grid {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
            padding-top: 16px !important;
          }

          /* 카드 그리드: 가로 컴팩트 2열 나열로 쇼핑몰급 UX 획득 */
          .campaign-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
          }

          /* 카드 내부 컴포넌트 텍스트 및 간격 2열 맞춤화 */
          .campaign-grid > div {
            height: auto !important;
            min-height: 290px !important;
          }
          .campaign-grid div[style*="height: '180px'"] {
            height: 120px !important;
          }
          /* 리액트 style props에 주입된 높이 무시 및 모바일 최적화 */
          .campaign-card-image {
            height: 110px !important;
          }
          .campaign-card-content {
            padding: 10px !important;
          }
          .campaign-card-content h4 {
            font-size: 0.82rem !important;
            line-height: 1.25 !important;
            height: 34px !important; /* 모바일 카드 높이 균형 */
          }
          .campaign-card-content .reward {
            font-size: 0.72rem !important;
          }
          .campaign-card-content .meta-info {
            font-size: 0.65rem !important;
          }

          /* 모바일 로그인 모달 팝업 가로폭 꽉 채우기 */
          div[style*="width: '450px'"] {
            width: 90% !important;
            max-width: 380px !important;
            padding: 24px 16px !important;
          }
        }
      `}</style>

    </div>
  );
}
