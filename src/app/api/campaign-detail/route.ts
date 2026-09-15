import { NextRequest, NextResponse } from 'next/server';
import { refreshCampaignDetail } from '@/lib/detail-service';
import { getCampaignById } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const campaignId = searchParams.get('id');

    if (!campaignId) return NextResponse.json({ success: false, error: 'Campaign ID required' }, { status: 400 });
    const campaign = await getCampaignById(campaignId);
    if (!campaign) return NextResponse.json({ success: false }, { status: 404 });
    if (url && url !== campaign.campaignUrl) return NextResponse.json({ success: false, error: 'Campaign URL mismatch' }, { status: 400 });
    // SSRF 방어: 허용된 체험단 사이트 도메인 검증
    try {
      const parsed = new URL(campaign.campaignUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return NextResponse.json({ success: false, error: 'Invalid URL protocol' }, { status: 400 });
      }
      const ALLOWED_DOMAIN_PATTERNS = [
        'revu.net', 'dinnerqueen.net', 'reviewnote.co.kr', '4blog.net',
        'xn--939au0g4vj8sq.net', 'ringble.co.kr', 'cometoplay.kr', 'modublog.co.kr',
        'assaview.co.kr', 'ohmyblog.co.kr', 'reviewplace.co.kr', 'mrblog.net',
        'mible.co.kr', 'cloudreview.co.kr', 'weble.net'
      ];
      const isAllowedHost = ALLOWED_DOMAIN_PATTERNS.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
      );
      if (!isAllowedHost) {
        return NextResponse.json({ success: false, error: 'Access to untrusted host is prohibited' }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
    }

    return NextResponse.json(await refreshCampaignDetail(campaignId));
  } catch (error) {
    const busy = error instanceof Error && error.message === 'DETAIL_BUSY';
    return NextResponse.json({ success: false, error: busy ? '잠시 후 다시 시도해주세요.' : '상세 조회 실패' }, { status: busy ? 429 : 500 });
  }
}
