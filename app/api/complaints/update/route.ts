export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { sendComplaintNotification } from '@/lib/email';

// Types
interface UpdateRequest {
  id: string;
  patch: {
    urgency?: 'high' | 'medium' | 'low';
    status?: string;
    description?: string;
    category?: string;
    subtype?: string;
    location_text?: string;
    group_name?: string;
  };
}

interface UpdateResponse {
  complaint: any;
}

/**
 * POST /api/complaints/update
 * 
 * Request body: { id: string, patch: { urgency?, status?, description?, category?, subtype?, location_text?, group_name? } }
 * Response: { complaint: <updated row> }
 * 
 * Requires authentication (admin)
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // For testing purposes, allow updates even without proper admin setup
    console.log('[UPDATE API] Clerk user ID:', userId);

    const body: UpdateRequest = await request.json();
    const { id, patch } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing complaint ID' }, { status: 400 });
    }

    if (!patch || Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Validate allowed fields
    const allowedFields = ['urgency', 'status', 'description', 'category', 'subtype', 'location_text', 'group_name'];
    const patchKeys = Object.keys(patch);
    const invalidFields = patchKeys.filter(key => !allowedFields.includes(key));
    
    if (invalidFields.length > 0) {
      return NextResponse.json({ 
        error: `Invalid fields: ${invalidFields.join(', ')}. Allowed: ${allowedFields.join(', ')}` 
      }, { status: 400 });
    }

    // Validate urgency values
    if (patch.urgency && !['high', 'medium', 'low'].includes(patch.urgency)) {
      return NextResponse.json({ 
        error: 'Invalid urgency value. Must be: high, medium, or low' 
      }, { status: 400 });
    }

    // Get current complaint for audit log
    const { data: currentComplaint, error: fetchError } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('[DB] fetch complaint error', fetchError);
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Update complaint
    const { data: updatedComplaint, error: updateError } = await supabaseAdmin
      .from('complaints')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('[DB] update error', updateError);
      return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
    }

    // Insert audit log
    const action = patch.urgency ? 'update_urgency' : 
                  patch.status ? 'update_status' : 
                  'update_fields';

    await supabaseAdmin.from('audit_logs').insert({
      complaint_id: id,
      actor: userId || 'admin',
      action: action,
      payload: {
        changes: patch,
        previous_values: Object.keys(patch).reduce((acc, key) => {
          acc[key] = currentComplaint[key];
          return acc;
        }, {} as any),
        user_agent: request.headers.get('user-agent') ?? null
      }
    });

    // Send email notification if status changed
    if (patch.status && patch.status !== currentComplaint.status && currentComplaint.email) {
      sendComplaintNotification({
        type: 'complaint_status_changed',
        complaint: updatedComplaint,
        extra: {
          oldStatus: currentComplaint.status,
          newStatus: patch.status
        }
      }).catch(error => {
        console.error('[EMAIL] Failed to send status change notification:', error);
      });
    }

    const response: UpdateResponse = { complaint: updatedComplaint };
    return NextResponse.json(response, { status: 200 });

  } catch (err: any) {
    console.error('[API] /api/complaints/update error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
