import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, FileText, User, BookOpen, Calendar, Eye } from 'lucide-react';
import bg from "../assets/bg-gradient.png";
import {supabase} from "../connect-supabase.js";
import QRCode from "qrcode";
import Header from '../components/Header';
import SideNav from '../components/SideNav';

const AddThesisPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [abstract, setAbstract] = useState('');
  const [college, setCollege] = useState('');
  const [batch, setBatch] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeImage, setQrCodeImage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentTheses, setRecentTheses] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  // Fetch recent theses from Supabase
  const fetchRecentTheses = async () => {
    try {
      setLoadingRecent(true);
      const { data, error } = await supabase
        .from('thesestwo')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      setRecentTheses(data || []);
    } catch (error) {
      console.error('Error fetching recent theses:', error);
      setRecentTheses([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status based on creation date (example logic)
  const getThesisStatus = (createdAt) => {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffDays = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) return 'New';
    if (diffDays < 7) return 'Recent';
    return 'Active';
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'Recent': return 'bg-green-100 text-green-800';
      case 'Active': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // View thesis details
  const handleViewThesis = (thesis) => {
    // You can implement a modal or navigate to a details page
    window.open(thesis.file_url, '_blank');
  };

  useEffect(() => {
    fetchRecentTheses();
  }, []);

  const generateAndUploadQRCode = async (fileUrl) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(fileUrl, {
        width: 400,
        margin: 2
      });

      const blob = await fetch(qrCodeDataUrl).then(res => res.blob());
      
      const qrFileName = `qr-code/qr-${Date.now()}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('thesis-files')
        .upload(qrFileName, blob, {
          contentType: 'image/png'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('thesis-files')
        .getPublicUrl(qrFileName);

      return publicUrl;
    } catch (err) {
      console.error('QR Code generation/upload failed:', err);
      throw err;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    if (!title || !author || !abstract || !college || !batch || !file) {
      setError('Please fill in all fields and upload a file.');
      setIsSubmitting(false);
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const originalFileName = file.name
        .replace(`.${fileExt}`, '')
        .replace(/[^a-zA-Z0-9-_]/g, "_");
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const fileName = `${originalFileName}-${uniqueId}.${fileExt}`;
      const filePath = `thesis-pdfs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('thesis-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('thesis-files')
        .getPublicUrl(filePath);

      const qrCodeImageUrl = await generateAndUploadQRCode(publicUrl);

      const { data, error: insertError } = await supabase
        .from('thesestwo')
        .insert([
          { 
            title, 
            author, 
            abstract, 
            college, 
            batch, 
            file_url: publicUrl,
            file_name: fileName,
            qr_code_url: qrCodeImageUrl,
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) throw insertError;

      setSuccess('Thesis added successfully!');
      setQrCodeUrl(publicUrl);
      setQrCodeImage(qrCodeImageUrl);
      setShowQrModal(true);
      
      // Refresh recent theses list
      fetchRecentTheses();

      // Reset form
      setTitle('');
      setAuthor('');
      setAbstract('');
      setCollege('');
      setBatch('');
      setFile(null);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to add thesis. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleLogOut = () => {
    navigate('/')
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please upload a PDF file only.');
      setFile(null);
    }
  };

  const closeQrModal = () => {
    setShowQrModal(false);
    setQrCodeUrl('');
  };

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <Header onMenuToggle={toggleSidebar} onLogOut={handleLogOut} />

      <div className="flex-1 flex">
        <SideNav isOpen={isSidebarOpen} onClose={closeSidebar} />

        <main className="flex-1 p-8">
          <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-black mb-2">THESIS HUB</h1>
              <p className="text-xl font-semibold text-black">Add New Thesis</p>
              <p className="text-black/80 mt-2">Upload and manage academic theses with comprehensive details and QR code generation</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Thesis Title */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                      <BookOpen size={20} />
                      Thesis Title *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter the complete thesis title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full p-4 rounded-lg bg-gray-100 border border-gray-300 text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Author */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                      <User size={20} />
                      Author Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Enter author's full name..."
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      className="w-full p-4 rounded-lg bg-gray-100 border border-gray-300 text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* College */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                      🎓 College *
                    </label>
                    <select 
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      className="w-full p-4 rounded-lg bg-gray-100 border border-gray-300 text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select College</option>
                      <option value="College of Arts and Sciences">College of Arts and Sciences</option>
                      <option value="College of Business and Public Administration">College of Business and Public Administration</option>
                      <option value="College of Education">College of Education</option>
                      <option value="College of Engineering">College of Engineering</option>
                      <option value="College of Computing and Multimedia Studies">College of Information and Communications Technology</option>
                    </select>
                  </div>

                  {/* Batch */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                      <Calendar size={20} />
                      Academic Batch *
                    </label>
                    <select 
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      className="w-full p-4 rounded-lg bg-gray-100 border border-gray-300 text-base focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Batch</option>
                      <option value="2020">2020</option>
                      <option value="2021">2021</option>
                      <option value="2022">2022</option>
                      <option value="2023">2023</option>
                      <option value="2024">2024</option>
                    </select>
                  </div>
                </div>

                {/* Abstract */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                    <FileText size={20} />
                    Abstract *
                  </label>
                  <textarea
                    placeholder="Provide a comprehensive abstract of the thesis..."
                    value={abstract}
                    onChange={(e) => setAbstract(e.target.value)}
                    className="w-full p-4 rounded-lg bg-gray-100 border border-gray-300 text-base h-48 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-lg font-semibold text-gray-700">
                    <Upload size={20} />
                    Thesis Document *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-red-400 transition-colors">
                    <input 
                      type="file" 
                      id="fileUpload" 
                      accept="application/pdf" 
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="fileUpload" className="cursor-pointer">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Upload size={48} className="text-gray-400" />
                        <div>
                          <p className="text-lg font-semibold text-gray-700">
                            {file ? 'Change PDF File' : 'Upload Thesis PDF'}
                          </p>
                          <p className="text-gray-500 mt-1">Click to browse or drag and drop</p>
                          <p className="text-sm text-gray-400">Maximum file size: 50MB</p>
                        </div>
                      </div>
                    </label>
                  </div>
                  {file && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText size={24} className="text-green-600" />
                          <div>
                            <p className="font-semibold text-green-800">{file.name}</p>
                            <p className="text-sm text-green-600">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          className="text-red-600 hover:text-red-800 font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-red-800 hover:bg-red-700 disabled:bg-gray-400 text-white px-8 py-4 rounded-lg text-lg font-semibold flex items-center gap-3 transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload size={24} />
                        Add Thesis to Library
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Upload Guidelines */}
          <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <h3 className="text-2xl font-bold text-[#990000] mb-6">📋 Thesis Upload Guidelines</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-lg text-gray-800">Required Information</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">✓ Complete thesis title</li>
                  <li className="flex items-center gap-2">✓ Author's full name</li>
                  <li className="flex items-center gap-2">✓ College department</li>
                  <li className="flex items-center gap-2">✓ Academic year/batch</li>
                  <li className="flex items-center gap-2">✓ Comprehensive abstract (min. 200 words)</li>
                  <li className="flex items-center gap-2">✓ PDF document (max. 50MB)</li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-lg text-gray-800">Format Requirements</h4>
                <ul className="space-y-2 text-gray-600">
                  <li className="flex items-center gap-2">✅ PDF format only</li>
                  <li className="flex items-center gap-2">✅ Clear text (OCR recommended)</li>
                  <li className="flex items-center gap-2">✅ Proper pagination</li>
                  <li className="flex items-center gap-2">✅ Table of contents</li>
                  <li className="flex items-center gap-2">✅ References section</li>
                  <li className="flex items-center gap-2">✅ Abstract page</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Recent Uploads */}
          <div className="mt-12 bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-[#990000]">📥 Recently Added Theses</h3>
              <button 
                onClick={fetchRecentTheses}
                className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Refresh
              </button>
            </div>
            
            {loadingRecent ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading recent theses...</p>
              </div>
            ) : recentTheses.length === 0 ? (
              <div className="text-center py-8">
                <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No theses found. Start by adding your first thesis!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 font-bold">
                      <th className="border border-gray-300 px-4 py-3 text-left">Title</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">Author</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">College</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">Batch</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">Date Added</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">Status</th>
                      <th className="border border-gray-300 px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTheses.map((thesis, index) => (
                      <tr key={thesis.thesisID || index} className="hover:bg-gray-50 transition-colors">
                        <td className="border border-gray-300 px-4 py-3">
                          <div className="max-w-xs truncate" title={thesis.title}>
                            {thesis.title}
                          </div>
                        </td>
                        <td className="border border-gray-300 px-4 py-3">{thesis.author}</td>
                        <td className="border border-gray-300 px-4 py-3">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {thesis.college}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3">{thesis.batch}</td>
                        <td className="border border-gray-300 px-4 py-3">{formatDate(thesis.created_at)}</td>
                        <td className="border border-gray-300 px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(getThesisStatus(thesis.created_at))}`}>
                            {getThesisStatus(thesis.created_at)}
                          </span>
                        </td>
                        <td className="border border-gray-300 px-4 py-3">
                          <button
                            onClick={() => handleViewThesis(thesis)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                            disabled={!thesis.file_url}
                          >
                            <Eye size={14} />
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Summary */}
            {!loadingRecent && recentTheses.length > 0 && (
              <div className="mt-4 text-sm text-gray-600">
                Showing {recentTheses.length} most recent theses
              </div>
            )}
          </div>
        </main>
      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold text-[#990000] mb-4 text-center">Thesis Added Successfully! 🎉</h3>
            <p className="text-gray-600 mb-6 text-center">
              Your thesis has been added to the library. Scan the QR code below to access it directly.
            </p>
            
            <div className="flex justify-center mb-6 p-4 bg-white border-2 border-gray-200 rounded-xl">
              {qrCodeImage && (
                <img src={qrCodeImage} alt="QR Code" className="w-64 h-64" />
              )}
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Thesis URL:</p>
              <p className="text-xs text-gray-600 break-all">{qrCodeUrl}</p>
            </div>
            
            <button
              onClick={closeQrModal}
              className="w-full bg-red-800 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors"
            >
              Close & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddThesisPage;