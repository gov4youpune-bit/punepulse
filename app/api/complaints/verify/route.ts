import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendComplaintNotification } from '@/lib/email';

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface VerifyRequest {
  report_id: string;
  action: 'approve' | 'reject';
  admin_comments?: string;
}

interface VerifyResponse {
  success: boolean;
  message: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: VerifyRequest = await request.json();
    const { report_id, action, admin_comments } = body;

    console.log('[VERIFY API] Verification request:', { report_id, action, admin_comments });

    if (!report_id || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: report_id and action' 
      }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be "approve" or "reject"' 
      }, { status: 400 });
    }

    // For now, allow any authenticated user to verify reports
    // TODO: Add proper admin role checking later
    console.log('[VERIFY API] Authenticated user:', clerkUserId);

    // Get the worker report with complaint details
    const { data: report, error: reportError } = await supabaseAdmin
      .from('worker_reports')
      .select(`
        *,
        complaint:complaints (
          id,
          token,
          category,
          subtype,
          description,
          email,
          status,
          urgency,
          created_at,
          location_text
        )
      `)
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      console.error('[VERIFY API] Report not found:', reportError);
      return NextResponse.json({ 
        error: 'Worker report not found' 
      }, { status: 404 });
    }

    if (report.status !== 'submitted') {
      return NextResponse.json({ 
        error: 'Report has already been processed' 
      }, { status: 400 });
    }

    const complaint = report.complaint;

    if (action === 'approve') {
      // Update worker report status
      const { error: updateReportError } = await supabaseAdmin
        .from('worker_reports')
        .update({
          status: 'verified',
          updated_at: new Date().toISOString()
        })
        .eq('id', report_id);

      if (updateReportError) {
        console.error('[VERIFY API] Error updating report:', updateReportError);
        return NextResponse.json({ 
          error: 'Failed to update report status' 
        }, { status: 500 });
      }

      // Update complaint status to resolved
      const { error: updateComplaintError } = await supabaseAdmin
        .from('complaints')
        .update({
          status: 'resolved',
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: clerkUserId,
          updated_at: new Date().toISOString()
        })
        .eq('id', complaint.id);

      if (updateComplaintError) {
        console.error('[VERIFY API] Error updating complaint:', updateComplaintError);
        return NextResponse.json({ 
          error: 'Failed to update complaint status' 
        }, { status: 500 });
      }

      // Send resolved email to original reporter
      if (complaint.email) {
        try {
          await sendComplaintNotification({
            type: 'complaint_resolved',
            complaint: {
              id: complaint.id,
              token: complaint.token,
              category: complaint.category,
              subtype: complaint.subtype,
              description: complaint.description,
              status: 'resolved',
              urgency: complaint.urgency,
              created_at: complaint.created_at,
              email: complaint.email,
              location_text: complaint.location_text
            }
          });
          console.log('[VERIFY API] Resolved email sent to:', complaint.email);
        } catch (emailError) {
          console.error('[VERIFY API] Email notification failed:', emailError);
          // Don't fail the verification if email fails
        }
      }

    } else if (action === 'reject') {
      // Update worker report status
      const { error: updateReportError } = await supabaseAdmin
        .from('worker_reports')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', report_id);

      if (updateReportError) {
        console.error('[VERIFY API] Error updating report:', updateReportError);
        return NextResponse.json({ 
          error: 'Failed to update report status' 
        }, { status: 500 });
      }

      // Update complaint status back to assigned (so worker can resubmit)
      const { error: updateComplaintError } = await supabaseAdmin
        .from('complaints')
        .update({
          status: 'assigned',
          verification_status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', complaint.id);

      if (updateComplaintError) {
        console.error('[VERIFY API] Error updating complaint:', updateComplaintError);
        return NextResponse.json({ 
          error: 'Failed to update complaint status' 
        }, { status: 500 });
      }
    }

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      complaint_id: complaint.id,
      actor_clerk_id: clerkUserId,
      action: `worker_report_${action}d`,
      payload: {
        report_id: report_id,
        admin_comments: admin_comments || null,
        user_agent: request.headers.get('user-agent') ?? null
      }
    });

    const response: VerifyResponse = {
      success: true,
      message: `Worker report ${action}d successfully`
    };

    console.log('[VERIFY API] Verification completed successfully');
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[VERIFY API] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err.message 
    }, { status: 500 });
  }
}