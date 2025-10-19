import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Book, 
  Clock, 
  Settings, 
  RefreshCw, 
  Save, 
  Trash2, 
  Cpu,
  Network,
  Database,
  Archive,
  Download
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
  const [settings, setSettings] = useState({
    device_status: 'active'
  });
  const [currentAdmin, setCurrentAdmin] = useState(null);

  useEffect(() => {
    fetchCurrentAdmin();
    fetchLogs();
    fetchBookshelfBooks();
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
        .from('bookshelf_logs')
        .select(`
          *,
          users:user_id (user_id, username, full_name),
          theses:thesis_id (thesis_id, title)
        `)
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
      const { data, error } = await supabase
        .from('bookshelf_inventory')
        .select(`
          *,
          theses:thesis_id (
            thesis_id,
            title,
            author,
            college_department,
            batch
          )
        `)
        .order('thesis_book_id', { ascending: false });

      if (error) throw error;
      setBookshelfBooks(data || []);
    } catch (error) {
      console.error('Error fetching bookshelf books:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('bookshelf_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings({
          device_status: data.device_status || 'active'
        });
      } else {
        // Initialize settings if no record exists
        const { error: insertError } = await supabase
          .from('bookshelf_settings')
          .insert([
            { 
              device_id: 1, 
              device_status: 'active'
            }
          ]);

        if (insertError) throw insertError;
        
        setSettings({ device_status: 'active' });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('bookshelf_settings')
        .upsert({
          device_id: 1,
          device_status: settings.device_status
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

  const archiveOldLogs = async () => {
    if (!confirm('Are you sure you want to archive logs older than 30 days? This will create a downloadable archive file.')) return;

    try {
      setLoading(true);
      
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Get old logs for archiving
      const { data: oldLogs, error: fetchError } = await supabase
        .from('bookshelf_logs')
        .select(`
          *,
          users:user_id (user_id, username, full_name),
          theses:thesis_id (thesis_id, title)
        `)
        .lt('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (!oldLogs || oldLogs.length === 0) {
        alert('No logs found older than 30 days to archive.');
        return;
      }

      // Create downloadable archive
      const archiveData = {
        archiveDate: new Date().toISOString(),
        totalLogs: oldLogs.length,
        dateRange: {
          from: oldLogs[oldLogs.length - 1].created_at,
          to: oldLogs[0].created_at
        },
        logs: oldLogs
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(archiveData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookshelf_logs_archive_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Delete old logs after successful archive
      const { error: deleteError } = await supabase
        .from('bookshelf_logs')
        .delete()
        .lt('created_at', thirtyDaysAgo.toISOString());

      if (deleteError) throw deleteError;
      
      fetchLogs();
      alert(`Successfully archived ${oldLogs.length} logs and downloaded archive file.`);
    } catch (error) {
      console.error('Error archiving logs:', error);
      alert('Error archiving logs');
    } finally {
      setLoading(false);
    }
  };

  const removeBookFromShelf = async (thesis_book_id) => {
    if (!confirm('Are you sure you want to remove this book from the bookshelf?')) return;

    try {
      const { error } = await supabase
        .from('bookshelf_inventory')
        .delete()
        .eq('thesis_book_id', thesis_book_id);

      if (error) throw error;
      
      fetchBookshelfBooks();
      alert('Book removed from bookshelf successfully!');
    } catch (error) {
      console.error('Error removing book:', error);
      alert('Error removing book');
    }
  };

  const updateBookStatus = async (thesis_book_id, newStatus) => {
    try {
      const { error } = await supabase
        .from('bookshelf_inventory')
        .update({ 
          current_status: newStatus
        })
        .eq('thesis_book_id', thesis_book_id);

      if (error) throw error;
      
      fetchBookshelfBooks();
      alert('Book status updated successfully!');
    } catch (error) {
      console.error('Error updating book status:', error);
      alert('Error updating book status');
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

  // Calculate statistics
  const availableBooksCount = bookshelfBooks.filter(book => book.current_status === 'available').length;
  const borrowedBooksCount = bookshelfBooks.filter(book => book.current_status === 'borrowed').length;
  const maintenanceBooksCount = bookshelfBooks.filter(book => book.current_status === 'maintenance').length;

  return (
    <div className="min-h-screen w-screen bg-cover bg-center bg-no-repeat flex flex-col font-sans" style={{ backgroundImage: `url(${bg})` }}>
      
      <CommonHeader isAuthenticated={true} onLogOut={handleLogOut} userRole="admin" />

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
                      settings?.device_status === 'active' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {settings?.device_status?.charAt(0)?.toUpperCase() + settings?.device_status?.slice(1) || 'Unknown'}
                    </p>
                  </div>
                  <Network className={`w-8 h-8 ${
                    settings.device_status === 'active' ? 'text-green-500' : 'text-yellow-500'
                  }`} />
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Books</p>
                    <p className="text-2xl font-bold text-blue-600">{bookshelfBooks.length}</p>
                  </div>
                  <Book className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Available Books</p>
                    <p className="text-2xl font-bold text-green-600">
                      {availableBooksCount}
                    </p>
                  </div>
                  <Archive className="w-8 h-8 text-green-500" />
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
                          onClick={fetchLogs}
                          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <RefreshCw size={16} />
                          Refresh Logs
                        </button>
                        <button
                          onClick={archiveOldLogs}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Download size={16} />
                          Archive Old Logs
                        </button>
                      </div>
                    </div>

                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Note:</strong> Archiving logs will download a JSON file containing logs older than 30 days 
                        and then remove them from the database to improve performance.
                      </p>
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
                          <div className="col-span-2">User</div>
                          <div className="col-span-5">Book Details</div>
                          <div className="col-span-2">Action</div>
                          <div className="col-span-1">ID</div>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {logs.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                              No activity logs found.
                            </div>
                          ) : (
                            logs.map((log, index) => (
                              <div
                                key={log.bookshelf_logs_id || index}
                                className={`grid grid-cols-12 gap-4 p-4 text-sm border-b ${
                                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}
                              >
                                <div className="col-span-2">
                                  {new Date(log.created_at).toLocaleString()}
                                </div>
                                <div className="col-span-2">
                                  <div className="font-medium">{log.users?.full_name || 'Unknown User'}</div>
                                  <div className="text-gray-500 text-xs">{log.users?.username || 'N/A'}</div>
                                </div>
                                <div className="col-span-5">
                                  <div className="font-medium">{log.theses?.title || 'Unknown Book'}</div>
                                  <div className="text-gray-500 text-xs">Thesis ID: {log.thesis_id}</div>
                                </div>
                                <div className="col-span-2">
                                  <span className={`px-2 py-1 rounded-full text-xs ${
                                    log.status === 'returned' 
                                      ? 'bg-green-100 text-green-800'
                                      : log.status === 'borrowed'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}>
                                    {log.status}
                                  </span>
                                </div>
                                <div className="col-span-1 text-xs text-gray-500">
                                  #{log.bookshelf_logs_id}
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
                          onClick={fetchBookshelfBooks}
                          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <RefreshCw size={16} />
                          Refresh Books
                        </button>
                      </div>
                    </div>

                    {/* Bookshelf Status Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-green-800 font-semibold">Available</p>
                            <p className="text-2xl font-bold text-green-600">{availableBooksCount}</p>
                          </div>
                          <Archive className="w-8 h-8 text-green-500" />
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-blue-800 font-semibold">Borrowed</p>
                            <p className="text-2xl font-bold text-blue-600">{borrowedBooksCount}</p>
                          </div>
                          <Book className="w-8 h-8 text-blue-500" />
                        </div>
                      </div>
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-yellow-800 font-semibold">Maintenance</p>
                            <p className="text-2xl font-bold text-yellow-600">{maintenanceBooksCount}</p>
                          </div>
                          <Settings className="w-8 h-8 text-yellow-500" />
                        </div>
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
                            <p className="text-gray-400">Books are added to the bookshelf during maintenance mode</p>
                          </div>
                        ) : (
                          bookshelfBooks.map((inventoryItem) => (
                            <div
                              key={inventoryItem.thesis_book_id}
                              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg text-gray-800 mb-1 line-clamp-2">
                                    {inventoryItem.theses?.title || 'Unknown Title'}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2">
                                    by {inventoryItem.theses?.author || 'Unknown Author'}
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  inventoryItem.current_status === 'available' 
                                    ? 'bg-green-100 text-green-800'
                                    : inventoryItem.current_status === 'borrowed'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {inventoryItem.current_status?.charAt(0)?.toUpperCase() + inventoryItem.current_status?.slice(1) || 'Unknown'}
                                </span>
                              </div>
                              
                              <div className="space-y-2 mb-4">
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">College:</span>
                                  <span className="font-medium text-right">{inventoryItem.theses?.college_department || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Batch:</span>
                                  <span className="font-medium">{inventoryItem.theses?.batch || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Location:</span>
                                  <span className="font-medium">{inventoryItem.book_location || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-500">Inventory ID:</span>
                                  <span className="font-medium">#{inventoryItem.thesis_book_id}</span>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <select
                                  value={inventoryItem.current_status || 'available'}
                                  onChange={(e) => updateBookStatus(inventoryItem.thesis_book_id, e.target.value)}
                                  className="flex-1 bg-gray-100 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                >
                                  <option value="available">Available</option>
                                  <option value="borrowed">Borrowed</option>
                                  <option value="maintenance">Maintenance</option>
                                </select>
                                <button
                                  onClick={() => removeBookFromShelf(inventoryItem.thesis_book_id)}
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
                  </div>
                )}

                {/* System Settings Tab */}
                {activeTab === 'system-settings' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Device Status</p>
                          <select
                            value={settings.device_status}
                            onChange={(e) => setSettings({ ...settings, device_status: e.target.value })}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            <option value="active">Active</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
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

                    <div className="bg-gray-50 rounded-lg p-6 border">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Cpu size={18} />
                        Device Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Current Status</h4>
                          <p className={`text-lg font-semibold ${
                            settings.device_status === 'active' ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {settings.device_status === 'active' ? '🟢 Active' : '🟡 Maintenance'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {settings.device_status === 'active' 
                              ? 'Device is operational and accepting scans'
                              : 'Device is in maintenance mode - book operations disabled'
                            }
                          </p>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Bookshelf Statistics</h4>
                          <p className="text-lg font-semibold text-gray-800">
                            {availableBooksCount} / {bookshelfBooks.length} books available
                          </p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ 
                                width: `${bookshelfBooks.length > 0 ? 
                                  (availableBooksCount / bookshelfBooks.length) * 100 
                                  : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <h4 className="font-medium text-gray-700 mb-2">Device Status Effects</h4>
                        <ul className="text-sm text-gray-600 space-y-2">
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>
                              <strong>Active:</strong> Books can be scanned, borrowed, and returned normally
                            </span>
                          </li>
                          <li className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                            <span>
                              <strong>Maintenance:</strong> Book operations disabled - use this mode for adding/removing books physically
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <h4 className="font-medium text-yellow-800 mb-2">📝 Note about Book Management</h4>
                        <p className="text-sm text-yellow-700">
                          Books are physically added to the bookshelf during maintenance mode. 
                          The inventory is automatically updated when books are scanned by the IoT system.
                          Use maintenance mode when you need to physically rearrange or add new books to the shelf.
                        </p>
                      </div>
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