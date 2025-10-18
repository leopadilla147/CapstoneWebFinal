import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, BookOpen, User } from 'lucide-react';
import { supabase } from '../connect-supabase.js';
import CommonHeader from '../components/CommonHeader';
import bg from '../assets/bg-gradient.png';

const BorrowRequest = ({ thesis }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    duration: 7,
    purpose: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to request a thesis');
        setLoading(false);
        return;
      }

      // Get user details from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Create borrowing request
      const { data, error: requestError } = await supabase
        .from('borrowing_requests')
        .insert([
          {
            user_id: user.id,
            thesis_id: thesis.thesisID,
            duration_days: parseInt(formData.duration),
            purpose: formData.purpose,
            status: 'pending'
          }
        ])
        .select();

      if (requestError) throw requestError;

      setSuccess('Borrowing request sent successfully! The admin will review your request.');
      
      // Redirect back after 2 seconds
      setTimeout(() => {
        navigate(-1);
      }, 2000);

    } catch (err) {
      console.error('Borrow request error:', err);
      setError(err.message || 'Failed to send borrowing request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="w-screen min-h-screen bg-cover bg-center bg-no-repeat flex flex-col"
      style={{ backgroundImage: `url(${bg})` }}
    >
      <CommonHeader isAuthenticated={true} />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          {/* Back Button */}
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-white hover:text-gray-200 mb-6 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Thesis
          </button>

          {/* Borrow Request Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="bg-blue-100 p-3 rounded-full">
                  <BookOpen className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <h2 className="text-3xl font-bold text-blue-800 mb-2">Request to Borrow Thesis</h2>
              <p className="text-gray-600">
                Submit your request to borrow this thesis
              </p>
            </div>

            {/* Thesis Info */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Thesis Details</h3>
              <div className="space-y-2">
                <p><span className="font-semibold">Title:</span> {thesis.title}</p>
                <p><span className="font-semibold">Author:</span> {thesis.author}</p>
                <p><span className="font-semibold">College:</span> {thesis.college}</p>
                <p><span className="font-semibold">Batch:</span> {thesis.batch}</p>
              </div>
            </div>

            {/* Borrow Request Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
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

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Calendar size={20} className="text-blue-600" />
                  Borrowing Duration *
                </label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="3">3 Days</option>
                  <option value="7">1 Week</option>
                  <option value="14">2 Weeks</option>
                  <option value="30">1 Month</option>
                </select>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose of Borrowing *
                </label>
                <textarea
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  placeholder="Please describe why you need to borrow this thesis..."
                  rows="4"
                  className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              {/* Terms */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-800 mb-2">Terms and Conditions</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• You must return the thesis on or before the due date</li>
                  <li>• Late returns may result in penalties</li>
                  <li>• Do not share the thesis with unauthorized persons</li>
                  <li>• Keep the thesis in good condition</li>
                </ul>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-semibold text-base transition-all duration-300 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Sending Request...
                  </>
                ) : (
                  <>
                    <BookOpen size={20} />
                    Submit Borrow Request
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BorrowRequest;