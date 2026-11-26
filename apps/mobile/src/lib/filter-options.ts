import type { CampaignFilters } from './campaign-api';

export type FilterOption = { value: string; label: string };
export type FilterGroup = keyof Omit<CampaignFilters, 'sortBy'>;

export const EMPTY_FILTERS: CampaignFilters = {
  category: [],
  platform: [],
  type: [],
  location: [],
  targetSite: [],
  sortBy: 'latest',
};

export const FILTER_OPTIONS: Record<FilterGroup, FilterOption[]> = {
  category: [
    ['food-korean', '한식'], ['food-western', '양식'], ['food-japanese', '일식'], ['food-chinese', '중식'], ['food-cafe', '카페/디저트'], ['food-pub', '술집/주점'], ['food-snack', '분식'], ['food-meat', '육류/구이'], ['food-omakase', '오마카세'],
    ['beauty-cosmetics', '화장품/스킨케어'], ['beauty-salon', '헤어/네일/속눈썹'], ['beauty-spa', '피부/에스테틱'], ['beauty-body', '다이어트/체형'], ['health-fitness', '헬스/피트니스'], ['health-food', '영양제/건강식품'], ['health-medical', '병원/의료'],
    ['service-fortune', '사주/타로'], ['accommodation', '숙박'], ['travel', '여행/레저/관광'], ['culture', '문화/공연/전시'],
    ['fashion-clothing', '의류/패션'], ['fashion-accessory', '신발/가방/잡화'], ['baby', '유아동/육아'], ['life-goods', '생활용품/인테리어'], ['health-fresh', '밀키트/신선식품'], ['life-appliances', '가전/디지털'], ['life-auto', '자동차'], ['pet', '반려동물/애견'], ['book', '도서/교육'], ['hobby', '취미/클래스'], ['etc', '기타'],
  ].map(([value, label]) => ({ value, label })),
  platform: [
    ['blog', '블로그'], ['clip', '클립'], ['instagram', '인스타그램'], ['youtube', '유튜브'], ['tiktok', '틱톡'], ['coupang', '쿠팡'],
  ].map(([value, label]) => ({ value, label })),
  type: [
    ['visit', '방문형'], ['delivery', '배송형'],
  ].map(([value, label]) => ({ value, label })),
  location: [
    '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '세종', '강원', '제주', '충북', '충남', '전북', '전남', '경북', '경남',
  ].map(value => ({ value, label: value })),
  targetSite: [
    '강남맛집', '디너의여왕', '포블로그', '리뷰노트', '클라우드리뷰', '레뷰 (REVU)', '미블', '링블', '놀러와체험단', '모블', '아싸뷰', '오마이블로그', '리뷰플레이스',
  ].map(value => ({ value, label: value })),
};

export const FILTER_LABELS: Record<FilterGroup, string> = {
  category: '카테고리',
  platform: '플랫폼',
  type: '모집 유형',
  location: '지역',
  targetSite: '출처 사이트',
};

export function cloneFilters(filters: CampaignFilters): CampaignFilters {
  return {
    category: [...filters.category],
    platform: [...filters.platform],
    type: [...filters.type],
    location: [...filters.location],
    targetSite: [...filters.targetSite],
    sortBy: filters.sortBy,
  };
}

export function toggleFilterValue(filters: CampaignFilters, group: FilterGroup, value: string): CampaignFilters {
  const values = filters[group];
  return { ...filters, [group]: values.includes(value) ? values.filter(item => item !== value) : [...values, value] };
}

export function selectedFilterCount(filters: CampaignFilters): number {
  return filters.category.length + filters.platform.length + filters.type.length + filters.location.length + filters.targetSite.length;
}
