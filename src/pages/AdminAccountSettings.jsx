import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Shield, Save, Eye, EyeOff, Key, Settings } from 'lucide-react';
import bg from "../assets/bg-gradient.png";
import CommonHeader from '../components/CommonHeader';
import SideNav from '../components/SideNav';
import { supabase } from '../connect-supabase.js';

const AdminAccountSettings = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    department: '',
    position: ''
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

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/admin-login');
        return;
      }

      const userData = JSON.parse(storedUser);
      if (userData.role !== 'admin') {
        navigate('/');
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userData.id)
        .single();

      if (adminError) throw adminError;

      if (!adminData) {
        navigate('/admin-login');
        return;
      }

      setAdmin(adminData);
      
      setFormData({
        full_name: adminData.full_name || '',
        email: adminData.email || '',
        phone: adminData.phone || '',
        department: adminData.department || '',
        position: adminData.position || ''
      });

      // Load preferences
      const savedPreferences = localStorage.getItem(`admin_preferences_${adminData.id}`);
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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

    try {
      if (!admin) {
        setError('No admin data found. Please try logging in again.');
        setSaving(false);
        return;
      }

      const { data, error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          email: formData.email,
          phone: formData.phone,
          department: formData.department,
          position: formData.position,
        })
        .eq('id', admin.id)
        .select();

      if (updateError) throw updateError;

      // Save preferences to localStorage
      localStorage.setItem(`admin_preferences_${admin.id}`, JSON.stringify(preferences));

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
        })
        .eq('id', admin.id);

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

  const departments = [
    'Library Administration',
    'IT Department',
    'Research Office',
    'Academic Affairs',
    'Student Services'
  ];

  const positions = [
    'System Administrator',
    'Library Manager',
    'IT Specialist',
    'Research Coordinator',
    'Department Head'
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
        <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="admin" onMenuToggle={toggleSidebar} />
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
        <CommonHeader isAuthenticated={false} onLogOut={handleLogOut} />
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
      
      <CommonHeader 
        isAuthenticated={true} 
        onLogOut={handleLogOut} 
        userRole="admin"
        onMenuToggle={toggleSidebar}
      />

      <div className="flex-1 flex">
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Admin Account Settings</h1>
              <p className="text-white/80">Manage your administrator profile and system preferences</p>
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
                        Department
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      >
                        <option value="">Select Department</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
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
                    disabled={saving}
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

export default AdminAccountSettings;