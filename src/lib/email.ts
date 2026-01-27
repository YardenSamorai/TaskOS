import { Resend } from "resend";
import { shouldSendEmailNotification } from "./actions/notification-preferences";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://task-os.app";

// Email template base
const emailTemplate = (content: string, preheader?: string) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${preheader ? `<meta name="x-apple-disable-message-reformatting">` : ''}
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
    ${preheader ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ''}
    <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
      
      <!-- Header -->
      <div style="background-color: #4f46e5; padding: 32px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">TaskOS</h1>
      </div>
      
      <!-- Content -->
      <div style="padding: 32px;">
        ${content}
      </div>
      
      <!-- Footer -->
      <div style="padding: 24px 32px; background: #fafafa; border-top: 1px solid #e4e4e7;">
        <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
          You received this email because of your notification settings.<br>
          <a href="${APP_URL}/en/app/account" style="color: #4f46e5;">Manage notification preferences</a>
        </p>
      </div>
      
    </div>
  </body>
</html>
`;

// Button component
const emailButton = (text: string, href: string) => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
  <tr>
    <td align="center">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="background-color: #4f46e5; border-radius: 8px; padding: 14px 32px;">
            <a href="${href}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              ${text}
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
`;

interface SendInvitationEmailParams {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteLink: string;
  role: string;
}

export const sendInvitationEmail = async ({
  to,
  workspaceName,
  inviterName,
  inviteLink,
  role,
}: SendInvitationEmailParams) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "TaskOS <noreply@task-os.app>",
      to: [to],
      subject: `You're invited to join ${workspaceName} on TaskOS`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background-color: #4f46e5; padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">TaskOS</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">You're Invited! 🎉</h2>
                
                <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
                  <strong>${inviterName}</strong> has invited you to join <strong>${workspaceName}</strong> as a <strong>${role}</strong>.
                </p>
                
                <!-- Button using table for better email client support -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background-color: #4f46e5; border-radius: 8px; padding: 14px 32px;">
                            <a href="${inviteLink}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                              Accept Invitation
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <p style="color: #71717a; font-size: 14px; margin: 0 0 16px 0;">
                  Or copy and paste this link in your browser:
                </p>
                <p style="color: #4f46e5; font-size: 12px; word-break: break-all; margin: 0; padding: 12px; background: #f4f4f5; border-radius: 6px;">
                  ${inviteLink}
                </p>
              </div>
              
              <!-- Footer -->
              <div style="padding: 24px 32px; background: #fafafa; border-top: 1px solid #e4e4e7;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                  This invitation will expire in 7 days.<br>
                  If you didn't expect this email, you can safely ignore it.
                </p>
              </div>
              
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email send error:", error);
    return { success: false, error: "Failed to send email" };
  }
};

interface SendPasswordResetEmailParams {
  to: string;
  userName: string;
  resetLink: string;
}

export const sendPasswordResetEmail = async ({
  to,
  userName,
  resetLink,
}: SendPasswordResetEmailParams) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "TaskOS <noreply@task-os.app>",
      to: [to],
      subject: "Reset your TaskOS password",
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
            <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              
              <!-- Header -->
              <div style="background-color: #4f46e5; padding: 32px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">TaskOS</h1>
              </div>
              
              <!-- Content -->
              <div style="padding: 32px;">
                <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">Reset your password</h2>
                
                <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
                  Hi <strong>${userName}</strong>,
                </p>
                
                <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
                  We received a request to reset the password for your TaskOS account. Click the button below to choose a new password.
                </p>
                
                <!-- Button using table for better email client support -->
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                  <tr>
                    <td align="center">
                      <table cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td style="background-color: #4f46e5; border-radius: 8px; padding: 14px 32px;">
                            <a href="${resetLink}" style="color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                
                <p style="color: #71717a; font-size: 14px; margin: 0 0 16px 0;">
                  Or copy and paste this link in your browser:
                </p>
                <p style="color: #4f46e5; font-size: 12px; word-break: break-all; margin: 0; padding: 12px; background: #f4f4f5; border-radius: 6px;">
                  ${resetLink}
                </p>
              </div>
              
              <!-- Footer -->
              <div style="padding: 24px 32px; background: #fafafa; border-top: 1px solid #e4e4e7;">
                <p style="color: #a1a1aa; font-size: 12px; margin: 0; text-align: center;">
                  This link will expire in 1 hour.<br>
                  If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
              
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error("Failed to send password reset email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Password reset email error:", error);
    return { success: false, error: "Failed to send email" };
  }
};

