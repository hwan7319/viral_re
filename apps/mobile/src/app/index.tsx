import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCampaigns, fetchCrawlStatus, type Campaign, type CampaignFilters } from '@/lib/campaign-api';
import { cloneFilters, EMPTY_FILTERS, FILTER_LABELS, FILTER_OPTIONS, selectedFilterCount, toggleFilterValue, type FilterGroup } from '@/lib/filter-options';

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 300_000;

const platformLabel = (platform: string) => ({
  blog: '블로그',
  clip: '클립',
  instagram: '인스타그램',
  youtube: '유튜브',
  tiktok: '틱톡',
  coupang: '쿠팡',
}[platform] || platform);
const sortOptions: Array<{ value: CampaignFilters['sortBy']; label: string }> = [
  { value: 'latest', label: '최신순' },
  { value: 'endDate', label: '마감임박순' },
  { value: 'popular', label: '경쟁률순' },
];

export default function HomeScreen() {
  const [keyword, setKeyword] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appliedFilters, setAppliedFilters] = useState<CampaignFilters>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState<CampaignFilters>(EMPTY_FILTERS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const activeFilterCount = useMemo(() => selectedFilterCount(appliedFilters), [appliedFilters]);

  const refreshAfterCollection = useCallback(async (search: string, filters: CampaignFilters) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const status = await fetchCrawlStatus(search);
      if (status?.status === 'queued' || status?.status === 'running') continue;
      if (status?.status === 'failed') {
        setSyncNotice('최신 공고 확인에 실패해 기존 결과를 표시합니다.');
        return;
      }
      const refreshed = await fetchCampaigns(search, false, filters);
      setCampaigns(refreshed.data);
      setTotalCount(refreshed.totalCount);
      setSyncNotice(status?.failedSources?.length
        ? `${status.failedSources.join(', ')} 수집은 실패해 기존 데이터를 표시합니다.`
        : '최신 공고가 반영되었습니다.');
      return;
    }
    setSyncNotice('최신 공고 확인이 지연되고 있습니다. 잠시 후 다시 확인해주세요.');
  }, []);

  const load = useCallback(async (search: string, allowCollection: boolean, filters: CampaignFilters) => {
    setError(null);
    try {
      const result = await fetchCampaigns(search, allowCollection, filters);
      setCampaigns(result.data);
      setTotalCount(result.totalCount);
      const isCollecting = result.crawlStatus?.status === 'queued' || result.crawlStatus?.status === 'running';
      if (isCollecting) {
        setSyncNotice('최신 공고를 확인 중입니다. 완료되면 자동 반영됩니다.');
        void refreshAfterCollection(search, filters).catch(() => setSyncNotice('최신 공고 확인이 지연되고 있습니다.'));
      } else if (result.isCrawlingTriggered) {
        setSyncNotice('선택 조건에 맞는 최신 공고를 확인 중입니다. 목록은 잠시 후 갱신됩니다.');
      } else {
        setSyncNotice(null);
      }
    } catch {
      setError('공고를 불러오지 못했습니다. 네트워크 연결 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshAfterCollection]);

  useEffect(() => {
    // Defer the first request until after the initial paint. This also avoids
    // synchronously cascading state changes from an effect.
    const initialLoad = setTimeout(() => { void load('', false, EMPTY_FILTERS); }, 0);
    return () => clearTimeout(initialLoad);
  }, [load]);

  const submitSearch = () => {
    setLoading(true);
    void load(keyword.trim(), Boolean(keyword.trim()), appliedFilters);
  };

  const openFilters = () => {
    setDraftFilters(cloneFilters(appliedFilters));
    setIsFilterOpen(true);
  };

  const applyFilters = () => {
    const next = cloneFilters(draftFilters);
    setAppliedFilters(next);
    setIsFilterOpen(false);
    setLoading(true);
    void load(keyword.trim(), true, next);
  };

  const updateSort = (sortBy: CampaignFilters['sortBy']) => {
    const next = { ...appliedFilters, sortBy };
    setAppliedFilters(next);
    setLoading(true);
    void load(keyword.trim(), false, next);
  };

  const toggleDraftValue = (group: FilterGroup, value: string) => setDraftFilters(current => toggleFilterValue(current, group, value));

  const toggleAllInGroup = (group: FilterGroup) => {
    setDraftFilters(current => {
      const values = FILTER_OPTIONS[group].map(option => option.value);
      return { ...current, [group]: current[group].length === values.length ? [] : values };
    });
  };

  const openCampaign = async (campaign: Campaign) => {
    if (await Linking.canOpenURL(campaign.campaignUrl)) await Linking.openURL(campaign.campaignUrl);
    else setError('원본 공고 링크를 열 수 없습니다.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={campaigns}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(keyword.trim(), false, appliedFilters); }} tintColor="#5B4CF6" />}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.brand}>바이럴리</Text>
              <Text style={styles.subtitle}>체험단 공고를 한곳에서 비교하세요</Text>
            </View>
            <View style={styles.searchRow}>
              <TextInput
                value={keyword}
                onChangeText={setKeyword}
                onSubmitEditing={submitSearch}
                placeholder="키워드를 검색하세요"
                placeholderTextColor="#94A3B8"
                returnKeyType="search"
                style={styles.input}
              />
              <Pressable style={styles.searchButton} onPress={submitSearch} accessibilityRole="button" accessibilityLabel="키워드 검색">
                <Text style={styles.searchButtonText}>검색</Text>
              </Pressable>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultCount}>공고 {totalCount.toLocaleString()}건</Text>
              <Pressable style={styles.filterButton} onPress={openFilters} accessibilityRole="button" accessibilityLabel="상세 검색 조건 열기">
                <Text style={styles.filterButtonText}>상세 검색{activeFilterCount ? ` ${activeFilterCount}` : ''}</Text>
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sortRow}>
              {sortOptions.map(option => <Pressable key={option.value} style={[styles.sortChip, appliedFilters.sortBy === option.value && styles.sortChipActive]} onPress={() => updateSort(option.value)}><Text style={[styles.sortChipText, appliedFilters.sortBy === option.value && styles.sortChipTextActive]}>{option.label}</Text></Pressable>)}
            </ScrollView>
            {syncNotice ? <Text style={styles.notice}>{syncNotice}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={loading ? <ActivityIndicator color="#5B4CF6" style={styles.loader} /> : <Text style={styles.empty}>조건에 맞는 공고가 없습니다.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => void openCampaign(item)} accessibilityRole="link" accessibilityLabel={`${item.title} 원본 공고 열기`}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} alt={item.title} /> : <View style={[styles.thumbnail, styles.thumbnailFallback]} />}
            <View style={styles.cardContent}>
              <View style={styles.badgeRow}>
                <Text style={styles.platformBadge}>{platformLabel(item.platform)}</Text>
                <Text style={styles.source}>{item.targetSite}</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.benefit} numberOfLines={2}>{item.description || '제공 혜택 확인 필요'}</Text>
              <Text style={styles.meta}>{item.location || '지역 확인 필요'} · 마감 {item.endDate || '확인 필요'}</Text>
            </View>
          </Pressable>
        )}
      />
      <Modal visible={isFilterOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsFilterOpen(false)}>
        <SafeAreaView style={styles.modalSafeArea} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <View><Text style={styles.modalTitle}>상세 검색</Text><Text style={styles.modalSubtitle}>같은 조건은 OR, 다른 조건은 AND로 적용됩니다.</Text></View>
            <Pressable onPress={() => setIsFilterOpen(false)} style={styles.closeButton} accessibilityRole="button" accessibilityLabel="상세 검색 닫기"><Text style={styles.closeButtonText}>닫기</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.filterContent}>
            {(Object.keys(FILTER_OPTIONS) as FilterGroup[]).map(group => {
              const allSelected = draftFilters[group].length === FILTER_OPTIONS[group].length;
              return <View key={group} style={styles.filterSection}>
                <View style={styles.filterSectionHeader}><Text style={styles.filterSectionTitle}>{FILTER_LABELS[group]}</Text><Pressable onPress={() => toggleAllInGroup(group)}><Text style={styles.selectAllText}>{allSelected ? '전체 해제' : '전체 선택'}</Text></Pressable></View>
                <View style={styles.optionWrap}>
                  {FILTER_OPTIONS[group].map(option => {
                    const selected = draftFilters[group].includes(option.value);
                    return <Pressable key={option.value} style={[styles.optionChip, selected && styles.optionChipActive]} onPress={() => toggleDraftValue(group, option.value)}><Text style={[styles.optionChipText, selected && styles.optionChipTextActive]}>{option.label}</Text></Pressable>;
                  })}
                </View>
              </View>;
            })}
          </ScrollView>
          <View style={styles.modalActions}>
            <Pressable style={styles.resetButton} onPress={() => setDraftFilters({ ...cloneFilters(EMPTY_FILTERS), sortBy: appliedFilters.sortBy })}><Text style={styles.resetButtonText}>선택 초기화</Text></Pressable>
            <Pressable style={styles.applyButton} onPress={applyFilters}><Text style={styles.applyButtonText}>조건 적용 ({selectedFilterCount(draftFilters)})</Text></Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  list: { padding: 20, gap: 12 },
  header: { marginBottom: 20 },
  brand: { color: '#172554', fontSize: 28, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 14, marginTop: 5 },
  searchRow: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, height: 50, borderWidth: 1, borderColor: '#DDE4F0', borderRadius: 14, backgroundColor: '#FFF', paddingHorizontal: 16, color: '#0F172A', fontSize: 16 },
  searchButton: { alignItems: 'center', backgroundColor: '#5B4CF6', borderRadius: 14, justifyContent: 'center', paddingHorizontal: 18 },
  searchButtonText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  resultRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  resultCount: { color: '#172554', fontSize: 16, fontWeight: '700' },
  filterButton: { backgroundColor: '#EEF2FF', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  filterButtonText: { color: '#4F46E5', fontSize: 12, fontWeight: '700' },
  sortRow: { gap: 8, paddingTop: 12 },
  sortChip: { borderColor: '#DDE4F0', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  sortChipActive: { backgroundColor: '#172554', borderColor: '#172554' },
  sortChipText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  sortChipTextActive: { color: '#FFF' },
  notice: { color: '#4338CA', fontSize: 13, lineHeight: 19, marginTop: 10 },
  error: { color: '#DC2626', fontSize: 13, lineHeight: 19, marginTop: 10 },
  loader: { marginTop: 60 },
  empty: { color: '#64748B', marginTop: 48, textAlign: 'center' },
  card: { backgroundColor: '#FFF', borderColor: '#E2E8F0', borderRadius: 18, borderWidth: 1, flexDirection: 'row', overflow: 'hidden', padding: 10 },
  thumbnail: { backgroundColor: '#E2E8F0', borderRadius: 12, height: 96, width: 96 },
  thumbnailFallback: { opacity: 0.6 },
  cardContent: { flex: 1, justifyContent: 'space-between', marginLeft: 12, paddingVertical: 2 },
  badgeRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  platformBadge: { backgroundColor: '#EEF2FF', borderRadius: 999, color: '#4F46E5', fontSize: 11, fontWeight: '700', overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 3 },
  source: { color: '#64748B', fontSize: 12 },
  title: { color: '#172554', fontSize: 15, fontWeight: '700', lineHeight: 21, marginTop: 5 },
  benefit: { color: '#475569', fontSize: 13, lineHeight: 18, marginTop: 4 },
  meta: { color: '#64748B', fontSize: 12, marginTop: 7 },
  modalSafeArea: { backgroundColor: '#F8FAFC', flex: 1 },
  modalHeader: { alignItems: 'flex-start', backgroundColor: '#FFF', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  modalTitle: { color: '#172554', fontSize: 21, fontWeight: '800' },
  modalSubtitle: { color: '#64748B', fontSize: 12, marginTop: 5 },
  closeButton: { paddingVertical: 7 },
  closeButtonText: { color: '#4F46E5', fontSize: 14, fontWeight: '700' },
  filterContent: { padding: 20 },
  filterSection: { borderBottomColor: '#E2E8F0', borderBottomWidth: 1, paddingBottom: 20, paddingTop: 4 },
  filterSectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  filterSectionTitle: { color: '#172554', fontSize: 16, fontWeight: '800' },
  selectAllText: { color: '#4F46E5', fontSize: 12, fontWeight: '700' },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { backgroundColor: '#FFF', borderColor: '#DDE4F0', borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 },
  optionChipActive: { backgroundColor: '#EEF2FF', borderColor: '#5B4CF6' },
  optionChipText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  optionChipTextActive: { color: '#4F46E5' },
  modalActions: { backgroundColor: '#FFF', borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', gap: 10, padding: 16 },
  resetButton: { alignItems: 'center', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, justifyContent: 'center', minHeight: 50, paddingHorizontal: 16 },
  resetButtonText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  applyButton: { alignItems: 'center', backgroundColor: '#5B4CF6', borderRadius: 12, flex: 1, justifyContent: 'center', minHeight: 50 },
  applyButtonText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
});
