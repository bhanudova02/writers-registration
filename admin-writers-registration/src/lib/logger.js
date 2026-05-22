import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export const logAdminActivity = async (email, action, details = "") => {
    try {
        await addDoc(collection(db, "admin_logs"), {
            adminEmail: email || "Unknown Admin",
            action,
            details,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error("Failed to log admin activity:", error);
    }
};
