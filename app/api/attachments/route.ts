export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Types for request/response
interface SingleFileRequest {
  filename: string;
  contentType: string;
  bucket?: string;
  filePath?: string;
}

interface BatchFileRequest {
  files: Array<{
    filename: string;
    contentType: string;
  }>;
  bucket?: string;
}

interface SingleFileResponse {
  uploadUrl: string;
  key: string;
}

interface BatchFileResponse {
  uploads: Array<{
    uploadUrl: string;
    key: string;
  }>;
}

/**
 * POST /api/attachments
 *
 * Accepts either:
 *  - Single file: { filename: 'abc.jpg', contentType: 'image/jpeg' }
 *  - Batch files: { files: [{ filename: 'abc.jpg', contentType: 'image/jpeg' }, ...] }
 *  - Custom path: { bucket: 'my-bucket', filePath: 'complaints/abc.jpg' }
 *
 * Returns:
 *  - Single: { uploadUrl: string, key: string }
 *  - Batch: { uploads: [{ uploadUrl: string, key: string }, ...] }
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

    // Check if this is a batch request
    if (body.files && Array.isArray(body.files)) {
      return handleBatchUpload(supabase, bucket, body as BatchFileRequest);
    } else {
      return handleSingleUpload(supabase, bucket, body as SingleFileRequest);
    }
  } catch (err) {
    console.error('Unexpected error in attachments route:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function handleSingleUpload(supabase: any, bucket: string, body: SingleFileRequest): Promise<NextResponse> {
  // Resolve filePath - use simple naming without date folders
  let filePath: string | undefined = body.filePath;
  if (!filePath && body.filename) {
    const filename = String(body.filename).trim().replace(/\s+/g, '_');
    filePath = `${Date.now()}-${filename}`;
  }
  if (!filePath) {
    return NextResponse.json({ error: 'filePath or filename required' }, { status: 400 });
  }

  // Create signed upload URL
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

  const response: SingleFileResponse = { uploadUrl, key: filePath };
  return NextResponse.json(response, { status: 200 });
}

async function handleBatchUpload(supabase: any, bucket: string, body: BatchFileRequest): Promise<NextResponse> {
  const uploads: Array<{ uploadUrl: string; key: string }> = [];

  for (const file of body.files) {
    const filename = String(file.filename).trim().replace(/\s+/g, '_');
    const filePath = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${filename}`;

    // Create signed upload URL
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

    uploads.push({ uploadUrl, key: filePath });
  }

  const response: BatchFileResponse = { uploads };
  return NextResponse.json(response, { status: 200 });
}
