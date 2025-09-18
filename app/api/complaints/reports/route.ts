import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Fix dynamic server usage error
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface WorkerReport {
  id: string;
  complaint_id: string;
  worker_clerk_id: string;
  comments?: string;
  photos: string[];
  status: string;
  created_at: string;
  complaint?: {
    id: string;
    token: string;
    category: string;
    subtype: string;
    description: string;
  };
  worker?: {
    id: string;
    display_name: string;
    email?: string;
  };
}

interface ReportsResponse {
  reports: WorkerReport[];
}

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: appUser, error: userError } = await supabaseAdmin
      .from('app_users')
      .select('role')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !appUser || appUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get worker reports with complaint and worker details
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('worker_reports')
      .select(`
        id,
        complaint_id,
        worker_id,
        worker_clerk_id,
        comments,
        photos,
        status,
        created_at,
        updated_at,
        complaint:complaints (
          id,
          token,
          category,
          subtype,
          description,
          email
        ),
        worker:workers (
          id,
          display_name,
          email,
          clerk_user_id
        )
      `)
      .in('status', ['submitted'])
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('Fetch worker reports error:', reportsError);
      return NextResponse.json({ error: 'Failed to fetch worker reports' }, { status: 500 });
    }

    console.log('[REPORTS API] Found reports:', reports?.length || 0);
    console.log('[REPORTS API] Sample report:', reports?.[0]);

    const response: ReportsResponse = { reports: reports || [] };
    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    console.error('[API] /api/complaints/reports error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}