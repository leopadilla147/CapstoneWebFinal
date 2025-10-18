import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, BookOpen, Save, Shield, Bell, Eye, EyeOff, User as UserIcon } from 'lucide-react';
import bg from "../assets/bg-gradient.png";
import CommonHeader from '../components/CommonHeader';
import UserSideNav from '../components/UserSideNav';
import { supabase } from '../connect-supabase.js';

const UserAccountSettings = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    student_id: '',
    college: '',
    course: '',
    year_level: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    weekly_recommendations: true,
    thesis_reminders: true
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(true);
  const [checkingUsername, setCheckingUsername] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  // Check authentication using your preferred method
  const checkAuthentication = () => {
    // Method 1: Check localStorage (most common)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData && userData.role === 'user') {
        return userData;
      }
    }

    // Method 2: Check sessionStorage
    const sessionUser = sessionStorage.getItem('user');
    if (sessionUser) {
      const userData = JSON.parse(sessionUser);
      if (userData && userData.role === 'user') {
        return userData;
      }
    }

    // Method 3: Check if using Supabase Auth
    // This would require you to be using Supabase Authentication
    
    return null;
  };

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // First, check if user is authenticated using your method
      const authenticatedUser = checkAuthentication();
      
      if (!authenticatedUser) {
        console.log('No authenticated user found, redirecting to home');
        navigate('/');
        return;
      }

      // If you're using Supabase Auth, get the current user
      let userId = authenticatedUser.id;
      
      // If using localStorage/sessionStorage without Supabase Auth, use the stored ID
      if (!userId && authenticatedUser.userId) {
        userId = authenticatedUser.userId;
      }

      if (!userId) {
        console.error('No user ID found');
        navigate('/');
        return;
      }

      console.log('Fetching user data for ID:', userId);

      // Fetch user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        throw userError;
      }

      if (!userData) {
        console.error('No user data found');
        navigate('/');
        return;
      }

      console.log('User data fetched:', userData);

      setUser(userData);
      
      // Populate form data
      setFormData({
        username: userData.username || '',
        full_name: userData.full_name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        student_id: userData.student_id || '',
        college: userData.college || '',
        course: userData.course || '',
        year_level: userData.year_level || ''
      });

      // Load preferences
      const savedPreferences = localStorage.getItem(`user_preferences_${userId}`);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      setError('Failed to load user data');
      // Don't redirect immediately, show error first
      // navigate('/');
    } finally {
      setLoading(false);
    }
  };

  // Check if username is available
  const checkUsernameAvailability = async (username) => {
    if (!username || username === user?.username) {
      setUsernameAvailable(true);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .neq('id', user?.id) // Exclude current user
        .single();

      setUsernameAvailable(!data); // If no data, username is available
    } catch (error) {
      // If no user found, it's available
      setUsernameAvailable(true);
    } finally {
      setCheckingUsername(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogOut = () => {
    // Clear all authentication methods
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

    // Check username availability when username changes
    if (name === 'username') {
      checkUsernameAvailability(value);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handlePreferenceChange = (preference) => {
    setPreferences(prev => ({
      ...prev,
      [preference]: !prev[preference]
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    // Validate username
    if (!formData.username.trim()) {
      setError('Username is required');
      setSaving(false);
      return;
    }

    if (!usernameAvailable) {
      setError('Username is already taken. Please choose a different one.');
      setSaving(false);
      return;
    }

    try {
      if (!user) {
        setError('No user data found. Please try logging in again.');
        setSaving(false);
        return;
      }

      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          college: formData.college,
          course: formData.course,
          year_level: formData.year_level,
        })
        .eq('id', user.id)
        .select();

      if (updateError) throw updateError;

      // Save preferences to localStorage
      localStorage.setItem(`user_preferences_${user.id}`, JSON.stringify(preferences));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

    } catch (error) {
      console.error('Error updating user:', error);
      setError('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    try {
      if (!user) {
        setError('No user data found.');
        return;
      }

      // Update password in users table
      const { error: dbError } = await supabase
        .from('users')
        .update({
          password: passwordData.newPassword,
        })
        .eq('id', user.id);

      if (dbError) throw dbError;

      setPasswordSaved(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);

      setTimeout(() => setPasswordSaved(false), 3000);

    } catch (error) {
      console.error('Error updating password:', error);
      setError(error.message || 'Failed to update password. Please try again.');
    }
  };

  const colleges = [
    'College of Arts and Sciences',
    'College of Business and Public Administration',
    'College of Education',
    'College of Engineering',
    'College of Information and Communications Technology'
  ];

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  // Debug: Check what's happening
  console.log('Current state:', { loading, user, authenticated: checkAuthentication() });

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
        <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="user" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-white mt-4">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
        <CommonHeader isAuthenticated={false} onLogOut={handleLogOut} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Required</h2>
            <p className="text-gray-700 mb-4">Please log in to access your account settings.</p>
            <button
              onClick={() => navigate('/user-login')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Go to Login
            </button>
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
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Account Settings</h1>
              <p className="text-white/80">Manage your personal information and preferences</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-red-700 font-semibold">{error}</p>
                </div>
              )}

              {saved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-700 font-semibold">✓ Profile updated successfully!</p>
                </div>
              )}

              {passwordSaved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-green-700 font-semibold">✓ Password updated successfully!</p>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h2 className="text-xl font-bold text-[#990000] mb-4 flex items-center gap-2">
                    <User size={20} />
                    Personal Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Username *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className={`w-full pl-10 p-3 border rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                            !usernameAvailable && formData.username !== user?.username 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                          placeholder="Choose a username"
                          required
                        />
                      </div>
                      {checkingUsername && (
                        <p className="text-xs text-blue-600 mt-1">Checking username availability...</p>
                      )}
                      {!usernameAvailable && formData.username !== user?.username && (
                        <p className="text-xs text-red-600 mt-1">Username is already taken</p>
                      )}
                      {usernameAvailable && formData.username && formData.username !== user?.username && (
                        <p className="text-xs text-green-600 mt-1">Username is available</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="+63 912 345 6789"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student ID *
                      </label>
                      <input
                        type="text"
                        name="student_id"
                        value={formData.student_id}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-100"
                        required
                        disabled
                      />
                      <p className="text-xs text-gray-500 mt-1">Student ID cannot be changed</p>
                    </div>
                  </div>
                </div>

                {/* Rest of your form remains the same... */}
                {/* Academic Information */}
                <div>
                  <h2 className="text-xl font-bold text-[#990000] mb-4 flex items-center gap-2">
                    <BookOpen size={20} />
                    Academic Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        College *
                      </label>
                      <select
                        name="college"
                        value={formData.college}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select College</option>
                        {colleges.map(college => (
                          <option key={college} value={college}>{college}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course/Program *
                      </label>
                      <input
                        type="text"
                        name="course"
                        value={formData.course}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="e.g., Bachelor of Science in Information Technology"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year Level *
                      </label>
                      <select
                        name="year_level"
                        value={formData.year_level}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Year Level</option>
                        {yearLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div>
                  <h2 className="text-xl font-bold text-[#990000] mb-4 flex items-center gap-2">
                    <Bell size={20} />
                    Preferences
                  </h2>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={preferences.email_notifications}
                        onChange={() => handlePreferenceChange('email_notifications')}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500" 
                      />
                      <span className="text-gray-700">Email notifications for request updates</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={preferences.weekly_recommendations}
                        onChange={() => handlePreferenceChange('weekly_recommendations')}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500" 
                      />
                      <span className="text-gray-700">Weekly research recommendations</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input 
                        type="checkbox" 
                        checked={preferences.thesis_reminders}
                        onChange={() => handlePreferenceChange('thesis_reminders')}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500" 
                      />
                      <span className="text-gray-700">Thesis access reminders</span>
                    </label>
                  </div>
                </div>

                {/* Security */}
                <div>
                  <h2 className="text-xl font-bold text-[#990000] mb-4 flex items-center gap-2">
                    <Shield size={20} />
                    Security
                  </h2>
                  <div className="space-y-4">
                    <button
                      type="button"
                      onClick={() => setShowPasswordForm(!showPasswordForm)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      Change Password
                    </button>

                    {showPasswordForm && (
                      <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                        <h3 className="font-semibold text-gray-800">Update Password</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Current Password
                            </label>
                            <div className="relative">
                              <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                name="currentPassword"
                                value={passwordData.currentPassword}
                                onChange={handlePasswordChange}
                                className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              New Password
                            </label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? 'text' : 'password'}
                                name="newPassword"
                                value={passwordData.newPassword}
                                onChange={handlePasswordChange}
                                className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Enter new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Confirm New Password
                            </label>
                            <div className="relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={passwordData.confirmPassword}
                                onChange={handlePasswordChange}
                                className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                                placeholder="Confirm new password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                              </button>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={handlePasswordUpdate}
                              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                            >
                              Update Password
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowPasswordForm(false)}
                              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="text-sm text-gray-600">
                      <p>Account created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-6">
                  <button
                    type="submit"
                    disabled={saving || !usernameAvailable || checkingUsername}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={20} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserAccountSettings;