// Email service using Resend
// In development, emails are logged to console

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'HomeTrace <noreply@hometrace.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  // In development without API key, log to console
  if (!RESEND_API_KEY || process.env.NODE_ENV === 'development') {
    console.log('=== Email (Development Mode) ===')
    console.log(`To: ${options.to}`)
    console.log(`Subject: ${options.subject}`)
    console.log(`Body: ${options.text || 'See HTML'}`)
    console.log('================================')
    return { success: true, messageId: 'dev-' + Date.now() }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, messageId: data.id }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<EmailResult> {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px;">🏠</span>
          </div>
          <h1 style="color: #1f2937; font-size: 24px; margin: 0;">HomeTrace</h1>
        </div>

        <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">Reset Your Password</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Hi ${name},
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          We received a request to reset your password. Click the button below to create a new password:
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Reset Password
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} HomeTrace. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Hi ${name},

We received a request to reset your password. Click the link below to create a new password:

${resetUrl}

This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.

© ${new Date().getFullYear()} HomeTrace. All rights reserved.
  `

  return sendEmail({
    to,
    subject: 'Reset Your Password - HomeTrace',
    html,
    text,
  })
}

/**
 * Send invite email to buyer
 */
export async function sendInviteEmail(
  to: string,
  inviterName: string,
  inviteToken: string
): Promise<EmailResult> {
  const inviteUrl = `${APP_URL}/invite/${inviteToken}`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px;">🏠</span>
          </div>
          <h1 style="color: #1f2937; font-size: 24px; margin: 0;">HomeTrace</h1>
        </div>

        <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">You're Invited!</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join HomeTrace - the smart way to find your perfect home.
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          With HomeTrace, you can:
        </p>

        <ul style="color: #4b5563; font-size: 16px; line-height: 1.8;">
          <li>Record your impressions during home visits</li>
          <li>Get AI-powered analysis and recommendations</li>
          <li>Compare homes side by side</li>
          <li>Work seamlessly with your realtor</li>
        </ul>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Accept Invitation
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          This invitation will expire in 7 days.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} HomeTrace. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
${inviterName} has invited you to join HomeTrace!

HomeTrace helps you find your perfect home by:
- Recording your impressions during home visits
- Getting AI-powered analysis and recommendations
- Comparing homes side by side
- Working seamlessly with your realtor

Accept your invitation: ${inviteUrl}

This invitation will expire in 7 days.

© ${new Date().getFullYear()} HomeTrace. All rights reserved.
  `

  return sendEmail({
    to,
    subject: `${inviterName} invited you to HomeTrace`,
    html,
    text,
  })
}

/**
 * Send welcome email after registration
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  role: 'BUYER' | 'REALTOR'
): Promise<EmailResult> {
  const dashboardUrl = `${APP_URL}/${role.toLowerCase()}`

  const roleMessage = role === 'BUYER'
    ? 'Start by adding homes to your list and recording your impressions during visits.'
    : 'Start by inviting your clients and adding homes for them to explore.'

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="color: white; font-size: 24px;">🏠</span>
          </div>
          <h1 style="color: #1f2937; font-size: 24px; margin: 0;">Welcome to HomeTrace!</h1>
        </div>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Hi ${name},
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Your account has been created successfully. ${roleMessage}
        </p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            Go to Dashboard
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          © ${new Date().getFullYear()} HomeTrace. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `

  const text = `
Hi ${name},

Welcome to HomeTrace! Your account has been created successfully.

${roleMessage}

Go to your dashboard: ${dashboardUrl}

© ${new Date().getFullYear()} HomeTrace. All rights reserved.
  `

  return sendEmail({
    to,
    subject: 'Welcome to HomeTrace!',
    html,
    text,
  })
}
