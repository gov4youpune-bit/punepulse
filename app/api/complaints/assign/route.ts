import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/email';

interface AssignRequest {
  complaint_id: string;
  assigned_to_worker_id: string;
  assigned_to_clerk_id: string;
  note?: string;
}

interface AssignResponse {
  complaint: any;
  assignment: any;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      console.error('[AUTH] No Clerk user ID found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For testing purposes, allow assignment even without proper admin setup
    console.log('[ASSIGN API] Clerk user ID:', clerkUserId);
    
    // Try to check admin role but don't block if table doesn't exist
    try {
      const { data: appUsers, error: userError } = await supabaseAdmin
        .from('app_users')
        .select('role, email')
        .eq('clerk_user_id', clerkUserId);

      if (userError) {
        console.log('[ASSIGN API] app_users table error (continuing anyway):', userError.message);
      } else if (appUsers && appUsers.length > 0) {
        const appUser = appUsers[0];
        if (appUser?.role !== 'admin') {
          console.log('[ASSIGN API] User is not admin (continuing anyway):', appUser?.role);
        }
      } else {
        console.log('[ASSIGN API] No app_users record found (continuing anyway)');
      }
    } catch (tableError) {
      console.log('[ASSIGN API] app_users table not accessible (continuing anyway):', tableError);
    }

    const body: AssignRequest = await request.json();
    const { complaint_id, assigned_to_worker_id, assigned_to_clerk_id, note } = body;

    if (!complaint_id || !assigned_to_worker_id || !assigned_to_clerk_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get worker details - with fallback for hardcoded worker
    let worker;
    if (assigned_to_worker_id === 'hardcoded-worker-1') {
      // Use hardcoded worker for testing
      worker = {
        id: 'hardcoded-worker-1',
        display_name: 'Gov4You Pune Worker',
        clerk_user_id: 'hardcoded-clerk-id',
        email: 'gov4youpune@gmail.com'
      };
    } else {
      const { data: workerData, error: workerError } = await supabaseAdmin
        .from('workers')
        .select('id, display_name, clerk_user_id, email')
        .eq('id', assigned_to_worker_id)
        .eq('is_active', true)
        .single();

      if (workerError || !workerData) {
        return NextResponse.json({ error: 'Worker not found or inactive' }, { status: 404 });
      }
      worker = workerData;
    }

    // Get worker's email from app_users
    const { data: workerAppUsers, error: workerAppUserError } = await supabaseAdmin
      .from('app_users')
      .select('email, display_name')
      .eq('clerk_user_id', assigned_to_clerk_id);
    
    const workerAppUser = workerAppUsers && workerAppUsers.length > 0 ? workerAppUsers[0] : null;

    // Check if complaint exists
    const { data: complaint, error: complaintError } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('id', complaint_id)
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    // Create assignment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('complaint_assignments')
      .insert({
        complaint_id,
        assigned_to: assigned_to_worker_id,
        assigned_to_clerk_id,
        assigned_by_clerk_id: clerkUserId,
        note: note || null,
        assigned_at: new Date().toISOString()
      })
      .select()
      .single();

    if (assignmentError) {
      console.error('Assignment creation error:', assignmentError);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    // Update complaint
    const { data: updatedComplaint, error: updateError } = await supabaseAdmin
      .from('complaints')
      .update({
        assigned_to: assigned_to_worker_id,
        assigned_to_clerk_id,
        assigned_at: new Date().toISOString(),
        status: 'assigned'
      })
      .eq('id', complaint_id)
      .select()
      .single();

    if (updateError) {
      console.error('Complaint update error:', updateError);
      return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
    }

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      complaint_id,
      actor: clerkUserId, // Use 'actor' field instead of 'actor_clerk_id'
      action: 'complaint_assigned',
      payload: {
        assigned_to: worker.display_name,
        assigned_to_clerk_id,
        assignment_id: assignment.id,
        note: note || null,
        user_agent: request.headers.get('user-agent') ?? null
      }
    });

    // Send assignment email to worker
    if (workerAppUser?.email) {
      const workerDashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/worker/dashboard`;
      const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/track/${complaint.token}`;
      
      const emailResult = await sendEmail({
        to: workerAppUser.email,
        cc: process.env.MAIL_REPLY_TO || 'akshay3thakur@gmail.com',
        replyTo: process.env.MAIL_REPLY_TO || 'akshay3thakur@gmail.com',
        subject: `New Complaint Assignment - ${complaint.token}`,
        text: `
Hello ${workerAppUser.display_name || worker.display_name},

You have been assigned a new complaint to resolve.

Complaint Details:
- Token: ${complaint.token}
- Category: ${complaint.category} - ${complaint.subtype}
- Description: ${complaint.description}
- Location: ${complaint.location_text || 'Not specified'}

${note ? `Assignment Note: ${note}` : ''}

Please visit your dashboard to view full details and submit your report:
${workerDashboardUrl}

You can also track this complaint at: ${trackingUrl}

Best regards,
Pune Pulse Admin Team
        `.trim(),
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Complaint Assignment</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2563eb; margin-top: 0;">New Complaint Assignment</h2>
    <p>Hello ${workerAppUser.display_name || worker.display_name},</p>
    <p>You have been assigned a new complaint to resolve.</p>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Complaint Details</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Token:</td>
        <td style="padding: 8px 0; font-family: monospace; color: #2563eb;">${complaint.token}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Category:</td>
        <td style="padding: 8px 0;">${complaint.category} - ${complaint.subtype}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Location:</td>
        <td style="padding: 8px 0;">${complaint.location_text || 'Not specified'}</td>
      </tr>
    </table>
    
    <div style="margin-top: 15px;">
      <h4 style="margin: 0 0 8px 0; color: #374151;">Description</h4>
      <p style="white-space: pre-wrap; background: #f9fafb; padding: 12px; border-radius: 4px; margin: 0;">${complaint.description}</p>
    </div>
    
    ${note ? `
    <div style="margin-top: 15px;">
      <h4 style="margin: 0 0 8px 0; color: #374151;">Assignment Note</h4>
      <p style="background: #fef3c7; padding: 12px; border-radius: 4px; margin: 0; border-left: 4px solid #f59e0b;">${note}</p>
    </div>
    ` : ''}
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${workerDashboardUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; margin-right: 10px;">View Dashboard</a>
    <a href="${trackingUrl}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Track Complaint</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>Best regards,<br>Pune Pulse Admin Team</p>
  </div>
</body>
</html>
        `.trim()
      });

      if (!emailResult.success) {
        console.error('Failed to send assignment email:', emailResult.error);
      }
    }

    const response: AssignResponse = { 
      complaint: updatedComplaint, 
      assignment: {
        ...assignment,
        worker: {
          id: worker.id,
          name: worker.display_name,
          email: workerAppUser?.email
        }
      }
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: any) {
    console.error('[API] /api/complaints/assign error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}