import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, BookOpen, Users, TrendingUp, Shield } from 'lucide-react';
import bgImage from '../assets/bg-gradient.png';
import CommonHeader from '../components/CommonHeader';
import { supabase } from '../connect-supabase';

export default function ThesisHubHome() {
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState({ totalTheses: 0, totalColleges: 0, recentUploads: 0 });
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshHeader, setRefreshHeader] = useState(0); // Add refresh trigger
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    checkUserStatus();
  }, [refreshHeader]); // Add dependency

  const checkUserStatus = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
  };

  const fetchStats = async () => {
    try {
      const { count: totalTheses } = await supabase
        .from('thesestwo')
        .select('*', { count: 'exact', head: true });

      const { data: colleges } = await supabase
        .from('thesestwo')
        .select('college')
        .not('college', 'is', null);

      const uniqueColleges = new Set(colleges?.map(item => item.college) || []);
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: recentUploads } = await supabase
        .from('thesestwo')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats({
        totalTheses: totalTheses || 0,
        totalColleges: uniqueColleges.size,
        recentUploads: recentUploads || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setLoading(true);
      navigate(`/results?q=${encodeURIComponent(query)}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const handleUserLogin = () => {
    if (currentUser) {
      if (currentUser.role === 'user') {
        navigate('/user-dashboard');
      } else {
        navigate('/admin-homepage');
      }
    } else {
      navigate('/user-login');
    }
  };

  const handleAdminLogin = () => {
    if (currentUser) {
      if (currentUser.role === 'user') {
        alert('Please log out from your user account first before accessing the admin portal.');
        return;
      } else if (currentUser.role === 'admin') {
        navigate('/admin-homepage');
        return;
      }
    }
    navigate('/admin-login');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setRefreshHeader(prev => prev + 1); // Force header refresh
  };

  return (
    <div
      className="w-full min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Common Header with key to force re-render */}
      <CommonHeader 
        key={refreshHeader} // Force re-render when this changes
        isAuthenticated={!!currentUser} 
        onLogOut={handleLogout}
        hideLoginButton={true}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center text-black px-4 py-8">
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto mb-12">
          <h1 className="text-6xl font-extrabold text-red-800 drop-shadow-md mb-6">
            THESIS HUB
          </h1>
          <p className="text-xl text-gray-800 mb-8 leading-relaxed">
            Discover, explore, and access comprehensive research papers and theses from Camarines Norte State College. 
            A centralized platform for academic research and knowledge sharing.
          </p>

          {/* Search Section */}
          <form onSubmit={handleSearch} className="mb-12">
            <div className="flex items-center bg-white shadow-2xl rounded-full overflow-hidden border-2 border-red-200 w-full max-w-2xl mx-auto transition-all duration-300 hover:border-red-300">
              <Search className="ml-4 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search by title, author, keywords, or abstract..."
                className="flex-grow p-4 text-gray-700 text-lg outline-none"
              />
              <button 
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Search
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <BookOpen className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-red-800">{stats.totalTheses}+</div>
              <div className="text-gray-700 font-semibold">Research Papers</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <Users className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-red-800">{stats.totalColleges}</div>
              <div className="text-gray-700 font-semibold">Colleges</div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <TrendingUp className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <div className="text-3xl font-bold text-red-800">{stats.recentUploads}</div>
              <div className="text-gray-700 font-semibold">Recent Uploads</div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="max-w-4xl mx-auto mt-8">
          <h3 className="text-2xl font-bold text-red-800 mb-6">Quick Access</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button 
              onClick={() => navigate('/results')}
              className="bg-red-700 hover:bg-red-800 text-white p-6 rounded-2xl text-lg font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
            >
              <BookOpen size={24} />
              Browse All Theses
            </button>
            
            {!currentUser ? (
              <button 
                onClick={handleUserLogin}
                className="bg-white hover:bg-gray-100 text-red-700 p-6 rounded-2xl text-lg font-semibold border-2 border-red-700 transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
              >
                <Users size={24} />
                Student Login
              </button>
            ) : (
              <button 
                onClick={handleUserLogin}
                className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-2xl text-lg font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3"
              >
                <BookOpen size={24} />
                Go to {currentUser.role === 'admin' ? 'Admin' : 'Student'} Dashboard
              </button>
            )}
          </div>
          
          {/* Admin Access - Separate Section */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-3">Administrator Access</p>
            <button 
              onClick={handleAdminLogin}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 mx-auto ${
                currentUser && currentUser.role === 'user'
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-gray-700 hover:bg-gray-800 text-white'
              }`}
              disabled={currentUser && currentUser.role === 'user'}
              title={currentUser && currentUser.role === 'user' ? 'Please log out from student account first' : 'Access Admin Portal'}
            >
              <Shield size={20} />
              {currentUser && currentUser.role === 'admin' ? 'Admin Panel' : 'Admin Portal'}
            </button>
          </div>
        </div>

        <p className="text-sm mt-12 text-gray-600">
          Last Updated: Batch 2022 - 2023 • Continuously updated with new research
        </p>
      </main>
    </div>
  );
}