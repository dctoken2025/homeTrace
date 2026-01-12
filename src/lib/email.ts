// Email service using Resend
// In development, emails are logged to console

import { getConfig, CONFIG_KEYS, markConfigUsed } from './config'

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

const EMAIL_FROM = process.env.EMAIL_FROM || 'HomeTrace <noreply@hometrace.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

/**
 * Send an email using Resend API
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const resendApiKey = await getConfig(CONFIG_KEYS.RESEND_API_KEY)

  // In development without API key, log to console
  if (!resendApiKey || process.env.NODE_ENV === 'development') {
    console.log('=== Email (Development Mode) ===')
    console.log(`To: ${options.to}`)
    console.log(`Subject: ${options.subject}`)
    console.log(`Body: ${options.text || 'See HTML'}`)
    console.log('================================')
    return { success: true, messageId: 'dev-' + Date.now() }
  }

  try {
    // Mark as used for tracking
    await markConfigUsed(CONFIG_KEYS.RESEND_API_KEY).catch(() => {})

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
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
  const inviteUrl = `${APP_URL}/accept-invite?token=${inviteToken}`

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

/**
 * Send visit suggestion email to buyer
 */
export async function sendVisitSuggestionEmail(options: {
  buyerEmail: string
  buyerName: string
  realtorName: string
  houseAddress: string
  suggestedAt: Date
  message?: string
}): Promise<EmailResult> {
  const { buyerEmail, buyerName, realtorName, houseAddress, suggestedAt, message } = options
  const calendarUrl = `${APP_URL}/client/calendar`

  const formattedDate = suggestedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = suggestedAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const messageSection = message
    ? `<p style="color: #4b5563; font-size: 16px; line-height: 1.6; background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #10b981;">
        <strong>Message from ${realtorName}:</strong><br>
        "${message}"
      </p>`
    : ''

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

        <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">New Visit Suggestion</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Hi ${buyerName},
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          <strong>${realtorName}</strong> has suggested a visit for you:
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="color: #166534; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">Property</p>
          <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0; font-weight: 500;">${houseAddress}</p>

          <p style="color: #166534; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">Suggested Date & Time</p>
          <p style="color: #1f2937; font-size: 16px; margin: 0;">${formattedDate} at ${formattedTime}</p>
        </div>

        ${messageSection}

        <div style="text-align: center; margin: 30px 0;">
          <a href="${calendarUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            View & Respond
          </a>
        </div>

        <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
          Please respond to this suggestion before 24 hours prior to the suggested time, or it will expire automatically.
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
Hi ${buyerName},

${realtorName} has suggested a visit for you:

Property: ${houseAddress}
Date & Time: ${formattedDate} at ${formattedTime}
${message ? `\nMessage: "${message}"\n` : ''}

View and respond to this suggestion: ${calendarUrl}

Please respond before 24 hours prior to the suggested time, or it will expire automatically.

© ${new Date().getFullYear()} HomeTrace. All rights reserved.
  `

  return sendEmail({
    to: buyerEmail,
    subject: `${realtorName} suggested a visit - ${houseAddress}`,
    html,
    text,
  })
}

/**
 * Send suggestion response email to realtor
 */
export async function sendSuggestionResponseEmail(options: {
  realtorEmail: string
  realtorName: string
  buyerName: string
  houseAddress: string
  suggestedAt: Date
  accepted: boolean
  rejectionReason?: string
}): Promise<EmailResult> {
  const { realtorEmail, realtorName, buyerName, houseAddress, suggestedAt, accepted, rejectionReason } = options
  const scheduleUrl = `${APP_URL}/realtor/schedule`

  const formattedDate = suggestedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = suggestedAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const statusColor = accepted ? '#10b981' : '#ef4444'
  const statusBgColor = accepted ? '#f0fdf4' : '#fef2f2'
  const statusBorderColor = accepted ? '#bbf7d0' : '#fecaca'
  const statusText = accepted ? 'ACCEPTED' : 'DECLINED'
  const statusEmoji = accepted ? '✅' : '❌'

  const rejectionSection = !accepted && rejectionReason
    ? `<p style="color: #4b5563; font-size: 16px; line-height: 1.6; background: #f9fafb; padding: 16px; border-radius: 8px; border-left: 4px solid #ef4444;">
        <strong>Reason:</strong><br>
        "${rejectionReason}"
      </p>`
    : ''

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

        <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 16px;">${statusEmoji} Visit Suggestion ${statusText}</h2>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          Hi ${realtorName},
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
          <strong>${buyerName}</strong> has <strong style="color: ${statusColor};">${accepted ? 'accepted' : 'declined'}</strong> your visit suggestion.
        </p>

        <div style="background: ${statusBgColor}; border: 1px solid ${statusBorderColor}; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="color: ${statusColor}; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">Property</p>
          <p style="color: #1f2937; font-size: 16px; margin: 0 0 16px 0; font-weight: 500;">${houseAddress}</p>

          <p style="color: ${statusColor}; font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; font-weight: 600;">${accepted ? 'Scheduled For' : 'Originally Suggested'}</p>
          <p style="color: #1f2937; font-size: 16px; margin: 0;">${formattedDate} at ${formattedTime}</p>
        </div>

        ${rejectionSection}

        ${accepted
          ? `<p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              The visit has been added to the schedule. You can view it in your dashboard.
            </p>`
          : `<p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              You can suggest a different time if needed.
            </p>`
        }

        <div style="text-align: center; margin: 30px 0;">
          <a href="${scheduleUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            View Schedule
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
Hi ${realtorName},

${buyerName} has ${accepted ? 'accepted' : 'declined'} your visit suggestion.

Property: ${houseAddress}
${accepted ? 'Scheduled For' : 'Originally Suggested'}: ${formattedDate} at ${formattedTime}
${!accepted && rejectionReason ? `\nReason: "${rejectionReason}"\n` : ''}

${accepted
  ? 'The visit has been added to the schedule.'
  : 'You can suggest a different time if needed.'
}

View your schedule: ${scheduleUrl}

© ${new Date().getFullYear()} HomeTrace. All rights reserved.
  `

  return sendEmail({
    to: realtorEmail,
    subject: `${statusEmoji} ${buyerName} ${accepted ? 'accepted' : 'declined'} your visit suggestion`,
    html,
    text,
  })
}
