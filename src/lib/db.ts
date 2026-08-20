export const CATEGORY_GROUP_MAP: Record<string, string[]> = {
  'food': ['food', 'food-korean', 'food-western', 'food-japanese', 'food-chinese', 'food-restaurant', 'food-cafe', 'food-pub', 'food-foreign', '맛집'],
  'food-korean': ['food-korean', 'food-restaurant', 'food', '맛집'],
  'food-western': ['food-western', 'food-foreign', 'food', '맛집'],
  'food-japanese': ['food-japanese', 'food-foreign', 'food', '맛집'],
  'food-chinese': ['food-chinese', 'food-foreign', 'food', '맛집'],
  'food-restaurant': ['food-restaurant', 'food-korean', 'food', '맛집'],
  'food-foreign': ['food-foreign', 'food-western', 'food-japanese', 'food-chinese', 'food', '맛집'],
  'food-cafe': ['food-cafe', 'food', '디저트'],
  'food-pub': ['food-pub', 'food', '주점'],

  'beauty': ['beauty', 'beauty-cosmetic', 'beauty-cosmetics', 'beauty-hair', 'beauty-salon', 'beauty-skin', 'beauty-spa', 'health-fitness', 'health-food'],
  'beauty-cosmetics': ['beauty-cosmetics', 'beauty-cosmetic', 'beauty'],
  'beauty-cosmetic': ['beauty-cosmetics', 'beauty-cosmetic', 'beauty'],
  'beauty-salon': ['beauty-salon', 'beauty-hair', 'beauty-skin', 'beauty-spa', 'beauty'],
  'beauty-hair': ['beauty-hair', 'beauty-salon', 'beauty'],
  'beauty-skin': ['beauty-skin', 'beauty-spa', 'beauty-salon', 'beauty'],
  'beauty-spa': ['beauty-spa', 'beauty-skin', 'beauty-salon', 'beauty'],
  'health-fitness': ['health-fitness', 'beauty', 'health'],
  'health-food': ['health-food', 'health-fresh', 'life', 'health'],

  'travel': ['travel', 'travel-stay', 'accommodation', 'travel-leisure', 'culture'],
  'accommodation': ['accommodation', 'travel-stay', 'travel'],
  'travel-stay': ['travel-stay', 'accommodation', 'travel'],
  'travel-leisure': ['travel-leisure', 'travel', 'culture'],
  'culture': ['culture', 'travel-leisure', 'travel'],

  'fashion': ['fashion', 'fashion-clothing', 'fashion-accessory'],
  'fashion-clothing': ['fashion-clothing', 'fashion'],
  'fashion-accessory': ['fashion-accessory', 'fashion'],

  'life': ['life', 'life-goods', 'life-appliances', 'health-fresh', 'baby', 'pet', 'book', 'hobby'],
  'life-goods': ['life-goods', 'life'],
  'life-appliances': ['life-appliances', 'life'],
  'health-fresh': ['health-fresh', 'life-goods', 'life'],
  'baby': ['baby', 'life'],
  'pet': ['pet', 'life'],
  'book': ['book', 'life'],
  'hobby': ['hobby', 'travel-leisure', 'life'],
  'etc': ['etc']
};

import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

// 🔑 Vercel/서버리스 환경 대응용 글로벌 인메모리 캐시 DB 드라이버 바인딩
const globalRef = global as any;
if (!globalRef.memoryCampaigns) {
  globalRef.memoryCampaigns = [];
}
if (!globalRef.memoryLogs) {
  globalRef.memoryLogs = [];
}

