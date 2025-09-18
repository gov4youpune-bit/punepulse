import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    console.log('[DEBUG REPORTS API] Clerk user ID:', clerkUserId);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: appUser, error: userError } = await supabaseAdmin
      .from('app_users')
      .select('role')
      .eq('clerk_user_id', clerkUserId)
      .single();

    console.log('[DEBUG REPORTS API] App user check:', { appUser, userError });

    if (userError || !appUser || appUser.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Admin access required',
        details: { appUser, userError, clerkUserId }
      }, { status: 403 });
    }

    // Get all worker reports (no filtering for debugging)
    const { data: allReports, error: allReportsError } = await supabaseAdmin
      .from('worker_reports')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('[DEBUG REPORTS API] All reports:', { count: allReports?.length, error: allReportsError });

    // Get submitted reports
    const { data: submittedReports, error: submittedError } = await supabaseAdmin
      .from('worker_reports')
      .select('*')
      .eq('status', 'submitted')
      .order('created_at', { ascending: false });

    console.log('[DEBUG REPORTS API] Submitted reports:', { count: submittedReports?.length, error: submittedError });

    // Get reports with joins
    const { data: reportsWithJoins, error: joinsError } = await supabaseAdmin
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
      .eq('status', 'submitted')
      .order('created_at', { ascending: false });

    console.log('[DEBUG REPORTS API] Reports with joins:', { count: reportsWithJoins?.length, error: joinsError });

    return NextResponse.json({
      debug: {
        clerkUserId,
        appUser,
        allReportsCount: allReports?.length || 0,
        submittedReportsCount: submittedReports?.length || 0,
        reportsWithJoinsCount: reportsWithJoins?.length || 0,
        sampleReport: submittedReports?.[0],
        sampleReportWithJoins: reportsWithJoins?.[0]
      },
      reports: reportsWithJoins || []
    }, { status: 200 });

  } catch (err: any) {
    console.error('[DEBUG REPORTS API] Error:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err.message 
    }, { status: 500 });
  }
}
