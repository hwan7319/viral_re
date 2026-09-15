import { deadlineFromText } from './campaign-values';
import axios from 'axios';
import * as cheerio from 'cheerio';



// 🔑 크롤링 브라우저 User-Agent 헤더 셋업 (우회 성능 향상)
export const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

export const parseDdayToDate = deadlineFromText;

export const parseRemainDaysToDate = (remainDays: number): string => {
  const now = new Date();
  const target = new Date(now.getTime() + remainDays * 24 * 60 * 60 * 1000);
  return target.toISOString().split('T')[0];
};

// 🔑 실제 업체측 리뷰어 미션 가이드라인 생성 헬퍼 함수
export const generateRealMission = (title: string, platform: string, category: string, location?: string): string => {
  return '';
};

export const parseCountText = (text: string): { applyCount: number; limitCount: number } => {
  if (!text) return { applyCount: 0, limitCount: 0 };
  const cleaned = text.replace(/\s+/g, '');
  
  // 1. 명시적 "신청N / 모집N" 또는 "신청N명 / 모집N명" 패턴
  const applyFirstMatch = cleaned.match(/신청([0-9,]+).*?모집([0-9,]+)/);
  if (applyFirstMatch) {
    return {
      applyCount: parseInt(applyFirstMatch[1].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(applyFirstMatch[2].replace(/,/g, ''), 10) || 0
    };
  }

  // 2. 명시적 "모집N / 신청N" 또는 "모집N명 / 신청N명" 패턴
  const limitFirstMatch = cleaned.match(/모집([0-9,]+).*?신청([0-9,]+)/);
  if (limitFirstMatch) {
    return {
      applyCount: parseInt(limitFirstMatch[2].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(limitFirstMatch[1].replace(/,/g, ''), 10) || 0
    };
  }

  // 3. 단순 "신청N" 패턴
  const applyOnlyMatch = cleaned.match(/신청([0-9,]+)/);
  // 4. 단순 "모집N" 패턴
  const limitOnlyMatch = cleaned.match(/모집([0-9,]+)/);

  if (applyOnlyMatch || limitOnlyMatch) {
    return {
      applyCount: applyOnlyMatch ? parseInt(applyOnlyMatch[1].replace(/,/g, ''), 10) : 0,
      limitCount: limitOnlyMatch ? parseInt(limitOnlyMatch[1].replace(/,/g, ''), 10) : 0
    };
  }

  // 5. "N / M" 단순 슬래시 (신청/모집)
  const slashMatch = cleaned.match(/([0-9,]+)\/([0-9,]+)/);
  if (slashMatch) {
    return {
      applyCount: parseInt(slashMatch[1].replace(/,/g, ''), 10) || 0,
      limitCount: parseInt(slashMatch[2].replace(/,/g, ''), 10) || 0
    };
  }

  return { applyCount: 0, limitCount: 0 };
};

export const detectPlatform = (title: string, rawPlatformText?: string): 'blog' | 'clip' | 'blog+clip' | 'blog+instagram' | 'instagram' | 'youtube' | 'coupang' | 'etc' => {
  const t = (title || '').toLowerCase();
  const p = (rawPlatformText || '').toLowerCase();
  const combined = `${t} ${p}`;

  // 1. Coupang
  if (combined.includes('쿠팡') || combined.includes('coupang')) {
    return 'coupang';
  }

  const hasBlog = combined.includes('blog') || combined.includes('블로그') || combined.includes('네이버');
  const hasInsta = combined.includes('릴스') || combined.includes('인스타') || combined.includes('instagram') || combined.includes('reels') || combined.includes('insta');
  const hasClip = combined.includes('clip') || combined.includes('클립');

  // 2. Both Blog/Naver and Instagram/Reels (Requires explicit multiplatform tag or title)
  if (
    combined.includes('블로그+인스타') || combined.includes('인스타+블로그') ||
    combined.includes('블로그&인스타') || combined.includes('네이버+인스타') ||
    combined.includes('릴스+블로그') || combined.includes('블로그+릴스') ||
    combined.includes('블로그 및 인스타') || combined.includes('블로그와 인스타') ||
    (combined.includes('[블로그]') && combined.includes('[인스타]')) ||
    (combined.includes('[블로그]') && combined.includes('[릴스]'))
  ) {
    return 'blog+instagram';
  }

  // 3. Instagram / Reels
  if (hasInsta) {
    return 'instagram';
  }

  // 4. YouTube / Shorts
  if (combined.includes('쇼츠') || combined.includes('유튜브') || combined.includes('youtube') || combined.includes('shorts')) {
    return 'youtube';
  }

  // 5. Naver Clip / Blog
  if (hasBlog && hasClip) return 'blog+clip';
  if (hasClip) return 'clip';
  if (hasBlog) return 'blog';

  return 'blog';
};

export const detectCategory = (title: string, desc: string): string => {
  const t = (title + ' ' + desc).toLowerCase();
  
  // 1. 맛집/카페 하위 세분화
  if (t.includes('카페') || t.includes('디저트') || t.includes('베이커리') || t.includes('빵집') || t.includes('도넛') || t.includes('마카롱') || t.includes('음료')) {
    return 'food-cafe';
  }
  if (t.includes('이자카야') || t.includes('주점') || t.includes('술집') || t.includes('포차') || t.includes('맥주') || t.includes('와인') || t.includes('칵테일') || t.includes('주류') || t.includes('호프')) {
    return 'food-pub';
  }
  if (t.includes('맛집') || t.includes('식사') || t.includes('고기') || t.includes('삼겹살') || t.includes('한우') || t.includes('식당') || t.includes('뷔페') || t.includes('레스토랑') || t.includes('스시') || t.includes('초밥') || t.includes('파스타') || t.includes('피자') || t.includes('돈까스') || t.includes('치킨') || t.includes('통닭') || t.includes('곱창') || t.includes('마라탕') || t.includes('국밥') || t.includes('갈비') || t.includes('샤브') || t.includes('칼국수') || t.includes('냉면')) {
    return 'food-restaurant';
  }
  
  // 2. 뷰티 하위 세분화
  if (t.includes('헤어') || t.includes('미용실') || t.includes('염색') || t.includes('파마') || t.includes('펌') || t.includes('클리닉') || t.includes('두피')) {
    return 'beauty-hair';
  }
  if (t.includes('네일') || t.includes('왁싱') || t.includes('피부') || t.includes('에스테틱') || t.includes('속눈썹') || t.includes('마사지') || t.includes('체형교정') || t.includes('체형')) {
    return 'beauty-skin';
  }
  if (t.includes('화장품') || t.includes('크림') || t.includes('앰플') || t.includes('세럼') || t.includes('에센스') || t.includes('립스틱') || t.includes('선크림') || t.includes('선블록') || t.includes('뷰티') || t.includes('메이크업') || t.includes('아이라이너') || t.includes('쿠션') || t.includes('클렌징') || t.includes('로션') || t.includes('토너') || t.includes('마스크팩')) {
    return 'beauty-cosmetic';
  }

  // 3. 반려동물 (Pet)
  if (t.includes('강아지') || t.includes('고양이') || t.includes('애견') || t.includes('반려동물') || t.includes('펫') || t.includes('사료') || t.includes('개껌') || t.includes('캣')) {
    return 'pet';
  }

  // 4. 여행/숙박 하위 세분화
  if (t.includes('호텔') || t.includes('펜션') || t.includes('풀빌라') || t.includes('리조트') || t.includes('글램핑') || t.includes('캠핑') || t.includes('게스트하우스') || t.includes('민박') || t.includes('숙소') || t.includes('숙박') || t.includes('스테이')) {
    return 'travel-stay';
  }
  if (t.includes('입장권') || t.includes('티켓') || t.includes('패스') || t.includes('액티비티') || t.includes('레저') || t.includes('체험권') || t.includes('서핑') || t.includes('요트') || t.includes('아쿠아리움') || t.includes('키즈카페') || t.includes('놀이공원') || t.includes('박물관') || t.includes('전시')) {
    return 'travel-leisure';
  }

  // 5. 패션 하위 세분화
  if (t.includes('의류') || t.includes('패션') || t.includes('자켓') || t.includes('코트') || t.includes('셔츠') || t.includes('티셔츠') || t.includes('원피스') || t.includes('니트') || t.includes('바지') || t.includes('치마') || t.includes('아우터') || t.includes('의상')) {
    return 'fashion-clothing';
  }
  if (t.includes('가방') || t.includes('백팩') || t.includes('숄더백') || t.includes('신발') || t.includes('구두') || t.includes('운동화') || t.includes('스니커즈') || t.includes('모자') || t.includes('액세서리') || t.includes('악세사리') || t.includes('귀걸이') || t.includes('목걸이') || t.includes('시계') || t.includes('주얼리')) {
    return 'fashion-accessory';
  }

  // 6. 도서/교육 단독 카테고리 분리
  if (t.includes('도서') || t.includes('책 ') || t.includes('베스트셀러') || t.includes('소설') || t.includes('에세이') || t.includes('인터넷강의') || t.includes('인강') || t.includes('교육') || t.includes('학습지') || t.includes('학습') || t.includes('학원') || t.includes('교재')) {
    return 'book';
  }

  // 7. 건강/식품 세분화
  if (t.includes('밀키트') || t.includes('신선식품') || t.includes('반찬') || t.includes('간식') || t.includes('과일') || t.includes('음료') || t.includes('탄산수') || t.includes('커피원두') || t.includes('조미료') || t.includes('가공식품') || t.includes('푸드')) {
    return 'health-fresh';
  }
  if (t.includes('영양제') || t.includes('유산균') || t.includes('비타민') || t.includes('다이어트') || t.includes('단백질') || t.includes('콜라겐') || t.includes('홍삼') || t.includes('헬스케어') || t.includes('즙 ') || t.includes('건강식품') || t.includes('프로바이오틱스')) {
    return 'health-food';
  }

  // 8. 유아동/육아
  if (t.includes('유아') || t.includes('아동') || t.includes('아기') || t.includes('육아') || t.includes('기저귀') || t.includes('분유') || t.includes('젖병') || t.includes('장난감') || t.includes('키즈') || t.includes('카시트') || t.includes('유모차') || t.includes('아동복') || t.includes('베이비')) {
    return 'baby';
  }

  // 9. 가전/디지털
  if (t.includes('가전') || t.includes('청소기') || t.includes('모니터') || t.includes('키보드') || t.includes('마우스') || t.includes('가습기') || t.includes('이어폰') || t.includes('헤드폰') || t.includes('스마트폰') || t.includes('충전기') || t.includes('디지털') || t.includes('마사지기') || t.includes('안마기')) {
    return 'life-appliances';
  }

  // 10. 생활용품
  if (t.includes('세제') || t.includes('섬유유연제') || t.includes('샴푸') || t.includes('린스') || t.includes('치약') || t.includes('칫솔') || t.includes('화장지') || t.includes('물티슈') || t.includes('침구') || t.includes('베개') || t.includes('가구') || t.includes('인테리어') || t.includes('식기') || t.includes('생활용품') || t.includes('수건') || t.includes('디퓨저') || t.includes('향수')) {
    return 'life-goods';
  }

  return 'etc';
};

export const buildAutoKeywords = (title: string, desc: string): string => {
  const t = (title + ' ' + desc).toLowerCase();
  const keywords: string[] = [];
  if (t.includes('맛집') || t.includes('식당')) keywords.push('맛집');
  if (t.includes('삼겹살') || t.includes('한우') || t.includes('고기')) keywords.push('고기');
  if (t.includes('카페') || t.includes('디저트')) keywords.push('카페');
  if (t.includes('펜션') || t.includes('풀빌라')) keywords.push('펜션');
  return keywords.length > 0 ? `,${keywords.join(',')},` : '';
};