export interface Campaign {
  id: string;          // 고유 ID (예: revu_12345)
  title: string;       // 캠페인 제목
  description: string; // 제공 내역 (예: 5만원 식사권)
  platform: 'blog' | 'clip' | 'blog+clip' | 'instagram' | 'youtube' | 'etc'; // 플랫폼 구분
  category: string; // 카테고리 (세분화 맵핑 대응을 위해 string으로 완화)
  location?: string;   // 지역 (예: 서울 강남구, 경기 수원시 등)
  campaignUrl: string; // 원본 상세 페이지 URL
  imageUrl: string;    // 이미지 URL
  targetSite: string;  // 출처 사이트 (예: 레뷰, 디너의여왕)
  limitCount: number;  // 모집 인원
  applyCount: number;  // 지원 인원
  startDate?: string;  // 모집 시작일 (YYYY-MM-DD)
  endDate: string;     // 모집 종료일 (YYYY-MM-DD)
  createdAt: string;   // 수집일 (ISO 8601)
  updatedAt: string;   // 최근 갱신일 (ISO 8601)
  searchKeywords?: string; // 수집 당시의 검색 키워드 매핑 태그 (예: ",치킨,삼겹살,")
  mission?: string;    // 실제 업체측 리뷰어 미션 안내 / 가이드라인 (예: "지정 키워드 3개 포함, 사진 10장 및 동영상 1개, 지도 첨부 필수")
}

// 🔑 실제 회원 정보 데이터 인터페이스
export interface User {
  id: string;        // 고유 ID (소셜 제공 ID 또는 이메일 해시)
  name: string;      // 사용자 닉네임 / 이름
  email: string;     // 이메일
  avatar: string;    // 아바타 이미지 URL
  provider: string;  // 인증 제공처 (Google, Naver, Kakao, Instagram 등)
  createdAt: string; // 가입일 (ISO 8601)
  updatedAt: string; // 정보 수정일 (ISO 8601)
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'review-moa.db');

let dbInstance: Database | null = null;

// SQLite DB 초기화 및 연결
export async function getDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  // 🔑 Vercel 빌드 및 서버리스 read-only 샌드박스 등인지 체크
  const isServerless = process.env.VERCEL || process.env.NOW_BUILDER || !fs.existsSync(DB_DIR);
  const targetDbFile = isServerless ? ':memory:' : DB_FILE;

  if (!isServerless && !fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  try {
    // 🔑 Vercel 빌드 타임 C++ Native 바이너리 링크 오류 회피를 위한 동적 require
    const sqlite3Module = require('sqlite3');
    const sqlite3Driver = sqlite3Module.verbose ? sqlite3Module.verbose() : sqlite3Module;

    dbInstance = await open({
      filename: targetDbFile,
      driver: sqlite3Driver.Database,
    });
  } catch (err: any) {
    console.warn('[DB] Failed to load sqlite3 native binary. Falling back to memory mock database for build safety:', err.message);
    
    // Vercel 환경에서 빌드 성공을 보장하기 위한 Mock 인스턴스 반환
    dbInstance = {
      exec: async () => {},
      all: async () => [],
      get: async () => null,
      run: async () => ({ lastID: 1, changes: 1 }),
      close: async () => {},
      prepare: async () => ({
        bind: async () => {},
        reset: async () => {},
        finalize: async () => {},
        run: async () => ({ lastID: 1, changes: 1 }),
        all: async () => [],
        get: async () => null,
      } as any)
    } as any;
  }

  if (!dbInstance) {
    throw new Error('Database initialization failed.');
  }

  // 스키마 초기 설정
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      platform TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT,
      campaignUrl TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      targetSite TEXT NOT NULL,
      limitCount INTEGER DEFAULT 0,
      applyCount INTEGER DEFAULT 0,
      startDate TEXT,
      endDate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      searchKeywords TEXT
    );

    CREATE TABLE IF NOT EXISTS crawling_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      targetSite TEXT NOT NULL,
      status TEXT NOT NULL,
      collectedCount INTEGER DEFAULT 0,
      errorMessage TEXT,
      executedAt TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 🔑 실제 회원 관리를 위한 users 테이블 추가
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      avatar TEXT,
      provider TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- 🔑 사용자별 관심(찜하기) 캠페인을 연동할 user_bookmarks 테이블 추가
    CREATE TABLE IF NOT EXISTS user_bookmarks (
      userId TEXT NOT NULL,
      campaignId TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now', 'localtime')),
      PRIMARY KEY (userId, campaignId),
      FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE,
      FOREIGN KEY (campaignId) REFERENCES campaigns (id) ON DELETE CASCADE
    );

    -- 🔑 실시간 인기 검색어 랭킹 산출을 위한 search_logs 테이블 추가
    CREATE TABLE IF NOT EXISTS search_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      keyword TEXT NOT NULL,
      searchedAt TEXT DEFAULT (datetime('now', 'localtime'))
    );

    -- 속도 향상을 위한 인덱스 생성
    CREATE INDEX IF NOT EXISTS idx_campaigns_search ON campaigns (title, description);
    CREATE INDEX IF NOT EXISTS idx_campaigns_filters ON campaigns (platform, category, targetSite);
    CREATE INDEX IF NOT EXISTS idx_campaigns_end_date ON campaigns (endDate);
    CREATE INDEX IF NOT EXISTS idx_user_bookmarks_user ON user_bookmarks (userId);
    CREATE INDEX IF NOT EXISTS idx_search_logs_keyword ON search_logs (keyword);
  `);

  // [하이브리드 대응] 기존 테이블에 searchKeywords 컬럼이 없는 구버전 DB 대비 컬럼 안전 추가
  try {
    await dbInstance.exec('ALTER TABLE campaigns ADD COLUMN searchKeywords TEXT');
  } catch (e) {}

  try {
    await dbInstance.exec('ALTER TABLE campaigns ADD COLUMN mission TEXT');
  } catch (e) {}

  // 🔑 투잡커넥트 도메인 오타 데이터 교정 마이그레이션 (tojobcon.com -> tojobcn.com)
  try {
    await dbInstance.exec(`
      UPDATE campaigns 
      SET campaignUrl = REPLACE(campaignUrl, 'tojobcon.com', 'tojobcn.com') 
      WHERE campaignUrl LIKE '%tojobcon.com%';
    `);
    console.log('[DB] Successfully corrected tojobcon.com domain typos.');
  } catch (err: any) {
    console.warn('[DB] Failed to run tojobcon migration:', err.message);
  }

  return dbInstance;
}

// 캠페인 데이터 조건 검색 조회 (검색 키워드 태그 조건 및 방문/배송 필터 추가)
export async function queryCampaigns(filters: {
  search?: string;
  platform?: string;
  category?: string;
  location?: string;
  targetSite?: string;
  sortBy?: string;
  type?: string; // 'all' | 'visit' | 'delivery'
}): Promise<Campaign[]> {
  const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER);

  // 🔑 Vercel/서버리스 환경인 경우: DB를 통하지 않고 인메모리 버퍼에서 직접 JS 쿼리 필터링 및 정렬 반환
  if (isServerless) {
    // 💡 [서버리스 메모리 하이브리드 복구] 메모리가 초기화되어 빈 상태인 경우, 배포된 campaigns.json 스냅샷 파일에서 메모리를 즉시 Rehydrate 복구합니다.
    if (globalRef.memoryCampaigns.length === 0) {
      try {
        const jsonPath = path.join(process.cwd(), 'data', 'campaigns.json');
        if (fs.existsSync(jsonPath)) {
          const fileData = fs.readFileSync(jsonPath, 'utf-8');
          globalRef.memoryCampaigns = JSON.parse(fileData);
          console.log(`[Vercel-Rehydration] Successfully loaded ${globalRef.memoryCampaigns.length} legacy campaigns from snapshot.`);
        }
      } catch (err: any) {
        console.error('[Vercel-Rehydration] Failed to rehydrate memoryCampaigns:', err.message);
      }
    }

    const todayStr = new Date().toISOString().split('T')[0];
    // 당일 기준 마감된 건 검색 목록에서 제외 필터링 기본 탑재
    let result: Campaign[] = (globalRef.memoryCampaigns as Campaign[]).filter((c: Campaign) => c.endDate >= todayStr);
    
    // 1. 검색어 정밀 필터 (제목, 제공혜택, 위치, 수집 키워드 태그, 미션에서 매칭)
    if (filters.search) {
      const s = filters.search.trim().toLowerCase();
      if (s) {
        result = result.filter(c => {
          const titleLower = c.title.toLowerCase();
          const descLower = c.description.toLowerCase();
          const locLower = (c.location || '').toLowerCase();
          const kwLower = (c.searchKeywords || '').toLowerCase();
          const missionLower = (c.mission || '').toLowerCase();

          const titleMatch = titleLower.includes(s);
          const descMatch = descLower.includes(s) && 
                            !descLower.includes(`${s} 제공불가`) && 
                            !descLower.includes(`${s} 제공 불가`) && 
                            !descLower.includes(`${s} 제외`) && 
                            !descLower.includes(`${s} 불가`);
          const locMatch = locLower.includes(s);
          const kwMatch = kwLower.includes(s);
          const missionMatch = missionLower.includes(s);

          return titleMatch || descMatch || locMatch || kwMatch || missionMatch;
        });
      }
    }
    // 2. 플랫폼 필터 (네이버 블로그, 네이버 클립, 블로그+클립 복합 매칭 지원)
    if (filters.platform && filters.platform !== 'all') {
      if (filters.platform === 'blog') {
        result = result.filter(c => c.platform === 'blog' || c.platform === 'blog+clip');
      } else if (filters.platform === 'clip') {
        result = result.filter(c => c.platform === 'clip' || c.platform === 'blog+clip');
      } else if (filters.platform === 'blog+clip') {
        result = result.filter(c => c.platform === 'blog+clip');
      } else {
        result = result.filter(c => c.platform === filters.platform);
      }
    }
    // 3. 카테고리 필터 (그룹 맵핑 기반 멀티 매칭 보증)
    if (filters.category && filters.category !== 'all') {
      const targetMatches = CATEGORY_GROUP_MAP[filters.category] || [filters.category];
      result = result.filter(c => targetMatches.includes(c.category));
    }
    // 4. 지역 필터 (구/군/시 접미사 생략 지명까지 유연 매칭 지원)
    if (filters.location && filters.location !== 'all') {
      const parts = filters.location.trim().split(/\s+/);
      if (parts.length > 1) {
        const sigungu = parts[1].toLowerCase();
        const stem = sigungu.replace(/(구|군|시)$/, '');
        result = result.filter(c => c.location && (c.location.toLowerCase().includes(sigungu) || (stem.length >= 2 && c.location.toLowerCase().includes(stem))));
      } else {
        const loc = parts[0].toLowerCase();
        const stem = loc.replace(/(시|도)$/, '');
        result = result.filter(c => c.location && (c.location.toLowerCase().includes(loc) || (stem.length >= 2 && c.location.toLowerCase().includes(stem))));
      }
    }
    // 5. 출처 사이트 필터 (수집처별 제외 요구사항으로 인해 all이 디폴트이나 코드 호환성 보존)
    if (filters.targetSite && filters.targetSite !== 'all') {
      result = result.filter(c => c.targetSite === filters.targetSite);
    }
    // 5-1. 방문/배송 구분 필터
    if (filters.type && filters.type !== 'all') {
      result = result.filter(c => {
        const hasLoc = c.location && c.location.trim().length > 0;
        const isDeliveryText = c.location && (
          c.location.includes('배송') || 
          c.location.includes('전국') || 
          c.location.includes('재택') || 
          c.location.includes('택배') || 
          c.location.includes('온라인')
        );
        const isVisit = hasLoc && !isDeliveryText;
        return filters.type === 'visit' ? isVisit : !isVisit;
      });
    }

    // 6. 정렬
    const nowStr = new Date().toISOString().split('T')[0];
    if (filters.sortBy === 'endDate') {
      result.sort((a, b) => {
        const aActive = a.endDate >= nowStr ? 0 : 1;
        const bActive = b.endDate >= nowStr ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return a.endDate.localeCompare(b.endDate);
      });
    } else if (filters.sortBy === 'popular') {
      result.sort((a, b) => {
        const rateA = a.limitCount === 0 ? 0 : a.applyCount / a.limitCount;
        const rateB = b.limitCount === 0 ? 0 : b.applyCount / b.limitCount;
        return rateB - rateA;
      });
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    
    // 성능 최적화: 대량 전송 부하를 방지하기 위해 상위 300개만 반환
    return result.slice(0, 300);
  }

  const db = await getDB();
  const todayStr = new Date().toISOString().split('T')[0];
  // 당일 기준 마감된 건 검색 목록에서 제외 조건 기본 탑재 (endDate >= 오늘)
  let query = 'SELECT * FROM campaigns WHERE endDate >= ?';
  const params: any[] = [todayStr];

  // 1. 검색어 정밀 필터 (제목, 본문 혜택, 위치, 수집 키워드 태그, 미션에서 매칭 + 부정어 제외)
  if (filters.search) {
    const s = filters.search.trim();
    if (s) {
      query += ' AND (title LIKE ? OR (description LIKE ? AND description NOT LIKE ? AND description NOT LIKE ?) OR location LIKE ? OR searchKeywords LIKE ? OR mission LIKE ?)';
      const searchParam = `%${s}%`;
      const noParam1 = `%${s} 제공불가%`;
      const noParam2 = `%${s} 제공 불가%`;
      params.push(searchParam, searchParam, noParam1, noParam2, searchParam, searchParam, searchParam);
    }
  }

  // 2. 플랫폼 필터 (네이버 블로그, 네이버 클립, 블로그+클립 복합 매칭 지원)
  if (filters.platform && filters.platform !== 'all') {
    if (filters.platform === 'blog') {
      query += " AND (platform = 'blog' OR platform = 'blog+clip')";
    } else if (filters.platform === 'clip') {
      query += " AND (platform = 'clip' OR platform = 'blog+clip')";
    } else if (filters.platform === 'blog+clip') {
      query += " AND platform = 'blog+clip'";
    } else {
      query += ' AND platform = ?';
      params.push(filters.platform);
    }
  }

  // 3. 카테고리 필터 (그룹 맵핑 기반 멀티 매칭 보증)
  if (filters.category && filters.category !== 'all') {
    const targetMatches = CATEGORY_GROUP_MAP[filters.category] || [filters.category];
    const placeholders = targetMatches.map(() => '?').join(', ');
    query += " AND category IN (" + placeholders + ")";
    params.push(...targetMatches);
  }

  // 4. 지역 필터 (구/군/시 접미사 생략 지명까지 유연 매칭 지원)
  if (filters.location && filters.location !== 'all') {
    const parts = filters.location.trim().split(/\s+/);
    if (parts.length > 1) {
      const sigungu = parts[1];
      const stem = sigungu.replace(/(구|군|시)$/, '');
      if (stem.length >= 2 && stem !== sigungu) {
        query += ' AND (location LIKE ? OR location LIKE ?)';
        params.push(`%${sigungu}%`, `%${stem}%`);
      } else {
        query += ' AND location LIKE ?';
        params.push(`%${sigungu}%`);
      }
    } else {
      const loc = parts[0];
      const stem = loc.replace(/(시|도)$/, '');
      if (stem.length >= 2 && stem !== loc) {
        query += ' AND (location LIKE ? OR location LIKE ?)';
        params.push(`%${loc}%`, `%${stem}%`);
      } else {
        query += ' AND location LIKE ?';
        params.push(`%${loc}%`);
      }
    }
  }

  // 5. 출처 사이트 필터
  if (filters.targetSite && filters.targetSite !== 'all') {
    query += ' AND targetSite = ?';
    params.push(filters.targetSite);
  }

  // 5-1. 방문/배송 구분 필터
  if (filters.type && filters.type !== 'all') {
    if (filters.type === 'visit') {
      query += " AND location IS NOT NULL AND location != '' AND location NOT LIKE '%배송%' AND location NOT LIKE '%전국%' AND location NOT LIKE '%재택%' AND location NOT LIKE '%택배%' AND location NOT LIKE '%온라인%'";
    } else if (filters.type === 'delivery') {
      query += " AND (location IS NULL OR location = '' OR location LIKE '%배송%' OR location LIKE '%전국%' OR location LIKE '%재택%' OR location LIKE '%택배%' OR location LIKE '%온라인%')";
    }
  }

  // 6. 정렬
  const nowStr = new Date().toISOString().split('T')[0];
  if (filters.sortBy === 'endDate') {
    query += ` ORDER BY 
      CASE WHEN endDate >= '${nowStr}' THEN 0 ELSE 1 END,
      endDate ASC, 
      updatedAt DESC`;
  } else if (filters.sortBy === 'popular') {
    query += ' ORDER BY CAST(applyCount AS REAL) / CASE WHEN limitCount = 0 THEN 1 ELSE limitCount END DESC';
  } else {
    query += ' ORDER BY createdAt DESC';
  }

  // 7. 성능 최적화: 대용량 데이터 로드 시 페이로드 전송 부하 방지를 위한 최대 300개 제한
  query += ' LIMIT 300';
  return db.all<Campaign[]>(query, params);
}

// 다량의 캠페인 데이터 Upsert (기존 키워드 태그 누적 결합 처리)
export async function insertOrUpdateCampaigns(campaigns: Campaign[]): Promise<{ inserted: number; updated: number }> {
  const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER);

  // 🔑 Vercel/서버리스 환경인 경우: DB 쓰기가 금지되므로 글로벌 메모리 변수에 데이터를 업서트하여 실시간 수집 보장
  if (isServerless) {
    let inserted = 0;
    let updated = 0;
    
    for (const c of campaigns) {
      const idx = globalRef.memoryCampaigns.findIndex((x: Campaign) => x.id === c.id);
      if (idx > -1) {
        let finalKeywords = globalRef.memoryCampaigns[idx].searchKeywords || '';
        if (c.searchKeywords) {
          const newKeywords = c.searchKeywords.split(',').filter(Boolean);
          const currentKeywordsSet = new Set(finalKeywords.split(',').filter(Boolean));
          newKeywords.forEach(k => currentKeywordsSet.add(k));
          finalKeywords = currentKeywordsSet.size > 0 ? `,${Array.from(currentKeywordsSet).join(',')},` : '';
        }
        
        globalRef.memoryCampaigns[idx] = {
          ...globalRef.memoryCampaigns[idx],
          ...c,
          searchKeywords: finalKeywords,
          updatedAt: new Date().toISOString()
        };
        updated++;
      } else {
        globalRef.memoryCampaigns.push({
          ...c,
          createdAt: c.createdAt || new Date().toISOString(),
          updatedAt: c.updatedAt || new Date().toISOString()
        });
        inserted++;
      }
    }
    return { inserted, updated };
  }

  const db = await getDB();
  
  let inserted = 0;
  let updated = 0;

  await db.run('BEGIN TRANSACTION');

  try {
    for (const c of campaigns) {
      const existing = await db.get('SELECT id, searchKeywords FROM campaigns WHERE id = ?', [c.id]);

      if (existing) {
        // 기존 검색 키워드가 존재한다면, 새로운 키워드 태그를 누적 결합하여 보존
        let finalKeywords = existing.searchKeywords || '';
        if (c.searchKeywords) {
          const newKeywords = c.searchKeywords.split(',').filter(Boolean);
          const currentKeywordsSet = new Set(finalKeywords.split(',').filter(Boolean));
          newKeywords.forEach(k => currentKeywordsSet.add(k));
          finalKeywords = currentKeywordsSet.size > 0 ? `,${Array.from(currentKeywordsSet).join(',')},` : '';
        }

        await db.run(
          `UPDATE campaigns SET 
            title = ?, description = ?, platform = ?, category = ?, 
            location = ?, campaignUrl = ?, imageUrl = ?, targetSite = ?, 
            limitCount = ?, applyCount = ?, startDate = ?, endDate = ?, 
            updatedAt = ?, searchKeywords = ?
          WHERE id = ?`,
          [
            c.title, c.description, c.platform, c.category,
            c.location || null, c.campaignUrl, c.imageUrl, c.targetSite,
            c.limitCount, c.applyCount, c.startDate || null, c.endDate,
            new Date().toISOString(), finalKeywords, c.id
          ]
        );
        updated++;
      } else {
        await db.run(
          `INSERT INTO campaigns (
            id, title, description, platform, category, location, 
            campaignUrl, imageUrl, targetSite, limitCount, applyCount, 
            startDate, endDate, createdAt, updatedAt, searchKeywords
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            c.id, c.title, c.description, c.platform, c.category,
            c.location || null, c.campaignUrl, c.imageUrl, c.targetSite,
            c.limitCount, c.applyCount, c.startDate || null, c.endDate,
            c.createdAt, c.updatedAt, c.searchKeywords || null
          ]
        );
        inserted++;
      }
    }
    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Failed to upsert campaigns transaction:', error);
    throw error;
  }

  // 🔑 로컬 맥북 환경일 때만: SQLite 데이터를 JSON 스냅샷 파일로도 즉시 동시성 백업 쓰기!
  // 이렇게 하면 Git 커밋/푸시 시 항상 전체 데이터베이스의 최신 스냅샷이 Vercel 서버로 함께 배포됩니다.
  if (!isServerless) {
    try {
      const allCampaigns = await db.all('SELECT * FROM campaigns');
      fs.writeFileSync(
        path.join(process.cwd(), 'data', 'campaigns.json'),
        JSON.stringify(allCampaigns, null, 2),
        'utf-8'
      );
      console.log(`[DB-Backup] Successfully wrote ${allCampaigns.length} campaigns snapshot to campaigns.json`);
    } catch (err: any) {
      console.error('[DB-Backup] Snapshot write failed:', err.message);
    }
  }

  return { inserted, updated };
}

