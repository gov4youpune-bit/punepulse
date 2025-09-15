export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * GET /api/attachments/public?key=...
 * 
 * Returns a signed URL for accessing an attachment
 * Response: { url: string }
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
    if (!bucket) {
      return NextResponse.json({ error: 'Storage bucket not configured' }, { status: 500 });
    }

    // Create signed URL (expires in 1 hour)
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(key, 3600);

    if (error) {
      console.error('Storage error (createSignedUrl):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const signedUrl = data?.signedUrl || null;

    if (!signedUrl) {
      console.warn('Unexpected createSignedUrl response shape', data);
      return NextResponse.json({ error: 'Unexpected storage response', data }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrl }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in attachments public route:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
