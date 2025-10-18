import React, { useState, useEffect } from 'react';
import { Search, Download, Filter, Check, X, Clock, History } from 'lucide-react';
import bg from "../assets/bg-gradient.png"
import { useNavigate } from "react-router-dom";
import Header from '../components/Header';
import SideNav from '../components/SideNav';
import { supabase } from '../connect-supabase.js';

function BorrowedThesis() {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('requests');
  const [borrowingData, setBorrowingData] = useState({
    requests: [],
    current: [],
    history: []
  });
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    currentBorrows: 0,
    returnedThisMonth: 0,
    requestsThisMonth: 0
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogOut = () => {
    navigate('/')
  }

  // Fetch borrowing data
  const fetchBorrowingData = async () => {
    try {
      setLoading(true);
      
      // Fetch all borrowing requests with user and thesis data
      const { data, error } = await supabase
        .from('borrowing_requests')
        .select(`
          *,
          users:user_id (full_name, student_id, college, course, year_level),
          thesestwo:thesis_id (title, author, college, file_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Categorize data
      const requests = data.filter(item => item.status === 'pending');
      const current = data.filter(item => item.status === 'approved');
      const history = data.filter(item => ['returned', 'rejected'].includes(item.status));

      setBorrowingData({ requests, current, history });

      // Calculate statistics
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const returnedThisMonth = history.filter(item => 
        item.status === 'returned' && 
        new Date(item.return_date).getMonth() === currentMonth &&
        new Date(item.return_date).getFullYear() === currentYear
      ).length;

      const requestsThisMonth = data.filter(item => 
        new Date(item.request_date).getMonth() === currentMonth &&
        new Date(item.request_date).getFullYear() === currentYear
      ).length;

      setStats({
        currentBorrows: current.length,
        returnedThisMonth,
        requestsThisMonth
      });

    } catch (error) {
      console.error('Error fetching borrowing data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle request actions
  const handleRequestAction = async (requestId, action) => {
    try {
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        approved_date: action === 'approve' ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('borrowing_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Refresh data
      fetchBorrowingData();

    } catch (error) {
      console.error('Error updating request:', error);
    }
  };

  // Handle return action
  const handleReturn = async (borrowId) => {
    try {
      const { error } = await supabase
        .from('borrowing_requests')
        .update({
          status: 'returned',
          return_date: new Date().toISOString()
        })
        .eq('id', borrowId);

      if (error) throw error;

      // Refresh data
      fetchBorrowingData();

    } catch (error) {
      console.error('Error returning thesis:', error);
    }
  };

  useEffect(() => {
    fetchBorrowingData();
  }, []);

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      returned: { color: 'bg-blue-100 text-blue-800', label: 'Returned' }
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
      
      <Header onMenuToggle={toggleSidebar} onLogOut={handleLogOut} />

      <div className="flex-1 flex">
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">THESIS HUB</h1>
              <p className="text-xl font-semibold text-white">Borrowing Management</p>
              <p className="text-greyy-700 mt-2">Manage thesis borrowing requests and track borrowed theses</p>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <Clock className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stats.currentBorrows}</p>
                    <p className="text-gray-600">Currently Borrowed</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-green-100 p-3 rounded-full">
                    <History className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stats.returnedThisMonth}</p>
                    <p className="text-gray-600">Returned This Month</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-100 p-3 rounded-full">
                    <Filter className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-800">{stats.requestsThisMonth}</p>
                    <p className="text-gray-600">Requests This Month</p>
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
                  Pending Requests ({borrowingData.requests.length})
                </button>
                <button
                  className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                    activeTab === 'current'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('current')}
                >
                  Currently Borrowed ({borrowingData.current.length})
                </button>
                <button
                  className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                    activeTab === 'history'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('history')}
                >
                  History ({borrowingData.history.length})
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
                      placeholder="Search by student name, ID, or thesis title..."
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
                  <button className="bg-green-700 hover:bg-green-800 text-white px-4 py-3 rounded-full font-semibold flex items-center gap-2">
                    <Download size={20} />
                    Export
                  </button>
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
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Department</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">ID No.</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Name</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Thesis Title</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Request Date</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Duration</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {borrowingData.requests.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.users?.college || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base font-mono">{item.users?.student_id || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base font-semibold">{item.users?.full_name || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.thesestwo?.title || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{new Date(item.request_date).toLocaleDateString()}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.duration_days} days</td>
                              <td className="border border-gray-300 px-6 py-4">
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => handleRequestAction(item.id, 'approve')}
                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                  >
                                    <Check size={16} />
                                    Approve
                                  </button>
                                  <button 
                                    onClick={() => handleRequestAction(item.id, 'reject')}
                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                                  >
                                    <X size={16} />
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {borrowingData.requests.length === 0 && (
                            <tr>
                              <td colSpan="7" className="border border-gray-300 px-6 py-8 text-center text-gray-500">
                                No pending requests found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Currently Borrowed Table */}
                  {activeTab === 'current' && (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100 font-bold">
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Department</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">ID No.</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Name</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Thesis Title</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Borrow Date</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Due Date</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {borrowingData.current.map((item) => {
                            const dueDate = new Date(item.approved_date);
                            dueDate.setDate(dueDate.getDate() + item.duration_days);
                            const isOverdue = new Date() > dueDate;

                            return (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="border border-gray-300 px-6 py-4 text-base">{item.users?.college || 'N/A'}</td>
                                <td className="border border-gray-300 px-6 py-4 text-base font-mono">{item.users?.student_id || 'N/A'}</td>
                                <td className="border border-gray-300 px-6 py-4 text-base font-semibold">{item.users?.full_name || 'N/A'}</td>
                                <td className="border border-gray-300 px-6 py-4 text-base">{item.thesestwo?.title || 'N/A'}</td>
                                <td className="border border-gray-300 px-6 py-4 text-base">{new Date(item.approved_date).toLocaleDateString()}</td>
                                <td className="border border-gray-300 px-6 py-4 text-base">
                                  <span className={`px-2 py-1 rounded text-sm font-semibold ${
                                    isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {dueDate.toLocaleDateString()}
                                    {isOverdue && ' (Overdue)'}
                                  </span>
                                </td>
                                <td className="border border-gray-300 px-6 py-4">
                                  <button 
                                    onClick={() => handleReturn(item.id)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                                  >
                                    Mark as Returned
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                          {borrowingData.current.length === 0 && (
                            <tr>
                              <td colSpan="7" className="border border-gray-300 px-6 py-8 text-center text-gray-500">
                                No currently borrowed theses
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
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Department</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">ID No.</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Name</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Thesis Title</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Request Date</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Status</th>
                            <th className="border border-gray-300 px-6 py-4 text-left text-base">Return Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {borrowingData.history.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.users?.college || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base font-mono">{item.users?.student_id || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base font-semibold">{item.users?.full_name || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{item.thesestwo?.title || 'N/A'}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">{new Date(item.request_date).toLocaleDateString()}</td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {getStatusBadge(item.status)}
                              </td>
                              <td className="border border-gray-300 px-6 py-4 text-base">
                                {item.return_date ? new Date(item.return_date).toLocaleDateString() : 'N/A'}
                              </td>
                            </tr>
                          ))}
                          {borrowingData.history.length === 0 && (
                            <tr>
                              <td colSpan="7" className="border border-gray-300 px-6 py-8 text-center text-gray-500">
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