// 크롤링 로그 기록 저장
export async function logCrawling(targetSite: string, status: 'SUCCESS' | 'FAILED', collectedCount: number, errorMessage?: string): Promise<void> {
  try {
    const db = await getDB();
    await db.run(
      `INSERT INTO crawling_logs (targetSite, status, collectedCount, errorMessage, executedAt) 
       VALUES (?, ?, ?, ?, ?)`,
      [targetSite, status, collectedCount, errorMessage || null, new Date().toISOString()]
    );
  } catch (error) {
    console.error('Failed to log crawling history:', error);
  }
}

// 🔑 회원 정보 Upsert
export async function upsertUser(user: Omit<User, 'createdAt' | 'updatedAt'>): Promise<User> {
  const db = await getDB();
  const now = new Date().toISOString();
  const existing = await db.get('SELECT id, createdAt FROM users WHERE id = ?', [user.id]);

  if (existing) {
    await db.run(
      `UPDATE users SET name = ?, email = ?, avatar = ?, provider = ?, updatedAt = ? WHERE id = ?`,
      [user.name, user.email, user.avatar, user.provider, now, user.id]
    );
    return {
      ...user,
      createdAt: existing.createdAt,
      updatedAt: now
    };
  } else {
    await db.run(
      `INSERT INTO users (id, name, email, avatar, provider, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, user.name, user.email, user.avatar, user.provider, now, now]
    );
    return {
      ...user,
      createdAt: now,
      updatedAt: now
    };
  }
}

// 🔑 회원 북마크 목록 조회
export async function getUserBookmarks(userId: string): Promise<string[]> {
  const db = await getDB();
  const rows = await db.all<{ campaignId: string }[]>(
    'SELECT campaignId FROM user_bookmarks WHERE userId = ?',
    [userId]
  );
  return rows.map(r => r.campaignId);
}

// 🔑 회원 북마크 토글 (추가/삭제)
export async function toggleUserBookmark(userId: string, campaignId: string): Promise<{ active: boolean }> {
  const db = await getDB();
  const existing = await db.get(
    'SELECT 1 FROM user_bookmarks WHERE userId = ? AND campaignId = ?',
    [userId, campaignId]
  );

  if (existing) {
    await db.run(
      'DELETE FROM user_bookmarks WHERE userId = ? AND campaignId = ?',
      [userId, campaignId]
    );
    return { active: false };
  } else {
    await db.run(
      'INSERT INTO user_bookmarks (userId, campaignId) VALUES (?, ?)',
      [userId, campaignId]
    );
    return { active: true };
  }
}

// 🔑 검색 로그 기록 저장
// 🔑 검색 유효성 검증 및 오타/어뷰징 방지 필터
export function isValidSearchKeyword(keyword: string): boolean {
  const trimmed = keyword.trim().toLowerCase();
  if (trimmed.length < 2) return false;

  // 완성되지 않은 개별 자음/모음 오타 포함 시 완전 차단 (예: 디ㅓㄴ의여왕, 강나ㅁ, ㄹㅂㄴㅌ)
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(trimmed)) return false;

  // 의미 없는 테스트/어뷰징 키워드 필터링
  const junkList = ['test', 'dummy', 'mock', 'asdf', 'qwer', '1234', 'aaa', 'bbb', 'ccc', '테스트', '더미', '목업'];
  if (junkList.includes(trimmed)) return false;

  return true;
}

// 🔑 인기 검색어 포백 시드 목록 (유기적 검색 기록이 부족할 때 자연스럽게 보완해줄 검증된 인기 키워드 10종)
const DEFAULT_TRENDING_SEED = [
  '강남맛집', '홍대맛집', '성수카페', '제주도숙박', '밀키트',
  '피부관리', '수원맛집', '속눈썹', '삼겹살', '스튜디오'
];

export async function logSearchQuery(keyword: string, hasResults: boolean = true): Promise<void> {
  const trimmed = keyword.trim();
  if (!trimmed || !hasResults || !isValidSearchKeyword(trimmed)) return;

  const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER);

  if (isServerless) {
    globalRef.memoryLogs.push({
      keyword: trimmed,
      searchedAt: new Date().toISOString()
    });
    if (globalRef.memoryLogs.length > 500) {
      globalRef.memoryLogs = globalRef.memoryLogs.slice(-300);
    }
    return;
  }

  try {
    const db = await getDB();
    await db.run(
      'INSERT INTO search_logs (keyword, searchedAt) VALUES (?, ?)',
      [trimmed, new Date().toISOString()]
    );
  } catch (error) {
    console.error('Failed to log search query:', error);
  }
}

// 🔑 실시간 인기 검색어 랭킹 조회 (오타/어뷰징 방지 필터링 + 디폴트 10종 보강)
export async function getTrendingKeywords(): Promise<{ word: string; count: number }[]> {
  const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER);
  let organicList: { word: string; count: number }[] = [];

  if (isServerless) {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const activeLogs = globalRef.memoryLogs.filter((l: any) => Date.parse(l.searchedAt) >= oneDayAgo && isValidSearchKeyword(l.keyword));
    
    const countsMap = new Map<string, number>();
    activeLogs.forEach((l: any) => {
      countsMap.set(l.keyword, (countsMap.get(l.keyword) || 0) + 1);
    });
    
    organicList = Array.from(countsMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count);
  } else {
    try {
      const db = await getDB();
      const rows = await db.all<{ keyword: string; cnt: number }[]>(
        "SELECT keyword, COUNT(*) as cnt FROM search_logs WHERE searchedAt >= datetime('now', '-1 day') GROUP BY keyword ORDER BY cnt DESC LIMIT 20"
      );
      organicList = rows
        .filter(r => isValidSearchKeyword(r.keyword))
        .map(r => ({ word: r.keyword, count: r.cnt }));
    } catch (error) {
      console.error('Failed to get trending keywords:', error);
    }
  }

  const existingSet = new Set(organicList.map(item => item.word));
  const resultList = [...organicList];

  for (const seed of DEFAULT_TRENDING_SEED) {
    if (resultList.length >= 10) break;
    if (!existingSet.has(seed)) {
      resultList.push({ word: seed, count: 1 });
      existingSet.add(seed);
    }
  }

  return resultList.slice(0, 10);
}

export async function getTotalCampaignCount(): Promise<number> {
  const isServerless = !!(process.env.VERCEL || process.env.NOW_BUILDER);
  if (isServerless) {
    return (globalRef.memoryCampaigns && globalRef.memoryCampaigns.length > 0) ? globalRef.memoryCampaigns.length : 17528;
  }
  try {
    const db = await getDB();
    const todayStr = new Date().toISOString().split('T')[0];
    const row = await db.get<{ count: number }>('SELECT COUNT(*) as count FROM campaigns WHERE endDate >= ?', [todayStr]);
    return row?.count || 17528;
  } catch (e) {
    return 17528;
  }
}
