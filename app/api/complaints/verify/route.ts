export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { sendComplaintNotification } from '@/lib/email';

// Types
interface VerifyRequest {
  complaint_id: string;
  report_id?: string;
  action: 'verify' | 'reject';
  note?: string;
}

interface VerifyResponse {
  complaint: any;
  report?: any;
}

/**
 * POST /api/complaints/verify
 * 
 * Request body: { complaint_id: string, report_id?: string, action: 'verify'|'reject', note?: string }
 * Response: { complaint: <updated complaint>, report?: <updated report> }
 * 
 * Requires admin authentication
 */
export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user is admin
    const userRole = user.user_metadata?.role;
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body: VerifyRequest = await request.json();
    const { complaint_id, report_id, action, note } = body;

    if (!complaint_id || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: complaint_id and action' 
      }, { status: 400 });
    }

    if (!['verify', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "verify" or "reject"' 
      }, { status: 400 });
    }

    // Check if complaint exists
    const { data: complaint, error: complaintError } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('id', complaint_id)
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json({ 
        error: 'Complaint not found' 
      }, { status: 404 });
    }

    let updatedReport = null;

    // If report_id provided, update the specific report
    if (report_id) {
      const { data: report, error: reportError } = await supabaseAdmin
        .from('worker_reports')
        .update({
          status: action === 'verify' ? 'verified' : 'rejected'
        })
        .eq('id', report_id)
        .eq('complaint_id', complaint_id)
        .select()
        .single();

      if (reportError) {
        console.error('Report update error:', reportError);
        return NextResponse.json({ 
          error: 'Failed to update report' 
        }, { status: 500 });
      }

      updatedReport = report;
    }

    // Update complaint based on action
    const updateData: any = {
      verification_status: action === 'verify' ? 'verified' : 'rejected',
      verified_at: new Date().toISOString(),
      verified_by: user.id
    };

    if (action === 'verify') {
      updateData.status = 'resolved';
    } else {
      // Reject: set back to assigned or in_progress
      updateData.status = complaint.assigned_to ? 'assigned' : 'in_progress';
    }

    const { data: updatedComplaint, error: updateError } = await supabaseAdmin
      .from('complaints')
      .update(updateData)
      .eq('id', complaint_id)
      .select()
      .single();

    if (updateError) {
      console.error('Complaint update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update complaint' 
      }, { status: 500 });
    }

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      complaint_id,
      actor: user.email || 'admin',
      action: action === 'verify' ? 'resolution_verified' : 'resolution_rejected',
      payload: {
        action,
        report_id: report_id || null,
        note: note || null,
        previous_status: complaint.status,
        new_status: updatedComplaint.status,
        user_agent: request.headers.get('user-agent') ?? null
      }
    });

    // Send email notification if complaint was verified/resolved
    if (action === 'verify' && updatedComplaint.status === 'resolved' && complaint.email) {
      sendComplaintNotification({
        type: 'complaint_verified',
        complaint: updatedComplaint
      }).catch(error => {
        console.error('[EMAIL] Failed to send verification notification:', error);
      });
    }

    const response: VerifyResponse = { 
      complaint: updatedComplaint,
      report: updatedReport
    };
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[API] /api/complaints/verify error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
