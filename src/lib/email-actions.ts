"use server";

import { doc, getDoc, updateDoc } from "firebase/firestore";
import { adminDb } from "./firebase-admin";
import { sendOfflineNotificationEmail } from "./email";
import type { UserData } from "@/types";

/**
 * Checks if a user is offline and sends a notification email if they haven't been notified for this session.
 * This is a server action and should only be called from other server-side code or trusted actions.
 * @param recipientId The UID of the message recipient.
 * @param senderName The name of the message sender.
 * @param chatType The type of chat ('assignment' or 'support').
 * @param chatId The ID of the assignment or support chat.
 */
export async function sendThrottledNotificationEmail(
  recipientId: string,
  senderName: string,
  chatType: "assignment" | "support",
  chatId: string
) {
  if (!recipientId) return;

  try {
    const userRef = adminDb.collection("users").doc(recipientId);
    // Use the get() method to fetch the document snapshot
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.log(`User ${recipientId} not found. Cannot send email.`);
      return;
    }

    const userData = userSnap.data() as UserData;

    // Send email only if the user is offline AND hasn't been notified for this offline session yet.
    if (!userData.isOnline && !userData.notifiedForOfflineMessage) {
      const baseUrl = process.env.BASE_URL || "http://localhost:3000";
      const chatLink =
        chatType === "assignment"
          ? `${baseUrl}/assignment/${chatId}`
          : `${baseUrl}/support`;

      // Send the email
      await sendOfflineNotificationEmail(userData.email, senderName, chatLink);

      // Mark that a notification has been sent for this session.
      // This flag will be reset when the user next comes online.
      await userRef.update({ notifiedForOfflineMessage: true });

      console.log(`Offline notification sent to ${userData.email}`);
    }
  } catch (error) {
    console.error("Error in sendThrottledNotificationEmail:", error);
    // We don't rethrow errors here to prevent crashing the chat functionality.
  }
}
