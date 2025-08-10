// app/api/attachments/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * POST
 * Request body:
 * { filename: string, contentType?: string }
 *
 * Response:
 * { uploadUrl: string, key: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { filename, contentType } = body ?? {};

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    }

    // Bucket name (fallback to same bucket env used elsewhere)
    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'complaint-attachments';

    // Make a safe, unique key/path for the file.
    // You can change this pattern to suit your storage layout.
    const key = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${filename.replace(/\s+/g, '_')}`;

    // expiry in seconds (5 minutes)
    const expiresIn = 60 * 5;

    // IMPORTANT: pass an options object instead of a raw number — TypeScript expects an options object.
    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUploadUrl(key, { expiresIn });

    if (error) {
      console.error('Storage error (createSignedUploadUrl):', error);
      return NextResponse.json({ error: 'Failed to create signed upload URL' }, { status: 500 });
    }

    // different versions / builds of supabase client may return fields with slightly different names
    const uploadUrl =
      (data && (data.signedURL ?? data.signedUrl ?? (data as any).signed_url ?? (data as any).upload_url)) ||
      null;

    if (!uploadUrl) {
      console.error('Storage: createSignedUploadUrl returned unexpected payload', data);
      return NextResponse.json({ error: 'Failed to get upload URL' }, { status: 500 });
    }

    // Return URL for client to PUT to and the key (so you can store reference in complaints table)
    return NextResponse.json({ uploadUrl, key }, { status: 201 });
  } catch (err: any) {
    console.error('[API] /api/attachments error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
