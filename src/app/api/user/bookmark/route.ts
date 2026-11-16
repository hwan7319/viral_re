import { NextRequest, NextResponse } from 'next/server';
import { toggleUserBookmark, getUserBookmarks, getCampaignById } from '@/lib/db';
import { authenticatedUser, sameOrigin } from '@/lib/auth';
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const { campaignId } = await request.json();
    if (typeof campaignId !== 'string' || campaignId.length > 200 || !await getCampaignById(campaignId)) return NextResponse.json({ success: false, error: 'Invalid campaign' }, { status: 400 });
    const result = await toggleUserBookmark(user.id, campaignId);
    return NextResponse.json({ success: true, ...result, bookmarks: await getUserBookmarks(user.id) });
  } catch { return NextResponse.json({ success: false, error: 'Bookmark update failed' }, { status: 500 }); }
}

// 북마크는 현재 로그인한 사용자만 조회할 수 있으며, 다른 사용자의 ID를 받지 않는다.
export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const bookmarks = await getUserBookmarks(user.id);
    const campaigns = (await Promise.all(bookmarks.map(campaignId => getCampaignById(campaignId)))).filter(Boolean);
    return NextResponse.json({ success: true, bookmarks, campaigns });
  } catch {
    return NextResponse.json({ success: false, error: 'Bookmark lookup failed' }, { status: 500 });
  }
}
