import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { complaint_id } = body;
    if (!complaint_id) {
      return NextResponse.json({ error: 'complaint_id required' }, { status: 400 });
    }

    // generate a job id (uuid) and store a submission attempt inside complaint.submitted_to_portal
    const jobId = randomUUID();

    // update the complaint to mark queued/submitted (optimistic)
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
      // still return job id but set status accordingly
      return NextResponse.json({ job_id: jobId, warning: 'Failed to update DB' }, { status: 202 });
    }

    // In a real worker you'd enqueue a job here (BullMQ / Upstash / Worker)
    // For pilot, we simply return job id and updated complaint
    return NextResponse.json({ job_id: jobId, updatedComplaint }, { status: 200 });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
