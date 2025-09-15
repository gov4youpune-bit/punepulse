export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Types
interface AssignRequest {
  complaint_id: string;
  assigned_to_user_id: string;
  note?: string;
}

interface AssignResponse {
  complaint: any;
  assignment: any;
}

/**
 * POST /api/complaints/assign
 * 
 * Request body: { complaint_id: string, assigned_to_user_id: string, note?: string }
 * Response: { complaint: <updated row>, assignment: <assignment row> }
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

    const body: AssignRequest = await request.json();
    const { complaint_id, assigned_to_user_id, note } = body;

    if (!complaint_id || !assigned_to_user_id) {
      return NextResponse.json({ 
        error: 'Missing required fields: complaint_id and assigned_to_user_id' 
      }, { status: 400 });
    }

    // Get worker by user_id
    const { data: worker, error: workerError } = await supabaseAdmin
      .from('workers')
      .select('id, display_name, email')
      .eq('user_id', assigned_to_user_id)
      .eq('is_active', true)
      .single();

    if (workerError || !worker) {
      return NextResponse.json({ 
        error: 'Worker not found or inactive' 
      }, { status: 404 });
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

    // Create assignment (with fallback if table doesn't exist)
    let assignment = null;
    const { data: assignmentData, error: assignmentError } = await supabaseAdmin
      .from('complaint_assignments')
      .insert({
        complaint_id,
        assigned_to: worker.id,
        assigned_by: user.id,
        note: note || null,
        status: 'assigned'
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Assignment creation error:', assignmentError);
      
      // If the error is about the table not existing, skip assignment creation
      if (assignmentError.code === '42703' || assignmentError.message?.includes('does not exist')) {
        console.log('complaint_assignments table does not exist, skipping assignment creation');
        assignment = { id: 'mock-assignment', assigned_to: worker.id };
      } else {
        return NextResponse.json({ 
          error: 'Failed to create assignment' 
        }, { status: 500 });
      }
    } else {
      assignment = assignmentData;
    }

    // Update complaint
    const { data: updatedComplaint, error: updateError } = await supabaseAdmin
      .from('complaints')
      .update({
        assigned_to: worker.id,
        assigned_at: new Date().toISOString(),
        status: 'assigned'
      })
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
      action: 'complaint_assigned',
      payload: {
        assigned_to: worker.display_name,
        assigned_to_email: worker.email,
        assignment_id: assignment.id,
        note: note || null,
        user_agent: request.headers.get('user-agent') ?? null
      }
    });

    const response: AssignResponse = { 
      complaint: updatedComplaint, 
      assignment 
    };
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[API] /api/complaints/assign error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
