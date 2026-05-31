import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';

import { auth, db } from './firebase';

import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AdminLoginPage from './pages/AdminLoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import DashboardHomePage from './pages/DashboardHomePage';
import MembersPage from './pages/members/MembersPage';
import RegistrationsPage from './pages/registrations/RegistrationsPage';
import RenewalsPage from './pages/renewals/RenewalsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';



// Helper to check admin
const bootstrapAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export async function isAllowedAdmin(user) {
  const email = user?.email?.toLowerCase()
  if (!email) return false
  if (bootstrapAdminEmails.includes(email)) return true

  try {
    const adminDoc = await getDoc(doc(db, 'admins', email))
    return adminDoc.exists() && adminDoc.data()?.active === true
  } catch (error) {
    console.error("Error checking admin permissions:", error)
    return false
  }
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";
  
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("SamsungBrowser")) browser = "Samsung Browser";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  
  if (ua.includes("Win")) os = "Windows";
  else if (ua.includes("Mac")) os = "MacOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  return `${os} - ${browser}`;
}

const LoadingScreen = () => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 4 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid min-h-screen place-items-center bg-zinc-900 text-zinc-300 tracking-wider">
      <div className="flex text-sm font-medium">
        <span>Loading</span>
        <span className="inline-block w-8 text-left">{dots}</span>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        localStorage.removeItem('tcwa_admin_login_time');
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
        return;
      }

      const loginTime = localStorage.getItem('tcwa_admin_login_time');
      const now = Date.now();
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

      if (!loginTime) {
        localStorage.setItem('tcwa_admin_login_time', now.toString());
      } else if (now - parseInt(loginTime, 10) > TWENTY_FOUR_HOURS) {
        console.warn("Session expired (24 hours limit reached). Logging out...");
        localStorage.removeItem('tcwa_admin_login_time');
        await auth.signOut();
        setUser(null);
        setLoading(false);
        return;
      }

      const allowed = await isAllowedAdmin(currentUser);
      if (allowed) {
        setUser(currentUser);
        
        // Track device info and last active time
        const email = currentUser.email.toLowerCase();
        if (!bootstrapAdminEmails.includes(email)) {
          try {
            await updateDoc(doc(db, 'admins', email), {
              lastActive: new Date().toISOString(),
              deviceInfo: getDeviceInfo(),
              isOnline: true
            });
          } catch(e) {
            console.error("Failed to update activity status", e);
          }

          // Real-time security listener: Auto-logout if admin is revoked or deleted
          unsubscribeSnapshot = onSnapshot(doc(db, 'admins', email), 
            (docSnap) => {
              if (!docSnap.exists() || docSnap.data()?.active !== true) {
                console.warn("Admin access revoked in real-time. Logging out...");
                auth.signOut();
                setUser(null);
              }
            },
            (error) => {
              console.error("Admin DB listener error:", error);
              auth.signOut();
              setUser(null);
            }
          );
        }
      } else {
        await auth.signOut();
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Enforce 24 hour session limit while app is open
  useEffect(() => {
    if (!user) return;
    
    const checkSession = () => {
      const loginTime = localStorage.getItem('tcwa_admin_login_time');
      if (loginTime && Date.now() - parseInt(loginTime, 10) > 24 * 60 * 60 * 1000) {
        console.warn("Session expired (24 hours limit reached) while active. Logging out...");
        localStorage.removeItem('tcwa_admin_login_time');
        auth.signOut();
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [user]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"
          element={
            <ProtectedRoute user={user}>
              <DashboardLayout user={user} />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHomePage />} />
          <Route path="members" element={
            <ProtectedRoute user={user}>
              <MembersPage />
            </ProtectedRoute>
          } />
          <Route path="registrations" element={
            <ProtectedRoute user={user}>
              <RegistrationsPage />
            </ProtectedRoute>
          } />
          <Route path="renewals" element={
            <ProtectedRoute user={user}>
              <RenewalsPage />
            </ProtectedRoute>
          } />
          <Route path="notifications" element={
            <ProtectedRoute user={user}>
              <NotificationsPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<DashboardHomePage />} />
        </Route>

        <Route path="/admin-login" element={user ? <Navigate to="/" /> : <AdminLoginPage onLogin={setUser} />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} />
    </BrowserRouter>
  );
}

export default App;
