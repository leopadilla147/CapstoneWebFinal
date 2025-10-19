import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, BookCheck, PlusCircle, Home, X, Users, Clock, AlertCircle, Settings, User, Cpu } from 'lucide-react';
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
      label: "Add Thesis", 
      icon: PlusCircle,
      description: "Upload new research papers"
    },
    { 
      path: "/borrowed-thesis", 
      label: "Thesis Access", 
      icon: BookCheck,
      description: "Manage access requests"
    },
    { 
      path: "/thesis-viewing", 
      label: "View & Manage Theses", 
      icon: BookOpen,
      description: "Browse and edit theses"
    },
    { 
      path: "/smart-iot-bookshelf", 
      label: "IoT Bookshelf", 
      icon: Cpu, 
      description: "Manage auto-logging and devices"
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
      
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        
        if (userData.id) {
          // Fetch complete user data from database
          const { data: userDataFromDB, error } = await supabase
            .from('users')
            .select(`
              user_id,
              username,
              full_name,
              email,
              admins!inner(admin_id, position, college_department)
            `)
            .eq('user_id', userData.id)
            .single();
            
          if (!error && userDataFromDB) {
            setAdminUser({
              ...userDataFromDB,
              adminData: userDataFromDB.admins[0]
            });
          } else {
            setAdminUser(userData);
          }
        } else {
          setAdminUser(userData);
        }
      }

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
        .from('theses')
        .select('*', { count: 'exact', head: true });

      if (thesesError) throw thesesError;

      // Fetch current access count (approved but not removed)
      const { count: currentlyBorrowed, error: accessError } = await supabase
        .from('thesis_access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (accessError) throw accessError;

      // Fetch pending requests count
      const { count: pendingRequests, error: pendingError } = await supabase
        .from('thesis_access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      setStats({
        totalTheses: totalTheses || 0,
        currentlyBorrowed: currentlyBorrowed || 0,
        pendingRequests: pendingRequests || 0,
        overdueTheses: 0 // You can implement this based on remove_access_date
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatistics();
    }
  }, [isOpen]);

  const getDisplayName = () => {
    if (!adminUser) return 'Loading...';
    
    if (adminUser.full_name) return adminUser.full_name;
    if (adminUser.fullName) return adminUser.fullName;
    if (adminUser.username) return adminUser.username;
    if (adminUser.email) return adminUser.email;
    
    return 'Admin User';
  };

  const getRoleDisplay = () => {
    if (!adminUser) return 'Loading...';
    
    if (adminUser.adminData) {
      return adminUser.adminData.position || 'Administrator';
    }
    
    return adminUser.position || 'System Administrator';
  };

  const getDepartment = () => {
    if (!adminUser) return '';
    
    if (adminUser.adminData) {
      return adminUser.adminData.college_department;
    }
    
    return adminUser.department || '';
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
              <span className="font-bold text-lg block">THESIS GUARD</span>
              <span className="text-xs text-red-200">Admin Panel</span>
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
              {getDepartment() && (
                <p className="text-xs text-red-300 truncate mt-1">
                  {getDepartment()}
                </p>
              )}
              {adminUser?.email && (
                <p className="text-xs text-red-300 truncate mt-1">
                  {adminUser.email}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 group relative ${
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
        <div className="p-4 border-t border-red-800">
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

              {/* Current Access */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-red-200 text-sm">Current Access:</span>
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
        {!loading && stats.pendingRequests > 0 && (
          <div className="p-4 border-t border-red-800">
            <h3 className="text-sm font-semibold text-red-200 mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Alerts
            </h3>
            <div className="space-y-2 text-xs">
              {stats.pendingRequests > 0 && (
                <div className="flex items-center gap-2 text-yellow-300">
                  <Clock size={12} />
                  <span>{stats.pendingRequests} access request(s) need review</span>
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