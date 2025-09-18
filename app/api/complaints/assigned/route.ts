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

    // Check if user is a worker
    const { data: appUsers, error: userError } = await supabaseAdmin
      .from('app_users')
      .select('role, email')
      .eq('clerk_user_id', clerkUserId);

    if (userError) {
      console.error('Fetch app_users error:', userError);
      return NextResponse.json({ error: 'Failed to verify user role' }, { status: 500 });
    }

    const appUser = appUsers && appUsers.length > 0 ? appUsers[0] : null;
    if (!appUser || appUser.role !== 'worker') {
      console.log('[ASSIGNED API] User is not a worker or not found:', appUser?.role || 'not found');
      return NextResponse.json({ error: 'Worker access required' }, { status: 403 });
    }

    // Get assigned complaints for this worker
    console.log('[ASSIGNED API] Fetching complaints for clerk user ID:', clerkUserId);
    
    const { data: complaints, error: complaintsError } = await supabaseAdmin
      .from('complaints')
      .select(`
        *,
        worker_reports (
          id,
          comments,
          photos,
          status,
          created_at
        )
      `)
      .eq('assigned_to_clerk_id', clerkUserId)
      .order('assigned_at', { ascending: false });

    if (complaintsError) {
      console.error('Fetch assigned complaints error:', complaintsError);
      return NextResponse.json({ error: 'Failed to fetch assigned complaints' }, { status: 500 });
    }

    console.log('[ASSIGNED API] Found complaints:', complaints?.length || 0);

    // Transform data and parse coordinates
    const transformedComplaints: AssignedComplaint[] = complaints.map((complaint: any) => {
      let lat: number | null = null;
      let lng: number | null = null;

      if (complaint.location_text && typeof complaint.location_text === 'string') {
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
        status: complaint.status,
        urgency: complaint.urgency || 'medium',
        created_at: complaint.created_at,
        updated_at: complaint.updated_at,
        assigned_at: complaint.assigned_at,
        attachments: complaint.attachments || [],
        lat,
        lng,
        worker_reports: complaint.worker_reports || []
      };
    });

    const response: AssignedResponse = { complaints: transformedComplaints };
    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    console.error('[API] /api/complaints/assigned error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}