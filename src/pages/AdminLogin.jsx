import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '../connect-supabase.js';
import bg from '../assets/bg-gradient.png';
import CommonHeader from '../components/CommonHeader';

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
    if (currentUser && (currentUser.role === 'student' || currentUser.role === 'user')) {
      setError('You are currently logged in as a student/user. Please log out first before accessing admin portal.');
      setLoading(false);
      return;
    }

    try {
      // Check in users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('user_id, username, password, full_name, email')
        .eq('username', username)
        .maybeSingle();

      if (userError) {
        console.error('User lookup error:', userError);
        setError('Database error. Please try again.');
        setLoading(false);
        return;
      }

      if (!user) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      // Verify password
      if (user.password !== password) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      // Check if user exists in admins table to confirm admin status
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('admin_id, position, college_department')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (adminError) {
        console.error('Admin lookup error:', adminError);
        setError('Database error. Please try again.');
        setLoading(false);
        return;
      }

      if (!adminData) {
        setError('Access denied. This portal is for administrators only.');
        setLoading(false);
        return;
      }

      // Update updated_at timestamp
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        // Continue with login even if update fails
      }

      // Store user session
      const userData = {
        id: user.user_id,
        username: user.username,
        role: 'admin',
        fullName: user.full_name,
        email: user.email,
        adminId: adminData.admin_id,
        position: adminData.position,
        department: adminData.college_department
      };
      localStorage.setItem('user', JSON.stringify(userData));

      // Check for pending access requests and create notifications
      await checkPendingAccessRequests(user.user_id);

      // Redirect to admin dashboard
      navigate('/admin-homepage');

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkPendingAccessRequests = async (adminUserId) => {
    try {
      // Get all pending access requests
      const { data: pendingRequests, error: requestsError } = await supabase
        .from('thesis_access_request')
        .select(`
          access_request_id,
          user_id,
          thesis_id,
          status,
          request_date,
          users!thesis_access_request_user_id_fkey(full_name, username),
          theses!thesis_access_request_thesis_id_fkey(title, author)
        `)
        .eq('status', 'pending')
        .order('request_date', { ascending: false });

      if (requestsError) {
        console.error('Error fetching pending requests:', requestsError);
        return;
      }

      if (pendingRequests && pendingRequests.length > 0) {
        console.log(`Found ${pendingRequests.length} pending access requests`);

        // Create notifications for each pending request
        for (const request of pendingRequests) {
          const { error: notificationError } = await supabase
            .from('notifications')
            .insert({
              user_id: adminUserId,
              access_request_id: request.access_request_id,
              title: 'New Access Request',
              message: `Student ${request.users?.full_name || request.users?.username} requested access to thesis: "${request.theses?.title}" by ${request.theses?.author}`,
              type: 'info',
              is_read: false
            });

          if (notificationError) {
            console.error('Error creating notification:', notificationError);
          }
        }
      }
    } catch (error) {
      console.error('Error checking pending access requests:', error);
    }
  };

  return (
    <div
      className="w-screen min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <CommonHeader isAuthenticated={false} hideLoginButton={true} />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <Shield className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-red-800 mb-2">Thesis Guard Admin</h2>
              <p className="text-gray-600">
                Access the Thesis Guard management system
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

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
                    disabled={loading || (currentUser && (currentUser.role === 'student' || currentUser.role === 'user'))}
                  />
                </div>
              </div>

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
                    disabled={loading || (currentUser && (currentUser.role === 'student' || currentUser.role === 'user'))}
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

              <button
                type="submit"
                disabled={loading || (currentUser && (currentUser.role === 'student' || currentUser.role === 'user'))}
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
                    {currentUser && (currentUser.role === 'student' || currentUser.role === 'user') ? 'Logout Required' : 'Sign In'}
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Secure access for authorized administrators only.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Not an admin? <Link to="/user-login" className="text-red-600 hover:text-red-700">Student/User Login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;