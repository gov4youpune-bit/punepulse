import nodemailer from 'nodemailer';

// Environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const MAIL_FROM = process.env.MAIL_FROM || 'Pune Pulse <noreply@punepulse.dev>';
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || 'noreply@punepulse.dev';
const ADMIN_NOTIFICATION_EMAILS = process.env.ADMIN_NOTIFICATION_EMAILS?.split(',').map(email => email.trim()).filter(Boolean) || [];
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const DRY_RUN_EMAIL = process.env.DRY_RUN_EMAIL === 'true';

// Create transporter
let transporter: nodemailer.Transporter | null = null;

function createTransporter() {
  if (transporter) return transporter;

  // Check if SMTP config is available
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log('[EMAIL] SMTP configuration missing, using dry run mode');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return transporter;
}

// Email sending function
export async function sendEmail({
  to,
  cc,
  bcc,
  subject,
  text,
  html,
  from = MAIL_FROM,
  replyTo = MAIL_REPLY_TO,
}: {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  text: string;
  html: string;
  from?: string;
  replyTo?: string;
}): Promise<{ success: boolean; info?: any; dryRun?: boolean; error?: string }> {
  try {
    const transport = createTransporter();
    
    if (!transport || DRY_RUN_EMAIL) {
      // Dry run mode - log to console
      console.log('[EMAIL DRY RUN]');
      console.log('To:', Array.isArray(to) ? to.join(', ') : to);
      console.log('Subject:', subject);
      console.log('Text:', text);
      console.log('HTML:', html);
      console.log('---');
      return { success: true, dryRun: true };
    }

    const mailOptions = {
      from,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: cc ? (Array.isArray(cc) ? cc.join(', ') : cc) : undefined,
      bcc: bcc ? (Array.isArray(bcc) ? bcc.join(', ') : bcc) : undefined,
      subject,
      text,
      html,
      replyTo,
    };

    const info = await transport.sendMail(mailOptions);
    console.log('[EMAIL] Sent successfully:', info.messageId);
    return { success: true, info };
  } catch (error) {
    console.error('[EMAIL] Send failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Complaint notification types
type NotificationType = 'complaint_created' | 'complaint_submitted_to_portal' | 'complaint_status_changed' | 'complaint_verified';

interface ComplaintData {
  id: string;
  token: string;
  category: string;
  subtype: string;
  description: string;
  status: string;
  urgency?: string;
  created_at: string;
  email?: string;
  attachments?: string[];
  location_text?: string;
}

interface NotificationExtra {
  oldStatus?: string;
  newStatus?: string;
  portal_token?: string;
  portal_url?: string;
}

// Template functions
function getTrackingUrl(token: string): string {
  return `${NEXT_PUBLIC_APP_URL}/track/${token}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusDisplay(status: string): string {
  const statusMap: Record<string, string> = {
    'submitted': 'Submitted',
    'in_progress': 'In Progress',
    'assigned': 'Assigned',
    'pending_verification': 'Pending Verification',
    'resolved': 'Resolved',
    'rejected': 'Rejected',
  };
  return statusMap[status] || status;
}

function getUrgencyDisplay(urgency?: string): string {
  const urgencyMap: Record<string, string> = {
    'high': 'High Priority',
    'medium': 'Medium Priority',
    'low': 'Low Priority',
  };
  return urgencyMap[urgency || 'medium'] || 'Medium Priority';
}

// Email templates
function getComplaintCreatedTemplate(complaint: ComplaintData) {
  const trackingUrl = getTrackingUrl(complaint.token);
  const formattedDate = formatDate(complaint.created_at);
  const urgencyDisplay = getUrgencyDisplay(complaint.urgency);

  const subject = `Complaint Submitted - ${complaint.token}`;
  
  const text = `
Your complaint has been successfully submitted to Pune Municipal Corporation.

Complaint Details:
- Token: ${complaint.token}
- Category: ${complaint.category} - ${complaint.subtype}
- Priority: ${urgencyDisplay}
- Submitted: ${formattedDate}
- Status: ${getStatusDisplay(complaint.status)}

${complaint.description}

Track your complaint: ${trackingUrl}

Thank you for helping improve Pune!

Best regards,
Pune Pulse Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complaint Submitted</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2563eb; margin-top: 0;">Complaint Submitted Successfully</h2>
    <p>Your complaint has been successfully submitted to Pune Municipal Corporation.</p>
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
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Priority:</td>
        <td style="padding: 8px 0;">${urgencyDisplay}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Submitted:</td>
        <td style="padding: 8px 0;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Status:</td>
        <td style="padding: 8px 0; color: #059669;">${getStatusDisplay(complaint.status)}</td>
      </tr>
    </table>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Description</h3>
    <p style="white-space: pre-wrap;">${complaint.description}</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Track Your Complaint</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>Thank you for helping improve Pune!</p>
    <p>Best regards,<br>Pune Pulse Team</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

function getComplaintSubmittedToPortalTemplate(complaint: ComplaintData, extra: NotificationExtra) {
  const trackingUrl = getTrackingUrl(complaint.token);
  const formattedDate = formatDate(complaint.created_at);

  const subject = `Complaint Submitted to PMC Portal - ${complaint.token}`;
  
  const text = `
Your complaint has been submitted to the Pune Municipal Corporation portal.

Complaint Details:
- Token: ${complaint.token}
- Category: ${complaint.category} - ${complaint.subtype}
- Submitted: ${formattedDate}
- Portal Status: Submitted

${complaint.description}

${extra.portal_token ? `Portal Reference: ${extra.portal_token}` : ''}
${extra.portal_url ? `Portal Link: ${extra.portal_url}` : ''}

Track your complaint: ${trackingUrl}

Thank you for your patience!

Best regards,
Pune Pulse Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complaint Submitted to Portal</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2563eb; margin-top: 0;">Complaint Submitted to PMC Portal</h2>
    <p>Your complaint has been successfully submitted to the Pune Municipal Corporation portal.</p>
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
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Submitted:</td>
        <td style="padding: 8px 0;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Portal Status:</td>
        <td style="padding: 8px 0; color: #059669;">Submitted</td>
      </tr>
    </table>
  </div>

  ${extra.portal_token ? `
  <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
    <p style="margin: 0; color: #92400e;"><strong>Portal Reference:</strong> ${extra.portal_token}</p>
  </div>
  ` : ''}

  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Description</h3>
    <p style="white-space: pre-wrap;">${complaint.description}</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Track Your Complaint</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>Thank you for your patience!</p>
    <p>Best regards,<br>Pune Pulse Team</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

function getComplaintStatusChangedTemplate(complaint: ComplaintData, extra: NotificationExtra) {
  const trackingUrl = getTrackingUrl(complaint.token);
  const formattedDate = formatDate(complaint.created_at);

  const subject = `Complaint Status Updated - ${complaint.token}`;
  
  const text = `
Your complaint status has been updated.

Complaint Details:
- Token: ${complaint.token}
- Category: ${complaint.category} - ${complaint.subtype}
- Submitted: ${formattedDate}
- Status Changed: ${getStatusDisplay(extra.oldStatus || '')} → ${getStatusDisplay(extra.newStatus || complaint.status)}

${complaint.description}

Track your complaint: ${trackingUrl}

Thank you for your patience!

Best regards,
Pune Pulse Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complaint Status Updated</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #059669; margin-top: 0;">Complaint Status Updated</h2>
    <p>Your complaint status has been updated.</p>
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
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Submitted:</td>
        <td style="padding: 8px 0;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Status Changed:</td>
        <td style="padding: 8px 0;">
          <span style="color: #6b7280;">${getStatusDisplay(extra.oldStatus || '')}</span>
          <span style="margin: 0 8px; color: #6b7280;">→</span>
          <span style="color: #059669; font-weight: bold;">${getStatusDisplay(extra.newStatus || complaint.status)}</span>
        </td>
      </tr>
    </table>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Description</h3>
    <p style="white-space: pre-wrap;">${complaint.description}</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${trackingUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Track Your Complaint</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>Thank you for your patience!</p>
    <p>Best regards,<br>Pune Pulse Team</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

function getComplaintVerifiedTemplate(complaint: ComplaintData) {
  const trackingUrl = getTrackingUrl(complaint.token);
  const formattedDate = formatDate(complaint.created_at);

  const subject = `Complaint Resolved - ${complaint.token}`;
  
  const text = `
Great news! Your complaint has been resolved.

Complaint Details:
- Token: ${complaint.token}
- Category: ${complaint.category} - ${complaint.subtype}
- Submitted: ${formattedDate}
- Status: Resolved ✅

${complaint.description}

Track your complaint: ${trackingUrl}

Thank you for helping improve Pune!

Best regards,
Pune Pulse Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Submitted:</td>
        <td style="padding: 8px 0;">${formattedDate}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold; color: #6b7280;">Status:</td>
        <td style="padding: 8px 0; color: #059669; font-weight: bold;">✅ Resolved</td>
      </tr>
    </table>
  </div>

  <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
    <h3 style="margin-top: 0; color: #374151;">Description</h3>
    <p style="white-space: pre-wrap;">${complaint.description}</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${trackingUrl}" style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Resolution</a>
  </div>

  <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center; color: #6b7280; font-size: 14px;">
    <p>Thank you for helping improve Pune!</p>
    <p>Best regards,<br>Pune Pulse Team</p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

// Main notification function
export async function sendComplaintNotification({
  type,
  complaint,
  extra = {},
}: {
  type: NotificationType;
  complaint: ComplaintData;
  extra?: NotificationExtra;
}): Promise<{ success: boolean; error?: string }> {
  try {
    let template: { subject: string; text: string; html: string };

    switch (type) {
      case 'complaint_created':
        template = getComplaintCreatedTemplate(complaint);
        break;
      case 'complaint_submitted_to_portal':
        template = getComplaintSubmittedToPortalTemplate(complaint, extra);
        break;
      case 'complaint_status_changed':
        template = getComplaintStatusChangedTemplate(complaint, extra);
        break;
      case 'complaint_verified':
        template = getComplaintVerifiedTemplate(complaint);
        break;
      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const results = [];

    // Send to reporter if email is provided
    if (complaint.email) {
      const reporterResult = await sendEmail({
        to: complaint.email,
        cc: MAIL_REPLY_TO, // CC admin
        subject: template.subject,
        text: template.text,
        html: template.html,
      });
      results.push(reporterResult);
    }

    // Send separate admin notification if no complainant email
    if (!complaint.email && ADMIN_NOTIFICATION_EMAILS.length > 0) {
      const adminSubject = `[ADMIN] ${template.subject}`;
      const adminResult = await sendEmail({
        to: ADMIN_NOTIFICATION_EMAILS,
        subject: adminSubject,
        text: template.text,
        html: template.html,
      });
      results.push(adminResult);
    }

    // Check if any email failed
    const failedResults = results.filter(result => !result.success);
    if (failedResults.length > 0) {
      console.error('[EMAIL] Some notifications failed:', failedResults);
      return { success: false, error: 'Some email notifications failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('[EMAIL] Notification failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
