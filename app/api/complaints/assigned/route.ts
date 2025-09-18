import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Fix dynamic server usage error
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AssignedComplaint {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  location_text?: string;
  location_point?: string;
  status: string;
  urgency?: string;
  created_at: string;
  updated_at: string;
  assigned_at?: string;
  attachments?: string[];
  lat?: number | null;
  lng?: number | null;
  worker_reports?: Array<{
    id: string;
    comments?: string;
    photos: string[];
    status: string;
    created_at: string;
  }>;
}

interface AssignedResponse {
  complaints: AssignedComplaint[];
}

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    console.log('[ASSIGNED API] Clerk user ID:', clerkUserId);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Debug: Check all assignments in the table
    console.log('[ASSIGNED API] Checking all assignments in complaint_assignments table...');
    const { data: allAssignments, error: allAssignmentsError } = await supabaseAdmin
      .from('complaint_assignments')
      .select('assigned_to_clerk_id, complaint_id, assigned_at')
      .order('assigned_at', { ascending: false });
    
    if (allAssignmentsError) {
      console.error('Error fetching all assignments:', allAssignmentsError);
    } else {
      console.log('[ASSIGNED API] All assignments:', allAssignments);
      console.log('[ASSIGNED API] Looking for assignments with clerk_user_id:', clerkUserId);
    }

    // Get assigned complaints for this worker from complaint_assignments table
    console.log('[ASSIGNED API] Fetching complaints for clerk user ID:', clerkUserId);
    
    const { data: assignments, error: assignmentsError } = await supabaseAdmin
      .from('complaint_assignments')
      .select(`
        complaint_id,
        assigned_at,
        note,
        assigned_to_clerk_id,
        complaints (
          id,
          token,
          category,
          subtype,
          description,
          location_text,
          location_point,
          status,
          urgency,
          created_at,
          updated_at,
          attachments,
          worker_reports (
            id,
            comments,
            photos,
            status,
            created_at
          )
        )
      `)
      .eq('assigned_to_clerk_id', clerkUserId)
      .order('assigned_at', { ascending: false });

    if (assignmentsError) {
      console.error('Fetch complaint assignments error:', assignmentsError);
      return NextResponse.json({ error: 'Failed to fetch assigned complaints' }, { status: 500 });
    }

    console.log('[ASSIGNED API] Found assignments:', assignments?.length || 0);
    console.log('[ASSIGNED API] Assignments data:', assignments);

    // If no assignments found, return empty array (user might not be a worker or have no assignments)
    if (!assignments || assignments.length === 0) {
      console.log('[ASSIGNED API] No assignments found for user:', clerkUserId);
      return NextResponse.json({ complaints: [] }, { status: 200 });
    }

    // Transform data and parse coordinates
    const transformedComplaints: AssignedComplaint[] = assignments.map((assignment: any) => {
      const complaint = assignment.complaints;
      let lat: number | null = null;
      let lng: number | null = null;

      // Parse location_point if it exists
      if (complaint.location_point && typeof complaint.location_point === 'string') {
        const coords = complaint.location_point.trim().match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (coords) {
          lat = parseFloat(coords[1]);
          lng = parseFloat(coords[2]);
        }
      }

      // Fallback: try to parse from location_text
      if (!lat && !lng && complaint.location_text && typeof complaint.location_text === 'string') {
        const coords = complaint.location_text.trim().match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
        if (coords) {
          lat = parseFloat(coords[1]);
          lng = parseFloat(coords[2]);
        }
      }

      return {
        id: complaint.id,
        token: complaint.token,
        category: complaint.category,
        subtype: complaint.subtype,
        description: complaint.description,
        location_text: complaint.location_text,
        location_point: complaint.location_point,
        status: complaint.status,
        urgency: complaint.urgency || 'medium',
        created_at: complaint.created_at,
        updated_at: complaint.updated_at,
        assigned_at: assignment.assigned_at,
        attachments: complaint.attachments || [],
        lat,
        lng,
        worker_reports: complaint.worker_reports || []
      };
    });

    console.log('[ASSIGNED API] Transformed complaints:', transformedComplaints);
    const response: AssignedResponse = { complaints: transformedComplaints };
    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    console.error('[API] /api/complaints/assigned error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}