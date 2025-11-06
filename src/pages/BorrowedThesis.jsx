import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, Check, X, Clock, History, User, Book, Calendar, AlertTriangle } from 'lucide-react';
import bg from "../assets/bg-gradient.png"
import { useNavigate } from "react-router-dom";
import CommonHeader from '../components/CommonHeader.jsx';
import SideNav from '../components/SideNav';
import { supabase } from '../connect-supabase.js';

function BorrowedThesis() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [accessData, setAccessData] = useState({
    requests: [],
    current: [],
    history: []
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentAccess: 0,
    approvedThisMonth: 0,
    requestsThisMonth: 0,
    expiredToday: 0
  });
  const [expirationDays] = useState(30); // Default 30 days expiration

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogOut = () => {
    localStorage.removeItem('user');
    navigate('/')
  };

  // Check for expired access and automatically remove them
  const checkAndRemoveExpiredAccess = async () => {
    try {
      const currentDate = new Date().toISOString();
      
      // Find access that should be expired (approved more than expirationDays ago)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - expirationDays);
      
      const { data: expiredAccess, error: expiredError } = await supabase
        .from('thesis_access_requests')
        .select(`
          *,
          users:user_id (user_id, username, full_name, email),
          theses:thesis_id (thesis_id, title, author)
        `)
        .eq('status', 'approved')
        .lt('approved_date', expirationDate.toISOString());

      if (expiredError) {
        console.error('Error fetching expired access:', expiredError);
        return;
      }

      if (expiredAccess && expiredAccess.length > 0) {
        console.log(`Found ${expiredAccess.length} expired access records to remove`);

        for (const access of expiredAccess) {
          // Update status to 'expired'
          const { error: updateError } = await supabase
            .from('thesis_access_requests')
            .update({
              status: 'expired',
              remove_access_date: currentDate
            })
            .eq('access_request_id', access.access_request_id);

          if (updateError) {
            console.error('Error updating expired access:', updateError);
            continue;
          }

          // Create notification for user about expired access
          await supabase
            .from('notifications')
            .insert({
              user_id: access.user_id,
              thesis_id: access.thesis_id,
              access_request_id: access.access_request_id,
              title: 'Access Expired',
              message: `Your access to "${access.theses?.title}" has automatically expired after ${expirationDays} days.`,
              type: 'warning'
            });

          console.log(`Automatically removed expired access for user ${access.users?.full_name} to thesis "${access.theses?.title}"`);
        }
      }
    } catch (error) {
      console.error('Error checking and removing expired access:', error);
    }
  };

  // Check for access that will expire soon (within 3 days)
  const checkExpiringSoonAccess = async () => {
    try {
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 3); // 3 days from now
      
      const expirationThreshold = new Date();
      expirationThreshold.setDate(expirationThreshold.getDate() - (expirationDays - 3));
      
      const { data: expiringSoon, error } = await supabase
        .from('thesis_access_requests')
        .select(`
          *,
          users:user_id (user_id, username, full_name, email),
          theses:thesis_id (thesis_id, title, author)
        `)
        .eq('status', 'approved')
        .lt('approved_date', expirationThreshold.toISOString());

      if (error) {
        console.error('Error fetching expiring soon access:', error);
        return;
      }

      if (expiringSoon && expiringSoon.length > 0) {
        console.log(`Found ${expiringSoon.length} access records expiring soon`);
        
        // Create notifications for admin about expiring access
        const { data: adminUsers, error: adminError } = await supabase
          .from('admins')
          .select('user_id');
          
        if (adminError) {
          console.error('Error fetching admin users:', adminError);
          return;
        }

        if (adminUsers) {
          for (const admin of adminUsers) {
            for (const access of expiringSoon) {
              const daysRemaining = Math.ceil((new Date(access.approved_date).getTime() + (expirationDays * 24 * 60 * 60 * 1000) - new Date().getTime()) / (1000 * 60 * 60 * 24));
              
              await supabase
                .from('notifications')
                .insert({
                  user_id: admin.user_id,
                  thesis_id: access.thesis_id,
                  access_request_id: access.access_request_id,
                  title: 'Access Expiring Soon',
                  message: `Access for ${access.users?.full_name} to "${access.theses?.title}" will expire in ${daysRemaining} days.`,
                  type: 'warning'
                });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking expiring soon access:', error);
    }
  };

  // Fetch access request data
  const fetchAccessData = async () => {
    try {
      setLoading(true);
      
      console.log('Starting to fetch access data...');
      
      // First, check and remove any expired access
      await checkAndRemoveExpiredAccess();
      
      // Then, check for access expiring soon
      await checkExpiringSoonAccess();
      
      // Fetch all access requests with user and thesis data
      const { data, error } = await supabase
        .from('thesis_access_requests')
        .select(`
          *,
          users:user_id (user_id, username, full_name, email),
          theses:thesis_id (thesis_id, title, author, college_department, pdf_file_url)
        `)
        .order('request_date', { ascending: false });

      if (error) {
        console.error('Error fetching access data:', error);
        throw error;
      }

      console.log('Raw data from Supabase:', data);

      // Categorize data
      const requests = data.filter(item => item.status === 'pending');
      const current = data.filter(item => item.status === 'approved');
      const history = data.filter(item => ['removed', 'rejected', 'expired'].includes(item.status));

      console.log('Categorized data - Requests:', requests.length, 'Current:', current.length, 'History:', history.length);

      setAccessData({ requests, current, history });

      // Calculate expiration dates and statistics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const today = new Date();

      const approvedThisMonth = current.filter(item => {
        if (!item.approved_date) return false;
        const approvedDate = new Date(item.approved_date);
        return approvedDate.getMonth() === currentMonth && 
               approvedDate.getFullYear() === currentYear;
      }).length;

      const requestsThisMonth = data.filter(item => {
        const requestDate = new Date(item.request_date);
        return requestDate.getMonth() === currentMonth && 
               requestDate.getFullYear() === currentYear;
      }).length;

      const expiredToday = history.filter(item => {
        if (item.remove_access_date) {
          const removeDate = new Date(item.remove_access_date);
          return removeDate.toDateString() === today.toDateString() && 
                 item.status === 'expired';
        }
        return false;
      }).length;

      setStats({
        currentAccess: current.length,
        approvedThisMonth,
        requestsThisMonth,
        expiredToday
      });

      console.log('Stats calculated:', {
        currentAccess: current.length,
        approvedThisMonth,
        requestsThisMonth,
        expiredToday
      });

    } catch (error) {
      console.error('Error fetching access data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle request actions
  const handleRequestAction = async (requestId, action) => {
    try {
      const request = accessData.requests.find(req => req.access_request_id === requestId);
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_date: action === 'approve' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('thesis_access_requests')
        .update(updateData)
        .eq('access_request_id', requestId);

      if (error) {
        console.error('Error updating request:', error);
        throw error;
      }

      // Create notification for user
      if (request) {
        await supabase
          .from('notifications')
          .insert({
            user_id: request.user_id,
            thesis_id: request.thesis_id,
            access_request_id: requestId,
            title: action === 'approve' ? 'Access Request Approved' : 'Access Request Rejected',
            message: action === 'approve' 
              ? `Your access request for "${request.theses.title}" has been approved. Access will expire after ${expirationDays} days.`
              : `Your access request for "${request.theses.title}" has been rejected`,
            type: action === 'approve' ? 'success' : 'error'
          });
      }

      // Refresh data
      fetchAccessData();

    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  // Handle remove access action
  const handleRemoveAccess = async (accessId) => {
    try {
      const access = accessData.current.find(acc => acc.access_request_id === accessId);
      
      const { error } = await supabase
        .from('thesis_access_requests')
        .update({
          status: 'removed',
          remove_access_date: new Date().toISOString()
        })
        .eq('access_request_id', accessId);

      if (error) {
        console.error('Error removing access:', error);
        throw error;
      }

      // Create notification for user
      if (access) {
        await supabase
          .from('notifications')
          .insert({
            user_id: access.user_id,
            thesis_id: access.thesis_id,
            access_request_id: accessId,
            title: 'Access Removed',
            message: `Your access to "${access.theses.title}" has been removed by an administrator.`,
            type: 'warning'
          });
      }

      // Refresh data
      fetchAccessData();

    } catch (error) {
      console.error('Error removing access:', error);
    }
  };

  // Calculate days remaining for approved access
  const getDaysRemaining = (approvedDate) => {
    if (!approvedDate) return 0;
    
    const approved = new Date(approvedDate);
    const expiration = new Date(approved.getTime() + (expirationDays * 24 * 60 * 60 * 1000));
    const now = new Date();
    const diffTime = expiration - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get expiration status badge
  const getExpirationBadge = (approvedDate) => {
    const daysRemaining = getDaysRemaining(approvedDate);
    
    if (daysRemaining <= 0) {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Expired</span>;
    } else if (daysRemaining <= 3) {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">Expiring in {daysRemaining} days</span>;
    } else if (daysRemaining <= 7) {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">{daysRemaining} days left</span>;
    } else {
      return <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">{daysRemaining} days left</span>;
    }
  };

  useEffect(() => {
    fetchAccessData();
    
    // Set up interval to check for expired access every hour
    const interval = setInterval(() => {
      checkAndRemoveExpiredAccess();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status, approvedDate = null) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      removed: { color: 'bg-gray-100 text-gray-800', label: 'Removed' },
      expired: { color: 'bg-red-100 text-red-800', label: 'Expired' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="admin" />

      <div className="flex-1 flex">
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">THESIS GUARD</h1>
              <p className="text-xl font-semibold text-white">Thesis Access Management</p>
              <p className="text-greyy-700 mt-2">Manage thesis access requests and track user access</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <User className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stats.currentAccess}</p>
                    <p className="text-gray-600">Current Access</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <Check className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stats.approvedThisMonth}</p>
                    <p className="text-gray-600">Approved This Month</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <History className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stats.requestsThisMonth}</p>
                    <p className="text-gray-600">Requests This Month</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-orange-100 p-3 rounded-full">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stats.expiredToday}</p>
                    <p className="text-gray-600">Expired Today</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg">
              <div className="flex space-x-4 border-b border-gray-200">
                <button
                  className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                    activeTab === 'requests'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('requests')}
                >
                  Pending Requests ({accessData.requests.length})
                </button>
                <button
                  className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                    activeTab === 'current'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('current')}
                >
                  Current Access ({accessData.current.length})
                </button>
                <button
                  className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('history')}
                >
                  History ({accessData.history.length})
                </button>
              </div>
            </div>

            {/* Search and Controls */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 w-full max-w-2xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search by user name, email, or thesis title..."
                      className="w-full pl-10 pr-4 py-3 rounded-l-full border border-gray-300 text-base outline-none"
                    />
                  </div>
                  <button className="bg-red-900 hover:bg-red-800 text-white px-6 py-3 rounded-r-full font-bold text-base flex items-center gap-2">
                    <Search size={20} />
                    Search
                  </button>
                </div>
                
                <div className="flex gap-3">
                  <button className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-full font-semibold flex items-center gap-2">
                    <Filter size={20} />
                    Filter
                  </button>
                  
                  {activeTab === 'history' && (
                    <button className="bg-green-700 hover:bg-green-800 text-white px-4 py-3 rounded-full font-semibold flex items-center gap-2">
                      <Download size={20} />
                      Export
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Data Tables */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading data...</p>
                </div>
              ) : (
                <>
                  {/* Pending Requests Table */}
                  {activeTab === 'requests' && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 font-bold">
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">User</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Email</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Thesis Title</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Request Date</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessData.requests.map((item) => (
                            <tr key={item.access_request_id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-6 py-4 text-base font-semibold">
                                {item.users?.full_name || 'N/A'}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.users?.email || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.theses?.title || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {new Date(item.request_date).toLocaleDateString()}
                              </td>
                              <td className="border border-gray-300 px-6 py-4">
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleRequestAction(item.access_request_id, 'approve')}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                  >
                                    <Check size={16} />
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => handleRequestAction(item.access_request_id, 'reject')}
                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                  >
                                    <X size={16} />
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {accessData.requests.length === 0 && (
                            <tr>
                              <td colSpan="5" className="border border-gray-300 px-6 py-8 text-center text-gray-500">
                                No pending requests found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Current Access Table */}
                  {activeTab === 'current' && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 font-bold">
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">User</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Email</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Thesis Title</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Approved Date</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Expires In</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessData.current.map((item) => (
                            <tr key={item.access_request_id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-6 py-4 text-base font-semibold">
                                {item.users?.full_name || 'N/A'}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.users?.email || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.theses?.title || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {item.approved_date ? new Date(item.approved_date).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {item.approved_date ? getExpirationBadge(item.approved_date) : 'N/A'}
                              </td>
                              <td className="border border-gray-300 px-6 py-4">
                                <button 
                                  onClick={() => handleRemoveAccess(item.access_request_id)}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                                >
                                  Remove Access
                                </button>
                              </td>
                            </tr>
                          ))}
                          {accessData.current.length === 0 && (
                            <tr>
                              <td colSpan="6" className="border border-gray-300 px-6 py-8 text-center text-gray-500">
                                No current access found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* History Table */}
                  {activeTab === 'history' && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 font-bold">
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">User</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Email</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Thesis Title</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Request Date</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Status</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Removed Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {accessData.history.map((item) => (
                            <tr key={item.access_request_id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-6 py-4 text-base font-semibold">
                                {item.users?.full_name || 'N/A'}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.users?.email || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.theses?.title || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {new Date(item.request_date).toLocaleDateString()}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {getStatusBadge(item.status)}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {item.remove_access_date ? new Date(item.remove_access_date).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                          {accessData.history.length === 0 && (
                            <tr>
                              <td colSpan="6" className="border border-gray-300 px-6 py-8 text-center text-gray-500">
                                No history found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default BorrowedThesis;