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

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center">
          {/* Logo Container with pulse */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse"></div>
            <img 
              src="/Logo.png" 
              alt="TCWA Logo" 
              className="w-24 h-24 object-contain relative z-10 animate-[bounce_2s_infinite]"
            />
          </div>
          
          {/* Custom Spinner & Text */}
          <div className="flex flex-col items-center gap-3">
             <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-[3px] border-zinc-700 border-t-orange-500 rounded-full animate-spin"></div>
                <h2 className="text-white font-bold tracking-widest uppercase text-sm">Authenticating</h2>
             </div>
             <p className="text-zinc-500 text-[11px] font-semibold tracking-widest uppercase">Securing Connection...</p>
          </div>
        </div>
      </div>
    );
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
