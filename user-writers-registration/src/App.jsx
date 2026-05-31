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

  useEffect(() => {
    let unsubscribeAuth = () => {};
    
    // Check Firebase Auth state to prevent localStorage bypass
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      import('./firebase').then(({ auth }) => {
        unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
          if (!firebaseUser && isLoggedIn) {
            // Allow developer bypass in local mode
            if (import.meta.env.DEV && member?.membershipId?.startsWith('TEST')) {
              return;
            }
            console.warn("Security Check: No Firebase Auth session found. Forcing logout.");
            handleLogout();
          }
        });
      });
    });

    if (isLoggedIn && member) {
      const loginTime = localStorage.getItem('tcwa_user_login_time');
      const now = Date.now();
      const SIX_DAYS = 6 * 24 * 60 * 60 * 1000;

      if (!loginTime) {
        localStorage.setItem('tcwa_user_login_time', now.toString());
      } else if (now - parseInt(loginTime, 10) > SIX_DAYS) {
        console.warn("Session expired (6 days limit reached). Forcing logout.");
        handleLogout();
        return;
      }

      localStorage.setItem('tcwa_member', JSON.stringify(member));
      localStorage.setItem('tcwa_isLoggedIn', 'true');
      
      // Real-time check if member still exists in DB
      import('firebase/firestore').then(({ doc, onSnapshot }) => {
        import('./firebase').then(({ db }) => {
          if (member.membershipId) {
            const unsubDb = onSnapshot(doc(db, 'members', member.membershipId), 
              (docSnap) => {
                if (!docSnap.exists()) {
                  console.warn("Member deleted from database. Forcing logout.");
                  handleLogout();
                }
              },
              (error) => {
                console.error("Firestore permission/access error. Forcing logout to be safe.", error);
                handleLogout();
              }
            );
          }
        }).catch(err => console.error("Failed to load firebase", err));
      }).catch(err => console.error("Failed to load firestore", err));
      
    } else {
      localStorage.removeItem('tcwa_member');
      localStorage.removeItem('tcwa_isLoggedIn');
      localStorage.removeItem('tcwa_user_login_time');
    }

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [isLoggedIn, member]);

  // Enforce 6 day session limit while app is open
  useEffect(() => {
    if (!isLoggedIn) return;
    
    const checkSession = () => {
      const loginTime = localStorage.getItem('tcwa_user_login_time');
      if (loginTime && Date.now() - parseInt(loginTime, 10) > 6 * 24 * 60 * 60 * 1000) {
        console.warn("Session expired (6 days limit reached) while active. Logging out...");
        handleLogout();
      }
    };

    const interval = setInterval(checkSession, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isLoggedIn]);

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
