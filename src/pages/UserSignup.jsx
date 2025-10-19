import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, User, Mail, Phone, BookOpen, Calendar, Shield, ArrowLeft, GraduationCap } from 'lucide-react';
import { supabase, supabaseAdmin } from '../connect-supabase.js';
import CommonHeader from '../components/CommonHeader';
import bg from '../assets/bg-gradient.png';

const UserSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    phone: '',
    birthdate: '',
    password: '',
    confirmPassword: '',
    isStudent: false,
    student_id: '',
    year_level: '',
    college_department: '',
    other_department: '',
    course: '',
    other_course: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [collegeDepartments, setCollegeDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);

  // Fetch college departments on component mount
  useEffect(() => {
    fetchCollegeDepartments();
  }, []);

  // Fetch courses when department changes
  useEffect(() => {
    if (formData.college_department && formData.college_department !== 'other') {
      fetchCoursesByDepartment(formData.college_department);
    } else {
      setCourses([]);
    }
  }, [formData.college_department]);

  const fetchCollegeDepartments = async () => {
    setLoadingDepartments(true);
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
    } finally {
      setLoadingDepartments(false);
    }
  };

  const fetchCoursesByDepartment = async (departmentId) => {
    setLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('course_id, course_name, course_code, department_id')
        .eq('department_id', departmentId)
        .order('course_name');

      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }

      setCourses(data || []);
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const validateForm = () => {
    if (!formData.full_name.trim()) {
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
    if (formData.isStudent && !formData.student_id.trim()) {
      setError('Please enter your student ID');
      return false;
    }
    if (formData.isStudent && !formData.college_department) {
      setError('Please select your college department');
      return false;
    }
    if (formData.isStudent && formData.college_department === 'other' && !formData.other_department.trim()) {
      setError('Please specify your college department');
      return false;
    }
    if (formData.isStudent && !formData.course) {
      setError('Please select your course/program');
      return false;
    }
    if (formData.isStudent && formData.course === 'other' && !formData.other_course.trim()) {
      setError('Please specify your course/program');
      return false;
    }
    if (formData.isStudent && !formData.year_level) {
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
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('username')
        .eq('username', formData.username)
        .maybeSingle();

      if (userCheckError) {
        console.error('Error checking username:', userCheckError);
        throw userCheckError;
      }

      if (existingUser) {
        setError('Username already exists. Please choose a different one.');
        setLoading(false);
        return;
      }

      // Check if email already exists
      const { data: existingEmail, error: emailCheckError } = await supabase
        .from('users')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (emailCheckError) {
        console.error('Error checking email:', emailCheckError);
        throw emailCheckError;
      }

      if (existingEmail) {
        setError('Email already registered. Please use a different email.');
        setLoading(false);
        return;
      }

      // Check if student ID already exists (if student)
      if (formData.isStudent) {
        const { data: existingStudent, error: studentCheckError } = await supabase
          .from('students')
          .select('student_id')
          .eq('student_id', formData.student_id)
          .maybeSingle();

        if (studentCheckError) {
          console.error('Error checking student ID:', studentCheckError);
          console.warn('Students table might not be properly configured. Continuing without student ID check.');
        } else if (existingStudent) {
          setError('Student ID already registered. Please use a different student ID.');
          setLoading(false);
          return;
        }
      }

      // Determine department and course values
      const finalDepartment = formData.college_department === 'other' 
        ? formData.other_department 
        : (collegeDepartments.find(dept => dept.department_id === formData.college_department)?.department_name || formData.college_department);

      const finalCourse = formData.course === 'other'
        ? formData.other_course
        : (courses.find(course => course.course_id === formData.course)?.course_name || formData.course);

      // Use admin client to bypass RLS for user creation
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert([
          {
            username: formData.username,
            password: formData.password,
            full_name: formData.full_name,
            email: formData.email,
            phone: formData.phone,
            birthdate: formData.birthdate,
            // STATUS REMOVED - column doesn't exist in your table
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (userError) {
        console.error('Error creating user:', userError);
        if (userError.code === '42501') {
          setError('Database configuration error. Please contact administrator to set up proper permissions.');
        } else {
          setError(userError.message || 'Failed to create account. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Insert into students table if user is a student
      if (formData.isStudent && newUser) {
        try {
          const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert([
              {
                user_id: newUser.user_id,
                student_id: formData.student_id,
                year_level: formData.year_level,
                college_department: finalDepartment,
                course: finalCourse,
                created_at: new Date().toISOString()
              }
            ]);

          if (studentError) {
            console.error('Error creating student record:', studentError);
            console.warn('Could not create student record. User account was created successfully.');
          }
        } catch (studentErr) {
          console.warn('Student record creation failed, but user account was created:', studentErr);
        }
      }

      setSuccess('Account created successfully! Redirecting to login...');
      
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

  const yearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  return (
    <div
      className="w-screen min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <CommonHeader isAuthenticated={false} />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white hover:text-gray-200 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>

          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <User className="w-8 h-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-red-800 mb-2">Create Your Account</h2>
              <p className="text-gray-600">
                Join the CNSC Thesis Hub community
              </p>
            </div>

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

              {/* Student Checkbox */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-xl p-6 text-center transition-all duration-300 hover:shadow-md hover:border-red-300">
                <div className="flex flex-col items-center space-y-4">
                  <div className="bg-white p-3 rounded-full border-2 border-red-200 shadow-sm">
                    <GraduationCap className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex items-center gap-3 bg-white/80 px-4 py-2 rounded-lg border border-red-200">
                    <input
                      type="checkbox"
                      name="isStudent"
                      checked={formData.isStudent}
                      onChange={handleInputChange}
                      className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer transform scale-125"
                      id="isStudent"
                    />
                    <label 
                      htmlFor="isStudent" 
                      className="text-lg font-bold text-gray-800 cursor-pointer select-none"
                    >
                      I am a CNSC Student
                    </label>
                  </div>
                  <p className={`text-sm transition-all duration-300 ${
                    formData.isStudent ? 'text-green-700 font-medium' : 'text-gray-600'
                  }`}>
                    {formData.isStudent 
                      ? '🎓 Student profile enabled - Please fill in your academic information below'
                      : 'Check this box if you are currently enrolled as a student at CNSC'
                    }
                  </p>
                </div>
              </div>

              {/* Personal Information */}
              <div className="transition-all duration-300">
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
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
                        placeholder="your.email@example.com"
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
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
                        className="w-full p-3 pl-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                      />
                    </div>
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
                      className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    />
                  </div>

                  {formData.isStudent && (
                    <div className="animate-fadeIn">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Student ID *
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          name="student_id"
                          value={formData.student_id}
                          onChange={handleInputChange}
                          placeholder="e.g., 2023-00123 or BSIT-2023-001"
                          className="w-full p-3 pl-10 border border-yellow-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-yellow-50"
                          required={formData.isStudent}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Enter your student ID</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Information - Only for Students */}
              {formData.isStudent && (
                <div className="animate-fadeIn border-l-4 border-yellow-400 pl-4 bg-yellow-50/50 rounded-r-lg py-2">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <BookOpen size={20} className="text-yellow-600" />
                    Academic Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* College Department */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        College Department *
                      </label>
                      <select
                        name="college_department"
                        value={formData.college_department}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                        required={formData.isStudent}
                      >
                        <option value="">Select College Department</option>
                        {collegeDepartments.map(dept => (
                          <option key={dept.department_id} value={dept.department_id}>
                            {dept.department_name}
                          </option>
                        ))}
                        <option value="other">Other (Please specify)</option>
                      </select>
                      {loadingDepartments && (
                        <p className="text-xs text-gray-500 mt-1">Loading departments...</p>
                      )}
                    </div>

                    {/* Other Department Input */}
                    {formData.college_department === 'other' && (
                      <div className="animate-fadeIn">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Specify Department *
                        </label>
                        <input
                          type="text"
                          name="other_department"
                          value={formData.other_department}
                          onChange={handleInputChange}
                          placeholder="Enter your college department"
                          className="w-full p-3 border border-yellow-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-yellow-50"
                          required={formData.isStudent}
                        />
                      </div>
                    )}

                    {/* Course/Program */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Course/Program *
                      </label>
                      <select
                        name="course"
                        value={formData.course}
                        onChange={handleInputChange}
                        disabled={!formData.college_department || formData.college_department === 'other'}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                        required={formData.isStudent}
                      >
                        <option value="">{formData.college_department === 'other' ? 'Select "Other" and specify below' : 'Select Course/Program'}</option>
                        {courses.map(course => (
                          <option key={course.course_id} value={course.course_id}>
                            {course.course_name}
                          </option>
                        ))}
                        <option value="other">Other (Please specify)</option>
                      </select>
                      {loadingCourses && formData.college_department && formData.college_department !== 'other' && (
                        <p className="text-xs text-gray-500 mt-1">Loading courses...</p>
                      )}
                      {formData.college_department === 'other' && (
                        <p className="text-xs text-yellow-600 mt-1">Please specify your course below</p>
                      )}
                    </div>

                    {/* Other Course Input */}
                    {formData.course === 'other' && (
                      <div className="animate-fadeIn">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Specify Course *
                        </label>
                        <input
                          type="text"
                          name="other_course"
                          value={formData.other_course}
                          onChange={handleInputChange}
                          placeholder="Enter your course/program"
                          className="w-full p-3 border border-yellow-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all bg-yellow-50"
                          required={formData.isStudent}
                        />
                      </div>
                    )}

                    {/* Year Level */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Year Level *
                      </label>
                      <select
                        name="year_level"
                        value={formData.year_level}
                        onChange={handleInputChange}
                        className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all"
                        required={formData.isStudent}
                      >
                        <option value="">Select Year Level</option>
                        {yearLevels.map(level => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Password Section */}
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
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                        className="w-full p-3 pr-10 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  required
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500 mt-1 flex-shrink-0"
                  id="terms"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="#" className="text-red-600 hover:text-red-700 font-medium underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-red-600 hover:text-red-700 font-medium underline">
                    Privacy Policy
                  </a>{' '}
                  of CNSC Thesis Hub
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-4 rounded-lg font-bold text-base transition-all duration-300 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
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
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-gray-600">
                  Already have an account?{' '}
                  <Link to="/user-login" className="text-red-600 hover:text-red-700 font-semibold underline transition-colors">
                    Sign in here
                  </Link>
                </p>
              </div>
            </form>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="text-center text-white bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <BookOpen className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Access Research Papers</p>
            </div>
            <div className="text-center text-white bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <Shield className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Secure QR Code Access</p>
            </div>
            <div className="text-center text-white bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
              <Calendar className="w-6 h-6 mx-auto mb-2" />
              <p className="text-sm font-medium">Track Your History</p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default UserSignup;