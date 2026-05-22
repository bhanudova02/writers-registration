import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db } from './firebase';

import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import AdminLoginPage from './pages/AdminLoginPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

import DashboardHomePage from './pages/DashboardHomePage';
import CreateAdminPage from './pages/CreateAdminPage';
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

  const adminDoc = await getDoc(doc(db, 'admins', email))
  return adminDoc.exists() && adminDoc.data()?.active === true
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const employeeSession = sessionStorage.getItem('employee_admin');
    if (employeeSession) {
      setUser(JSON.parse(employeeSession));
      setLoading(false);
      return undefined;
    }

    return onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      const allowed = await isAllowedAdmin(currentUser);
      if (allowed) {
        setUser(currentUser);
      } else {
        await auth.signOut();
        setUser(null);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-zinc-900 text-white">Loading...</div>;
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
          <Route path="create-admin" element={<CreateAdminPage />} />
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
