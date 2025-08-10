export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

/**
 * POST /api/attachments
 *
 * Accepts either:
 *  - { filename: 'abc.jpg', contentType: 'image/jpeg' }   <-- preferred (frontend sends this)
 *  - { bucket: 'my-bucket', filePath: 'complaints/abc.jpg' }  <-- legacy/explicit
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

    // If caller provided full filePath, use that (keeps backward compatibility)
    let filePath: string | undefined = body.filePath || body.path;

    // If filename provided, create a stable file path (prefix with complaints/ and timestamp)
    if (!filePath && body.filename) {
      const filename = String(body.filename).trim().replace(/\s+/g, '_');
      const now = Date.now();
      // ensure simple unique key — you can change folder structure as desired
      filePath = `complaints/${now}-${filename}`;
    }

    if (!filePath) {
      return NextResponse.json({ error: 'filePath/path or filename required' }, { status: 400 });
    }

    // Optionally you can set an expiresIn (seconds) for signed upload URL.
    // Supabase storage createSignedUploadUrl signature varies by version:
    // - some versions accept (path, expiresInSeconds)
    // - other versions might accept options. We attempt call that works more widely:
    // Try createSignedUploadUrl(path, expiresInSeconds) first, fallback to options if needed.
    let signedData: any = null;
    let signedError: any = null;

    // First try numeric expiresIn (60 seconds)
    try {
      const res = await supabase.storage.from(bucket).createSignedUploadUrl(filePath, 60);
      // supabase client returns { data, error }
      if (res.error) {
        signedError = res.error;
      } else {
        signedData = res.data;
      }
    } catch (e) {
      // If the above signature isn't supported, try the object form (some versions expect { upsert: boolean })
      try {
        const res2 = await supabase.storage.from(bucket).createSignedUploadUrl(filePath, { upsert: true });
        if (res2.error) {
          signedError = res2.error;
        } else {
          signedData = res2.data;
        }
      } catch (e2) {
        signedError = e2;
      }
    }

    if (signedError) {
      console.error('Storage error (createSignedUploadUrl):', signedError);
      // try to return a helpful message
      const message = (signedError && signedError.message) ? signedError.message : String(signedError);
      return NextResponse.json({ error: `Failed to create signed upload URL: ${message}` }, { status: 500 });
    }

    // signedData shape may differ across versions: check common keys
    // e.g. { signedUploadUrl } or { signedUrl } or { uploadUrl } or { signedURL }
    const uploadUrl =
      signedData?.signedUploadUrl ||
      signedData?.signedUrl ||
      signedData?.uploadUrl ||
      signedData?.signedURL ||
      signedData?.signed_url ||
      null;

    if (!uploadUrl) {
      // If structure unexpected, return the whole signedData to help debugging
      console.warn('Unexpected createSignedUploadUrl response shape', signedData);
      return NextResponse.json({ error: 'Unexpected storage response', data: signedData }, { status: 500 });
    }

    // Return the signed upload URL and the storage key (filePath) to the client
    return NextResponse.json({ uploadUrl, key: filePath }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in attachments route:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
  