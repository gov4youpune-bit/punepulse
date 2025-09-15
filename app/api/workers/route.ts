export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Types
interface Worker {
  id: string;
  user_id: string;
  display_name: string;
  email?: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WorkersResponse {
  workers: Worker[];
}

/**
 * GET /api/workers
 * 
 * Returns list of active workers
 * 
 * Requires admin authentication
 */
export async function GET(request: Request) {
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

    // Get active workers
    const { data: workers, error: workersError } = await supabaseAdmin
      .from('workers')
      .select('*')
      .eq('is_active', true)
      .order('display_name', { ascending: true });

    if (workersError) {
      console.error('Fetch workers error:', workersError);
      return NextResponse.json({ 
        error: 'Failed to fetch workers' 
      }, { status: 500 });
    }

    const response: WorkersResponse = { 
      workers: workers || [] 
    };
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[API] /api/workers error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
