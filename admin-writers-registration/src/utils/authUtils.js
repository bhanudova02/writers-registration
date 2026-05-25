import { auth } from '../firebase';
import { logAdminActivity } from '../lib/logger';

export const performLogout = async (user) => {
    if (user) {
        try {
            await logAdminActivity(
                user.email || user.displayName || "Unknown Admin", 
                "Logout", 
                "User logged out of admin dashboard (Manual or Auto-Timeout)"
            );
        } catch (error) {
            console.error("Failed to log activity, proceeding with local logout", error);
        }

        try {
            if (user.isEmployee) {
                sessionStorage.removeItem('employee_admin');
            } else {
                await auth.signOut();
            }
        } catch (error) {
            console.error("Failed to sign out from Firebase, proceeding with local logout", error);
        }
    }

    // Completely clear all caches to fix stale deployment issues and secure session
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all cookies
    document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // Clear service worker caches
    if ('caches' in window) {
        caches.keys().then((names) => {
            names.forEach(name => {
                caches.delete(name);
            });
        });
    }

    // Hard reload to flush SPA state
    window.location.href = "/admin-login";
};
