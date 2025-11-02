import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, Clock, BookOpen, User, Filter, Eye, X, RefreshCw } from 'lucide-react';
import bg from "../assets/bg-gradient.png";
import CommonHeader from '../components/CommonHeader';
import UserSideNav from '../components/UserSideNav';
import { supabase } from '../connect-supabase.js';

const UserHistory = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (!userData || (userData.role !== 'user' && userData.role !== 'student')) {
      navigate('/');
      return;
    }
    setUser(userData);
    fetchUserHistory(userData.id);
  }, [navigate]);

  const fetchUserHistory = async (userId) => {
    setLoading(true);
    setError('');
    try {
      console.log('Fetching history for user:', userId);

      // CORRECTED: Use 'thesis_access_request' and 'theses' table names
      const { data: accessRequests, error: fetchError } = await supabase
        .from('thesis_access_requests')
        .select(`
          *,
          theses (
            thesis_id,
            title,
            author,
            college_department,
            pdf_file_url,
            qr_code_url,
            batch
          )
        `)
        .eq('user_id', userId)
        .order('request_date', { ascending: false });

      if (fetchError) {
        console.error('Supabase fetch error:', fetchError);
        await trySimpleQuery(userId);
        return;
      }

      console.log('Fetched access requests:', accessRequests);

      // Transform data to match the activity format
      const userActivities = accessRequests.map(request => {
        let status, accessType, duration;

        // Map status and determine access type
        switch (request.status) {
          case 'approved':
            status = 'completed';
            accessType = 'view';
            duration = `Approved`;
            break;
          case 'pending':
            status = 'pending';
            accessType = 'request';
            duration = 'Pending approval';
            break;
          case 'rejected':
            status = 'rejected';
            accessType = 'request';
            duration = 'Request denied';
            break;
          case 'returned':
            status = 'completed';
            accessType = 'view';
            duration = 'Returned';
            break;
          case 'cancelled':
            status = 'rejected';
            accessType = 'request';
            duration = 'Cancelled';
            break;
          default:
            status = 'pending';
            accessType = 'request';
            duration = 'Pending approval';
        }

        const accessDate = request.request_date || request.created_at;
        
        return {
          id: request.access_request_id,
          thesisId: request.theses?.thesis_id || `T-${request.thesis_id}`,
          title: request.theses?.title || 'Unknown Thesis',
          author: request.theses?.author || 'Unknown Author',
          college: request.theses?.college_department || 'Unknown College',
          accessType: accessType,
          status: status,
          accessDate: accessDate,
          duration: duration,
          qrCodeUrl: request.theses?.qr_code_url,
          fileUrl: request.theses?.pdf_file_url,
          batch: request.theses?.batch,
          requestData: request,
          thesisDetails: request.theses
        };
      });

      console.log('Transformed activities:', userActivities);
      setActivities(userActivities);
      setFilteredActivities(userActivities);

    } catch (error) {
      console.error('Error fetching user history:', error);
      setError('Failed to load your history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Simple query method as fallback
  const trySimpleQuery = async (userId) => {
    try {
      // First get access requests - CORRECTED table name
      const { data: simpleRequests, error: simpleError } = await supabase
        .from('thesis_access_request')
        .select('*')
        .eq('user_id', userId)
        .order('request_date', { ascending: false });

      if (simpleError) throw simpleError;

      console.log('Simple requests data:', simpleRequests);

      // Then get all thesis data in one query to avoid multiple requests
      const thesisIds = simpleRequests.map(req => req.thesis_id).filter(id => id);
      // CORRECTED: Use 'theses' table instead of 'themes'
      const { data: theses, error: thesesError } = await supabase
        .from('theses')
        .select('*')
        .in('thesis_id', thesisIds);

      if (thesesError) {
        console.error('Error fetching theses:', thesesError);
        // If batch fetch fails, create activities without thesis details
        createActivitiesWithoutTheses(simpleRequests);
        return;
      }

      console.log('Fetched theses:', theses);

      // Create a map for easy lookup
      const thesisMap = {};
      theses.forEach(thesis => {
        thesisMap[thesis.thesis_id] = thesis;
      });

      // Transform data
      const userActivities = simpleRequests.map(request => {
        const thesisData = thesisMap[request.thesis_id];
        
        let status, accessType, duration;

        switch (request.status) {
          case 'approved':
            status = 'completed';
            accessType = 'view';
            duration = `Approved`;
            break;
          case 'pending':
            status = 'pending';
            accessType = 'request';
            duration = 'Pending approval';
            break;
          case 'rejected':
            status = 'rejected';
            accessType = 'request';
            duration = 'Request denied';
            break;
          case 'returned':
            status = 'completed';
            accessType = 'view';
            duration = 'Returned';
            break;
          case 'cancelled':
            status = 'rejected';
            accessType = 'request';
            duration = 'Cancelled';
            break;
          default:
            status = 'pending';
            accessType = 'request';
            duration = 'Pending approval';
        }

        const accessDate = request.request_date || request.created_at;

        return {
          id: request.access_request_id,
          thesisId: thesisData?.thesis_id || `T-${request.thesis_id}`,
          title: thesisData?.title || 'Unknown Thesis',
          author: thesisData?.author || 'Unknown Author',
          college: thesisData?.college_department || 'Unknown College',
          accessType: accessType,
          status: status,
          accessDate: accessDate,
          duration: duration,
          qrCodeUrl: thesisData?.qr_code_url,
          fileUrl: thesisData?.pdf_file_url,
          batch: thesisData?.batch,
          requestData: request,
          thesisDetails: thesisData
        };
      });

      console.log('Activities with simple query:', userActivities);
      setActivities(userActivities);
      setFilteredActivities(userActivities);

    } catch (altError) {
      console.error('Simple query also failed:', altError);
      // Last resort: create activities with minimal data
      createActivitiesWithoutTheses([]);
      setError('Unable to load detailed history. Showing basic request information.');
    }
  };

  // Create activities without thesis data as last resort
  const createActivitiesWithoutTheses = (requests) => {
    const userActivities = requests.map(request => {
      let status, accessType, duration;

      switch (request.status) {
        case 'approved':
          status = 'completed';
          accessType = 'view';
          duration = `Approved`;
          break;
        case 'pending':
          status = 'pending';
          accessType = 'request';
          duration = 'Pending approval';
          break;
        case 'rejected':
          status = 'rejected';
          accessType = 'request';
          duration = 'Request denied';
          break;
        case 'returned':
          status = 'completed';
          accessType = 'view';
          duration = 'Returned';
          break;
        case 'cancelled':
          status = 'rejected';
          accessType = 'request';
          duration = 'Cancelled';
          break;
        default:
          status = 'pending';
          accessType = 'request';
          duration = 'Pending approval';
      }

      const accessDate = request.request_date || request.created_at;

      return {
        id: request.access_request_id,
        thesisId: `T-${request.thesis_id}`,
        title: 'Thesis Information Unavailable',
        author: 'Unknown Author',
        college: 'Unknown College',
        accessType: accessType,
        status: status,
        accessDate: accessDate,
        duration: duration,
        qrCodeUrl: null,
        fileUrl: null,
        batch: null,
        requestData: request,
        thesisDetails: null
      };
    });

    setActivities(userActivities);
    setFilteredActivities(userActivities);
  };

  // Filter activities based on search and filters
  useEffect(() => {
    let filtered = activities;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.college.toLowerCase().includes(searchTerm.toLowerCase()) ||
        activity.thesisId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(activity => activity.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      filtered = filtered.filter(activity => {
        if (!activity.accessDate) return false;
        
        const activityDate = new Date(activity.accessDate);
        switch (dateFilter) {
          case 'today':
            return activityDate >= today;
          case 'yesterday':
            return activityDate >= yesterday && activityDate < today;
          case 'week':
            return activityDate >= lastWeek;
          case 'month':
            return activityDate >= lastMonth;
          default:
            return true;
        }
      });
    }

    setFilteredActivities(filtered);
  }, [searchTerm, statusFilter, dateFilter, activities]);

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
      fetchUserHistory(user.id);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'pending':
        return '⏳';
      case 'rejected':
        return '❌';
      default:
        return '📄';
    }
  };

  const getAccessTypeIcon = (accessType) => {
    return accessType === 'view' ? '👁️' : '📋';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }

    try {
      // CORRECTED: Use 'thesis_access_request' table
      const { error } = await supabase
        .from('thesis_access_request')
        .update({ status: 'cancelled' })
        .eq('access_request_id', requestId);

      if (error) throw error;

      if (user) {
        fetchUserHistory(user.id);
      }
      
      alert('Request cancelled successfully');
    } catch (error) {
      console.error('Error cancelling request:', error);
      setError('Failed to cancel request. Please try again.');
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || dateFilter !== 'all';

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="user" />

      <div className="flex-1 flex">
        <UserSideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-4xl font-bold text-black mb-2">Access History</h1>
                  <p className="text-black/80 text-lg">
                    Track your thesis viewing history and access requests
                  </p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors"
                  title="Refresh history"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 font-semibold">{error}</p>
                <button 
                  onClick={() => setError('')}
                  className="text-red-700 underline mt-2"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Filters and Search */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title, author, college, or thesis ID..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Filter size={16} className="inline mr-1" />
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar size={16} className="inline mr-1" />
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="yesterday">Yesterday</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>

                {/* Clear Filters */}
                <div className="flex items-end">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-2"
                    >
                      <X size={16} />
                      Clear Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')}>
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {statusFilter !== 'all' && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Status: {statusFilter}
                      <button onClick={() => setStatusFilter('all')}>
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {dateFilter !== 'all' && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Date: {dateFilter}
                      <button onClick={() => setDateFilter('all')}>
                        <X size={14} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#990000]">
                  {loading ? 'Loading...' : `Found ${filteredActivities.length} activities`}
                </h2>
                {hasActiveFilters && (
                  <p className="text-white/80 text-sm">
                    Filtered from {activities.length} total activities
                  </p>
                )}
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                <p className="ml-4 text-white">Loading your history...</p>
              </div>
            )}

            {/* No Results */}
            {!loading && filteredActivities.length === 0 && (
              <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No activities found</h3>
                <p className="text-gray-500 mb-4">
                  {hasActiveFilters 
                    ? 'No activities match your current filters. Try adjusting your search criteria.'
                    : "You haven't made any thesis requests yet. Start by searching for research papers."
                  }
                </p>
                {hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/results')}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                  >
                    Browse Theses
                  </button>
                )}
              </div>
            )}

            {/* Activities List */}
            {!loading && filteredActivities.length > 0 && (
              <div className="space-y-4">
                {filteredActivities.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row gap-6">
                        {/* Activity Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="text-xl font-bold text-gray-800 leading-tight">
                              {activity.title}
                            </h3>
                            <div className="flex items-center gap-2 ml-4">
                              <span className="text-2xl">{getStatusIcon(activity.status)}</span>
                              <span className="text-lg">{getAccessTypeIcon(activity.accessType)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-gray-600">
                              <User size={16} className="text-red-600" />
                              <span className="font-medium">Author:</span>
                              <span>{activity.author}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <BookOpen size={16} className="text-red-600" />
                              <span className="font-medium">College:</span>
                              <span>{activity.college}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar size={16} className="text-red-600" />
                              <span className="font-medium">Date:</span>
                              <span>{formatDate(activity.accessDate)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock size={16} className="text-red-600" />
                              <span className="font-medium">Duration:</span>
                              <span>{activity.duration}</span>
                            </div>
                          </div>

                          {/* Status and Actions */}
                          <div className="flex flex-wrap gap-3 items-center">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${getStatusColor(activity.status)}`}>
                              {activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
                            </span>
                            
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                              {activity.accessType === 'view' ? 'Thesis Access' : 'Access Request'}
                            </span>

                            {activity.batch && (
                              <span className="px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                                Batch: {activity.batch}
                              </span>
                            )}

                            {activity.status === 'pending' && (
                              <button 
                                onClick={() => handleCancelRequest(activity.id)}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                              >
                                Cancel Request
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Thesis ID and Quick Info */}
                        <div className="lg:w-48 flex-shrink-0">
                          <div className="text-center space-y-3">
                            <div className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm font-medium text-gray-700">Thesis ID</p>
                              <p className="font-mono text-lg font-bold text-gray-900">{activity.thesisId}</p>
                            </div>
                            
                            {activity.qrCodeUrl && (
                              <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <img
                                  src={activity.qrCodeUrl}
                                  alt="QR Code"
                                  className="w-24 h-24 mx-auto"
                                />
                                <p className="text-xs text-gray-500 mt-2">Access QR Code</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Statistics Summary */}
            {!loading && filteredActivities.length > 0 && (
              <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <h3 className="text-xl font-bold text-[#990000] mb-4">Activity Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{activities.length}</div>
                    <div className="text-sm text-gray-600">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {activities.filter(a => a.status === 'completed').length}
                    </div>
                    <div className="text-sm text-gray-600">Approved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {activities.filter(a => a.status === 'pending').length}
                    </div>
                    <div className="text-sm text-gray-600">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {activities.filter(a => a.status === 'rejected').length}
                    </div>
                    <div className="text-sm text-gray-600">Rejected</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserHistory;