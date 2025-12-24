
'use server';

import { Resend } from 'resend';

/*
* IMPORTANT: This file uses the RESEND_API_KEY from your .env.local file.
* Ensure you have set it up correctly.
*/

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Use a formatted string to set the display name for the sender.
const FROM_EMAIL = 'Academic Helper <academichelper@academichelper.lk>'; 

/**
 * Sends a notification that a user has received an offline message.
 * @param recipientEmail The email address of the recipient.
 * @param senderName The name of the person who sent the message.
 * @param chatLink A direct link to the chat conversation.
 */
export async function sendOfflineNotificationEmail(recipientEmail: string, senderName: string, chatLink: string) {
  console.log(`[EMAIL_LOG] Attempting to send offline notification to: ${recipientEmail}`);

  if (!resend) {
    console.warn("[EMAIL_LOG] Resend is not configured. Skipping offline notification email. Please set RESEND_API_KEY in your .env.local file.");
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: recipientEmail,
      subject: `You have a new message from ${senderName} on Academic Helper`,
      html: `<p>You've received a new message from <strong>${senderName}</strong> while you were offline.</p><p>You can view the message by clicking the link below:</p><p><a href="${chatLink}">View Conversation</a></p>`,
    });

    if (error) {
      console.error("[EMAIL_LOG] Resend API returned an error:", JSON.stringify(error, null, 2));
      return;
    }
    
    console.log(`[EMAIL_LOG] Successfully sent email to ${recipientEmail}. Resend ID: ${data?.id}`);

  } catch (error) {
    console.error("[EMAIL_LOG] CRITICAL: Failed to send offline notification email. An unexpected error occurred:", JSON.stringify(error, null, 2));
  }
}
