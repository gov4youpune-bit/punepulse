import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

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
        *,
        complaint:complaints (
          id,
          token,
          category,
          subtype,
          description
        ),
        worker:workers (
          id,
          display_name,
          email
        )
      `)
      .in('status', ['submitted', 'admin_verification_pending'])
      .order('created_at', { ascending: false });

    if (reportsError) {
      console.error('Fetch worker reports error:', reportsError);
      return NextResponse.json({ error: 'Failed to fetch worker reports' }, { status: 500 });
    }

    const response: ReportsResponse = { reports: reports || [] };
    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    console.error('[API] /api/complaints/reports error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
