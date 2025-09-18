import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/email';

interface AssignRequest {
  complaint_id: string;
  assigned_to_worker_id: string;
  assigned_to_clerk_id: string;
  note?: string;
}

interface AssignResponse {
  success: boolean;
  message: string;
  assignment?: any;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AssignRequest = await request.json();
    const { complaint_id, assigned_to_clerk_id, note } = body;

    console.log('[ASSIGN API] Assignment request:', { complaint_id, assigned_to_clerk_id, note });

    if (!complaint_id || !assigned_to_clerk_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: complaint_id and assigned_to_clerk_id' 
      }, { status: 400 });
    }

    // SIMPLIFIED APPROACH: Direct assignment without complex checks
    // 1. Update the complaint with assignment info
    const { data: updatedComplaint, error: updateError } = await supabaseAdmin
      .from('complaints')
      .update({
        assigned_to_clerk_id: assigned_to_clerk_id,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
        updated_at: new Date().toISOString()
      })
      .eq('id', complaint_id)
      .select()
      .single();

    if (updateError) {
      console.error('[ASSIGN API] Error updating complaint:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update complaint assignment' 
      }, { status: 500 });
    }

    // 2. Create assignment record
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('complaint_assignments')
      .insert({
        complaint_id: complaint_id,
        assigned_to_clerk_id: assigned_to_clerk_id,
        assigned_by_clerk_id: clerkUserId,
        note: note || 'Complaint assigned',
        assigned_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('[ASSIGN API] Error creating assignment:', assignmentError);
      // Don't fail the whole operation if assignment record fails
      console.log('[ASSIGN API] Assignment record failed, but complaint was updated');
    }

    // 3. Send email notification (optional)
    try {
      // Get worker email from app_users table
      const { data: workerData } = await supabaseAdmin
        .from('app_users')
        .select('email, display_name')
        .eq('clerk_user_id', assigned_to_clerk_id)
        .single();

      if (workerData?.email) {
        await sendEmail({
          to: workerData.email,
          subject: 'New Complaint Assignment',
          text: `New Complaint Assigned - ${updatedComplaint.token}`,
          html: `
            <h2>New Complaint Assigned</h2>
            <p>You have been assigned a new complaint:</p>
            <p><strong>Complaint ID:</strong> ${updatedComplaint.token}</p>
            <p><strong>Category:</strong> ${updatedComplaint.category} - ${updatedComplaint.subtype}</p>
            <p><strong>Description:</strong> ${updatedComplaint.description}</p>
            <p><strong>Location:</strong> ${updatedComplaint.location_text || 'Not specified'}</p>
            <p><strong>Priority:</strong> ${updatedComplaint.urgency || 'medium'}</p>
            <p>Please log in to your worker dashboard to view and respond to this complaint.</p>
          `
        });
        console.log('[ASSIGN API] Email notification sent to:', workerData.email);
      }
    } catch (emailError) {
      console.error('[ASSIGN API] Email notification failed:', emailError);
      // Don't fail the assignment if email fails
    }

    const response: AssignResponse = {
      success: true,
      message: 'Complaint assigned successfully',
      assignment: assignment
    };

    console.log('[ASSIGN API] Assignment completed successfully');
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[ASSIGN API] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err.message 
    }, { status: 500 });
  }
}