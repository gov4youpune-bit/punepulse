export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Types
interface ReportRequest {
  complaint_id: string;
  comments?: string;
  photos: string[];
}

interface ReportResponse {
  report: any;
  complaint: any;
}

/**
 * POST /api/complaints/report
 * 
 * Request body: { complaint_id: string, comments?: string, photos: string[] }
 * Response: { report: <created report>, complaint: <updated complaint> }
 * 
 * Requires worker authentication
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is a worker
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('id, name, email')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (workerError || !worker) {
      return NextResponse.json({ 
        error: 'Worker access required' 
      }, { status: 403 });
    }

    const body: ReportRequest = await request.json();
    const { complaint_id, comments, photos } = body;

    if (!complaint_id) {
      return NextResponse.json({ 
        error: 'Missing required field: complaint_id' 
      }, { status: 400 });
    }

    // Check if complaint exists and is assigned to this worker
    const { data: complaint, error: complaintError } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('id', complaint_id)
      .eq('assigned_to', worker.id)
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json({ 
        error: 'Complaint not found or not assigned to you' 
      }, { status: 404 });
    }

    // Create worker report
    const { data: report, error: reportError } = await supabaseAdmin
      .from('worker_reports')
      .insert({
        complaint_id,
        worker_id: worker.id,
        comments: comments || null,
        photos: photos || [],
        status: 'submitted'
      })
      .select()
      .single();

    if (reportError) {
      console.error('Report creation error:', reportError);
      return NextResponse.json({ 
        error: 'Failed to create report' 
      }, { status: 500 });
    }

    // Update complaint status
    const { data: updatedComplaint, error: updateError } = await supabaseAdmin
      .from('complaints')
      .update({
        status: 'pending_verification',
        verification_status: 'pending'
      })
      .eq('id', complaint_id)
      .select()
      .single();

    if (updateError) {
      console.error('Complaint update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update complaint status' 
      }, { status: 500 });
    }

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      complaint_id,
      actor: user.email || 'worker',
      action: 'worker_report_submitted',
      payload: {
        worker_name: worker.name,
        report_id: report.id,
        photos_count: photos?.length || 0,
        has_comments: !!comments,
        user_agent: request.headers.get('user-agent') ?? null
      }
    });

    const response: ReportResponse = { 
      report, 
      complaint: updatedComplaint 
    };
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[API] /api/complaints/report error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
