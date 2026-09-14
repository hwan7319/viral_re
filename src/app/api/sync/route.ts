import { NextRequest, NextResponse } from 'next/server';
import { insertOrUpdateCampaigns } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('x-sync-secret');
    const expectedSecret = process.env.SYNC_SECRET_KEY || process.env.CRON_SECRET;
    
    // 비밀키가 설정되어 있는 경우 검증 실행 (Bearer token 또는 직접 헤더)
    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}` && authHeader !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized sync request.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { campaigns } = body;

    if (!campaigns || !Array.isArray(campaigns)) {
      return NextResponse.json(
        { success: false, error: 'Invalid data format. campaigns array is required.' },
        { status: 400 }
      );
    }

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
  } catch (error: any) {
    console.error('[API-Sync] Error synchronizing data:', error);
    return NextResponse.json(
      { success: false, error: error.message },
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
