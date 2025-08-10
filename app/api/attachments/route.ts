export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/attachments
 *
 * Accepts either:
 *  - { filename: 'abc.jpg', contentType: 'image/jpeg' }
 *  - { bucket: 'my-bucket', filePath: 'complaints/abc.jpg' }
 *
 * Returns:
 *  { uploadUrl: string, key: string }
 */
export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const body = await req.json();

    // Resolve bucket
    const envBucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
    const bucket = body.bucket || envBucket;
    if (!bucket) {
      return NextResponse.json({ error: 'Storage bucket not configured' }, { status: 500 });
    }

    // Resolve filePath
    let filePath: string | undefined = body.filePath || body.path;
    if (!filePath && body.filename) {
      const filename = String(body.filename).trim().replace(/\s+/g, '_');
      filePath = `complaints/${Date.now()}-${filename}`;
    }
    if (!filePath) {
      return NextResponse.json({ error: 'filePath/path or filename required' }, { status: 400 });
    }

    // Create signed upload URL (object form works on latest clients)
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUploadUrl(filePath, { upsert: true });

    if (error) {
      console.error('Storage error (createSignedUploadUrl):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const uploadUrl = data?.signedUrl || null;

    if (!uploadUrl) {
      console.warn('Unexpected createSignedUploadUrl response shape', data);
      return NextResponse.json({ error: 'Unexpected storage response', data }, { status: 500 });
    }

    return NextResponse.json({ uploadUrl, key: filePath }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in attachments route:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
