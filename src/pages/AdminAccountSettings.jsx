import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, Save, Eye, EyeOff, Key, Settings, BookOpen, Plus, X, Building, GraduationCap } from 'lucide-react';
import bg from "../assets/bg-gradient.png";
import CommonHeader from '../components/CommonHeader.jsx';
import SideNav from '../components/SideNav';
import { supabase } from '../connect-supabase.js';

const AdminAccountSettings = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    birthdate: '',
    position: '',
    college_department: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    system_alerts: true,
    weekly_reports: true,
    security_alerts: true
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
  const [collegeDepartments, setCollegeDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  
  // New state for department and course management
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newDepartment, setNewDepartment] = useState({
    department_name: '',
    department_code: ''
  });
  const [newCourse, setNewCourse] = useState({
    course_name: '',
    course_code: '',
    department_id: ''
  });
  const [addingDepartment, setAddingDepartment] = useState(false);
  const [addingCourse, setAddingCourse] = useState(false);

  useEffect(() => {
    fetchAdminData();
    fetchCollegeDepartments();
    fetchCourses();
  }, []);

  const fetchCollegeDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('college_departments')
        .select('department_id, department_name, department_code')
        .order('department_name');

      if (error) {
        console.error('Error fetching departments:', error);
        return;
      }

      setCollegeDepartments(data || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          course_id,
          course_name,
          course_code,
          department_id,
          college_departments (department_name)
        `)
        .order('course_name');

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/admin-login');
        return;
      }

      const userDataFromStorage = JSON.parse(storedUser);
      if (userDataFromStorage.role !== 'admin') {
        navigate('/');
        return;
      }

      // Fetch user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userDataFromStorage.id)
        .single();

      if (userError) throw userError;

      if (!userData) {
        navigate('/admin-login');
        return;
      }

      // Fetch admin-specific data from admins table
      const { data: adminData, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('user_id', userData.user_id)
        .single();

      if (adminError && adminError.code !== 'PGRST116') throw adminError;

      // Combine user and admin data
      const combinedData = {
        ...userData,
        ...adminData
      };

      setAdmin(combinedData);
      
      setFormData({
        username: combinedData.username || '',
        full_name: combinedData.full_name || '',
        email: combinedData.email || '',
        phone: combinedData.phone || '',
        birthdate: combinedData.birthdate || '',
        position: combinedData.position || '',
        college_department: combinedData.college_department || ''
      });

      // Load preferences
      const savedPreferences = localStorage.getItem(`admin_preferences_${combinedData.user_id}`);
      if (savedPreferences) {
        setPreferences(JSON.parse(savedPreferences));
      }

    } catch (error) {
      console.error('Error fetching admin data:', error);
      setError('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username) => {
    if (!username || username === admin?.username) {
      setUsernameAvailable(true);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('username')
        .eq('username', username)
        .neq('user_id', admin?.user_id)
        .single();

      setUsernameAvailable(!data);
    } catch (error) {
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
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });

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

  // Add new department function
  const handleAddDepartment = async (e) => {
    e.preventDefault();
    setAddingDepartment(true);
    setError('');

    if (!newDepartment.department_name.trim() || !newDepartment.department_code.trim()) {
      setError('Department name and code are required');
      setAddingDepartment(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('college_departments')
        .insert([
          {
            department_name: newDepartment.department_name,
            department_code: newDepartment.department_code.toUpperCase()
          }
        ])
        .select();

      if (error) throw error;

      // Refresh departments list
      await fetchCollegeDepartments();
      
      // Reset form
      setNewDepartment({
        department_name: '',
        department_code: ''
      });
      setShowAddDepartment(false);
      
      // Show success message
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

    } catch (error) {
      console.error('Error adding department:', error);
      setError(error.message || 'Failed to add department. It might already exist.');
    } finally {
      setAddingDepartment(false);
    }
  };

  // Add new course function
  const handleAddCourse = async (e) => {
    e.preventDefault();
    setAddingCourse(true);
    setError('');

    if (!newCourse.course_name.trim() || !newCourse.course_code.trim() || !newCourse.department_id) {
      setError('Course name, code, and department are required');
      setAddingCourse(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            course_name: newCourse.course_name,
            course_code: newCourse.course_code.toUpperCase(),
            department_id: newCourse.department_id
          }
        ])
        .select();

      if (error) throw error;

      // Refresh courses list
      await fetchCourses();
      
      // Reset form
      setNewCourse({
        course_name: '',
        course_code: '',
        department_id: ''
      });
      setShowAddCourse(false);
      
      // Show success message
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

    } catch (error) {
      console.error('Error adding course:', error);
      setError(error.message || 'Failed to add course. It might already exist.');
    } finally {
      setAddingCourse(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

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
      if (!admin) {
        setError('No admin data found. Please try logging in again.');
        setSaving(false);
        return;
      }

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          username: formData.username,
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          birthdate: formData.birthdate,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', admin.user_id);

      if (userError) throw userError;

      // Update admins table
      const { error: adminError } = await supabase
        .from('admins')
        .upsert({
          user_id: admin.user_id,
          position: formData.position,
          college_department: formData.college_department || 'General'
        });

      if (adminError) throw adminError;

      // Save preferences to localStorage
      localStorage.setItem(`admin_preferences_${admin.user_id}`, JSON.stringify(preferences));

      // Update local storage user data
      const storedUser = JSON.parse(localStorage.getItem('user'));
      const updatedUser = {
        ...storedUser,
        username: formData.username,
        fullName: formData.full_name,
        email: formData.email,
        position: formData.position,
        department: formData.college_department
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

    } catch (error) {
      console.error('Error updating admin:', error);
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

    if (passwordData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    try {
      if (!admin) {
        setError('No admin data found.');
        return;
      }

      // Update password in users table
      const { error: dbError } = await supabase
        .from('users')
        .update({
          password: passwordData.newPassword,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', admin.user_id);

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

  const positions = [
    'System Administrator',
    'Library Manager',
    'IT Specialist',
    'Research Coordinator',
    'Department Head',
    'Thesis Coordinator'
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
        <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
            <p className="text-white mt-4">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!admin) {
    return (
      <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
        <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="admin" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Authentication Required</h2>
            <p className="text-gray-700 mb-4">Please log in as admin to access account settings.</p>
            <button
              onClick={() => navigate('/admin-login')}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-semibold"
            >
              Go to Admin Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="admin" />

      <div className="flex-1 flex">
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Admin Account Settings</h1>
              <p className="text-white/80">Manage your administrator profile and system preferences</p>
            </div>

            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-semibold">{error}</p>
                </div>
              )}

              {saved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 font-semibold">✓ Operation completed successfully!</p>
                </div>
              )}

              {passwordSaved && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 font-semibold">✓ Password updated successfully!</p>
                </div>
              )}

              {/* Main Account Settings Form */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
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
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          className={`w-full p-3 border rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                            !usernameAvailable && formData.username !== admin?.username 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-300'
                          }`}
                          placeholder="Choose a username"
                          required
                        />
                        {checkingUsername && (
                          <p className="text-xs text-blue-600 mt-1">Checking username availability...</p>
                        )}
                        {!usernameAvailable && formData.username !== admin?.username && (
                          <p className="text-xs text-red-600 mt-1">Username is already taken</p>
                        )}
                        {usernameAvailable && formData.username && formData.username !== admin?.username && (
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
                          Birthdate
                        </label>
                        <input
                          type="date"
                          name="birthdate"
                          value={formData.birthdate}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Position
                        </label>
                        <select
                          name="position"
                          value={formData.position}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        >
                          <option value="">Select Position</option>
                          {positions.map(position => (
                            <option key={position} value={position}>{position}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Administrative Information */}
                  <div>
                    <h2 className="text-xl font-bold text-[#990000] mb-4 flex items-center gap-2">
                      <BookOpen size={20} />
                      Administrative Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          College Department *
                        </label>
                        <select
                          name="college_department"
                          value={formData.college_department}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select College Department</option>
                          {collegeDepartments.map(dept => (
                            <option key={dept.department_id} value={dept.department_name}>
                              {dept.department_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Admin Preferences */}
                  <div>
                    <h2 className="text-xl font-bold text-[#990000] mb-4 flex items-center gap-2">
                      <Settings size={20} />
                      System Preferences
                    </h2>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={preferences.email_notifications}
                          onChange={() => handlePreferenceChange('email_notifications')}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500" 
                        />
                        <span className="text-gray-700">Email notifications for system alerts</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={preferences.system_alerts}
                          onChange={() => handlePreferenceChange('system_alerts')}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500" 
                        />
                        <span className="text-gray-700">Real-time system alerts</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={preferences.weekly_reports}
                          onChange={() => handlePreferenceChange('weekly_reports')}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500" 
                        />
                        <span className="text-gray-700">Weekly system reports</span>
                      </label>
                      <label className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={preferences.security_alerts}
                          onChange={() => handlePreferenceChange('security_alerts')}
                          className="rounded border-gray-300 text-red-600 focus:ring-red-500" 
                        />
                        <span className="text-gray-700">Security and access alerts</span>
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
                        <p>Admin since: {admin?.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}</p>
                        <p>Role: System Administrator</p>
                        <p>Last login: {new Date().toLocaleDateString()}</p>
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

              {/* College Department Management - SEPARATE FROM MAIN FORM */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[#990000] flex items-center gap-2">
                    <Building size={20} />
                    College Departments
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddDepartment(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Plus size={16} />
                    Add Department
                  </button>
                </div>

                {showAddDepartment && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-300">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-800">Add New Department</h3>
                      <button
                        type="button"
                        onClick={() => setShowAddDepartment(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleAddDepartment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department Name *
                        </label>
                        <input
                          type="text"
                          value={newDepartment.department_name}
                          onChange={(e) => setNewDepartment({...newDepartment, department_name: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="e.g., College of Computer Studies"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department Code *
                        </label>
                        <input
                          type="text"
                          value={newDepartment.department_code}
                          onChange={(e) => setNewDepartment({...newDepartment, department_code: e.target.value.toUpperCase()})}
                          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="e.g., CCS"
                          required
                        />
                      </div>
                      <div className="md:col-span-2 flex gap-3">
                        <button
                          type="submit"
                          disabled={addingDepartment}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                          {addingDepartment ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              Add Department
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddDepartment(false)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
                  <h3 className="font-semibold text-gray-800 mb-4">Existing Departments ({collegeDepartments.length})</h3>
                  {collegeDepartments.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No departments added yet. Add your first department above.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {collegeDepartments.map(dept => (
                        <div key={dept.department_id} className="bg-white border border-gray-200 rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-shadow">
                          <div>
                            <h4 className="font-semibold text-gray-800">{dept.department_name}</h4>
                            <p className="text-sm text-gray-600">Code: {dept.department_code}</p>
                          </div>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            ID: {dept.department_id}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Course Management - SEPARATE FROM MAIN FORM */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-[#990000] flex items-center gap-2">
                    <GraduationCap size={20} />
                    Courses
                  </h2>
                  <button
                    type="button"
                    onClick={() => setShowAddCourse(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Plus size={16} />
                    Add Course
                  </button>
                </div>

                {showAddCourse && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-300">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-800">Add New Course</h3>
                      <button
                        type="button"
                        onClick={() => setShowAddCourse(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <form onSubmit={handleAddCourse} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Course Name *
                        </label>
                        <input
                          type="text"
                          value={newCourse.course_name}
                          onChange={(e) => setNewCourse({...newCourse, course_name: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="e.g., Bachelor of Science in Computer Science"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Course Code *
                        </label>
                        <input
                          type="text"
                          value={newCourse.course_code}
                          onChange={(e) => setNewCourse({...newCourse, course_code: e.target.value.toUpperCase()})}
                          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          placeholder="e.g., BSCS"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Department *
                        </label>
                        <select
                          value={newCourse.department_id}
                          onChange={(e) => setNewCourse({...newCourse, department_id: e.target.value})}
                          className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        >
                          <option value="">Select Department</option>
                          {collegeDepartments.map(dept => (
                            <option key={dept.department_id} value={dept.department_id}>
                              {dept.department_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3 flex gap-3">
                        <button
                          type="submit"
                          disabled={addingCourse}
                          className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
                        >
                          {addingCourse ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Adding...
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              Add Course
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddCourse(false)}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-300">
                  <h3 className="font-semibold text-gray-800 mb-4">Existing Courses ({courses.length})</h3>
                  {courses.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No courses added yet. Add your first course above.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto">
                      {courses.map(course => (
                        <div key={course.course_id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-gray-800">{course.course_name}</h4>
                              <p className="text-sm text-gray-600">Code: {course.course_code}</p>
                              <p className="text-sm text-gray-600">
                                Department: {course.college_departments?.department_name}
                              </p>
                            </div>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              ID: {course.course_id}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminAccountSettings;