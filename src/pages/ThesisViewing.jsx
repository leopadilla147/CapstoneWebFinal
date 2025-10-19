import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Filter, Edit, Trash2, Eye, Download, 
  Plus, MoreVertical, BookOpen, User, Calendar,
  Building, FileText, AlertCircle, CheckCircle,
  X, ChevronLeft, ChevronRight, RefreshCw
} from 'lucide-react';
import bg from "../assets/bg-gradient.png";
import CommonHeader from '../components/CommonHeader';
import SideNav from '../components/SideNav';
import { supabase } from '../connect-supabase';

const ThesisViewing = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theses, setTheses] = useState([]);
  const [filteredTheses, setFilteredTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Available filters
  const colleges = [
    'College of Arts and Sciences',
    'College of Business and Public Administration',
    'College of Education',
    'College of Engineering',
    'College of Information and Communications Technology'
  ];

  const batches = ['2020', '2021', '2022', '2023', '2024'];

  useEffect(() => {
    fetchTheses();
  }, []);

  useEffect(() => {
    filterTheses();
  }, [searchTerm, collegeFilter, batchFilter, theses]);

  const fetchTheses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('theses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setTheses(data || []);
      setFilteredTheses(data || []);
    } catch (err) {
      console.error('Error fetching theses:', err);
      setError('Failed to load theses. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterTheses = () => {
    let filtered = theses;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(thesis =>
        thesis.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thesis.author?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        thesis.abstract?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply college filter
    if (collegeFilter !== 'all') {
      filtered = filtered.filter(thesis => thesis.college_department === collegeFilter);
    }

    // Apply batch filter
    if (batchFilter !== 'all') {
      filtered = filtered.filter(thesis => thesis.batch === batchFilter);
    }

    setFilteredTheses(filtered);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setCollegeFilter('all');
    setBatchFilter('all');
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentTheses = filteredTheses.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTheses.length / itemsPerPage);

  const handleEdit = (thesis) => {
    setSelectedThesis(thesis);
    setEditFormData({
      title: thesis.title || '',
      author: thesis.author || '',
      abstract: thesis.abstract || '',
      college_department: thesis.college_department || '',
      batch: thesis.batch || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = (thesis) => {
    setSelectedThesis(thesis);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedThesis) return;

    try {
      const { error } = await supabase
        .from('theses')
        .delete()
        .eq('thesis_id', selectedThesis.thesis_id);

      if (error) throw error;

      // Remove from local state
      setTheses(prev => prev.filter(t => t.thesis_id !== selectedThesis.thesis_id));
      setSuccess('Thesis deleted successfully!');
      setShowDeleteModal(false);
      setSelectedThesis(null);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting thesis:', err);
      setError('Failed to delete thesis. Please try again.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedThesis) return;

    try {
      const { error } = await supabase
        .from('theses')
        .update({
          ...editFormData,
          updated_at: new Date().toISOString()
        })
        .eq('thesis_id', selectedThesis.thesis_id);

      if (error) throw error;

      // Update local state
      setTheses(prev => prev.map(t => 
        t.thesis_id === selectedThesis.thesis_id 
          ? { ...t, ...editFormData, updated_at: new Date().toISOString() }
          : t
      ));

      setSuccess('Thesis updated successfully!');
      setShowEditModal(false);
      setSelectedThesis(null);

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating thesis:', err);
      setError('Failed to update thesis. Please try again.');
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

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return 'No abstract';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const hasActiveFilters = searchTerm || collegeFilter !== 'all' || batchFilter !== 'all';

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="admin" />

      <div className="flex-1 flex">
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">THESIS GUARD</h1>
              <p className="text-white/80 text-lg">
                View, edit, and manage all theses in the system
              </p>
            </div>

            {/* Alerts */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-600">{error}</p>
                <button onClick={() => setError('')} className="ml-auto">
                  <X className="w-4 h-4 text-red-600" />
                </button>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-green-600">{success}</p>
                <button onClick={() => setSuccess('')} className="ml-auto">
                  <X className="w-4 h-4 text-green-600" />
                </button>
              </div>
            )}

            {/* Controls Bar */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                {/* Search */}
                <div className="flex-1 w-full max-w-2xl">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search theses by title, author, or abstract..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={fetchTheses}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={20} />
                    Refresh
                  </button>
                  <button
                    onClick={() => navigate('/add-thesis-page')}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
                  >
                    <Plus size={20} />
                    Add Thesis
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* College Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building size={16} className="inline mr-1" />
                    College
                  </label>
                  <select
                    value={collegeFilter}
                    onChange={(e) => setCollegeFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="all">All Colleges</option>
                    {colleges.map(college => (
                      <option key={college} value={college}>{college}</option>
                    ))}
                  </select>
                </div>

                {/* Batch Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar size={16} className="inline mr-1" />
                    Batch
                  </label>
                  <select
                    value={batchFilter}
                    onChange={(e) => setBatchFilter(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="all">All Batches</option>
                    {batches.map(batch => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </div>

                {/* Items Per Page */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Items Per Page
                  </label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Search: "{searchTerm}"
                      <button onClick={() => setSearchTerm('')}>
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {collegeFilter !== 'all' && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      College: {collegeFilter}
                      <button onClick={() => setCollegeFilter('all')}>
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {batchFilter !== 'all' && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Batch: {batchFilter}
                      <button onClick={() => setBatchFilter('all')}>
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearFilters}
                    className="text-red-600 hover:text-red-700 font-semibold flex items-center gap-2 ml-2"
                  >
                    <X size={16} />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {loading ? 'Loading...' : `${filteredTheses.length} Theses Found`}
                </h2>
                {hasActiveFilters && (
                  <p className="text-white/80 text-sm">
                    Filtered from {theses.length} total theses
                  </p>
                )}
              </div>
              
              {/* Pagination Info */}
              {!loading && filteredTheses.length > 0 && (
                <div className="text-white text-sm">
                  Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTheses.length)} of {filteredTheses.length}
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            )}

            {/* No Results */}
            {!loading && filteredTheses.length === 0 && (
              <div className="bg-white rounded-2xl shadow-md p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No theses found</h3>
                <p className="text-gray-500 mb-4">
                  {hasActiveFilters 
                    ? 'No theses match your current filters. Try adjusting your search criteria.'
                    : 'No theses available in the system.'
                  }
                </p>
                {hasActiveFilters ? (
                  <button
                    onClick={clearFilters}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                  >
                    Clear Filters
                  </button>
                ) : (
                  <button
                    onClick={() => navigate('/add-thesis-page')}
                    className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
                  >
                    Add First Thesis
                  </button>
                )}
              </div>
            )}

            {/* Theses Table */}
            {!loading && filteredTheses.length > 0 && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thesis Details
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          College & Batch
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Added
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentTheses.map((thesis) => (
                        <tr key={thesis.thesis_id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-start space-x-4">
                              {thesis.qr_code_url && (
                                <img
                                  src={thesis.qr_code_url}
                                  alt="QR Code"
                                  className="w-16 h-16 border border-gray-200 rounded-lg"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  {thesis.title}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2 flex items-center gap-1">
                                  <User size={14} />
                                  {thesis.author}
                                </p>
                                <p className="text-sm text-gray-500 line-clamp-2">
                                  {truncateText(thesis.abstract, 120)}
                                </p>
                                {thesis.pdf_file_url && (
                                  <div className="flex gap-2 mt-2">
                                    <a
                                      href={thesis.pdf_file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                                    >
                                      <Eye size={14} />
                                      View PDF
                                    </a>
                                    <a
                                      href={thesis.pdf_file_url}
                                      download
                                      className="inline-flex items-center gap-1 text-green-600 hover:text-green-700 text-sm"
                                    >
                                      <Download size={14} />
                                      Download
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-1 text-sm text-gray-700">
                                <Building size={14} />
                                {thesis.college_department}
                              </div>
                              <div className="flex items-center gap-1 text-sm text-gray-700">
                                <Calendar size={14} />
                                Batch {thesis.batch}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(thesis.created_at)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(thesis)}
                                className="text-blue-600 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                title="Edit Thesis"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(thesis)}
                                className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                title="Delete Thesis"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedThesis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Delete Thesis</h3>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the thesis "<strong>{selectedThesis.title}</strong>" by {selectedThesis.author}? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                Delete Thesis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Thesis Modal */}
      {showEditModal && selectedThesis && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Edit Thesis</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Thesis Title *
                  </label>
                  <input
                    type="text"
                    value={editFormData.title}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Author *
                  </label>
                  <input
                    type="text"
                    value={editFormData.author}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    College *
                  </label>
                  <select
                    value={editFormData.college_department}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, college_department: e.target.value }))}
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
                    Batch *
                  </label>
                  <input
                    type="text"
                    value={editFormData.batch}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, batch: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Abstract *
                </label>
                <textarea
                  value={editFormData.abstract}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, abstract: e.target.value }))}
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Edit size={16} />
                  Update Thesis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThesisViewing;