import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json();
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Filename and content type are required' }, { status: 400 });
    }

    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = filename.split('.').pop();
    const uniqueFilename = `${timestamp}-${randomId}.${fileExtension}`;

    const bucket = process.env.NEXT_PUBLIC_STORAGE_BUCKET!;
    const path: string = `complaints/${uniqueFilename}`;
    const expiresIn: number = 60 * 60;

    const { data, error } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUploadUrl(path, expiresIn);

    if (error) {
      console.error('Storage error:', error);
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      key: path,
      bucket
    });
  } catch (e) {
    console.error('API error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
