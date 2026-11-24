/** Read-only concurrency QA for independent detailed-search requests. */
const baseUrl = process.env.QA_BASE_URL || 'http://127.0.0.1:3000';

type Scenario = { name: string; params: Record<string, string[]>; matches: (row: any) => boolean };
const text = (row: any) => `${row.title || ''} ${row.description || ''} ${row.location || ''} ${row.mission || ''}`;
const scenarios: Scenario[] = [
  { name: '한식', params: { category: ['food-korean'] }, matches: row => row.category === 'food-korean' },
  { name: '문화', params: { category: ['culture'] }, matches: row => row.category === 'culture' },
  { name: '쿠팡', params: { platform: ['coupang'] }, matches: row => row.platform === 'coupang' },
  { name: '틱톡', params: { platform: ['tiktok'] }, matches: row => row.platform === 'tiktok' },
  { name: '배송형', params: { type: ['delivery'] }, matches: row => /(배송|택배|재택|온라인|전국)/.test(text(row)) },
  { name: '방문형', params: { type: ['visit'] }, matches: row => !!row.location?.trim() && !/(배송|택배|재택|온라인|전국)/.test(text(row)) },
  { name: '서울', params: { location: ['서울'] }, matches: row => row.location?.includes('서울') },
  { name: '리뷰플레이스', params: { targetSite: ['리뷰플레이스'] }, matches: row => row.targetSite === '리뷰플레이스' },
  { name: '복수카테고리', params: { category: ['food-cafe', 'culture'] }, matches: row => ['food-cafe', 'culture'].includes(row.category) },
  { name: '3중조건', params: { category: ['food-korean'], platform: ['blog'], type: ['visit'] }, matches: row => row.category === 'food-korean' && ['blog', 'blog+clip', 'blog+instagram', 'naver+instagram'].includes(row.platform) && !!row.location?.trim() && !/(배송|택배|재택|온라인|전국)/.test(text(row)) },
];

async function request(scenario: Scenario) {
  const params = new URLSearchParams({ crawl: 'false', limit: '60', offset: '0' });
  for (const [name, values] of Object.entries(scenario.params)) for (const value of values) params.append(name, value);
  const response = await fetch(`${baseUrl}/api/campaigns?${params}`);
  if (!response.ok) throw new Error(`${scenario.name}: HTTP ${response.status}`);
  const body = await response.json() as { success: boolean; totalCount: number; data: any[] };
  if (!body.success || body.data.some(row => !scenario.matches(row))) throw new Error(`${scenario.name}: mismatched result`);
  return { name: scenario.name, totalCount: body.totalCount, ids: body.data.map(row => row.id).join('|') };
}

async function main() {
  const repetitions = 8;
  const results = await Promise.all(Array.from({ length: repetitions }, () => Promise.all(scenarios.map(request))));
  const failures: string[] = [];
  for (let index = 0; index < scenarios.length; index++) {
    const signatures = new Set(results.map(run => `${run[index].totalCount}/${run[index].ids}`));
    if (signatures.size !== 1) failures.push(`${scenarios[index].name}: inconsistent response across concurrent requests`);
  }
  console.log(JSON.stringify({ baseUrl, scenarios: scenarios.length, requests: scenarios.length * repetitions, failures }, null, 2));
  if (failures.length) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
