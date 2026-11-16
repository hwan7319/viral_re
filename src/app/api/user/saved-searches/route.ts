import { NextRequest, NextResponse } from 'next/server';
import {
  createUserSavedSearch,
  deleteUserSavedSearch,
  getUserSavedSearchesWithNewCampaigns,
  markUserSavedSearchSeen,
  normalizeSavedSearchFilters,
} from '@/lib/db';
import { authenticatedUser, sameOrigin } from '@/lib/auth';

const isSavedSearchId = (value: unknown): value is string =>
  typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);

export async function GET(request: NextRequest) {
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, data: await getUserSavedSearchesWithNewCampaigns(user.id) });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    const filters = normalizeSavedSearchFilters(body?.filters);
    if (typeof body?.name !== 'string' || !filters) {
      return NextResponse.json({ success: false, error: 'Invalid saved search' }, { status: 400 });
    }
    const savedSearch = await createUserSavedSearch(user.id, body.name, filters);
    return NextResponse.json({ success: true, data: savedSearch }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Saved search update failed';
    const status = ['Saved search limit reached', 'Same saved search already exists', 'Invalid saved search'].includes(message) ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!isSavedSearchId(body?.id) || body?.action !== 'mark-read') {
      return NextResponse.json({ success: false, error: 'Invalid saved search' }, { status: 400 });
    }
    const updated = await markUserSavedSearchSeen(user.id, body.id);
    return NextResponse.json({ success: updated, error: updated ? undefined : 'Not found' }, { status: updated ? 200 : 404 });
  } catch {
    return NextResponse.json({ success: false, error: 'Saved search update failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ success: false }, { status: 403 });
  const user = await authenticatedUser(request);
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json();
    if (!isSavedSearchId(body?.id)) return NextResponse.json({ success: false, error: 'Invalid saved search' }, { status: 400 });
    const deleted = await deleteUserSavedSearch(user.id, body.id);
    return NextResponse.json({ success: deleted, error: deleted ? undefined : 'Not found' }, { status: deleted ? 200 : 404 });
  } catch {
    return NextResponse.json({ success: false, error: 'Saved search update failed' }, { status: 500 });
  }
}
