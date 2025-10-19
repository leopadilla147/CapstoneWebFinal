import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Clock, CheckCircle, XCircle, Search, BookOpen, Calendar, User, RefreshCw } from 'lucide-react';
import bg from "../assets/bg-gradient.png";
import CommonHeader from '../components/CommonHeader';
import UserSideNav from '../components/UserSideNav';
import { supabase } from '../connect-supabase.js';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActivities: 0,
    pendingRequests: 0,
    approvedAccess: 0
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/');
        return;
      }

      const userData = JSON.parse(storedUser);
      if (userData.role !== 'user' && userData.role !== 'student') {
        navigate('/');
        return;
      }
      setUser(userData);

      await fetchUserActivities(userData.id);
      
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserActivities = async (userId) => {
    try {
      // CORRECTED: Use 'thesis_access_request' table (singular) instead of 'thesis_access_requests'
      // CORRECTED: Use 'theses' table instead of 'themes'
      const { data: accessRequests, error } = await supabase
        .from('thesis_access_requests')
        .select(`
          *,
          theses (
            thesis_id,
            title,
            author,
            college_department
          )
        `)
        .eq('user_id', userId)
        .order('request_date', { ascending: false });

      if (error) throw error;

      // Transform data to match the activity format
      const activities = accessRequests.map(request => {
        let status, type, duration;
        
        switch (request.status) {
          case 'approved':
            status = 'completed';
            type = 'thesis_access';
            const dueDate = new Date(request.approved_date);
            dueDate.setDate(dueDate.getDate() + 7); // Default 7 days
            duration = `Approved for 7 days`;
            break;
          case 'pending':
            status = 'pending';
            type = 'access_request';
            duration = 'Requested';
            break;
          case 'rejected':
            status = 'rejected';
            type = 'access_request';
            duration = 'Denied';
            break;
          case 'returned':
            status = 'completed';
            type = 'thesis_access';
            duration = 'Returned';
            break;
          default:
            status = 'pending';
            type = 'access_request';
            duration = 'Requested';
        }

        return {
          id: request.access_request_id,
          type: type,
          title: request.theses?.title || 'Unknown Thesis',
          status: status,
          date: new Date(request.request_date).toLocaleDateString(),
          time: new Date(request.request_date).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          duration: duration,
          thesisDetails: request.theses,
          requestData: request
        };
      });

      setUserActivity(activities);

      // Calculate stats
      const pendingRequests = activities.filter(activity => activity.status === 'pending').length;
      const approvedAccess = activities.filter(activity => 
        activity.status === 'completed' && activity.type === 'thesis_access'
      ).length;

      setStats({
        totalActivities: activities.length,
        pendingRequests: pendingRequests,
        approvedAccess: approvedAccess
      });

    } catch (error) {
      console.error('Error fetching user activities:', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogOut = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleRefresh = () => {
    if (user) {
      fetchUserActivities(user.id);
    }
  };

  const pendingRequests = userActivity.filter(activity => activity.status === 'pending');
  const recentActivity = userActivity
    .filter(activity => activity.status === 'completed')
    .slice(0, 3);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActivityTypeText = (type) => {
    return type === 'thesis_access' ? 'Thesis Access' : 'Access Request';
  };

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
        <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="user" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-white mt-4">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="user" />

      <div className="flex-1 flex">
        <UserSideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold text-black mb-2">
                    Welcome back{user?.fullName ? `, ${user.fullName}` : '!'}
                  </h1>
                  <p className="text-black/80 text-lg">
                    Track your thesis access requests and viewing history
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center">
                <History className="w-12 h-12 text-red-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-red-800">{stats.totalActivities}</div>
                <div className="text-gray-700 font-semibold">Total Activities</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center">
                <Clock className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-yellow-800">{stats.pendingRequests}</div>
                <div className="text-gray-700 font-semibold">Pending Requests</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <div className="text-3xl font-bold text-green-800">{stats.approvedAccess}</div>
                <div className="text-gray-700 font-semibold">Approved Access</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Pending Requests */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#990000]">Pending Requests</h2>
                  <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {pendingRequests.length} pending
                  </span>
                </div>

                {pendingRequests.length > 0 ? (
                  <div className="space-y-4">
                    {pendingRequests.map(request => (
                      <div key={request.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">{request.title}</h3>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <User size={14} />
                              {request.thesisDetails?.author || 'Unknown Author'}
                            </p>
                          </div>
                          {getStatusIcon(request.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {request.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {request.time}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {getActivityTypeText(request.type)}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(request.status)}`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-gray-600">No pending requests</p>
                    <p className="text-sm text-gray-500">All your requests have been processed</p>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[#990000]">Recent Activity</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate('/user-history')}
                      className="text-red-600 hover:text-red-700 text-sm font-semibold"
                    >
                      View All
                    </button>
                  </div>
                </div>

                {recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map(activity => (
                      <div key={activity.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-1">{activity.title}</h3>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <User size={14} />
                              {activity.thesisDetails?.author || 'Unknown Author'}
                            </p>
                          </div>
                          {getStatusIcon(activity.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Calendar size={14} />
                            {activity.date}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock size={14} />
                            {activity.time}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(activity.status)}`}>
                            {activity.duration}
                          </span>
                          <div className="flex gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(activity.status)}`}>
                              {getActivityTypeText(activity.type)}
                            </span>
                            {activity.requestData?.theses?.pdf_file_url && (
                              <button 
                                onClick={() => window.open(activity.requestData.theses.pdf_file_url, '_blank')}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                View Thesis
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No recent activity</p>
                    <p className="text-sm text-gray-500">Your access history will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Additional Info */}
            {userActivity.length > 0 && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-[#990000] mb-4">Activity Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Requests:</span>
                      <span className="font-semibold">{stats.totalActivities}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Currently Pending:</span>
                      <span className="font-semibold text-yellow-600">{stats.pendingRequests}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Successfully Approved:</span>
                      <span className="font-semibold text-green-600">{stats.approvedAccess}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Rejected Requests:</span>
                      <span className="font-semibold text-red-600">
                        {userActivity.filter(activity => activity.status === 'rejected').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h3 className="text-xl font-bold text-[#990000] mb-4">College Distribution</h3>
                  <div className="space-y-2">
                    {(() => {
                      const collegeCounts = {};
                      userActivity.forEach(activity => {
                        const college = activity.thesisDetails?.college_department || 'Unknown';
                        collegeCounts[college] = (collegeCounts[college] || 0) + 1;
                      });

                      return Object.entries(collegeCounts)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)
                        .map(([college, count]) => (
                          <div key={college} className="flex justify-between items-center">
                            <span className="text-gray-600 truncate">{college}</span>
                            <span className="font-semibold">{count} requests</span>
                          </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-[#990000] mb-4">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => navigate('/results')}
                  className="bg-red-600 hover:bg-red-700 text-white p-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3"
                >
                  <Search size={20} />
                  Search Theses
                </button>
                <button 
                  onClick={() => navigate('/user-history')}
                  className="bg-gray-600 hover:bg-gray-700 text-white p-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3"
                >
                  <History size={20} />
                  View Full History
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserDashboard;