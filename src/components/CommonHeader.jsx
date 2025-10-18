import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import logo from "../assets/logo.png";

const CommonHeader = ({ isAuthenticated = false, onLogOut, userRole = 'guest', hideLoginButton = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
  }, []);

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleLogin = () => {
    if (currentUser) {
      if (currentUser.role === 'admin') {
        navigate('/admin-homepage');
      } else {
        navigate('/user-dashboard');
      }
    } else {
      navigate('/user-login');
    }
  };

  const handleLogout = () => {
    if (onLogOut) {
      onLogOut();
    } else {
      localStorage.removeItem('user');
      setCurrentUser(null);
      if (location.pathname !== '/') {
        navigate('/');
      } else {
        window.location.reload();
      }
    }
  };

  const getLoginButtonText = () => {
    if (currentUser) {
      return currentUser.role === 'admin' ? 'Admin Panel' : 'My Account';
    }
    return 'Login';
  };

  const shouldShowLoginButton = !hideLoginButton;

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 text-white">
      <div className="flex items-center space-x-4">
        <div 
          className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleLogoClick}
        >
          <img src={logo} alt="CNSC Logo" className="w-16 h-16" />
          <div>
            <h1 className="font-bold text-lg leading-tight">CAMARINES NORTE STATE COLLEGE</h1>
            <p className="text-sm">F. Pimentel Avenue, Daet, Camarines Norte, Philippines</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        {currentUser && (
          <div className="relative">
            <Bell className="text-white cursor-pointer" onClick={toggleNotifications} />
            {showNotifications && (
              <div className="absolute top-8 right-0 bg-white text-black p-4 rounded-xl shadow-lg w-60 animate-fadeIn z-50">
                <p className="font-bold text-[#7d0010] mb-2">Notifications</p>
                <ul className="text-sm space-y-2">
                  <li className="border-b pb-1">1 new thesis uploaded</li>
                  <li className="border-b pb-1">Student borrowed a thesis</li>
                  <li>System backup completed</li>
                </ul>
              </div>
            )}
          </div>
        )}

        {currentUser ? (
          <>
            {shouldShowLoginButton && (
              <button 
                onClick={handleLogin}
                className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md font-semibold transition-colors"
              >
                {getLoginButtonText()}
              </button>
            )}
            <button 
              onClick={handleLogout} 
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-semibold transition-colors"
            >
              Log Out
            </button>
          </>
        ) : (
          shouldShowLoginButton && (
            <button 
              onClick={handleLogin} 
              className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md font-semibold transition-colors"
            >
              Login
            </button>
          )
        )}
      </div>
    </header>
  );
};

export default CommonHeader;