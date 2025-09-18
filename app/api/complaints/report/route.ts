import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

interface ReportRequest {
  complaint_id: string;
  comments?: string;
  photos: string[];
}

interface ReportResponse {
  success: boolean;
  message: string;
  report?: any;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ReportRequest = await request.json();
    const { complaint_id, comments, photos = [] } = body;

    console.log('[WORKER REPORT API] Report request:', { complaint_id, comments, photos });

    if (!complaint_id) {
      return NextResponse.json({ error: 'Missing complaint_id' }, { status: 400 });
    }

    // SIMPLIFIED APPROACH: Just check if complaint exists and is assigned
    const { data: complaint, error: complaintError } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('id', complaint_id)
      .single();

    if (complaintError || !complaint) {
      console.error('[WORKER REPORT API] Complaint not found:', complaintError);
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Check if complaint is assigned to this user
    if (complaint.assigned_to_clerk_id !== clerkUserId) {
      console.log('[WORKER REPORT API] Complaint not assigned to user:', {
        assigned_to: complaint.assigned_to_clerk_id,
        current_user: clerkUserId
      });
      return NextResponse.json({ error: 'Complaint not assigned to you' }, { status: 403 });
    }

    // Get worker ID from workers table
    const { data: workerData, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (workerError || !workerData) {
      console.error('[WORKER REPORT API] Worker not found:', workerError);
      return NextResponse.json({ 
        error: 'Worker not found in workers table' 
      }, { status: 404 });
    }

    // Create worker report
    const { data: report, error: reportError } = await supabaseAdmin
      .from('worker_reports')
      .insert({
        complaint_id,
        worker_id: workerData.id,
        worker_clerk_id: clerkUserId, // Also populate clerk ID
        comments: comments || null,
        photos: photos,
        status: 'submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (reportError) {
      console.error('[WORKER REPORT API] Report creation error:', reportError);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    // Update complaint status
    const { error: updateError } = await supabaseAdmin
      .from('complaints')
      .update({
        verification_status: 'pending',
        status: 'admin_verification_pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', complaint_id);

    if (updateError) {
      console.error('[WORKER REPORT API] Complaint update error:', updateError);
      // Don't fail the whole operation if status update fails
    }

    const response: ReportResponse = {
      success: true,
      message: 'Report submitted successfully',
      report: report
    };

    console.log('[WORKER REPORT API] Report submitted successfully:', report.id);
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[WORKER REPORT API] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err.message 
    }, { status: 500 });
  }
}