import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, SortAsc, BookOpen, Calendar, User, X } from 'lucide-react';
import bgImage from "../assets/bg-gradient.png";
import { useLocation, useNavigate } from 'react-router-dom';
import CommonHeader from '../components/CommonHeader';
import { supabase } from '../connect-supabase';

function useQuery() {
  const location = useLocation();
  return new URLSearchParams(location.search);
}

function SearchResultsPage() {
  const query = useQuery().get('q') || '';
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(query);
  const [filters, setFilters] = useState({
    college: '',
    batch: '',
    sortBy: 'title',
    sortOrder: 'asc'
  });
  const [colleges, setColleges] = useState([]);
  const [batches, setBatches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchResults(query);
  }, [query, filters]);

  
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (query) {
      fetchResults(query);
    }
  }, [query, filters]);

  const fetchFilterOptions = async () => {
    try {
      // Updated table name and column name
      const { data: collegeData } = await supabase
        .from('theses')
        .select('college_department')
        .not('college_department', 'is', null);

      const { data: batchData } = await supabase
        .from('theses')
        .select('batch')
        .not('batch', 'is', null);

      setColleges([...new Set(collegeData?.map(item => item.college_department) || [])]);
      setBatches([...new Set(batchData?.map(item => item.batch) || [])].sort().reverse());
    } catch (err) {
      console.error('Error fetching filter options:', err);
    }
  };

  const fetchResults = useCallback(async (searchQuery = '') => {
    try {
      setLoading(true);
      setError(null);

      let queryBuilder = supabase
        .from('theses')
        .select('thesis_id, title, author, abstract, college_department, batch, created_at, qr_code_url');

      // Apply search only if there's a search query
      if (searchQuery.trim()) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%,abstract.ilike.%${searchQuery}%,college_department.ilike.%${searchQuery}%`
        );
      }

      // Apply filters
      if (filters.college) {
        queryBuilder = queryBuilder.eq('college_department', filters.college);
      }
      if (filters.batch) {
        queryBuilder = queryBuilder.eq('batch', filters.batch);
      }

      // Apply sorting
      queryBuilder = queryBuilder.order(filters.sortBy, { 
        ascending: filters.sortOrder === 'asc' 
      });

      const { data, error: queryError } = await queryBuilder;

      if (queryError) throw queryError;
      setResults(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/results?q=${encodeURIComponent(searchInput)}`);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters = { college: '', batch: '', sortBy: 'title', sortOrder: 'asc' };
    setFilters(defaultFilters);
  };

  const highlightMatches = (text, keyword) => {
    if (!keyword.trim() || !text) return text;

    const escapedKeyword = keyword.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
    const regex = new RegExp(escapedKeyword, "gi");
    
    return text.replace(regex, match => `<mark class="bg-yellow-200 px-1 rounded">${match}</mark>`);
  };

  const truncateAbstract = (text, maxLength = 300) => {
    if (!text) return 'No abstract available';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const hasActiveFilters = filters.college || filters.batch || filters.sortBy !== 'title';

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed font-sans"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      <CommonHeader isAuthenticated={false} />

      <div className="w-full px-4 lg:px-8 py-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg mb-6 w-full">
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Search theses by title, author, abstract, or college..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-base outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    Search
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Filter size={20} />
                Filters
              </button>
            </div>
          </form>

          {showFilters && (
            <div className="border-t pt-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Advanced Filters</h3>
                <div className="flex gap-3">
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                    >
                      <X size={16} />
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <BookOpen size={16} />
                    College
                  </label>
                  <select
                    value={filters.college}
                    onChange={(e) => handleFilterChange({ ...filters, college: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">All Colleges</option>
                    {colleges.map(college => (
                      <option key={college} value={college}>{college}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar size={16} />
                    Batch
                  </label>
                  <select
                    value={filters.batch}
                    onChange={(e) => handleFilterChange({ ...filters, batch: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">All Batches</option>
                    {batches.map(batch => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <SortAsc size={16} />
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange({ ...filters, sortBy: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="title">Title</option>
                    <option value="author">Author</option>
                    <option value="created_at">Date Added</option>
                    <option value="college_department">College</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Sort Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange({ ...filters, sortOrder: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="asc">Ascending (A-Z)</option>
                    <option value="desc">Descending (Z-A)</option>
                  </select>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {filters.college && (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      College: {filters.college}
                      <button onClick={() => handleFilterChange({ ...filters, college: '' })}>
                        <X size={14} />
                      </button>
                    </span>
                  )}
                  {filters.batch && (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                      Batch: {filters.batch}
                      <button onClick={() => handleFilterChange({ ...filters, batch: '' })}>
                        <X size={14} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">
              {query ? `Results for "${query}"` : 'All Theses'}
            </h2>
            <p className="text-white/80">
              {loading ? 'Searching...' : `Found ${results.length} result${results.length !== 1 ? 's' : ''}`}
              {filters.college && ` in ${filters.college}`}
              {filters.batch && ` from ${filters.batch}`}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 text-lg mb-2">Error loading results</p>
            <p className="text-red-500">{error}</p>
            <button
              onClick={() => fetchResults(query || searchInput)}
              className="mt-3 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="bg-white rounded-2xl shadow-md p-12 text-center w-full">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No results found</h3>
            <p className="text-gray-500 mb-4">
              {query 
                ? `No theses found for "${query}". Try different keywords or filters.`
                : 'No theses available in the database.'
              }
            </p>
            {query && (
              <button
                onClick={() => {
                  setSearchInput('');
                  navigate('/results');
                }}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
              >
                View All Theses
              </button>
            )}
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="grid gap-6 w-full">
            {results.map((thesis) => (
              <div
                key={thesis.thesis_id}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden w-full"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1 min-w-0">
                      <h2 
                        className="text-xl font-bold text-gray-800 mb-3 leading-tight"
                        dangerouslySetInnerHTML={{
                          __html: highlightMatches(thesis.title, query)
                        }}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <User size={16} />
                          <span className="font-medium">Author:</span>
                          <span dangerouslySetInnerHTML={{
                            __html: highlightMatches(thesis.author, query)
                          }} />
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <BookOpen size={16} />
                          <span className="font-medium">College:</span>
                          <span>{thesis.college_department}</span>
                        </div>
                        {thesis.batch && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Calendar size={16} />
                            <span className="font-medium">Batch:</span>
                            <span>{thesis.batch}</span>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-700 mb-2">Abstract</h4>
                        <div
                          className="text-gray-600 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: highlightMatches(truncateAbstract(thesis.abstract), query)
                          }}
                        />
                      </div>
                    </div>

                    {thesis.qr_code_url && (
                      <div className="lg:w-48 flex-shrink-0">
                        <div className="text-center">
                          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3">
                            <img
                              src={thesis.qr_code_url}
                              alt="QR Code"
                              className="w-32 h-32 mx-auto"
                            />
                          </div>
                          <p className="text-sm text-gray-600 font-medium">
                            Scan QR Code to Access
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Use the Thesis Hub mobile app
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResultsPage;