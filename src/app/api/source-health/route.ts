import { NextResponse } from 'next/server';
import { getCrawlingHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sources = await getCrawlingHealth();
  return NextResponse.json({
    sources,
    healthy: sources.length > 0 && sources.every(source => source.status === 'SUCCESS'),
    generatedAt: new Date().toISOString(),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
