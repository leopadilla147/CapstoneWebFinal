import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, User, ArrowLeft } from 'lucide-react';
import { supabase } from '../connect-supabase.js';
import bg from '../assets/bg-gradient.png';
import logo from '../assets/logo.png';
import CommonHeader from '../components/CommonHeader.jsx';

const UserLogin = () => {
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

    // Check if user is already logged in as admin
    if (currentUser && currentUser.role === 'admin') {
      setError('You are currently logged in as an administrator. Please log out first before accessing student portal.');
      setLoading(false);
      return;
    }

    try {
      // Check in users table - REMOVED STATUS FROM SELECT
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('user_id, username, password, full_name, email')
        .eq('username', username)
        .maybeSingle();

      if (userError) {
        console.error('Database error:', userError);
        setError('Database error. Please try again.');
        setLoading(false);
        return;
      }

      if (!user) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      // REMOVED STATUS CHECK SINCE COLUMN DOESN'T EXIST
      // Verify password
      if (user.password !== password) {
        setError('Invalid username or password');
        setLoading(false);
        return;
      }

      // Check if user is an admin (should not be able to login here)
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('admin_id')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (adminError) {
        console.error('Admin check error:', adminError);
        // Continue with login even if admin check fails
      }

      if (adminData) {
        setError('Administrators must use the admin login portal.');
        setLoading(false);
        return;
      }

      // Check if user is a student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('student_id, year_level, college_department, course')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (studentError) {
        console.error('Student check error:', studentError);
        // Continue with login even if student check fails
      }

      let role = 'user';
      let studentInfo = null;

      if (studentData) {
        role = 'student';
        studentInfo = {
          studentId: studentData.student_id,
          yearLevel: studentData.year_level,
          department: studentData.college_department,
          course: studentData.course
        };
      }

      // Update only updated_at timestamp (REMOVED STATUS UPDATE)
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
      const userSession = {
        id: user.user_id,
        username: user.username,
        role: role,
        fullName: user.full_name,
        email: user.email
      };

      // Add student info if available
      if (studentInfo) {
        userSession.studentId = studentInfo.studentId;
        userSession.yearLevel = studentInfo.yearLevel;
        userSession.department = studentInfo.department;
        userSession.course = studentInfo.course;
      }

      localStorage.setItem('user', JSON.stringify(userSession));

      // Redirect based on role
      if (role === 'student') {
        navigate('/user-dashboard');
      } else {
        navigate('/user-dashboard');
      }

    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of the JSX remains the same)
  return (
    <div
      className="w-screen min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Header */}
      
      <CommonHeader isAuthenticated={false} hideLoginButton={true} />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <User className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-red-800 mb-2">Thesis Guard Login</h2>
              <p className="text-gray-600">
                Access your Thesis Guard account
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
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    disabled={loading || (currentUser && currentUser.role === 'admin')}
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
                    placeholder="Enter your password"
                    className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    disabled={loading || (currentUser && currentUser.role === 'admin')}
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
                disabled={loading || (currentUser && currentUser.role === 'admin')}
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
                    {currentUser && currentUser.role === 'admin' ? 'Logout Required' : 'Sign In'}
                  </>
                )}
              </button>

              <div className="text-center">
                <p className="text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/user-signup" className="text-red-600 hover:text-red-700 font-semibold">
                    Create account
                  </Link>
                </p>
              </div>

              <div className="text-center border-t pt-4 mt-4">
                <p className="text-sm text-gray-500">
                  Are you an administrator?{' '}
                  <Link to="/admin-login" className="text-red-600 hover:text-red-700 font-semibold">
                    Admin Login
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;