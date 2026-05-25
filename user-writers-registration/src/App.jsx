import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';

export default function App() {
  const [member, setMember] = useState(() => {
    const saved = localStorage.getItem('tcwa_member');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('tcwa_isLoggedIn') === 'true';
  });

  useEffect(() => {
    if (isLoggedIn && member) {
      localStorage.setItem('tcwa_member', JSON.stringify(member));
      localStorage.setItem('tcwa_isLoggedIn', 'true');
    } else {
      localStorage.removeItem('tcwa_member');
      localStorage.removeItem('tcwa_isLoggedIn');
    }
  }, [isLoggedIn, member]);

  const handleLogout = () => {
    // Completely clear all caches to fix stale deployment issues
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

    setMember(null);
    setIsLoggedIn(false);
    
    // Hard reload to flush SPA state
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-use" element={<TermsOfUse />} />
        <Route 
          path="/login" 
          element={!isLoggedIn ? <Login setMember={setMember} setIsLoggedIn={setIsLoggedIn} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={isLoggedIn ? <Dashboard member={member} setMember={setMember} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </BrowserRouter>
  );
}
