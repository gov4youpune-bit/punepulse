export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Types
interface BulkRequest {
  action: 'delete' | 'set_urgency' | 'group';
  ids: string[];
  payload?: {
    urgency?: 'high' | 'medium' | 'low';
    group?: string;
  };
}

interface BulkResponse {
  success: boolean;
  message?: string;
  results?: {
    updated: number;
    failed: number;
    errors: string[];
  };
}

/**
 * POST /api/complaints/bulk
 * 
 * Request body: { action: 'delete'|'set_urgency'|'group', ids: string[], payload?: any }
 * Response: { success: boolean, message?: string, results?: { updated: number, failed: number, errors: string[] } }
 * 
 * Requires authentication (admin)
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

    const body: BulkRequest = await request.json();
    const { action, ids, payload } = body;

    if (!action || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ 
        error: 'Missing or invalid action, ids required' 
      }, { status: 400 });
    }

    if (!['delete', 'set_urgency', 'group'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be: delete, set_urgency, or group' 
      }, { status: 400 });
    }

    // Validate payload based on action
    if (action === 'set_urgency' && (!payload?.urgency || !['high', 'medium', 'low'].includes(payload.urgency))) {
      return NextResponse.json({ 
        error: 'Invalid urgency. Must be: high, medium, or low' 
      }, { status: 400 });
    }

    if (action === 'group' && (!payload?.group || typeof payload.group !== 'string')) {
      return NextResponse.json({ 
        error: 'Group name required for group action' 
      }, { status: 400 });
    }

    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    // Process each complaint
    for (const id of ids) {
      try {
        if (action === 'delete') {
          // Get complaint for audit log before deletion
          const { data: complaint } = await supabaseAdmin
            .from('complaints')
            .select('*')
            .eq('id', id)
            .single();

          // Delete complaint
          const { error: deleteError } = await supabaseAdmin
            .from('complaints')
            .delete()
            .eq('id', id);

          if (deleteError) {
            throw new Error(deleteError.message);
          }

          // Insert audit log
          await supabaseAdmin.from('audit_logs').insert({
            complaint_id: id,
            actor: user.email || 'admin',
            action: 'bulk_delete',
            payload: {
              complaint_data: complaint,
              user_agent: request.headers.get('user-agent') ?? null
            }
          });

        } else if (action === 'set_urgency') {
          // Update urgency
          const { error: updateError } = await supabaseAdmin
            .from('complaints')
            .update({ urgency: payload!.urgency })
            .eq('id', id);

          if (updateError) {
            throw new Error(updateError.message);
          }

          // Insert audit log
          await supabaseAdmin.from('audit_logs').insert({
            complaint_id: id,
            actor: user.email || 'admin',
            action: 'bulk_set_urgency',
            payload: {
              urgency: payload!.urgency,
              user_agent: request.headers.get('user-agent') ?? null
            }
          });

        } else if (action === 'group') {
          // Update group_name
          const { error: updateError } = await supabaseAdmin
            .from('complaints')
            .update({ group_name: payload!.group })
            .eq('id', id);

          if (updateError) {
            throw new Error(updateError.message);
          }

          // Insert audit log
          await supabaseAdmin.from('audit_logs').insert({
            complaint_id: id,
            actor: user.email || 'admin',
            action: 'bulk_group',
            payload: {
              group_name: payload!.group,
              user_agent: request.headers.get('user-agent') ?? null
            }
          });
        }

        results.updated++;

      } catch (error) {
        results.failed++;
        results.errors.push(`ID ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const response: BulkResponse = {
      success: results.failed === 0,
      message: `Processed ${ids.length} complaints: ${results.updated} successful, ${results.failed} failed`,
      results
    };

    return NextResponse.json(response, { 
      status: results.failed === 0 ? 200 : 207 // 207 = Multi-Status (partial success)
    });

  } catch (err: any) {
    console.error('[API] /api/complaints/bulk error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
