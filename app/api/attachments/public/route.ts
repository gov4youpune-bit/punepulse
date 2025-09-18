import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Fix dynamic server usage error
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }

    console.log('[ATTACHMENTS API] Fetching attachment with key:', key);

    // Create signed URL for the attachment from the complaint-attachments bucket
    // Handle both old format (with folders) and new format (direct keys)
    let { data, error } = await supabaseAdmin.storage
      .from('complaint-attachments')
      .createSignedUrl(key, 3600); // 1 hour expiry

    // If the key has folder structure and fails, try without the folder prefix
    if (error && key.includes('/')) {
      console.log('Trying without folder prefix for key:', key);
      const simpleKey = key.split('/').pop(); // Get just the filename
      if (simpleKey) {
        const retryResult = await supabaseAdmin.storage
          .from('complaint-attachments')
          .createSignedUrl(simpleKey, 3600);
        
        if (retryResult.data && !retryResult.error) {
          data = retryResult.data;
          error = null;
          console.log('Successfully found attachment with simple key:', simpleKey);
        }
      }
    }

    if (error) {
      console.error('Failed to create signed URL:', error);
      if (error.message?.includes('Object not found') || error.message?.includes('404')) {
        return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to generate access URL' }, { status: 500 });
    }

    if (!data?.signedUrl) {
      return NextResponse.json({ error: 'No signed URL generated' }, { status: 500 });
    }

    console.log('[ATTACHMENTS API] Successfully generated signed URL for:', key);
    return NextResponse.json({ url: data.signedUrl });
  } catch (err: any) {
    console.error('[API] /api/attachments/public error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}