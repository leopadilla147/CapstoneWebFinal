import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Book, 
  Clock, 
  Users, 
  Settings, 
  RefreshCw, 
  Save, 
  Trash2, 
  Eye, 
  EyeOff, 
  Key,
  User,
  Cpu,
  Network,
  Database,
  Archive,
  BarChart,
  Search,
  Plus,
  Edit
} from 'lucide-react';
import bg from "../assets/bg-gradient.png";
import CommonHeader from '../components/CommonHeader';
import SideNav from '../components/SideNav';
import { supabase } from '../connect-supabase.js';

const SmartIOTPage = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('user-logs');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [bookshelfBooks, setBookshelfBooks] = useState([]);
  const [allTheses, setAllTheses] = useState([]);
  const [settings, setSettings] = useState({
    autoLogging: true,
    logRetentionDays: 30,
    enableNotifications: true,
    maxBorrowDuration: 7,
    iotDeviceStatus: 'online',
    autoSync: true,
    realTimeUpdates: true,
    bookshelfCapacity: 50,
    scanTimeout: 30
  });
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState('');
  const [bookshelfLocation, setBookshelfLocation] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState('excellent');

  useEffect(() => {
    fetchCurrentAdmin();
    fetchLogs();
    fetchBookshelfBooks();
    fetchAllTheses();
    fetchSettings();
  }, []);

  const fetchCurrentAdmin = () => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      setCurrentAdmin(userData);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('iot_bookshelf_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookshelfBooks = async () => {
    try {
      setLoading(true);
      // Fetch books from the new bookshelf_inventory table
      const { data, error } = await supabase
        .from('bookshelf_inventory')
        .select(`
          *,
          thesestwo (
            thesis_id,
            title,
            author,
            abstract,
            college,
            batch,
            file_url,
            file_name
          )
        `)
        .eq('current_status', 'available')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookshelfBooks(data || []);
    } catch (error) {
      console.error('Error fetching bookshelf books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTheses = async () => {
    try {
      const { data, error } = await supabase
        .from('thesestwo')
        .select('thesis_id, title, author, college, batch')
        .order('title', { ascending: true });

      if (error) throw error;
      setAllTheses(data || []);
    } catch (error) {
      console.error('Error fetching theses:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_type', 'iot_bookshelf')
        .single();

      if (data && data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          setting_type: 'iot_bookshelf',
          settings: settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const clearLogs = async () => {
    if (!confirm('Are you sure you want to clear all logs? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('iot_bookshelf_logs')
        .delete()
        .lt('created_at', new Date(Date.now() - settings.logRetentionDays * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      
      fetchLogs();
      alert('Old logs cleared successfully!');
    } catch (error) {
      console.error('Error clearing logs:', error);
      alert('Error clearing logs');
    }
  };

  const addBookToBookshelf = async () => {
    if (!selectedThesis || !bookshelfLocation) {
      alert('Please select a thesis and provide a bookshelf location');
      return;
    }

    try {
      const { error } = await supabase
        .from('bookshelf_inventory')
        .insert({
          thesis_id: selectedThesis,
          bookshelf_location: bookshelfLocation,
          physical_condition: physicalCondition,
          current_status: settings.iotDeviceStatus === 'maintenance' ? 'maintenance' : 'available',
          last_scan: new Date().toISOString()
        });

      if (error) throw error;
      
      setShowAddBookModal(false);
      setSelectedThesis('');
      setBookshelfLocation('');
      setPhysicalCondition('excellent');
      fetchBookshelfBooks();
      alert('Book added to bookshelf successfully!');
    } catch (error) {
      console.error('Error adding book to bookshelf:', error);
      alert('Error adding book to bookshelf');
    }
  };

  const removeBookFromShelf = async (inventoryId) => {
    if (!confirm('Are you sure you want to remove this book from the bookshelf?')) return;

    try {
      const { error } = await supabase
        .from('bookshelf_inventory')
        .delete()
        .eq('id', inventoryId);

      if (error) throw error;
      
      fetchBookshelfBooks();
      alert('Book removed from bookshelf successfully!');
    } catch (error) {
      console.error('Error removing book:', error);
      alert('Error removing book');
    }
  };

  const updateBookStatus = async (inventoryId, newStatus) => {
    try {
      const { error } = await supabase
        .from('bookshelf_inventory')
        .update({ 
          current_status: newStatus,
          last_scan: new Date().toISOString()
        })
        .eq('id', inventoryId);

      if (error) throw error;
      
      fetchBookshelfBooks();
      alert('Book status updated successfully!');
    } catch (error) {
      console.error('Error updating book status:', error);
      alert('Error updating book status');
    }
  };

  const simulateIoTActivity = () => {
    const actions = ['scan', 'borrow', 'return', 'check_in', 'check_out'];
    const statuses = ['success', 'failed'];
    const sampleBooks = [
      'Machine Learning Thesis 2024',
      'AI Research Document',
      'Computer Vision Study',
      'Data Analysis Research'
    ];

    const newLog = {
      id: Date.now(),
      action: actions[Math.floor(Math.random() * actions.length)],
      book_title: sampleBooks[Math.floor(Math.random() * sampleBooks.length)],
      book_id: 'TH-' + Math.floor(Math.random() * 1000),
      user_name: 'Test User ' + Math.floor(Math.random() * 10),
      user_id: 'user-' + Math.floor(Math.random() * 100),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: new Date().toISOString()
    };
    
    setLogs(prev => [newLog, ...prev.slice(0, 99)]);
    alert('Simulated IoT activity logged!');
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

        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Cpu className="text-white" />
                Smart IoT Bookshelf Management
              </h1>
              <p className="text-white/80">
                Monitor user activities, manage available books, and configure IoT bookshelf settings
              </p>
            </div>

            {/* System Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Device Status</p>
                    <p className={`text-2xl font-bold ${
                      settings?.iotDeviceStatus === 'online' ? 'text-green-600' : 
                      settings?.iotDeviceStatus === 'maintenance' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {settings?.iotDeviceStatus?.charAt(0)?.toUpperCase() + settings?.iotDeviceStatus?.slice(1) || 'Unknown'}
                    </p>
                  </div>
                  <Network className={`w-8 h-8 ${
                    settings.iotDeviceStatus === 'online' ? 'text-green-500' : 
                    settings.iotDeviceStatus === 'maintenance' ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Available Books</p>
                    <p className="text-2xl font-bold text-blue-600">{bookshelfBooks.length}</p>
                  </div>
                  <Book className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Logs</p>
                    <p className="text-2xl font-bold text-purple-600">{logs.length}</p>
                  </div>
                  <Database className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Bookshelf Capacity</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {bookshelfBooks.length}/{settings.bookshelfCapacity}
                    </p>
                  </div>
                  <Archive className="w-8 h-8 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-lg">
              {/* Tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex -mb-px">
                  {[
                    { id: 'user-logs', label: 'User Logs', icon: Clock },
                    { id: 'books-available', label: 'Books Available in Smart IOT Bookshelf', icon: Book },
                    { id: 'system-settings', label: 'System Settings', icon: Settings }
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 py-4 px-6 border-b-2 font-medium text-sm ${
                          activeTab === tab.id
                            ? 'border-red-500 text-red-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <IconComponent size={18} />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Tab Content */}
              <div>
                {/* User Logs Tab */}
                {activeTab === 'user-logs' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">User Activity Logs</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={simulateIoTActivity}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <RefreshCw size={16} />
                          Simulate Activity
                        </button>
                        <button
                          onClick={fetchLogs}
                          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <RefreshCw size={16} />
                          Refresh Logs
                        </button>
                        <button
                          onClick={clearLogs}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                          Clear Old Logs
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="animate-spin mx-auto mb-2 text-gray-600" />
                        <p className="text-gray-600">Loading logs...</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg border">
                        <div className="grid grid-cols-12 gap-4 p-4 font-semibold text-sm text-gray-600 border-b">
                          <div className="col-span-2">Timestamp</div>
                          <div className="col-span-2">Action</div>
                          <div className="col-span-3">Book Details</div>
                          <div className="col-span-3">User</div>
                          <div className="col-span-2">Status</div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {logs.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              No activity logs found.
                            </div>
                          ) : (
                            logs.map((log, index) => (
                              <div
                                key={log.id}
                                className={`grid grid-cols-12 gap-4 p-4 text-sm border-b ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                              >
                                <div className="col-span-2">
                                  {new Date(log.created_at).toLocaleString()}
                                </div>
                                <div className="col-span-2">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    log.action === 'borrow' 
                                      ? 'bg-green-100 text-green-800'
                                      : log.action === 'return'
                                      ? 'bg-blue-100 text-blue-800'
                                      : log.action === 'scan'
                                      ? 'bg-purple-100 text-purple-800'
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {log.action}
                                  </span>
                                </div>
                                <div className="col-span-3">
                                  <div className="font-medium">{log.book_title}</div>
                                  <div className="text-gray-500 text-xs">{log.book_id}</div>
                                </div>
                                <div className="col-span-3">
                                  <div className="font-medium">{log.user_name}</div>
                                  <div className="text-gray-500 text-xs">{log.user_id}</div>
                                </div>
                                <div className="col-span-2">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    log.status === 'success'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {log.status}
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Books Available in Smart IOT Bookshelf Tab */}
                {activeTab === 'books-available' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">Books Available in Smart IoT Bookshelf</h2>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddBookModal(true)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Plus size={16} />
                          Add Book to Bookshelf
                        </button>
                        <button
                          onClick={fetchBookshelfBooks}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <RefreshCw size={16} />
                          Refresh Books
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="animate-spin mx-auto mb-2 text-gray-600" />
                        <p className="text-gray-600">Loading bookshelf inventory...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bookshelfBooks.length === 0 ? (
                          <div className="col-span-full text-center py-12">
                            <Book className="mx-auto mb-4 text-gray-400" size={48} />
                            <p className="text-gray-500 text-lg">No books available in the bookshelf</p>
                            <p className="text-gray-400">Add books to the bookshelf to see them here</p>
                          </div>
                        ) : (
                            bookshelfBooks.map((inventoryItem) => (
                            <div
                              key={inventoryItem.id}
                              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div>
                                  <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-2">
                                    {inventoryItem?.thesestwo?.title || 'Unknown Title'}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2">
                                    by {inventoryItem?.thesestwo?.author || 'Unknown Author'}
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  inventoryItem?.current_status === 'available' 
                                    ? 'bg-green-100 text-green-800'
                                    : inventoryItem?.current_status === 'maintenance'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {inventoryItem?.current_status?.charAt(0)?.toUpperCase() + inventoryItem?.current_status?.slice(1) || 'Unknown'}
                                </span>
                              </div>
                              
                              <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">College:</span>
                                  <span className="font-medium">{inventoryItem?.thesestwo?.college || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Batch:</span>
                                  <span className="font-medium">{inventoryItem?.thesestwo?.batch || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Location:</span>
                                  <span className="font-medium">{inventoryItem?.bookshelf_location || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Condition:</span>
                                  <span className="font-medium capitalize">{inventoryItem?.physical_condition || 'unknown'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Last Scan:</span>
                                  <span className="font-medium">
                                    {inventoryItem?.last_scan ? new Date(inventoryItem.last_scan).toLocaleDateString() : 'Never'}
                                  </span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <select
                                  value={inventoryItem?.current_status || 'available'}
                                  onChange={(e) => updateBookStatus(inventoryItem.id, e.target.value)}
                                  className="flex-1 bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <option value="available">Available</option>
                                  <option value="borrowed">Borrowed</option>
                                  <option value="maintenance">Maintenance</option>
                                  <option value="reserved">Reserved</option>
                                </select>
                                <button
                                  onClick={() => removeBookFromShelf(inventoryItem.id)}
                                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm transition-colors"
                                  title="Remove from Bookshelf"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Add Book Modal */}
                    {showAddBookModal && (
                      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 w-full max-w-md">
                          <h3 className="text-xl font-bold mb-4">Add Book to Bookshelf</h3>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Select Thesis
                              </label>
                              <select
                                value={selectedThesis}
                                onChange={(e) => setSelectedThesis(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <option value="">Choose a thesis...</option>
                                {allTheses.map((thesis) => (
                                  <option key={thesis.thesis_id} value={thesis.thesis_id}>
                                    {thesis.title} - {thesis.author}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bookshelf Location
                              </label>
                              <input
                                type="text"
                                value={bookshelfLocation}
                                onChange={(e) => setBookshelfLocation(e.target.value)}
                                placeholder="e.g., Shelf A1, Row 3"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Physical Condition
                              </label>
                              <select
                                value={physicalCondition}
                                onChange={(e) => setPhysicalCondition(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              >
                                <option value="excellent">Excellent</option>
                                <option value="good">Good</option>
                                <option value="fair">Fair</option>
                                <option value="poor">Poor</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-6">
                            <button
                              onClick={() => setShowAddBookModal(false)}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={addBookToBookshelf}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded transition-colors"
                            >
                              Add to Bookshelf
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* System Settings Tab */}
                {activeTab === 'system-settings' && (
                  <div>
                    <h2 className="text-2xl font-semibold mb-6">IoT Bookshelf System Configuration</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Auto Logging Settings */}
                      <div className="bg-gray-50 p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Database size={18} />
                          Logging Settings
                        </h3>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              Enable Auto Logging
                            </label>
                            <input
                              type="checkbox"
                              checked={settings.autoLogging}
                              onChange={(e) => setSettings({ ...settings, autoLogging: e.target.checked })}
                              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Log Retention (Days)
                            </label>
                            <input
                              type="number"
                              value={settings.logRetentionDays}
                              onChange={(e) => setSettings({ ...settings, logRetentionDays: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              min="1"
                              max="365"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bookshelf Settings */}
                      <div className="bg-gray-50 p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Archive size={18} />
                          Bookshelf Settings
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Bookshelf Capacity
                            </label>
                            <input
                              type="number"
                              value={settings.bookshelfCapacity}
                              onChange={(e) => setSettings({ ...settings, bookshelfCapacity: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              min="1"
                              max="200"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Scan Timeout (Seconds)
                            </label>
                            <input
                              type="number"
                              value={settings.scanTimeout}
                              onChange={(e) => setSettings({ ...settings, scanTimeout: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              min="5"
                              max="120"
                            />
                          </div>
                        </div>
                      </div>

                      {/* IoT Device Settings */}
                      <div className="bg-gray-50 p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <Cpu size={18} />
                          Device Settings
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Device Status
                            </label>
                            <select
                              value={settings.iotDeviceStatus}
                              onChange={(e) => setSettings({ ...settings, iotDeviceStatus: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <option value="online">Online</option>
                              <option value="offline">Offline</option>
                              <option value="maintenance">Maintenance</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              Auto Sync
                            </label>
                            <input
                              type="checkbox"
                              checked={settings.autoSync}
                              onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Borrowing Settings */}
                      <div className="bg-gray-50 p-6 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                          <BarChart size={18} />
                          Borrowing Settings
                        </h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Maximum Borrow Duration (Days)
                            </label>
                            <input
                              type="number"
                              value={settings.maxBorrowDuration}
                              onChange={(e) => setSettings({ ...settings, maxBorrowDuration: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                              min="1"
                              max="30"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              Real-time Updates
                            </label>
                            <input
                              type="checkbox"
                              checked={settings.realTimeUpdates}
                              onChange={(e) => setSettings({ ...settings, realTimeUpdates: e.target.checked })}
                              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">
                              Enable Notifications
                            </label>
                            <input
                              type="checkbox"
                              checked={settings.enableNotifications}
                              onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                              className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={handleSaveSettings}
                        disabled={loading}
                        className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                      >
                        <Save size={16} />
                        {loading ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SmartIOTPage;