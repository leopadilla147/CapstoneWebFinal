import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, LogOut, User, Settings, Check, X, Clock, History, Home } from 'lucide-react';
import logo from "../assets/logo.png";
import { supabase } from '../connect-supabase.js';

const CommonHeader = ({ isAuthenticated = false, onLogOut, userRole = 'guest', hideLoginButton = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    
    if (user) {
      fetchNotifications(user.id);
      // Set up real-time subscription for new notifications
      setupRealtimeNotifications(user.id);
    }

    return () => {
      // Cleanup subscription
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [location]);

  let subscription;

  const setupRealtimeNotifications = (userId) => {
    subscription = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          // Add new notification to the top
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();
  };

  const fetchNotifications = async (userId) => {
    if (!userId) return;
    
    setLoadingNotifications(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      
      // Count unread notifications
      const unread = data ? data.filter(notification => !notification.is_read).length : 0;
      setUnreadCount(unread);
      
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('notification_id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.notification_id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
      
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.filter(notification => notification.notification_id !== notificationId)
      );
      
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(n => n.notification_id === notificationId);
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const toggleNotifications = (e) => {
    e.stopPropagation();
    setShowNotifications(prev => !prev);
    setShowUserMenu(false);
  };

  const toggleUserMenu = (e) => {
    e.stopPropagation();
    setShowUserMenu(prev => !prev);
    setShowNotifications(false);
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
      setShowUserMenu(false);
      setShowNotifications(false);
      
      if (location.pathname !== '/') {
        navigate('/');
      } else {
        window.location.reload();
      }
    }
  };

  const handleSettings = () => {
    if (currentUser?.role === 'admin') {
      navigate('/admin-account-settings');
    } else {
      navigate('/user-settings');
    }
    setShowUserMenu(false);
  };

  const handleProfile = () => {
    if (currentUser?.role === 'admin') {
      navigate('/admin-account-settings');
    } else {
      navigate('/user-settings');
    }
    setShowUserMenu(false);
  };

  const handleDashboard = () => {
    if (currentUser?.role === 'admin') {
      navigate('/admin-homepage');
    } else {
      navigate('/user-dashboard');
    }
    setShowUserMenu(false);
  };

  const getUserDisplayName = () => {
    if (!currentUser) return 'Guest';
    
    if (currentUser.fullName) return currentUser.fullName;
    if (currentUser.username) return currentUser.username;
    if (currentUser.email) return currentUser.email.split('@')[0];
    
    return 'User';
  };

  const getUserRoleDisplay = () => {
    if (!currentUser) return 'Guest';
    
    switch (currentUser.role) {
      case 'admin':
        return 'Administrator';
      case 'student':
        return 'Student';
      case 'user':
        return 'User';
      default:
        return 'User';
    }
  };

  const shouldShowLoginButton = !hideLoginButton;

  useEffect(() => {
    const handleClickOutside = () => {
      setShowNotifications(false);
      setShowUserMenu(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const formatNotificationTime = (createdAt) => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffInMinutes = Math.floor((now - created) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 text-white bg-[#7d0010] shadow-lg">
      <div className="flex items-center space-x-4">
        <div 
          className="flex items-center space-x-4 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={handleLogoClick}
        >
          <img src={logo} alt="CNSC Logo" className="w-16 h-16" />
          <div>
            <h1 className="font-bold text-lg leading-tight">CAMARINES NORTE STATE COLLEGE</h1>
            <p className="text-sm text-red-100">F. Pimentel Avenue, Daet, Camarines Norte, Philippines</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 relative">
        {currentUser && (
          <>
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={toggleNotifications}
                className="p-2 rounded-full hover:bg-red-800 transition-colors relative"
              >
                <Bell size={20} className="text-white" />
                {unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-yellow-400 text-red-800 rounded-full w-5 h-5 text-xs flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute top-12 right-0 bg-white text-black p-4 rounded-xl shadow-2xl w-80 z-50 animate-fadeIn border border-gray-200">
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-bold text-[#7d0010] text-lg">Notifications</p>
                    <div className="flex gap-2">
                      {unreadCount > 0 && (
                        <button 
                          onClick={markAllAsRead}
                          className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded hover:bg-green-200 transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                      <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                        {notifications.length} total
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {loadingNotifications ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600 mx-auto"></div>
                        <p className="text-gray-500 text-sm mt-2">Loading notifications...</p>
                      </div>
                    ) : notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div 
                          key={notification.notification_id}
                          className={`border-l-4 rounded-r-lg p-3 ${
                            notification.is_read 
                              ? 'border-gray-300 bg-gray-50' 
                              : 'border-red-500 bg-red-50'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{getNotificationIcon(notification.type)}</span>
                              <p className="font-semibold text-sm">{notification.title}</p>
                            </div>
                            <button
                              onClick={() => deleteNotification(notification.notification_id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{notification.message}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">
                              {formatNotificationTime(notification.created_at)}
                            </span>
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.notification_id)}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded hover:bg-blue-200 transition-colors flex items-center gap-1"
                              >
                                <Check size={12} />
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4">
                        <Bell size={24} className="text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No notifications</p>
                      </div>
                    )}
                  </div>
                  
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="w-full mt-3 text-center text-sm text-[#7d0010] font-semibold hover:underline pt-2 border-t border-gray-200 flex items-center justify-center gap-2"
                    >
                      <Check size={14} />
                      Mark All as Read
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative">
              <button 
                onClick={toggleUserMenu}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-red-800 transition-colors"
              >
                <div className="bg-red-600 p-2 rounded-full">
                  <User size={16} />
                </div>
                <div className="text-left hidden md:block">
                  <p className="text-sm font-semibold">{getUserDisplayName()}</p>
                  <p className="text-xs text-red-200">{getUserRoleDisplay()}</p>
                </div>
              </button>
              
              {showUserMenu && (
                <div className="absolute top-12 right-0 bg-white text-black p-2 rounded-xl shadow-2xl w-48 z-50 animate-fadeIn border border-gray-200">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="font-semibold text-sm truncate">{getUserDisplayName()}</p>
                    <p className="text-xs text-gray-600 truncate">{currentUser.email}</p>
                  </div>
                  
                  <button 
                    onClick={handleDashboard}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Home size={16} />
                    My Dashboard
                  </button>
                  
                  <button 
                    onClick={handleProfile}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-sm flex items-center gap-2"
                  >
                    <User size={16} />
                    My Profile
                  </button>
                  
                  <button 
                    onClick={handleSettings}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-sm flex items-center gap-2"
                  >
                    <Settings size={16} />
                    Settings
                  </button>
                  
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {!currentUser && shouldShowLoginButton && (
          <button 
            onClick={handleLogin} 
            className="bg-white text-[#7d0010] hover:bg-red-100 px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 shadow-md"
          >
            <User size={18} />
            Login
          </button>
        )}
      </div>
    </header>
  );
};

export default CommonHeader;