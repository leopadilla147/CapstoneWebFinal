import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-gradient.png";
import CommonHeader from '../components/CommonHeader.jsx';
import SideNav from '../components/SideNav';
import { supabase } from '../connect-supabase.js';

const AdminHomePage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalTheses: 0,
    currentlyBorrowed: 0,
    newThisMonth: 0,
    pendingRequests: 0
  });
  const [departmentStats, setDepartmentStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
    fetchAllData();
  }, []);

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

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStatistics(),
        fetchDepartmentStats(),
        fetchRecentActivity()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
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

      // Fetch currently accessed count (approved access requests)
      const { count: currentlyBorrowed, error: borrowError } = await supabase
        .from('thesis_access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (borrowError) throw borrowError;

      // Fetch new theses this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();

      const { count: newThisMonth, error: newThesesError } = await supabase
        .from('theses')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (newThesesError) throw newThesesError;

      // Fetch pending requests count
      const { count: pendingRequests, error: pendingError } = await supabase
        .from('thesis_access_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      setStats({
        totalTheses: totalTheses || 0,
        currentlyBorrowed: currentlyBorrowed || 0,
        newThisMonth: newThisMonth || 0,
        pendingRequests: pendingRequests || 0
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchDepartmentStats = async () => {
    try {
      // Fetch department-wise distribution from theses table
      const { data: thesesData, error: thesesDataError } = await supabase
        .from('theses')
        .select('college_department');

      if (thesesDataError) throw thesesDataError;

      // Calculate department statistics
      const departmentCounts = {};
      thesesData?.forEach(thesis => {
        const deptName = thesis.college_department || 'Unknown';
        departmentCounts[deptName] = (departmentCounts[deptName] || 0) + 1;
      });

      // Get all departments for consistent colors
      const { data: allDepartments, error: deptsError } = await supabase
        .from('college_departments')
        .select('department_id, department_name, department_code')
        .order('department_name');

      if (!deptsError && allDepartments) {
        const departmentColors = [
          'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
          'bg-orange-500', 'bg-pink-500', 'bg-indigo-500',
          'bg-teal-500', 'bg-red-500', 'bg-yellow-500'
        ];

        const formattedDepartmentStats = allDepartments.map((dept, index) => ({
          id: dept.department_id,
          name: dept.department_code,
          fullName: dept.department_name,
          count: departmentCounts[dept.department_name] || 0,
          color: departmentColors[index % departmentColors.length]
        }));

        // Sort by count descending
        formattedDepartmentStats.sort((a, b) => b.count - a.count);
        setDepartmentStats(formattedDepartmentStats);
      }
    } catch (error) {
      console.error('Error fetching department stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      // Fetch recent access requests with user information
      const { data: recentRequests, error } = await supabase
        .from('thesis_access_requests')
        .select(`
          *,
          users:user_id(full_name, email),
          theses:thesis_id(title)
        `)
        .order('request_date', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentActivity(recentRequests || []);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  // Refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAllData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="admin" />

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex">
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* Main Content - Expanded */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-[#990000] mb-2">
                Welcome back, {currentUser?.fullName || 'Admin'}!
              </h1>
              <p className="text-gray-600 text-lg">
                Here's what's happening with your thesis management system today.
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded mb-2 w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[#990000] mb-2">{stats.totalTheses}</div>
                    <div className="text-gray-700 font-semibold">Total Theses</div>
                  </>
                )}
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded mb-2 w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[#990000] mb-2">{stats.currentlyBorrowed}</div>
                    <div className="text-gray-700 font-semibold">Currently Accessed</div>
                  </>
                )}
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded mb-2 w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[#990000] mb-2">{stats.newThisMonth}</div>
                    <div className="text-gray-700 font-semibold">New This Month</div>
                  </>
                )}
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-l-4 border-yellow-500">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded mb-2 w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[#990000] mb-2">{stats.pendingRequests}</div>
                    <div className="text-gray-700 font-semibold">Pending Requests</div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Department-wise Statistics */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-[#990000] mb-6">Department-wise Thesis Distribution</h3>
                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-16 mx-auto"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {departmentStats.map((dept, index) => (
                      <div 
                        key={dept.id} 
                        className="text-center p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                        title={dept.fullName}
                      >
                        <div className={`w-12 h-12 ${dept.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                          <span className="text-white font-bold">{dept.count}</span>
                        </div>
                        <div className="font-semibold text-gray-700 text-sm">{dept.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{dept.count} theses</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="text-2xl font-bold text-[#990000] mb-6">Recent Activity</h3>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, index) => (
                      <div key={index} className="flex items-center space-x-3 animate-pulse">
                        <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={activity.access_request_id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {activity.users?.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800">
                            <span className="font-semibold">{activity.users?.full_name || 'User'}</span> requested access to "{activity.theses?.title || 'Thesis'}"
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatTimeAgo(activity.request_date)} • 
                            <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                              activity.status === 'approved' ? 'bg-green-100 text-green-800' :
                              activity.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {activity.status}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No recent activity</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold text-[#990000] mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button 
                  onClick={() => navigate('/add-thesis-page')}
                  className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors border-2 border-blue-200"
                >
                  <div className="text-blue-600 font-semibold">Add New Thesis</div>
                  <div className="text-sm text-blue-500 mt-1">Upload research papers</div>
                </button>
                
                <button 
                  onClick={() => navigate('/borrowed-thesis')}
                  className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors border-2 border-green-200"
                >
                  <div className="text-green-600 font-semibold">Manage Access</div>
                  <div className="text-sm text-green-500 mt-1">Review requests</div>
                </button>
                
                <button 
                  onClick={() => navigate('/thesis-viewing')}
                  className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors border-2 border-purple-200"
                >
                  <div className="text-purple-600 font-semibold">View Theses</div>
                  <div className="text-sm text-purple-500 mt-1">Browse all research</div>
                </button>
                
                <button 
                  onClick={() => navigate('/smart-iot-bookshelf')}
                  className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg text-center transition-colors border-2 border-orange-200"
                >
                  <div className="text-orange-600 font-semibold">IoT Bookshelf</div>
                  <div className="text-sm text-orange-500 mt-1">Manage devices</div>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminHomePage;