export const dynamic = "force-dynamic";
export const revalidate = 0;


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Supabase credentials are missing. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment variables.'
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseClient(); // ✅ only created when endpoint runs

    const body = await req.json();
    const { complaint_id } = body;

    if (!complaint_id) {
      return NextResponse.json({ error: 'complaint_id required' }, { status: 400 });
    }

    const jobId = randomUUID();
    const updatePayload = {
      status: 'queued_for_portal',
      submitted_to_portal: {
        job_id: jobId,
        queued_at: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    };

    const { data: updatedComplaint, error: updateErr } = await supabase
      .from('complaints')
      .update(updatePayload)
      .eq('id', complaint_id)
      .select()
      .single();

    if (updateErr) {
      console.error('Supabase update error', updateErr);
      return NextResponse.json({ job_id: jobId, warning: 'Failed to update DB' }, { status: 202 });
    }

    return NextResponse.json({ job_id: jobId, updatedComplaint }, { status: 200 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
