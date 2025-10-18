import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Phone, BookOpen, Calendar, Shield, ArrowLeft } from 'lucide-react';
import { supabase } from '../connect-supabase.js';
import CommonHeader from '../components/CommonHeader';
import bg from '../assets/bg-gradient.png';
import logo from '../assets/logo.png';

const UserSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    studentId: '',
    college: '',
    course: '',
    yearLevel: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Please enter a username');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return false;
    }
    if (!formData.studentId.trim()) {
      setError('Please enter your student ID');
      return false;
    }
    if (!formData.college) {
      setError('Please select your college');
      return false;
    }
    if (!formData.course.trim()) {
      setError('Please enter your course/program');
      return false;
    }
    if (!formData.yearLevel) {
      setError('Please select your year level');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Check if username already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('username')
        .eq('username', formData.username)
        .maybeSingle();

      if (existingUser) {
        setError('Username already exists. Please choose a different one.');
        setLoading(false);
        return;
      }

      // Check if student ID already exists
      const { data: existingStudent } = await supabase
        .from('users')
        .select('student_id')
        .eq('student_id', formData.studentId)
        .maybeSingle();

      if (existingStudent) {
        setError('Student ID already registered. Please use a different student ID.');
        setLoading(false);
        return;
      }

      // Insert new user
      const { data, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            username: formData.username,
            password: formData.password, // In production, this should be hashed
            role: 'user',
            full_name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            student_id: formData.studentId,
            college: formData.college,
            course: formData.course,
            year_level: formData.yearLevel,
            created_at: new Date().toISOString(),
            status: 'active'
          }
        ])
        .select();

      if (insertError) throw insertError;

      setSuccess('Account created successfully! Redirecting to login...');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/user-login');
      }, 2000);

    } catch (err) {
      console.error('Signup error:', err);
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
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

  return (
    <div
      className="w-screen min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
    >
      {/* Common Header - Not authenticated */}
      <CommonHeader isAuthenticated={false} />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          {/* Back Button */}
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white hover:text-gray-200 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>

          {/* Signup Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <User className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-red-800 mb-2">Student Registration</h2>
              <p className="text-gray-600">
                Create your Thesis Hub account to access research materials
              </p>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-6">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 text-sm text-center">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-600 text-sm text-center">{success}</p>
                </div>
              )}

              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <User size={20} className="text-red-600" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Username *
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="Choose a username"
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your.email@cnsc.edu.ph"
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+63 912 345 6789"
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <BookOpen size={20} className="text-red-600" />
                  Academic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student ID *
                    </label>
                    <input
                      type="text"
                      name="studentId"
                      value={formData.studentId}
                      onChange={handleInputChange}
                      placeholder="e.g., 2023-00123"
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      College *
                    </label>
                    <select
                      name="college"
                      value={formData.college}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
                      placeholder="e.g., Bachelor of Science in Information Technology"
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Year Level *
                    </label>
                    <select
                      name="yearLevel"
                      value={formData.yearLevel}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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

              {/* Password */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-red-600" />
                  Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="At least 6 characters"
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your password"
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        required
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
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  required
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-red-600 hover:text-red-700 font-medium">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-red-600 hover:text-red-700 font-medium">
                    Privacy Policy
                  </a>
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <User size={20} />
                    Create Account
                  </>
                )}
              </button>

              {/* Login Link */}
              <div className="text-center">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link to="/user-login" className="text-red-600 hover:text-red-700 font-semibold">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="text-center text-white">
              <BookOpen className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">Access Research Papers</p>
            </div>
            <div className="text-center text-white">
              <Shield className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">Secure QR Code Access</p>
            </div>
            <div className="text-center text-white">
              <Calendar className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm">Track Your History</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSignup;