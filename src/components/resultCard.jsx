import React, { useState } from 'react';
import { ExternalLink, Eye, EyeOff, Calendar, User, BookOpen } from 'lucide-react';

function ResultCard({ 
  thesis = {}, 
  searchQuery = '',
  onViewDetails 
}) {
  const [showFullAbstract, setShowFullAbstract] = useState(false);
  
  const {
    thesisID,
    title = 'Untitled Thesis',
    author = 'Unknown Author',
    abstract = 'No abstract available.',
    college = 'Unknown College',
    batch,
    created_at,
    qr_code_url
  } = thesis;

  const highlightText = (text, query) => {
    if (!query.trim() || !text) return text;
    
    const escapedQuery = query.replace(/[-[\]/{}()*+?.\\^$|]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "gi");
    
    return text.replace(regex, match => 
      `<mark class="bg-yellow-200 px-1 rounded font-medium">${match}</mark>`
    );
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return 'No abstract available.';
    if (text.length <= maxLength || showFullAbstract) return text;
    return text.substring(0, maxLength) + '...';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <h2 
              className="text-xl font-bold text-gray-800 mb-3 leading-tight cursor-pointer hover:text-red-700 transition-colors"
              onClick={() => onViewDetails && onViewDetails(thesisID)}
              dangerouslySetInnerHTML={{
                __html: highlightText(title, searchQuery)
              }}
            />
            
            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <User size={16} className="text-red-600" />
                <span className="font-medium">Author:</span>
                <span 
                  className="flex-1"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(author, searchQuery)
                  }}
                />
              </div>
              
              <div className="flex items-center gap-2 text-gray-600 text-sm">
                <BookOpen size={16} className="text-red-600" />
                <span className="font-medium">College:</span>
                <span>{college}</span>
              </div>
              
              {batch && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Calendar size={16} className="text-red-600" />
                  <span className="font-medium">Batch:</span>
                  <span>{batch}</span>
                </div>
              )}
              
              {created_at && (
                <div className="flex items-center gap-2 text-gray-600 text-sm">
                  <Calendar size={16} className="text-red-600" />
                  <span className="font-medium">Added:</span>
                  <span>{formatDate(created_at)}</span>
                </div>
              )}
            </div>

            {/* Abstract */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                  Abstract
                </h4>
                {abstract.length > 200 && (
                  <button
                    onClick={() => setShowFullAbstract(!showFullAbstract)}
                    className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                  >
                    {showFullAbstract ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showFullAbstract ? 'Show Less' : 'Show More'}
                  </button>
                )}
              </div>
              <div
                className="text-gray-600 leading-relaxed text-sm"
                dangerouslySetInnerHTML={{
                  __html: highlightText(truncateText(abstract), searchQuery)
                }}
              />
            </div>

            {/* Actions - Only View Details now */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => onViewDetails && onViewDetails(thesisID)}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
              >
                <ExternalLink size={16} />
                View Details
              </button>
            </div>
          </div>

          {/* QR Code Sidebar */}
          {qr_code_url && (
            <div className="lg:w-40 flex-shrink-0">
              <div className="text-center">
                <div className="bg-white border border-gray-200 rounded-lg p-3 mb-2">
                  <img
                    src={qr_code_url}
                    alt="QR Code"
                    className="w-full h-auto max-w-32 mx-auto"
                  />
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  Scan with Thesis Hub App
                </p>
                <p className="text-xs text-gray-400">
                  Mobile app access only
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultCard;