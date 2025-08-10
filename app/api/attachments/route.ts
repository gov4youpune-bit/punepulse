export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // Accepts either "path" or "filePath" from the request
    const body = await req.json();
    const bucket = body.bucket;
    const filePath = body.filePath || body.path;

    if (!bucket || !filePath) {
      return NextResponse.json(
        { error: 'Bucket and filePath/path are required' },
        { status: 400 }
      );
    }

    // Create signed upload URL with correct type
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath, { upsert: true });

    if (error) {
      console.error('Storage error (createSignedUploadUrl):', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in attachments route:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
