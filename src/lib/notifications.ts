
import { collection, addDoc, serverTimestamp, query, where, getDocs, writeBatch, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";

async function getAdminUids(): Promise<string[]> {
    const adminListRef = doc(db, "public_settings", "admin_users");
    try {
        const docSnap = await getDoc(adminListRef);
        if (docSnap.exists() && docSnap.data().uids) {
            return docSnap.data().uids;
        }
        return [];
    } catch (error) {
        console.error("Error getting admin UIDs from public list:", error);
        return [];
    }
}

export const createNotification = async (
    userId: string, 
    message: string, 
    link: string,
    type: 'general' | 'cancellation' = 'general'
) => {
    try {
        if (!userId) {
            console.error("Failed to create notification: No user ID provided.");
            return;
        }
        await addDoc(collection(db, "notifications"), {
            userId,
            message,
            link,
            isRead: false,
            createdAt: serverTimestamp(),
            type,
        });
    } catch (error) {
        console.error("Error creating notification:", error);
    }
};

interface CancellationNotificationPayload {
    userId: string;
    assignmentId: string;
    assignmentTitle: string;
    cancelledBy: string;
    reportedUserId: string;
}

export const createCancellationNotification = async (payload: CancellationNotificationPayload) => {
    const { userId, assignmentId, assignmentTitle, cancelledBy, reportedUserId } = payload;
    const message = `${cancelledBy} cancelled the assignment: "${assignmentTitle.substring(0, 20)}...". If you believe this was unfair, you can file a report.`;
    const link = `/report/${assignmentId}?reportedUserId=${reportedUserId}`;
    await createNotification(userId, message, link, 'cancellation');
};

export const createAdminNotification = async (
    message: string,
    link: string
) => {
    try {
        const adminUids = await getAdminUids();
        if (adminUids.length > 0) {
            for (const adminId of adminUids) {
               await createNotification(adminId, message, link);
            }
        }
    } catch (error) {
        console.error("Error creating admin notification:", error);
    }
}

export const markAllNotificationsAsRead = async (userId: string) => {
    const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('isRead', '==', false)
    );
    try {
        const querySnapshot = await getDocs(notificationsQuery);
        if (querySnapshot.empty) return;

        const batch = writeBatch(db);
        querySnapshot.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
};
