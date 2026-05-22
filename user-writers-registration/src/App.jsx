import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [member, setMember] = useState(() => {
    const saved = sessionStorage.getItem('tcwa_member');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return sessionStorage.getItem('tcwa_isLoggedIn') === 'true';
  });

  useEffect(() => {
    if (isLoggedIn && member) {
      sessionStorage.setItem('tcwa_member', JSON.stringify(member));
      sessionStorage.setItem('tcwa_isLoggedIn', 'true');
    } else {
      sessionStorage.removeItem('tcwa_member');
      sessionStorage.removeItem('tcwa_isLoggedIn');
    }
  }, [isLoggedIn, member]);

  const handleLogout = () => {
    setMember(null);
    setIsLoggedIn(false);
  };

  return (
    <BrowserRouter>
      <Routes>
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
