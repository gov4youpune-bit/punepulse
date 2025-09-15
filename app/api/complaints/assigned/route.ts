export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Types
interface AssignedComplaint {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  status: string;
  urgency: string;
  location_text?: string;
  created_at: string;
  updated_at: string;
  assigned_at: string;
  attachments?: string[];
  assignment_note?: string;
}

interface AssignedResponse {
  complaints: AssignedComplaint[];
}

/**
 * GET /api/complaints/assigned
 * 
 * Returns complaints assigned to the current worker
 * 
 * Requires worker authentication
 */
export async function GET(request: Request) {
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
      .select('id, display_name, email')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (workerError || !worker) {
      return NextResponse.json({ 
        error: 'Worker access required' 
      }, { status: 403 });
    }

    // Get assigned complaints with assignment details
    const { data: complaints, error: complaintsError } = await supabaseAdmin
      .from('complaints')
      .select(`
        id,
        token,
        category,
        subtype,
        description,
        status,
        urgency,
        location_text,
        created_at,
        updated_at,
        assigned_at,
        attachments
      `)
      .eq('assigned_to', worker.id)
      .order('assigned_at', { ascending: false });

    if (complaintsError) {
      console.error('Fetch assigned complaints error:', complaintsError);
      return NextResponse.json({ 
        error: 'Failed to fetch assigned complaints' 
      }, { status: 500 });
    }

    // Transform the data
    const transformedComplaints: AssignedComplaint[] = complaints.map(complaint => ({
      id: complaint.id,
      token: complaint.token,
      category: complaint.category,
      subtype: complaint.subtype,
      description: complaint.description,
      status: complaint.status,
      urgency: complaint.urgency || 'medium',
      location_text: complaint.location_text,
      created_at: complaint.created_at,
      updated_at: complaint.updated_at,
      assigned_at: complaint.assigned_at,
      attachments: complaint.attachments || [],
      assignment_note: undefined // Will be populated separately if needed
    }));

    const response: AssignedResponse = { 
      complaints: transformedComplaints 
    };
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[API] /api/complaints/assigned error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
