import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
