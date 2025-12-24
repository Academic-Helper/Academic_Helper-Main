
'use server';

import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { SignUpFormData, UserData } from "@/types";
import { createAdminNotification } from "./notifications";


export async function signUpWithEmailAndPassword(values: SignUpFormData) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
    const user = userCredential.user;
    
    // Send verification email via Firebase Auth
    await sendEmailVerification(user);

    const userData: Partial<UserData> = {
        uid: user.uid,
        name: values.name,
        email: values.email,
        photoURL: "",
        phone: values.phone,
        whatsApp: values.whatsApp,
        role: values.role,
        status: 'active',
        ahUserId: `AH-${user.uid.substring(0, 6).toUpperCase()}`,
        contactWarningCount: 0,
        createdAt: serverTimestamp(),
        isOnline: false,
        lastSeen: serverTimestamp(),
        walletBalance: 0,
        emailVerificationCredited: false,
        notifiedForOfflineMessage: false, // Ensure this field is initialized
    };

    if (values.role === 'writer') {
        userData.averageRating = 4.5;
        userData.ratingCount = 0;
        userData.referredBy = values.referralCode || null;
        userData.referralCount = 0;
        userData.hasZeroServiceCharge = false;
        userData.educationLevel = values.educationLevel;
    }

    if(values.role === 'teacher') {
        userData.subjects = [];
        userData.grades = [];
        userData.locations = [];
        userData.banners = [];
    }
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), userData);

    // Notify admin
    await createAdminNotification(`New user signed up: ${values.name}`, `/admin/support/${user.uid}`);
    
    // Sign the user out to force them to verify email before first login
    await signOut(auth);

    return { success: true, userId: user.uid };
  } catch (error: any) {
    console.error("Error signing up:", error);
    let errorMessage = error.message || "An unknown error occurred.";
    if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please log in.';
    }
    return { success: false, error: errorMessage };
  }
}

    
