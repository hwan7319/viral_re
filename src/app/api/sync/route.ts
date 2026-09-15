import { authorizeJob } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { insertOrUpdateCampaigns } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const denied = authorizeJob(req, 'SYNC');
    if (denied) return denied;

    const body = await req.json();
    const { campaigns } = body;

    if (!campaigns || !Array.isArray(campaigns)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data format. campaigns array is required.' },
        { status: 400 }
      );
    }

    if (campaigns.length > 500 || campaigns.some(c =>
      !c || ['id', 'title', 'description', 'platform', 'category', 'campaignUrl', 'imageUrl', 'targetSite', 'endDate', 'createdAt', 'updatedAt'].some(k => typeof c[k] !== 'string' || c[k].length > 20000) ||
      !Number.isInteger(c.applyCount) || c.applyCount < 0 || !Number.isInteger(c.limitCount) || c.limitCount < 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(c.endDate)
    )) return NextResponse.json({ success: false, error: 'Invalid campaign payload (maximum 500 per request)' }, { status: 400 });

    console.log(`[API-Sync] Received sync request for ${campaigns.length} campaigns`);

    // 🔑 Vercel 서버리스 환경인 경우 globalRef.memoryCampaigns 에 적재, 로컬인 경우 SQLite 에 저장
    const result = await insertOrUpdateCampaigns(campaigns);

    console.log(`[API-Sync] Sync Complete. Inserted: ${result.inserted}, Updated: ${result.updated}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully synchronized data.',
      inserted: result.inserted,
      updated: result.updated
    });
  } catch (error) {
    console.error('[API-Sync] Error synchronizing data:', error);
    return NextResponse.json(
      { success: false, error: '캠페인 동기화에 실패했습니다.' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
