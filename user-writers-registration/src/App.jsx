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
    let isMounted = true;
    
    // Check Firebase Auth state to prevent localStorage bypass
    import('firebase/auth').then(({ onAuthStateChanged }) => {
      import('./firebase').then(({ auth }) => {
        if (!isMounted) return;
        unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
          if (!firebaseUser && isLoggedIn) {
            // Allow all developer bypass logins in local DEV mode (no Firebase Auth session needed)
            if (import.meta.env.DEV) {
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
    } else {
      localStorage.removeItem('tcwa_member');
      localStorage.removeItem('tcwa_isLoggedIn');
      localStorage.removeItem('tcwa_user_login_time');
    }

    return () => {
      isMounted = false;
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [isLoggedIn]);

  // Dedicated Real-time Firestore sync and status/expiry check listener
  useEffect(() => {
    if (!isLoggedIn || !member?.membershipId) return;

    let unsubscribeDb = null;
    let isMounted = true;

    import('firebase/firestore').then(({ doc, onSnapshot }) => {
      import('./firebase').then(({ db }) => {
        if (!isMounted) return;
        unsubscribeDb = onSnapshot(doc(db, 'members', member.membershipId), 
          (docSnap) => {
            if (!isMounted) return;
            if (!docSnap.exists()) {
              console.warn("Member deleted from database. Forcing logout.");
              handleLogout();
            } else {
              const dbData = docSnap.data();
              const checkPermanentlyClosed = (m) => {
                if (!m) return false;
                if (m.status === "Disabled" || m.status === "Deceased") return true;
                if (m.memberType === "Associate Member") {
                  let expiryDate = null;
                  if (m.validityExpiresAt) {
                    let expDate = typeof m.validityExpiresAt.toDate === 'function' 
                      ? m.validityExpiresAt.toDate() 
                      : new Date(m.validityExpiresAt);
                    if (!isNaN(expDate.getTime())) {
                      expiryDate = expDate;
                    }
                  }
                  if (!expiryDate) {
                    let joiningDateStr = m.dateOfJoining || m.createdAt;
                    if (!joiningDateStr) return false;
                    let joiningDate = typeof joiningDateStr.toDate === 'function' ? joiningDateStr.toDate() : new Date(joiningDateStr);
                    if (isNaN(joiningDate.getTime())) return false;
                    
                    let refDateStr = m.lastRenewalDate || m.dateOfJoining || m.createdAt;
                    let refDate = typeof refDateStr.toDate === 'function' ? refDateStr.toDate() : new Date(refDateStr);
                    if (isNaN(refDate.getTime())) return false;
                    
                    expiryDate = new Date(joiningDate);
                    expiryDate.setFullYear(refDate.getFullYear());
                    if (expiryDate <= refDate) {
                      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                    }
                  }
                  
                  const now = new Date();
                  const diffTime = expiryDate.getTime() - now.getTime();
                  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  if (daysRemaining <= -1095) {
                    return true;
                  }
                }
                return false;
              };

              if (checkPermanentlyClosed(dbData)) {
                console.warn("Member account permanently closed. Forcing logout.");
                handleLogout();
              } else {
                // Check if any critical data changed before updating state to avoid infinite renders
                const hasChanged = 
                  dbData.status !== member.status || 
                  dbData.memberType !== member.memberType ||
                  dbData.name !== member.name ||
                  JSON.stringify(dbData.validityExpiresAt) !== JSON.stringify(member.validityExpiresAt);

                if (hasChanged) {
                  setMember(prev => ({ ...prev, ...dbData }));
                }
              }
            }
          },
          (error) => {
            console.error("Firestore permission/access error. Forcing logout to be safe.", error);
            handleLogout();
          }
        );
      });
    });

    return () => {
      isMounted = false;
      if (unsubscribeDb) unsubscribeDb();
    };
  }, [isLoggedIn, member?.membershipId]);

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
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <ToastContainer position="top-right" autoClose={3000} theme="dark" />
    </BrowserRouter>
  );
}
