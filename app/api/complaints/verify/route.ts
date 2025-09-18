import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { sendEmail } from '@/lib/email';

interface VerifyRequest {
  complaint_id: string;
  report_id?: string;
  action: 'verify' | 'reject';
  note?: string;
}

interface VerifyResponse {
  complaint: any;
  report?: any;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = getAuth(request);
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: appUser, error: userError } = await supabaseAdmin
      .from('app_users')
      .select('id, role, email, display_name')
      .eq('clerk_user_id', clerkUserId)
      .single();

    if (userError || !appUser || appUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body: VerifyRequest = await request.json();
    const { complaint_id, report_id, action, note } = body;

    if (!complaint_id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get complaint details
    const { data: complaint, error: complaintError } = await supabaseAdmin
      .from('complaints')
      .select('*')
      .eq('id', complaint_id)
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    let report = null;
    if (report_id) {
      const { data: reportData, error: reportError } = await supabaseAdmin
        .from('worker_reports')
        .select('*')
        .eq('id', report_id)
        .eq('complaint_id', complaint_id)
        .single();

      if (reportError) {
        console.error('Report fetch error:', reportError);
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      report = reportData;
    }

    if (action === 'verify') {
      // Update complaint as resolved
    const { data: updatedComplaint, error: updateError } = await supabaseAdmin
      .from('complaints')
        .update({
          status: 'resolved',
          verification_status: 'verified',
          resolved_at: new Date().toISOString(),
          resolved_by_clerk_id: clerkUserId,
          resolution_notes: note || null
        })
      .eq('id', complaint_id)
      .select()
      .single();

    if (updateError) {
      console.error('Complaint update error:', updateError);
        return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
      }

      // Update worker report status if provided
      if (report_id) {
        const { error: reportUpdateError } = await supabaseAdmin
          .from('worker_reports')
          .update({ status: 'reviewed' })
          .eq('id', report_id);

        if (reportUpdateError) {
          console.error('Report update error:', reportUpdateError);
        }
    }

    // Insert audit log
    await supabaseAdmin.from('audit_logs').insert({
      complaint_id,
        actor_clerk_id: clerkUserId,
        actor_app_user_id: appUser.id,
        action: 'verify_resolution',
      payload: {
        report_id: report_id || null,
        note: note || null,
        user_agent: request.headers.get('user-agent') ?? null
      }
    });

      // Send resolved email to reporter
      if (complaint.email) {
        const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/track/${complaint.token}`;
        
        // Get worker report photos for attachment links
        let photoLinks = '';
        if (report && report.photos && report.photos.length > 0) {
          photoLinks = '\n\nWorker Report Photos:\n';
          report.photos.forEach((photoKey: string, index: number) => {
            photoLinks += `${process.env.NEXT_PUBLIC_APP_URL}/api/attachments/public?key=${encodeURIComponent(photoKey)}\n`;
          });
        }

        const emailResult = await sendEmail({
          to: complaint.email,
          cc: process.env.MAIL_REPLY_TO || 'akshay3thakur@gmail.com',
          replyTo: process.env.MAIL_REPLY_TO || 'akshay3thakur@gmail.com',
          subject: `Complaint Resolved - ${complaint.token}`,
          text: `
Great news! Your complaint has been resolved.

Complaint Details:
- Token: ${complaint.token}
- Category: ${complaint.category} - ${complaint.subtype}
- Status: Resolved ✅
- Resolved on: ${new Date().toISOString()}

${complaint.description}

${note ? `Resolution Notes: ${note}` : ''}

Track your complaint: ${trackingUrl}
${photoLinks}

Thank you for helping improve Pune!

Best regards,
Pune Pulse Team
          `.trim(),
          html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Complaint Resolved</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #059669; margin-top: 0;">🎉 Complaint Resolved!</h2>
    <p>Great news! Your complaint has been resolved.</p>
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
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Status:</td>
        <td style="padding: 8px 0; color: #059669; font-weight: bold;">✅ Resolved</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Resolved on:</td>
        <td style="padding: 8px 0;">${new Date().toISOString()}</td>
      </tr>
    </table>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Description</h3>
    <p style="white-space: pre-wrap;">${complaint.description}</p>
  </div>

  ${note ? `
  <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
    <h4 style="margin: 0 0 8px 0; color: #92400e;">Resolution Notes</h4>
    <p style="margin: 0; color: #92400e;">${note}</p>
  </div>
  ` : ''}

  ${report && report.photos && report.photos.length > 0 ? `
  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Worker Report Photos</h3>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px;">
      ${report.photos.map((photoKey: string) => `
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/attachments/public?key=${encodeURIComponent(photoKey)}" target="_blank" style="display: block;">
          <img src="${process.env.NEXT_PUBLIC_APP_URL}/api/attachments/public?key=${encodeURIComponent(photoKey)}" 
               style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #e5e7eb;" />
        </a>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div style="text-align: center; margin: 30px 0;">
    <a href="${trackingUrl}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Resolution</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>Thank you for helping improve Pune!</p>
    <p>Best regards,<br>Pune Pulse Team</p>
  </div>
</body>
</html>
          `.trim()
        });

        if (!emailResult.success) {
          console.error('Failed to send resolution email:', emailResult.error);
        }
      }

      const response: VerifyResponse = { 
        complaint: updatedComplaint,
        report: report ? { ...report, status: 'reviewed' } : null
      };

      return NextResponse.json(response, { status: 200 });

    } else if (action === 'reject') {
      // Update complaint back to in_progress
      const { data: updatedComplaint, error: updateError } = await supabaseAdmin
        .from('complaints')
        .update({
          verification_status: 'rejected',
          status: 'in_progress'
        })
        .eq('id', complaint_id)
        .select()
        .single();

      if (updateError) {
        console.error('Complaint update error:', updateError);
        return NextResponse.json({ error: 'Failed to update complaint' }, { status: 500 });
      }

      // Update worker report status if provided
      if (report_id) {
        const { error: reportUpdateError } = await supabaseAdmin
          .from('worker_reports')
          .update({ status: 'rejected' })
          .eq('id', report_id);

        if (reportUpdateError) {
          console.error('Report update error:', reportUpdateError);
        }
      }

      // Insert audit log
      await supabaseAdmin.from('audit_logs').insert({
        complaint_id,
        actor_clerk_id: clerkUserId,
        actor_app_user_id: appUser.id,
        action: 'reject_resolution',
        payload: {
          report_id: report_id || null,
          note: note || null,
          user_agent: request.headers.get('user-agent') ?? null
        }
      });

      // Notify worker via email if they have an email
      if (report && report.worker_clerk_id) {
        const { data: workerAppUser } = await supabaseAdmin
          .from('app_users')
          .select('email, display_name')
          .eq('clerk_user_id', report.worker_clerk_id)
          .single();

        if (workerAppUser?.email) {
          const emailResult = await sendEmail({
            to: workerAppUser.email,
            cc: process.env.MAIL_REPLY_TO || 'akshay3thakur@gmail.com',
            replyTo: process.env.MAIL_REPLY_TO || 'akshay3thakur@gmail.com',
            subject: `Report Rejected - ${complaint.token}`,
            text: `
Hello ${workerAppUser.display_name},

Your report for complaint ${complaint.token} has been rejected and requires additional work.

${note ? `Admin Note: ${note}` : ''}

Please review the complaint and submit an updated report.

Best regards,
Pune Pulse Admin Team
            `.trim(),
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Report Rejected</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #dc2626; margin-top: 0;">Report Rejected</h2>
    <p>Hello ${workerAppUser.display_name},</p>
    <p>Your report for complaint ${complaint.token} has been rejected and requires additional work.</p>
  </div>

  ${note ? `
  <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
    <h4 style="margin: 0 0 8px 0; color: #92400e;">Admin Note</h4>
    <p style="margin: 0; color: #92400e;">${note}</p>
  </div>
  ` : ''}

  <div style="text-align: center; margin: 30px 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL}/worker/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Dashboard</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>Best regards,<br>Pune Pulse Admin Team</p>
  </div>
</body>
</html>
            `.trim()
          });

          if (!emailResult.success) {
            console.error('Failed to send rejection email:', emailResult.error);
          }
        }
    }

    const response: VerifyResponse = { 
      complaint: updatedComplaint,
        report: report ? { ...report, status: 'rejected' } : null
    };

    return NextResponse.json(response, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[API] /api/complaints/verify error', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}