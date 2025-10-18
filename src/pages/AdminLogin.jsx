import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '../connect-supabase.js';
import bg from '../assets/bg-gradient.png';
import logo from '../assets/logo.png'; // Import the logo

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(user);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please enter both username and password');
      setLoading(false);
      return;
    }

    // Check if user is already logged in as a student
    if (currentUser && currentUser.role === 'user') {
      setError('You are currently logged in as a student. Please log out first before accessing admin portal.');
      setLoading(false);
      return;
    }

    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, username, password, role, full_name, status')
        .eq('username', username)
        .maybeSingle();

      if (error || !user) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      if (user.status !== 'active') {
        setError('Your account is inactive. Please contact administrator.');
        setLoading(false);
        return;
      }

      if (user.password !== password) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      if (user.role !== 'admin') {
        setError('Access denied. This portal is for administrators only.');
        setLoading(false);
        return;
      }

      // Store user session
      localStorage.setItem('user', JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name
      }));

      // Redirect to admin dashboard
      navigate('/admin-homepage');

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-screen min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Custom Header for Admin Login with Back Button on Right */}
      <header className="w-full flex items-center justify-between px-6 py-4 text-white">
        {/* Logo and College Name */}
        <div className="flex items-center space-x-4">
          <img src={logo} alt="CNSC Logo" className="w-16 h-16" />
          <div>
            <h1 className="font-bold text-lg leading-tight">CAMARINES NORTE STATE COLLEGE</h1>
            <p className="text-sm">F. Pimentel Avenue, Daet, Camarines Norte, Philippines</p>
          </div>
        </div>
        
        {/* Back Button on Top Right */}
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors p-2 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm"
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <Shield className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-red-800 mb-2">Admin Portal</h2>
              <p className="text-gray-600">
                Access the Thesis Hub management system
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Username Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter admin username"
                    className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    disabled={loading || (currentUser && currentUser.role === 'user')}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    disabled={loading || (currentUser && currentUser.role === 'user')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading || (currentUser && currentUser.role === 'user')}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Signing In...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    {currentUser && currentUser.role === 'user' ? 'Logout Required' : 'Sign In'}
                  </>
                )}
              </button>
            </form>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Secure access for authorized administrators only.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;