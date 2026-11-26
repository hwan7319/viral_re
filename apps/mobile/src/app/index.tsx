import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCampaigns, fetchCrawlStatus, type Campaign } from '@/lib/campaign-api';

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 300_000;

const platformLabel = (platform: string) => ({ blog: '블로그', instagram: '인스타그램', youtube: '유튜브', tiktok: '틱톡', coupang: '쿠팡' }[platform] || platform);

export default function HomeScreen() {
  const [keyword, setKeyword] = useState('');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refreshAfterCollection = useCallback(async (search: string) => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      const status = await fetchCrawlStatus(search);
      if (status?.status === 'queued' || status?.status === 'running') continue;
      if (status?.status === 'failed') {
        setSyncNotice('최신 공고 확인에 실패해 기존 결과를 표시합니다.');
        return;
      }
      const refreshed = await fetchCampaigns(search, false);
      setCampaigns(refreshed.data);
      setTotalCount(refreshed.totalCount);
      setSyncNotice(status?.failedSources?.length
        ? `${status.failedSources.join(', ')} 수집은 실패해 기존 데이터를 표시합니다.`
        : '최신 공고가 반영되었습니다.');
      return;
    }
    setSyncNotice('최신 공고 확인이 지연되고 있습니다. 잠시 후 다시 확인해주세요.');
  }, []);

  const load = useCallback(async (search: string, allowCollection: boolean) => {
    setError(null);
    try {
      const result = await fetchCampaigns(search, allowCollection);
      setCampaigns(result.data);
      setTotalCount(result.totalCount);
      const isCollecting = result.crawlStatus?.status === 'queued' || result.crawlStatus?.status === 'running';
      if (isCollecting) {
        setSyncNotice('최신 공고를 확인 중입니다. 완료되면 자동 반영됩니다.');
        void refreshAfterCollection(search).catch(() => setSyncNotice('최신 공고 확인이 지연되고 있습니다.'));
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

  useEffect(() => { void load('', false); }, [load]);

  const submitSearch = () => {
    setLoading(true);
    void load(keyword.trim(), Boolean(keyword.trim()));
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(keyword.trim(), false); }} tintColor="#5B4CF6" />}
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
              <Text style={styles.filterHint}>상세 검색은 다음 단계에서 연결됩니다</Text>
            </View>
            {syncNotice ? <Text style={styles.notice}>{syncNotice}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={loading ? <ActivityIndicator color="#5B4CF6" style={styles.loader} /> : <Text style={styles.empty}>조건에 맞는 공고가 없습니다.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => void openCampaign(item)} accessibilityRole="link" accessibilityLabel={`${item.title} 원본 공고 열기`}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} /> : <View style={[styles.thumbnail, styles.thumbnailFallback]} />}
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
  filterHint: { color: '#94A3B8', fontSize: 12 },
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
});