// ==================== NOTIFICATION EMAILS ====================

interface TaskAssignedEmailParams {
  userId: string;
  to: string;
  userName: string;
  taskTitle: string;
  workspaceName: string;
  assignedBy: string;
  taskLink: string;
  dueDate?: string;
}

export const sendTaskAssignedEmail = async ({
  userId,
  to,
  userName,
  taskTitle,
  workspaceName,
  assignedBy,
  taskLink,
  dueDate,
}: TaskAssignedEmailParams) => {
  // Check if user wants this notification
  const shouldSend = await shouldSendEmailNotification(userId, "taskAssigned");
  if (!shouldSend) return { success: true, skipped: true };

  try {
    const content = `
      <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">New Task Assigned 📋</h2>
      
      <p style="color: #52525b; margin: 0 0 8px 0; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>
      
      <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
        <strong>${assignedBy}</strong> assigned you a new task in <strong>${workspaceName}</strong>:
      </p>
      
      <div style="padding: 16px; background: #f4f4f5; border-radius: 8px; margin-bottom: 16px;">
        <p style="color: #18181b; margin: 0; font-weight: 600; font-size: 16px;">${taskTitle}</p>
        ${dueDate ? `<p style="color: #71717a; margin: 8px 0 0 0; font-size: 14px;">📅 Due: ${dueDate}</p>` : ''}
      </div>
      
      ${emailButton("View Task", taskLink)}
    `;

    const { data, error } = await resend.emails.send({
      from: "TaskOS <noreply@task-os.app>",
      to: [to],
      subject: `New task assigned: ${taskTitle}`,
      html: emailTemplate(content, `${assignedBy} assigned you a task: ${taskTitle}`),
    });

    if (error) {
      console.error("Failed to send task assigned email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Task assigned email error:", error);
    return { success: false, error: "Failed to send email" };
  }
};

interface TaskDueSoonEmailParams {
  userId: string;
  to: string;
  userName: string;
  taskTitle: string;
  workspaceName: string;
  taskLink: string;
  dueDate: string;
  hoursUntilDue: number;
}

export const sendTaskDueSoonEmail = async ({
  userId,
  to,
  userName,
  taskTitle,
  workspaceName,
  taskLink,
  dueDate,
  hoursUntilDue,
}: TaskDueSoonEmailParams) => {
  const shouldSend = await shouldSendEmailNotification(userId, "taskDueSoon");
  if (!shouldSend) return { success: true, skipped: true };

  try {
    const urgencyText = hoursUntilDue <= 1 
      ? "due in less than an hour" 
      : hoursUntilDue <= 24 
      ? `due in ${hoursUntilDue} hours` 
      : "due soon";

    const content = `
      <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">Task Due Soon ⏰</h2>
      
      <p style="color: #52525b; margin: 0 0 8px 0; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>
      
      <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
        Your task in <strong>${workspaceName}</strong> is ${urgencyText}:
      </p>
      
      <div style="padding: 16px; background: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
        <p style="color: #18181b; margin: 0; font-weight: 600; font-size: 16px;">${taskTitle}</p>
        <p style="color: #92400e; margin: 8px 0 0 0; font-size: 14px; font-weight: 600;">📅 Due: ${dueDate}</p>
      </div>
      
      ${emailButton("View Task", taskLink)}
    `;

    const { data, error } = await resend.emails.send({
      from: "TaskOS <noreply@task-os.app>",
      to: [to],
      subject: `⏰ Reminder: "${taskTitle}" is ${urgencyText}`,
      html: emailTemplate(content, `Your task "${taskTitle}" is ${urgencyText}`),
    });

    if (error) {
      console.error("Failed to send task due soon email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Task due soon email error:", error);
    return { success: false, error: "Failed to send email" };
  }
};

interface NewCommentEmailParams {
  userId: string;
  to: string;
  userName: string;
  taskTitle: string;
  workspaceName: string;
  commenterName: string;
  commentText: string;
  taskLink: string;
}

export const sendNewCommentEmail = async ({
  userId,
  to,
  userName,
  taskTitle,
  workspaceName,
  commenterName,
  commentText,
  taskLink,
}: NewCommentEmailParams) => {
  const shouldSend = await shouldSendEmailNotification(userId, "comments");
  if (!shouldSend) return { success: true, skipped: true };

  try {
    const truncatedComment = commentText.length > 200 
      ? commentText.substring(0, 200) + "..." 
      : commentText;

    const content = `
      <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">New Comment 💬</h2>
      
      <p style="color: #52525b; margin: 0 0 8px 0; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>
      
      <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
        <strong>${commenterName}</strong> commented on <strong>${taskTitle}</strong> in <strong>${workspaceName}</strong>:
      </p>
      
      <div style="padding: 16px; background: #f4f4f5; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 16px;">
        <p style="color: #52525b; margin: 0; font-style: italic; line-height: 1.6;">"${truncatedComment}"</p>
      </div>
      
      ${emailButton("View Comment", taskLink)}
    `;

    const { data, error } = await resend.emails.send({
      from: "TaskOS <noreply@task-os.app>",
      to: [to],
      subject: `${commenterName} commented on "${taskTitle}"`,
      html: emailTemplate(content, `${commenterName}: "${truncatedComment}"`),
    });

    if (error) {
      console.error("Failed to send comment email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Comment email error:", error);
    return { success: false, error: "Failed to send email" };
  }
};

interface MentionEmailParams {
  userId: string;
  to: string;
  userName: string;
  taskTitle: string;
  workspaceName: string;
  mentionedBy: string;
  commentText: string;
  taskLink: string;
}

export const sendMentionEmail = async ({
  userId,
  to,
  userName,
  taskTitle,
  workspaceName,
  mentionedBy,
  commentText,
  taskLink,
}: MentionEmailParams) => {
  const shouldSend = await shouldSendEmailNotification(userId, "mentions");
  if (!shouldSend) return { success: true, skipped: true };

  try {
    const truncatedComment = commentText.length > 200 
      ? commentText.substring(0, 200) + "..." 
      : commentText;

    const content = `
      <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">You were mentioned! 📣</h2>
      
      <p style="color: #52525b; margin: 0 0 8px 0; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>
      
      <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
        <strong>${mentionedBy}</strong> mentioned you in a comment on <strong>${taskTitle}</strong> in <strong>${workspaceName}</strong>:
      </p>
      
      <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; border-left: 4px solid #10b981; margin-bottom: 16px;">
        <p style="color: #52525b; margin: 0; font-style: italic; line-height: 1.6;">"${truncatedComment}"</p>
      </div>
      
      ${emailButton("View Comment", taskLink)}
    `;

    const { data, error } = await resend.emails.send({
      from: "TaskOS <noreply@task-os.app>",
      to: [to],
      subject: `${mentionedBy} mentioned you in "${taskTitle}"`,
      html: emailTemplate(content, `${mentionedBy} mentioned you: "${truncatedComment}"`),
    });

    if (error) {
      console.error("Failed to send mention email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Mention email error:", error);
    return { success: false, error: "Failed to send email" };
  }
};

interface TaskCompletedEmailParams {
  userId: string;
  to: string;
  userName: string;
  taskTitle: string;
  workspaceName: string;
  completedBy: string;
  taskLink: string;
}

export const sendTaskCompletedEmail = async ({
  userId,
  to,
  userName,
  taskTitle,
  workspaceName,
  completedBy,
  taskLink,
}: TaskCompletedEmailParams) => {
  const shouldSend = await shouldSendEmailNotification(userId, "taskCompleted");
  if (!shouldSend) return { success: true, skipped: true };

  try {
    const content = `
      <h2 style="color: #18181b; margin: 0 0 16px 0; font-size: 20px;">Task Completed! ✅</h2>
      
      <p style="color: #52525b; margin: 0 0 8px 0; line-height: 1.6;">
        Hi <strong>${userName}</strong>,
      </p>
      
      <p style="color: #52525b; margin: 0 0 24px 0; line-height: 1.6;">
        Great news! <strong>${completedBy}</strong> marked a task as complete in <strong>${workspaceName}</strong>:
      </p>
      
      <div style="padding: 16px; background: #ecfdf5; border-radius: 8px; margin-bottom: 16px; text-align: center;">
        <span style="font-size: 32px;">🎉</span>
        <p style="color: #059669; margin: 8px 0 0 0; font-weight: 600; font-size: 16px;">${taskTitle}</p>
      </div>
      
      ${emailButton("View Task", taskLink)}
    `;

    const { data, error } = await resend.emails.send({
      from: "TaskOS <noreply@task-os.app>",
      to: [to],
      subject: `✅ Task completed: ${taskTitle}`,
      html: emailTemplate(content, `${completedBy} completed "${taskTitle}"`),
    });

    if (error) {
      console.error("Failed to send task completed email:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Task completed email error:", error);
    return { success: false, error: "Failed to send email" };
  }
};
