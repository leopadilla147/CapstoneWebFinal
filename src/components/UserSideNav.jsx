import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { History, Clock, Settings, User, Home, BookOpen } from 'lucide-react';
import logo from "../assets/logo.png";
import { supabase } from '../connect-supabase.js';

const UserSideNav = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    pendingRequests: 0,
    totalAccess: 0,
    approvedRequests: 0
  });
  const [loading, setLoading] = useState(true);
  const [courseName, setCourseName] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Get user from localStorage
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return;

      const userData = JSON.parse(storedUser);
      setUser(userData);

      // Fetch user's statistics from the database
      if (userData.id) {
        await fetchUserStats(userData.id);
      }

      // Fetch course name if user has course data
      if (userData.course) {
        await fetchCourseName(userData.course);
      }
      
    } catch (error) {
      console.error('Error fetching user data for sidebar:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseName = async (courseId) => {
    try {
      // If courseId is already a name (not numeric), use it directly
      if (isNaN(courseId)) {
        setCourseName(courseId);
        return;
      }

      // Fetch course name from database
      const { data, error } = await supabase
        .from('courses')
        .select('course_name')
        .eq('course_id', courseId)
        .single();

      if (error) {
        console.error('Error fetching course name:', error);
        setCourseName(courseId); // Fallback to the ID if error
        return;
      }

      if (data) {
        setCourseName(data.course_name);
      }
    } catch (error) {
      console.error('Error fetching course name:', error);
      setCourseName(courseId); // Fallback to the ID if error
    }
  };

  const fetchUserStats = async (userId) => {
    try {
      // CORRECTED: Use 'thesis_access_request' table instead of 'borrowing_requests'
      const { data: accessRequests, error } = await supabase
        .from('thesis_access_requests')
        .select('status')
        .eq('user_id', userId);

      if (error) throw error;

      // Calculate statistics
      const pendingRequests = accessRequests.filter(
        request => request.status === 'pending'
      ).length;

      const approvedRequests = accessRequests.filter(
        request => request.status === 'approved' || request.status === 'returned'
      ).length;

      const totalAccess = accessRequests.length;

      setStats({
        pendingRequests,
        totalAccess,
        approvedRequests
      });

    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const navItems = [
    { 
      path: "/user-dashboard", 
      label: "Dashboard", 
      icon: Home,
      description: "Overview and quick stats"
    },
    { 
      path: "/user-history", 
      label: "Access History", 
      icon: History,
      description: "Your thesis requests and access"
    },
    { 
      path: "/user-settings", 
      label: "Account Settings", 
      icon: Settings,
      description: "Manage your profile"
    }
  ];

  const isActive = (path) => {
    return location.pathname === path;
  };

  // Function to get display name
  const getDisplayName = () => {
    if (!user) return 'Loading...';
    
    // Return full name if available
    if (user.fullName) return user.fullName;
    
    // Return username if available
    if (user.username) return user.username;
    
    // Return email if available
    if (user.email) return user.email;
    
    // Fallback to first part of email before @
    if (user.email) {
      return user.email.split('@')[0];
    }
    
    // Final fallback
    return 'Student User';
  };

  // Function to get student ID display
  const getStudentIdDisplay = () => {
    if (!user) return 'Loading...';
    
    if (user.studentId) return `ID: ${user.studentId}`;
    
    return 'Active Student';
  };

  // Function to get college display
  const getCollegeDisplay = () => {
    if (!user) return 'CNSC';
    
    if (user.department) {
      // Return college name, but if it's too long, return abbreviation
      if (user.department.length > 15) {
        return user.department.split(' ').map(word => word[0]).join('');
      }
      return user.department;
    }
    
    return 'CNSC';
  };

  // Function to get course/year info - UPDATED to use courseName state
  const getCourseInfo = () => {
    if (!user) return '';
    
    const info = [];
    if (courseName) {
      info.push(courseName);
    } else if (user.course) {
      // If courseName is not fetched yet, show the stored value
      info.push(user.course);
    }
    if (user.yearLevel) info.push(user.yearLevel);
    
    return info.join(' • ');
  };

  // Refresh stats when the sidebar is opened
  useEffect(() => {
    if (isOpen && user && user.id) {
      fetchUserStats(user.id);
    }
  }, [isOpen, user]);

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
              <span className="font-bold text-lg block">Student Panel</span>
              <span className="text-xs text-red-200">Thesis Hub</span>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-red-800">
          <div className="flex items-center space-x-3">
            <div className="bg-red-600 p-2 rounded-full">
              <User size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">
                {getDisplayName()}
              </p>
              {getCourseInfo() && (
                <p className="text-xs text-red-300 truncate mt-1">
                  {getCourseInfo()}
                </p>
              )}
              {user?.email && (
                <p className="text-xs text-red-300 truncate mt-1">
                  {user.email}
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
            Quick Stats
          </h3>
          
          {loading ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-red-200">Loading...</span>
                <div className="h-4 w-8 bg-red-800 rounded animate-pulse"></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-red-200">Loading...</span>
                <div className="h-4 w-8 bg-red-800 rounded animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending Requests */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    stats.pendingRequests > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'
                  }`}></div>
                  <span className="text-red-200 text-sm">Pending:</span>
                </div>
                <span className="font-semibold text-white">{stats.pendingRequests}</span>
              </div>

              {/* Approved Requests */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-red-200 text-sm">Approved:</span>
                </div>
                <span className="font-semibold text-white">{stats.approvedRequests}</span>
              </div>

              {/* Total Access */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                  <span className="text-red-200 text-sm">Total Requests:</span>
                </div>
                <span className="font-semibold text-white">{stats.totalAccess}</span>
              </div>

            </div>
          )}
        </div>

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

export default UserSideNav;