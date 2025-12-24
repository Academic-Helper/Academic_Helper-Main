
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot, collection, query, where, orderBy, getDoc, setDoc, serverTimestamp, type Timestamp, updateDoc, limit, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { UserData, Notification, UserRole } from '@/types';
import { processVerifiedUserReferral } from '@/lib/referral-actions';

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  notifications: Notification[];
  handleSignOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  notifications: [],
  handleSignOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleSignOut = useCallback(async () => {
    if (auth.currentUser) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      try {
          await updateDoc(userRef, {
              isOnline: false,
              lastSeen: serverTimestamp()
          });
      } catch (error) {
          console.error("Error updating user status on sign out:", error);
      }
    }
    await auth.signOut();
  }, []);


  useEffect(() => {
    let unsubscribeUser = () => {};
    let unsubscribeNotifications = () => {};
    let presenceInterval: NodeJS.Timeout;
    let currentUid: string | null = null;

    const handleBeforeUnload = () => {
        if (currentUid) {
            // This is a best-effort attempt. The new handleSignOut is more reliable for explicit logouts.
            const userRef = doc(db, 'users', currentUid);
            updateDoc(userRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
        }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      unsubscribeUser();
      unsubscribeNotifications();
      clearInterval(presenceInterval);

      if (currentUid && currentUid !== user?.uid) {
         const oldUserRef = doc(db, 'users', currentUid);
         await updateDoc(oldUserRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
      }
      currentUid = user?.uid || null;

      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        
        // When user comes online, reset the offline notification flag
        updateDoc(userDocRef, { 
            isOnline: true, 
            lastSeen: serverTimestamp(),
            notifiedForOfflineMessage: false // Reset the flag
        }).catch(() => {});

        presenceInterval = setInterval(() => {
            if (auth.currentUser) {
                updateDoc(doc(db, 'users', auth.currentUser.uid), {
                    lastSeen: serverTimestamp()
                });
            }
        }, 60000);

        const userDoc = await getDoc(userDocRef);
        if (user.email?.toLowerCase() === 'danashanaka@gmail.com') {
          if (!userDoc.exists()) {
            const adminData: UserData = { 
                uid: user.uid, 
                email: user.email, 
                name: "Admin", 
                role: "admin",
                createdAt: serverTimestamp() as Timestamp,
                status: 'active',
                isOnline: true,
                lastSeen: serverTimestamp() as Timestamp,
                walletBalance: 0,
                contactWarningCount: 0,
            };
            await setDoc(userDocRef, adminData).catch(error => {
              console.error("Failed to create admin user document:", error);
            });
          }
        } else if (userDoc.exists()) {
            const initialUserData = userDoc.data() as UserData;
            // FIX: Retroactively add the notification field if it's missing for existing users.
            if (initialUserData.notifiedForOfflineMessage === undefined) {
              await updateDoc(userDocRef, { notifiedForOfflineMessage: false });
            }
            if (user.emailVerified && !initialUserData.emailVerificationCredited && initialUserData.referredBy) {
                await processVerifiedUserReferral(user.uid);
            }
        }
        
        unsubscribeUser = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const newUserData = doc.data() as UserData;
            setUserData(newUserData);
          } else {
            if (user.email?.toLowerCase() !== 'danashanaka@gmail.com') {
                setUserData(null);
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user data with snapshot:", error);
          setUserData(null);
          setLoading(false);
        });

        const notificationsQuery = query(
            collection(db, 'notifications'), 
            where('userId', '==', user.uid), 
            orderBy('createdAt', 'desc')
        );
        unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
            const userNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(userNotifications);
        }, (error) => {
            console.error("Error fetching notifications:", error);
        });

      } else {
        setUser(null);
        setUserData(null);
        setNotifications([]);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUser();
      unsubscribeNotifications();
      clearInterval(presenceInterval);
      if (currentUid) {
          const oldUserRef = doc(db, 'users', currentUid);
          updateDoc(oldUserRef, { isOnline: false, lastSeen: serverTimestamp() }).catch(() => {});
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, notifications, handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
