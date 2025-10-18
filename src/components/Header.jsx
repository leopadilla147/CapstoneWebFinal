import React, { useState } from 'react';
import { Bell, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from "../assets/logo.png";

const Header = ({ onMenuToggle, onLogOut }) => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleNotifications = () => {
    setShowNotifications(prev => !prev);
  };

  const handleLogoClick = () => {
    navigate('/');
  };

  // If onLogOut is not provided, use default logout
  const handleLogout = () => {
    if (onLogOut) {
      onLogOut();
    } else {
      // Default logout behavior
      localStorage.removeItem('user');
      navigate('/');
    }
  };

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 text-white">
      <div className="flex items-center space-x-4">
        <button 
          onClick={onMenuToggle}
          className="p-2 hover:bg-red-700 rounded-lg lg:hidden"
        >
          <Menu size={24} />
        </button>
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

        <button onClick={handleLogout} className="bg-red-700 hover:bg-red-800 text-white px-4 py-2 rounded-md font-semibold transition-colors">
          Log Out
        </button>
      </div>
    </header>
  );
};

export default Header;