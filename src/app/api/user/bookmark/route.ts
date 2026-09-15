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
