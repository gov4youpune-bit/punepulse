import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendComplaintNotification } from '@/lib/email';

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

    // Get worker ID from workers table
    const { data: workerData, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('id')
      .eq('clerk_user_id', assigned_to_clerk_id)
      .single();

    if (workerError || !workerData) {
      console.error('[ASSIGN API] Worker not found:', workerError);
      return NextResponse.json({ 
        error: 'Worker not found in workers table' 
      }, { status: 404 });
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

    // 2. Create assignment record with worker ID
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('complaint_assignments')
      .insert({
        complaint_id: complaint_id,
        assigned_to: workerData.id, // This was missing!
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
      return NextResponse.json({ 
        error: 'Failed to create assignment record' 
      }, { status: 500 });
    }

    // 3. Send email notification (optional)
    try {
      // Get worker email from app_users table
      const { data: workerEmailData } = await supabaseAdmin
        .from('app_users')
        .select('email, display_name')
        .eq('clerk_user_id', assigned_to_clerk_id)
        .single();

      if (workerEmailData?.email) {
        await sendComplaintNotification({
          type: 'complaint_assigned',
          complaint: {
            id: updatedComplaint.id,
            token: updatedComplaint.token,
            category: updatedComplaint.category,
            subtype: updatedComplaint.subtype,
            description: updatedComplaint.description,
            status: updatedComplaint.status,
            urgency: updatedComplaint.urgency,
            created_at: updatedComplaint.created_at,
            email: workerEmailData.email,
            location_text: updatedComplaint.location_text
          }
        });
        console.log('[ASSIGN API] Email notification sent to:', workerEmailData.email);
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