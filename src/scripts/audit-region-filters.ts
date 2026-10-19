import { queryCampaigns } from '../lib/db';

const SIDO_OPTIONS = [
  '서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산', '강원',
  '충북', '충남', '전북', '전남', '경북', '경남', '제주', '세종',
];

const matchesLocation = (location: string | undefined, value: string) => {
  const normalized = (location || '').toLowerCase();
  const locationTokens = normalized.replace(/[\/,]/g, ' ').split(/\s+/).filter(Boolean);
  const [sido, sigungu] = value.toLowerCase().split(/\s+/);
  if (!normalized.includes(sido)) return false;
  if (!sigungu) return true;
  const stem = sigungu.replace(/(구|군|시)$/, '');
  return locationTokens.includes(sigungu) || (stem.length >= 2 && locationTokens.includes(stem));
};

async function main() {
  const active = await queryCampaigns({});
  const observedLocations = [...new Set(active.map(campaign => campaign.location?.trim()).filter((value): value is string => Boolean(value)))];
  const observedSidos = new Set(observedLocations.map(location => location.split(/\s+/)[0]));
  const districtFilters = [...new Set(observedLocations
    .map(location => location.split(/\s+/).slice(0, 2).join(' '))
    .filter(location => location.split(/\s+/).length === 2))]
    .filter(location => SIDO_OPTIONS.includes(location.split(/\s+/)[0]));

  const issues: string[] = [];
  const summary: Array<{ filter: string; count: number }> = [];

  for (const sido of SIDO_OPTIONS) {
    const rows = await queryCampaigns({ location: sido });
    const invalid = rows.filter(row => !matchesLocation(row.location, sido));
    if (invalid.length) issues.push(`${sido}: ${invalid.length} invalid province rows`);
    summary.push({ filter: sido, count: rows.length });
    if (observedSidos.has(sido) && rows.length === 0) issues.push(`${sido}: observed source rows but filter returned none`);
  }

  for (const filter of districtFilters) {
    const rows = await queryCampaigns({ location: filter });
    const invalid = rows.filter(row => !matchesLocation(row.location, filter));
    if (invalid.length) issues.push(`${filter}: ${invalid.length} invalid district rows`);
  }

  console.log(JSON.stringify({
    activeCampaigns: active.length,
    provinceFiltersChecked: SIDO_OPTIONS.length,
    observedDistrictFiltersChecked: districtFilters.length,
    provinceSummary: summary,
    issueCount: issues.length,
    issues,
  }, null, 2));

  if (issues.length) process.exit(1);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
