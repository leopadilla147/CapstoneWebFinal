import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import bg from "../assets/bg-gradient.png";
import Header from '../components/Header';
import SideNav from '../components/SideNav';
import { supabase } from '../connect-supabase.js';

const AdminPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalTheses: 0,
    currentlyBorrowed: 0,
    newThisMonth: 0
  });
  const [collegeStats, setCollegeStats] = useState([]);
  const [loading, setLoading] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogOut = () => {
    // Clear user session
    localStorage.removeItem('user');
    navigate('/');
  }

  // Fetch statistics from Supabase
  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // Fetch total theses count
      const { count: totalTheses, error: thesesError } = await supabase
        .from('thesestwo')
        .select('*', { count: 'exact', head: true });

      if (thesesError) throw thesesError;

      // Fetch currently borrowed count
      const { count: currentlyBorrowed, error: borrowError } = await supabase
        .from('borrowing_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      if (borrowError) throw borrowError;

      // Fetch new theses this month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString();

      const { count: newThisMonth, error: newThesesError } = await supabase
        .from('thesestwo')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);

      if (newThesesError) throw newThesesError;

      // Fetch college-wise distribution
      const { data: collegeData, error: collegeError } = await supabase
        .from('thesestwo')
        .select('college');

      if (collegeError) throw collegeError;

      // Calculate college statistics
      const collegeCounts = {};
      collegeData.forEach(thesis => {
        const college = thesis.college || 'Unknown';
        collegeCounts[college] = (collegeCounts[college] || 0) + 1;
      });

      // Map to the required college names and colors
      const collegeMapping = {
        'College of Arts and Sciences': { name: 'CAS', color: 'bg-blue-500' },
        'College of Business and Public Administration': { name: 'CBPA', color: 'bg-green-500' },
        'College of Education': { name: 'COE', color: 'bg-purple-500' },
        'College of Engineering': { name: 'CENG', color: 'bg-orange-500' },
        'College of Information and Communications Technology': { name: 'CICT', color: 'bg-pink-500' },
        'College of Computing and Multimedia Studies': { name: 'CCMS', color: 'bg-indigo-500' }
      };

      const formattedCollegeStats = Object.entries(collegeMapping).map(([fullName, info]) => ({
        name: info.name,
        fullName: fullName,
        count: collegeCounts[fullName] || 0,
        color: info.color
      }));

      // Sort by count descending
      formattedCollegeStats.sort((a, b) => b.count - a.count);

      setStats({
        totalTheses: totalTheses || 0,
        currentlyBorrowed: currentlyBorrowed || 0,
        newThisMonth: newThisMonth || 0
      });

      setCollegeStats(formattedCollegeStats);

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatistics();
  }, []);

  // Refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStatistics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <Header onMenuToggle={toggleSidebar} onLogOut={handleLogOut} />

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex">
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        {/* Main Content - Expanded */}
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="text-center mb-12">
              <h1 className="text-6xl font-bold text-[#990000] mb-6">THESIS HUB</h1>
              <p className="text-xl text-gray-800 max-w-4xl mx-auto leading-relaxed">
                Thesis Hub is a comprehensive platform where students can search, access, and manage research theses, 
                fostering academic collaboration, knowledge sharing, and innovative learning experiences across all departments.
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded mb-2 mx-auto w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-24 mx-auto"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[#990000] mb-2">{stats.totalTheses}</div>
                    <div className="text-gray-700 font-semibold">Total Theses</div>
                  </>
                )}
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded mb-2 mx-auto w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-24 mx-auto"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[#990000] mb-2">{stats.currentlyBorrowed}</div>
                    <div className="text-gray-700 font-semibold">Currently Borrowed</div>
                  </>
                )}
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg">
                {loading ? (
                  <div className="animate-pulse">
                    <div className="h-8 bg-gray-300 rounded mb-2 mx-auto w-16"></div>
                    <div className="h-4 bg-gray-300 rounded w-24 mx-auto"></div>
                  </div>
                ) : (
                  <>
                    <div className="text-3xl font-bold text-[#990000] mb-2">{stats.newThisMonth}</div>
                    <div className="text-gray-700 font-semibold">New This Month</div>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions Grid - Larger and More Prominent 
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 justify-items-center">
              <Link to="/add-thesis-page" className="w-full max-w-md transform transition hover:scale-105">
                <div className="bg-red-800 hover:bg-red-700 text-white font-bold text-2xl w-full h-40 rounded-2xl flex flex-col items-center justify-center text-center shadow-2xl">
                  <div className="text-4xl mb-2">📚</div>
                  Adding of Thesis
                </div>
              </Link>

              <Link to="/borrowed-thesis" className="w-full max-w-md transform transition hover:scale-105">
                <div className="bg-red-800 hover:bg-red-700 text-white font-bold text-2xl w-full h-40 rounded-2xl flex flex-col items-center justify-center text-center shadow-2xl">
                  <div className="text-4xl mb-2">👥</div>
                  Student's Borrowed Thesis
                </div>
              </Link>

              <Link to="/thesis-viewing" className="w-full max-w-md transform transition hover:scale-105 lg:col-span-2">
                <div className="bg-red-800 hover:bg-red-700 text-white font-bold text-2xl w-full h-40 rounded-2xl flex flex-col items-center justify-center text-center shadow-2xl">
                  <div className="text-4xl mb-2">🔍</div>
                  Viewing of Thesis
                </div>
              </Link>
            </div> */}

            {/* College-wise Statistics */}
            <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-[#990000] mb-6">College-wise Thesis Distribution</h3>
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="text-center p-4 bg-gray-50 rounded-lg animate-pulse">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-16 mx-auto"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {collegeStats.map((college, index) => (
                    <div 
                      key={index} 
                      className="text-center p-4 bg-gray-50 rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                      title={college.fullName}
                    >
                      <div className={`w-12 h-12 ${college.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                        <span className="text-white font-bold">{college.count}</span>
                      </div>
                      <div className="font-semibold text-gray-700">{college.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{college.count} theses</div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Total Summary */}
              {!loading && (
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-700">Total Theses Across All Colleges:</span>
                    <span className="text-2xl font-bold text-[#990000]">{stats.totalTheses}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Statistics */}
            {!loading && (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h4 className="text-xl font-bold text-[#990000] mb-4">Monthly Overview</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">New Theses This Month:</span>
                      <span className="font-semibold text-[#990000]">{stats.newThisMonth}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Active Borrows:</span>
                      <span className="font-semibold text-[#990000]">{stats.currentlyBorrowed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Thesis Growth Rate:</span>
                      <span className="font-semibold text-green-600">
                        {stats.totalTheses > 0 ? ((stats.newThisMonth / stats.totalTheses) * 100).toFixed(1) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <h4 className="text-xl font-bold text-[#990000] mb-4">Top Colleges</h4>
                  <div className="space-y-3">
                    {collegeStats.slice(0, 3).map((college, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-gray-600">{college.name}:</span>
                        <span className="font-semibold">{college.count} theses</span>
                      </div>
                    ))}
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

export default AdminPage;