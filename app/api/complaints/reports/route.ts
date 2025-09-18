import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// Fix dynamic server usage error
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface WorkerReport {
  id: string;
  complaint_id: string;
  worker_id: string;
  worker_clerk_id: string;
  comments?: string;
  photos: string[];
  status: string;
  created_at: string;
  updated_at: string;
  complaint?: {
    id: string;
    token: string;
    category: string;
    subtype: string;
    description: string;
    email?: string;
  };
  worker?: {
    id: string;
    display_name: string;
    email?: string;
    clerk_user_id?: string;
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

    // For now, allow any authenticated user to access reports
    // TODO: Add proper admin role checking later
    console.log('[REPORTS API] Authenticated user:', clerkUserId);

    // Get worker reports with complaint and worker details
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('worker_reports')
      .select(`
        *,
        complaints!inner (
          id,
          token,
          category,
          subtype,
          description,
          email
        ),
        workers!inner (
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

    // Transform the data to match our interface
    const transformedReports: WorkerReport[] = (reports || []).map((report: any) => ({
      id: report.id,
      complaint_id: report.complaint_id,
      worker_id: report.worker_id,
      worker_clerk_id: report.worker_clerk_id,
      comments: report.comments,
      photos: report.photos || [],
      status: report.status,
      created_at: report.created_at,
      updated_at: report.updated_at,
      complaint: report.complaints ? {
        id: report.complaints.id,
        token: report.complaints.token,
        category: report.complaints.category,
        subtype: report.complaints.subtype,
        description: report.complaints.description,
        email: report.complaints.email
      } : undefined,
      worker: report.workers ? {
        id: report.workers.id,
        display_name: report.workers.display_name,
        email: report.workers.email,
        clerk_user_id: report.workers.clerk_user_id
      } : undefined
    }));

    const response: ReportsResponse = { reports: transformedReports };
    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    console.error('[API] /api/complaints/reports error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}