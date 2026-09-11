import { queryCampaigns } from './db';

async function runFilterTests() {
  console.log('===============================================================');
  console.log('🧪 [상세 검색 필터 (모집유형 / 카테고리 / 플랫폼 / 지역) 2차 검증]');
  console.log('===============================================================\n');

  const testCases = [
    // 1. 모집유형 (Type)
    { group: '모집유형', name: '전체 (all)', params: { type: 'all' } },
    { group: '모집유형', name: '방문형 (visit)', params: { type: 'visit' } },
    { group: '모집유형', name: '배송형/재택 (delivery)', params: { type: 'delivery' } },

    // 2. 카테고리 (Category)
    { group: '카테고리', name: '맛집/식품 (food)', params: { category: 'food' } },
    { group: '카테고리', name: '카페/디저트 (food-cafe)', params: { category: 'food-cafe' } },
    { group: '카테고리', name: '뷰티/화장품 (beauty)', params: { category: 'beauty' } },
    { group: '카테고리', name: '여행/숙박 (travel)', params: { category: 'travel' } },
    { group: '카테고리', name: '패션/잡화 (fashion)', params: { category: 'fashion' } },
    { group: '카테고리', name: '생활/가전 (life)', params: { category: 'life' } },

    // 3. 플랫폼 (Platform)
    { group: '플랫폼', name: '네이버 블로그 (blog)', params: { platform: 'blog' } },
    { group: '플랫폼', name: '인스타그램/릴스 (instagram)', params: { platform: 'instagram' } },
    { group: '플랫폼', name: '네이버 클립 (clip)', params: { platform: 'clip' } },

    // 4. 지역 (Location)
    { group: '지역', name: '서울 전체 (서울)', params: { location: '서울' } },
    { group: '지역', name: '강남구 (강남)', params: { location: '강남' } },
    { group: '지역', name: '경기 수원 (수원)', params: { location: '수원' } },
    { group: '지역', name: '부산 전체 (부산)', params: { location: '부산' } },
    { group: '지역', name: '제주도 (제주)', params: { location: '제주' } },

    // 5. 복합 필터 (Combined Filters)
    { group: '복합필터', name: '강남 + 방문형 + 맛집 + 블로그', params: { location: '강남', type: 'visit', category: 'food', platform: 'blog' } },
    { group: '복합필터', name: '배송형 + 뷰티 + 인스타그램', params: { type: 'delivery', category: 'beauty', platform: 'instagram' } },
    { group: '복합필터', name: '제주 + 숙박/여행 + 방문형', params: { location: '제주', type: 'visit', category: 'travel' } },
    { group: '복합필터', name: '홍대/마포 + 방문형 + 카페', params: { location: '마포', type: 'visit', category: 'food-cafe' } }
  ];

  const results: any[] = [];

  for (const tc of testCases) {
    const start = Date.now();
    const res = await queryCampaigns(tc.params);
    const elapsedMs = Date.now() - start;

    let status = '✅ 통과';
    let sampleTitle = res.length > 0 ? res[0].title.slice(0, 35) : '결과 없음';
    let sampleLoc = res.length > 0 ? (res[0].location || '배송/재택') : '-';

    if (tc.params.type === 'visit' && res.some(c => !c.location || c.location.includes('배송') || c.location.includes('전국'))) {
      status = '❌ 방문형 조건 이탈';
    } else if (tc.params.type === 'delivery' && res.some(c => c.location && (c.location.includes('강남구') || c.location.includes('마포구')))) {
      status = '❌ 배송형 조건 이탈';
    }

    results.push({
      구분: tc.group,
      필터명: tc.name,
      검색결과수: `${res.length}개`,
      응답속도: `${elapsedMs}ms`,
      샘플공고제목: sampleTitle,
      샘플위치: sampleLoc,
      검증상태: status
    });
  }

  console.table(results);
}

runFilterTests();
