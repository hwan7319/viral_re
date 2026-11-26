import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchCampaignDetail, type Campaign, type CampaignDetail } from '@/lib/campaign-api';
import { getCachedCampaign } from '@/lib/campaign-cache';

const platformLabel = (platform: string) => ({ blog: '블로그', clip: '클립', instagram: '인스타그램', youtube: '유튜브', tiktok: '틱톡', coupang: '쿠팡' }[platform] || platform);

function experienceLabel(campaign: Campaign) {
  if (campaign.platform === 'coupang') return '구매형 (쿠팡)';
  return campaign.location ? `방문 체험 · ${campaign.location}` : '재택/배송형';
}

export default function CampaignDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      // The already-rendered list row is preserved by ID so a user always sees
      // the exact campaign they tapped, even when the first page has changed.
      const found = getCachedCampaign(id);
      if (!found) throw new Error('campaign not available');
      setCampaign(found);
      setDetailLoading(true);
      const nextDetail = await fetchCampaignDetail(id);
      setDetail(nextDetail);
    } catch {
      setError('공고 상세를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
      setDetailLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const initialLoad = setTimeout(() => { void load(); }, 0);
    return () => clearTimeout(initialLoad);
  }, [load]);

  const openOfficial = async () => {
    if (!campaign) return;
    if (await Linking.canOpenURL(campaign.campaignUrl)) await Linking.openURL(campaign.campaignUrl);
    else setError('원본 공고 링크를 열 수 없습니다.');
  };

  const appliedCount = detail?.applyCount ?? campaign?.applyCount ?? 0;
  const limitCount = detail?.limitCount ?? campaign?.limitCount ?? 0;
  const mission = detail?.mission ?? campaign?.mission;
  const benefit = detail?.realBenefit || campaign?.description;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="목록으로 돌아가기"><Text style={styles.backText}>‹</Text></Pressable>
        <Text style={styles.headerTitle}>공고 상세</Text>
        <View style={styles.headerSpacer} />
      </View>
      {loading ? <ActivityIndicator color="#5B4CF6" style={styles.loader} /> : error && !campaign ? (
        <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Pressable onPress={() => void load()} style={styles.retryButton}><Text style={styles.retryText}>다시 시도</Text></Pressable></View>
      ) : campaign ? (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.sourceRow}><Text style={styles.platformBadge}>{platformLabel(campaign.platform)}</Text><Text style={styles.source}>{campaign.targetSite}</Text></View>
            <Text style={styles.title}>{campaign.title}</Text>
            <View style={styles.benefitBox}><Text style={styles.sectionEyebrow}>제공 혜택</Text><Text style={styles.benefit}>{benefit || '제공 혜택 확인 필요'}</Text></View>
            <Text style={styles.sectionTitle}>모집 정보</Text>
            <View style={styles.infoGrid}>
              <Info label="모집 정원" value={limitCount > 0 ? `${limitCount}명 (현재 ${appliedCount}명 신청)` : '확인 불가'} />
              <Info label="수집 플랫폼" value={campaign.targetSite} />
              <Info label="모집 마감일" value={campaign.endDate || '확인 필요'} />
              <Info label="체험 방식" value={experienceLabel(campaign)} />
            </View>
            <Text style={styles.sectionTitle}>미션 & 가이드라인</Text>
            <View style={styles.missionBox}>
              {detailLoading && !mission ? <View style={styles.missionLoading}><ActivityIndicator color="#5B4CF6" /><Text style={styles.missionLoadingText}>원본 공고 정보를 확인하고 있습니다.</Text></View> : <Text style={styles.mission}>{mission || '상세 미션은 원본 공고에서 확인할 수 있습니다.'}</Text>}
            </View>
            {error ? <Text style={styles.inlineError}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.actionBar}><Pressable style={styles.officialButton} onPress={() => void openOfficial()} accessibilityRole="link" accessibilityLabel="원본 공고 열기"><Text style={styles.officialButtonText}>원본 공고 보러가기</Text></Pressable></View>
        </>
      ) : null}
    </SafeAreaView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.infoCell}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F8FAFC', flex: 1 },
  header: { alignItems: 'center', backgroundColor: '#FFF', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', height: 58, justifyContent: 'space-between', paddingHorizontal: 14 },
  backButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  backText: { color: '#172554', fontSize: 34, fontWeight: '300', lineHeight: 36 },
  headerTitle: { color: '#172554', fontSize: 16, fontWeight: '800' },
  headerSpacer: { width: 36 },
  loader: { marginTop: 72 },
  content: { padding: 20, paddingBottom: 112 },
  sourceRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  platformBadge: { backgroundColor: '#EEF2FF', borderRadius: 999, color: '#4F46E5', fontSize: 12, fontWeight: '800', overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5 },
  source: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  title: { color: '#172554', fontSize: 23, fontWeight: '800', lineHeight: 32, marginTop: 13 },
  benefitBox: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA', borderRadius: 14, borderWidth: 1, marginTop: 20, padding: 16 },
  sectionEyebrow: { color: '#EA580C', fontSize: 12, fontWeight: '800' },
  benefit: { color: '#431407', fontSize: 15, fontWeight: '700', lineHeight: 22, marginTop: 6 },
  sectionTitle: { color: '#172554', fontSize: 17, fontWeight: '800', marginTop: 28, marginBottom: 10 },
  infoGrid: { backgroundColor: '#FFF', borderColor: '#E2E8F0', borderRadius: 15, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden' },
  infoCell: { borderBottomColor: '#E2E8F0', borderBottomWidth: 1, minHeight: 83, padding: 14, width: '50%' },
  infoLabel: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  infoValue: { color: '#172554', fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 6 },
  missionBox: { backgroundColor: '#FFF', borderColor: '#E2E8F0', borderRadius: 15, borderWidth: 1, padding: 16 },
  mission: { color: '#334155', fontSize: 14, lineHeight: 22 },
  missionLoading: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingVertical: 10 },
  missionLoadingText: { color: '#4F46E5', flex: 1, fontSize: 13, lineHeight: 19 },
  actionBar: { backgroundColor: '#FFF', borderTopColor: '#E2E8F0', borderTopWidth: 1, padding: 16 },
  officialButton: { alignItems: 'center', backgroundColor: '#5B4CF6', borderRadius: 13, justifyContent: 'center', minHeight: 51 },
  officialButtonText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  errorBox: { alignItems: 'center', padding: 30 },
  errorText: { color: '#B91C1C', lineHeight: 21, textAlign: 'center' },
  retryButton: { backgroundColor: '#EEF2FF', borderRadius: 10, marginTop: 16, paddingHorizontal: 14, paddingVertical: 10 },
  retryText: { color: '#4F46E5', fontWeight: '800' },
  inlineError: { color: '#B91C1C', fontSize: 13, marginTop: 12 },
});
