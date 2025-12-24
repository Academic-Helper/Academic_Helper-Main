
'use server';

import { doc, getDoc, runTransaction, collection, query, where, getDocs, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createAdminNotification, createNotification } from "./notifications";
import type { UserData, PromotionStatus } from "@/types";

export async function processVerifiedUserReferral(newUserId: string) {
  try {
    const newUserRef = doc(db, "users", newUserId);
    
    // We get the user doc outside the transaction to check if we even need to proceed.
    const newUserSnap = await getDoc(newUserRef);
    if (!newUserSnap.exists()) {
        console.warn(`processVerifiedUserReferral: New user ${newUserId} not found.`);
        return { success: false, error: "New user not found." };
    }

    const newUserDoc = newUserSnap.data() as UserData;
    
    // If there's no referral code or it's already been credited, we're done.
    if (!newUserDoc.referredBy || newUserDoc.emailVerificationCredited) {
        return { success: true, message: "No referral to process or already processed." };
    }

    // Find the referrer by their code (ahUserId)
    const q = query(collection(db, "users"), where("ahUserId", "==", newUserDoc.referredBy));
    const referrerSnap = await getDocs(q);
    
    if (referrerSnap.empty) {
        console.warn(`Referrer with code ${newUserDoc.referredBy} not found.`);
        // Mark as credited to avoid re-running this logic.
        await updateDoc(newUserRef, { emailVerificationCredited: true });
        return { success: false, error: "Referrer not found." };
    }
      
    const referrerRef = referrerSnap.docs[0].ref;

    // Now, run the main logic in a transaction
    const result = await runTransaction(db, async (transaction) => {
        const promoRef = doc(db, 'promotions', 'referralProgram');
        
        // We need to re-read the docs inside the transaction
        const freshReferrerDoc = await transaction.get(referrerRef);
        const freshPromoDoc = await transaction.get(promoRef);
        const freshNewUserDoc = await transaction.get(newUserRef);

        if (!freshReferrerDoc.exists()) {
            throw new Error("Referrer document does not exist!");
        }
        if(!freshNewUserDoc.exists()) {
            throw new Error("New user document does not exist!");
        }

        // Re-check the credit status inside the transaction to prevent race conditions
        if (freshNewUserDoc.data().emailVerificationCredited) {
            return null;
        }

        const currentReferrerData = freshReferrerDoc.data() as UserData;
        const newReferralCount = (currentReferrerData.referralCount || 0) + 1;
        transaction.update(referrerRef, { referralCount: newReferralCount });

        let shouldNotifyWinner = false;
        let isLastWinner = false;

        if (freshPromoDoc.exists()) {
            const promoData = freshPromoDoc.data() as PromotionStatus;
            const endDate = new Date(promoData.endDate.seconds * 1000);
            const winnerCount = promoData.winnerCount || 0;

            // Check if this referral makes them a winner
            if (newReferralCount >= promoData.referralsNeeded && 
                winnerCount < promoData.maxWinners &&
                new Date() < endDate &&
                !currentReferrerData.hasZeroServiceCharge) {
                
                transaction.update(referrerRef, { hasZeroServiceCharge: true });
                transaction.update(promoRef, { winnerCount: winnerCount + 1 });
                
                shouldNotifyWinner = true;
                isLastWinner = winnerCount + 1 === promoData.maxWinners;
            }
        }
        
        // Mark the new user's referral as credited
        transaction.update(newUserRef, { emailVerificationCredited: true });
        
        // Return values to use after the transaction
        return { shouldNotifyWinner, referrerId: currentReferrerData.uid, referrerName: currentReferrerData.name, isLastWinner };
    });

    if (result && result.shouldNotifyWinner) {
        await createNotification(result.referrerId, 'Congratulations! You have completed the referral challenge and earned a 0% service charge for life!', '/promotions');
        await createAdminNotification(`${result.referrerName} has won the referral promotion!`, `/admin/support/${result.referrerId}`);
        if (result.isLastWinner) {
            await createAdminNotification('The referral promotion has ended as all 5 winner spots have been filled.', '/admin');
        }
    }

    return { success: true, message: "Referral processed successfully." };
  } catch (error) {
    console.error("Error processing verified user referral:", error);
    // Return a generic error to the client
    return { success: false, error: "An error occurred while processing the referral." };
  }
}
