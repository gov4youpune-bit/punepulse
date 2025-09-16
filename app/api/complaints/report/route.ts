import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface ReportRequest {
  complaint_id: string;
  comments?: string;
  photos: string[];
}

interface ReportResponse {
  report: any;
  complaint: any;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a worker
    const { data: appUser, error: userError } = await supabaseAdmin
      .from('app_users')
      .select('id, role, email, display_name')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !appUser || appUser.role !== 'worker') {
      return NextResponse.json({ error: 'Worker access required' }, { status: 403 });
    }

    const body: ReportRequest = await request.json();
    const { complaint_id, comments, photos = [] } = body;

    if (!complaint_id) {
      return NextResponse.json({ error: 'Missing complaint_id' }, { status: 400 });
    }

    // Verify the complaint is assigned to this worker
    const { data: complaint, error: complaintError } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('id', complaint_id)
      .eq('assigned_to_clerk_id', clerkUserId)
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json({ error: 'Complaint not found or not assigned to you' }, { status: 404 });
    }

    // Create worker report
    const { data: report, error: reportError } = await supabaseAdmin
      .from('worker_reports')
      .insert({
        complaint_id,
        worker_clerk_id: clerkUserId,
        worker_user_id: appUser.id,
        comments: comments || null,
        photos: photos,
        status: 'submitted'
      })
      .select()
      .single();

    if (reportError) {
      console.error('Worker report creation error:', reportError);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    // Update complaint status
    const { data: updatedComplaint, error: updateError } = await supabaseAdmin
      .from('complaints')
      .update({
        verification_status: 'pending',
        status: 'admin_verification_pending'
      })
      .eq('id', complaint_id)
      .select()
      .single();

    if (updateError) {
      console.error('Complaint update error:', updateError);
      return NextResponse.json({ error: 'Failed to update complaint status' }, { status: 500 });
    }

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      complaint_id,
      actor_clerk_id: clerkUserId,
      actor_app_user_id: appUser.id,
      action: 'worker_report_submitted',
      payload: {
        report_id: report.id,
        photos_count: photos.length,
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