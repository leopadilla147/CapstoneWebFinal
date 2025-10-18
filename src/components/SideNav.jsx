// components/SideNav.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, BookCheck, PlusCircle, Home, X, Users, Clock, AlertCircle, RefreshCw, Settings, User } from 'lucide-react';
import logo from "../assets/logo.png";
import { supabase } from '../connect-supabase.js';

const SideNav = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [stats, setStats] = useState({
    totalTheses: 0,
    currentlyBorrowed: 0,
    pendingRequests: 0,
    overdueTheses: 0
  });
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState(null);

  const navItems = [
    { 
      path: "/admin-homepage", 
      label: "Dashboard", 
      icon: Home,
      isHome: true,
      description: "Overview and analytics"
    },
    { 
      path: "/add-thesis-page", 
      label: "Adding of Thesis", 
      icon: PlusCircle,
      description: "Upload new research papers"
    },
    { 
      path: "/borrowed-thesis", 
      label: "Student's Borrowed Thesis", 
      icon: BookCheck,
      description: "Manage borrowing requests"
    },
    { 
      path: "/thesis-viewing", 
      label: "View & Manage Theses", 
      icon: BookOpen,
      description: "Browse and edit theses"
    },
    { 
    path: "/smart-iot-bookshelf", 
    label: "IoT Bookshelf Management", 
    icon: Settings, 
    description: "Manage auto-logging and admin accounts"
    },
    { 
      path: "/admin-account-settings", 
      label: "Admin Account", 
      icon: User,
      description: "Manage your admin profile and settings"
    }
  ];

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // Get admin user from localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        // If we have a user ID but need more details, fetch from database
        if (userData.id) {
          const { data: adminData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.id)
            .single();
            
          if (!error && adminData) {
            setAdminUser(adminData);
          } else {
            setAdminUser(userData);
          }
        } else {
          setAdminUser(userData);
        }
      }

      // Fetch statistics from database
      await fetchStatistics();
      
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Fetch total theses count
      const { count: totalTheses, error: thesesError } = await supabase
        .from('thesestwo')
        .select('*', { count: 'exact', head: true });

      if (thesesError) throw thesesError;

      // Fetch currently borrowed count (approved but not returned)
      const { count: currentlyBorrowed, error: borrowError } = await supabase
        .from('borrowing_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (borrowError) throw borrowError;

      // Fetch pending requests count
      const { count: pendingRequests, error: pendingError } = await supabase
        .from('borrowing_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      // Fetch overdue theses (approved requests past their due date)
      const { data: borrowedData, error: overdueError } = await supabase
        .from('borrowing_requests')
        .select('*')
        .eq('status', 'approved');

      if (overdueError) throw overdueError;

      const overdueTheses = borrowedData.filter(request => {
        const dueDate = new Date(request.approved_date);
        dueDate.setDate(dueDate.getDate() + request.duration_days);
        return new Date() > dueDate;
      }).length;

      setStats({
        totalTheses: totalTheses || 0,
        currentlyBorrowed: currentlyBorrowed || 0,
        pendingRequests: pendingRequests || 0,
        overdueTheses: overdueTheses || 0
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  // Refresh stats when sidebar opens
  useEffect(() => {
    if (isOpen) {
      fetchStatistics();
    }
  }, [isOpen]);

  // Function to get display name
  const getDisplayName = () => {
    if (!adminUser) return 'Loading...';
    
    // Return full name if available
    if (adminUser.full_name) return adminUser.full_name;
    
    // Return username if available
    if (adminUser.username) return adminUser.username;
    
    // Return email if available
    if (adminUser.email) return adminUser.email;
    
    // Fallback to first part of email before @
    if (adminUser.email) {
      return adminUser.email.split('@')[0];
    }
    
    // Final fallback
    return 'Admin User';
  };

  // Function to get role display
  const getRoleDisplay = () => {
    if (!adminUser) return 'Loading...';
    
    if (adminUser.role === 'admin') {
      return adminUser.position ? adminUser.position : 'System Administrator';
    }
    
    return adminUser.role ? adminUser.role.charAt(0).toUpperCase() + adminUser.role.slice(1) : 'User';
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#7d0010] text-white transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static lg:inset-0`}>
        
        {/* Sidebar Header */}
        <div className="flex items-center justify-between p-4 border-b border-red-800">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="CNSC Logo" className="w-10 h-10" />
            <div>
              <span className="font-bold text-lg block">Admin Panel</span>
              <span className="text-xs text-red-200">Thesis Hub</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-1 hover:bg-red-700 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Admin User Info */}
        <div className="p-4 border-b border-red-800">
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 p-2 rounded-full">
              <Users size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {getDisplayName()}
              </p>
              <p className="text-xs text-red-200 truncate">
                {getRoleDisplay()}
              </p>
              {adminUser?.email && (
                <p className="text-xs text-red-300 truncate mt-1">
                  {adminUser.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group ${
                  active 
                    ? 'bg-red-900 border-l-4 border-yellow-400 shadow-lg' 
                    : 'hover:bg-red-700 hover:border-l-4 hover:border-yellow-400 hover:shadow-md'
                }`}
                onClick={onClose}
                title={item.description}
              >
                <IconComponent size={20} className={active ? 'text-yellow-400' : 'text-red-200'} />
                <div className="flex-1 min-w-0">
                  <span className={`font-medium block ${active ? 'text-white' : 'text-red-100'}`}>
                    {item.label}
                  </span>
                  <span className="text-xs text-red-200 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Quick Stats */}
        <div className="p-4 border-t border-red-800 mt-4">
          <h3 className="text-sm font-semibold text-red-200 mb-3 flex items-center gap-2">
            <BookOpen size={16} />
            System Overview
          </h3>
          
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-red-200">Loading...</span>
                  <div className="h-4 w-8 bg-red-800 rounded animate-pulse"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Total Theses */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-red-200 text-sm">Total Theses:</span>
                </div>
                <span className="font-semibold text-white">{stats.totalTheses}</span>
              </div>

              {/* Currently Borrowed */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-red-200 text-sm">Borrowed Now:</span>
                </div>
                <span className="font-semibold text-white">{stats.currentlyBorrowed}</span>
              </div>

              {/* Pending Requests */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    stats.pendingRequests > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-yellow-400'
                  }`}></div>
                  <span className="text-red-200 text-sm">Pending Requests:</span>
                </div>
                <span className="font-semibold text-white">{stats.pendingRequests}</span>
              </div>

            </div>
          )}
        </div>

        {/* Alerts Section */}
        {!loading && (stats.pendingRequests > 0 || stats.overdueTheses > 0) && (
          <div className="p-4 border-t border-red-800">
            <h3 className="text-sm font-semibold text-red-200 mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Alerts
            </h3>
            <div className="space-y-2 text-xs">
              {stats.pendingRequests > 0 && (
                <div className="flex items-center gap-2 text-yellow-300">
                  <Clock size={12} />
                  <span>{stats.pendingRequests} pending request(s) need review</span>
                </div>
              )}
              {stats.overdueTheses > 0 && (
                <div className="flex items-center gap-2 text-red-300">
                  <AlertCircle size={12} />
                  <span>{stats.overdueTheses} thesis(es) overdue for return</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Current Time */}
        <div className="p-4 border-t border-red-800">
          <div className="text-center text-xs text-red-200">
            <div>{new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}</div>
            <div className="font-mono text-white text-sm">
              {new Date().toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SideNav;