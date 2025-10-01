// File Path: /frontend/src/components/ChatMessage.tsx

import React, { useState } from 'react';
import { Bot, User, Clock, MessageSquare, Lightbulb, ChevronRight, Filter, Star, Eye, EyeOff } from 'lucide-react';
import ProductCard from './ProductCard';
import OrderCard from './OrderCard';

interface ChatMessageProps {
  message: {
    id: string;
    message: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    // Legacy support
    products?: any[];
    orders?: any[];
    // Enhanced dual slider support
    exact_matches?: any[];
    suggestions?: any[];
    suggested_questions?: string[];
    context_product?: any;
    show_exact_slider?: boolean;
    show_suggestions_slider?: boolean;
    // Enhanced metadata
    total_exact_matches?: number;
    total_suggestions?: number;
    current_page?: number;
    has_more_exact?: boolean;
    has_more_suggestions?: boolean;
    applied_filters?: Record<string, any>;
    search_metadata?: Record<string, any>;
  };
  selectedProductId?: string;
  onFocusProduct?: (productId: string) => void;
  onSendSuggestedQuestion?: (question: string, contextProduct?: any) => void;
  onRequestMore?: (type: 'exact' | 'suggestions') => void;
  onAskAboutProduct?: (productNumber: number, question: string) => void;
  className?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  selectedProductId,
  onFocusProduct,
  onSendSuggestedQuestion,
  onRequestMore,
  onAskAboutProduct,
  className = ""
}) => {
  const [showAllExact, setShowAllExact] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [activeProductNumber, setActiveProductNumber] = useState<number | null>(null);
  const [showImagesAsText, setShowImagesAsText] = useState(false);

  const isBot = message.sender === 'bot';
  
  // Support both new dual slider format and legacy format
  const exactMatches = message.exact_matches || (message.show_exact_slider !== false ? message.products : []) || [];
  const suggestions = message.suggestions || [];
  const hasExactMatches = exactMatches.length > 0 && message.show_exact_slider !== false;
  const hasSuggestions = suggestions.length > 0 && message.show_suggestions_slider !== false;
  
  const hasOrders = message.orders && message.orders.length > 0;
  const hasSuggestedQuestions = message.suggested_questions && message.suggested_questions.length > 0;
  const hasAppliedFilters = message.applied_filters && Object.keys(message.applied_filters).length > 0;

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // NEW: Function to detect and extract image URLs from message
  const extractImageUrls = (text: string): string[] => {
    // Detect URLs in the format of **Image X:** URL
    const imageUrlPattern = /\*\*Image \d+:\*\*\s*(https?:\/\/[^\s\n]+)/g;
    const matches = [];
    let match;
    
    while ((match = imageUrlPattern.exec(text)) !== null) {
      matches.push(match[1]);
    }
    
    return matches;
  };

  // NEW: Function to check if message contains product images
  const containsProductImages = (text: string): boolean => {
    return /Here are the available images for/.test(text) && 
           /\*\*Image \d+:\*\*/.test(text);
  };

  // NEW: Render message content with image support
  const renderMessageContent = (text: string) => {
    if (!containsProductImages(text)) {
      // Regular message - render as normal
      return <div className="text-sm leading-relaxed whitespace-pre-wrap">{text}</div>;
    }

    // Extract product title and images
    const titleMatch = text.match(/Here are the available images for \*\*(.*?)\*\*/);
    const productTitle = titleMatch ? titleMatch[1] : 'this product';
    const imageUrls = extractImageUrls(text);
    
    if (imageUrls.length === 0) {
      return <div className="text-sm leading-relaxed whitespace-pre-wrap">{text}</div>;
    }

    return (
      <div className="text-sm leading-relaxed">
        <div className="mb-4">
          <p className="font-medium text-gray-800 mb-2">
            Here are the available images for <strong>{productTitle}</strong>:
          </p>
          
          {/* Toggle button for image view */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setShowImagesAsText(!showImagesAsText)}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              {showImagesAsText ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {showImagesAsText ? 'Show URLs' : 'Show Images'}
            </button>
            <span className="text-xs text-gray-500">
              {imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''} found
            </span>
          </div>

          {showImagesAsText ? (
            // Show as text URLs (original format)
            <div className="space-y-1">
              {imageUrls.map((url, index) => (
                <div key={index} className="text-sm">
                  <strong>Image {index + 1}:</strong>{' '}
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline break-all"
                  >
                    {url}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            // Show actual images
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {imageUrls.map((url, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                    <img
                      src={url}
                      alt={`${productTitle} - Image ${index + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                      onError={(e) => {
                        // Fallback if image fails to load
                        e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA4VjE2TTggMTJIMTYiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHN2Zz4K';
                        e.currentTarget.alt = 'Image failed to load';
                      }}
                    />
                    
                    {/* Image overlay with number */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                      {index + 1}
                    </div>
                    
                    {/* Click to view full size */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 cursor-pointer flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 bg-white bg-opacity-90 rounded-full text-xs font-medium text-gray-700 hover:bg-opacity-100"
                        >
                          <Eye className="w-3 h-3" />
                          View Full Size
                        </a>
                      </div>
                    </div>
                  </div>
                  
                  {/* Image caption */}
                  <p className="text-xs text-gray-600 mt-1 text-center">
                    Image {index + 1} of {imageUrls.length}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Additional text after images */}
          {text.includes('*And ') && (
            <div className="mt-3 text-sm text-gray-600 italic">
              {text.match(/\*And .*?\*/)?.[0]?.replace(/\*/g, '')}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ENHANCED: Handle suggested question clicks with better context handling
  const handleSuggestedClick = (question: string) => {
    console.log('=== ChatMessage: Suggested Question Clicked ===');
    console.log('Question:', question);
    console.log('Message context product:', message.context_product?.title || 'None');
    console.log('Selected product ID:', selectedProductId);
    
    if (onSendSuggestedQuestion) {
      // Let the useChat hook handle context detection
      onSendSuggestedQuestion(question, message.context_product);
    } else {
      console.warn('ChatMessage: onSendSuggestedQuestion handler not provided');
    }
  };

  // ENHANCED: Handle product focus with context update
  const handleProductFocus = (productId: string, product: any) => {
    console.log('=== ChatMessage: Product Focused ===');
    console.log('Product ID:', productId);
    console.log('Product:', product?.title || 'Unknown');
    
    if (onFocusProduct) {
      onFocusProduct(productId);
    }
  };

  const handleProductNumberClick = (productNumber: number) => {
    setActiveProductNumber(activeProductNumber === productNumber ? null : productNumber);
  };

  const handleQuickQuestion = (productNumber: number, question: string) => {
    if (onAskAboutProduct) {
      onAskAboutProduct(productNumber, question);
      setActiveProductNumber(null);
    }
  };

  // Determine how many products to show in each slider
  const exactToShow = hasExactMatches ? 
    (showAllExact ? exactMatches : exactMatches.slice(0, 5)) : [];
  const suggestionsToShow = hasSuggestions ? 
    (showAllSuggestions ? suggestions : suggestions.slice(0, 3)) : [];

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'} mb-6 ${className}`}>
      <div className={`flex ${isBot ? 'flex-row' : 'flex-row-reverse'} items-start space-x-3 max-w-4xl`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isBot ? 'bg-blue-500' : 'bg-gray-500'
        }`}>
          {isBot ? <Bot className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
        </div>

        {/* Message Content */}
        <div className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} max-w-3xl`}>
          {/* Message Bubble */}
          <div className={`px-4 py-3 rounded-2xl ${
            isBot 
              ? 'bg-white border border-gray-200 text-gray-800' 
              : 'bg-blue-500 text-white'
          }`}>
            {/* ENHANCED: Message Text with Image Support */}
            {renderMessageContent(message.message)}
            
            {/* Timestamp and Context */}
            <div className="flex items-center mt-2 text-xs opacity-70">
              <Clock className="w-3 h-3 mr-1" />
              {formatTimestamp(message.timestamp)}
              {message.context_product && (
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-gray-600">
                  Context: {message.context_product.title?.substring(0, 20)}...
                </span>
              )}
            </div>

            {/* Applied Filters Display */}
            {hasAppliedFilters && isBot && (
              <div className="mt-2 flex flex-wrap gap-1">
                <Filter className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">Filters applied:</span>
                {message.applied_filters!.price_max && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    Under ${message.applied_filters!.price_max}
                  </span>
                )}
                {message.applied_filters!.brand && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    {message.applied_filters!.brand}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Exact Matches Slider */}
          {hasExactMatches && (
            <div className="mt-4 w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-semibold text-gray-800">
                    {exactMatches.length === 1 ? 'Perfect Match' : `${message.total_exact_matches || exactMatches.length} Exact Matches`}
                  </h4>
                  <Star className="w-4 h-4 text-yellow-500" />
                </div>
                
                {exactMatches.length > 5 && (
                  <button
                    onClick={() => setShowAllExact(!showAllExact)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  >
                    {showAllExact ? 'Show Less' : `Show All ${exactMatches.length}`}
                    <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${showAllExact ? 'rotate-90' : ''}`} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {exactToShow.map((product, index) => (
                  <div key={`exact-${product.shopify_id}-${index}`} className="relative">
                    {/* Product Number Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <button
                        onClick={() => handleProductNumberClick(index + 1)}
                        className="w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600 transition-colors"
                      >
                        {index + 1}
                      </button>
                      
                      {/* Quick Actions Dropdown */}
                      {activeProductNumber === index + 1 && (
                        <div className="absolute top-8 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-48 z-20">
                          <div className="text-xs text-gray-500 mb-1">Quick questions:</div>
                          {['What colors?', 'What sizes?', 'Show me images', 'Price?', 'Similar products?'].map((question) => (
                            <button
                              key={question}
                              onClick={() => handleQuickQuestion(index + 1, question)}
                              className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-100 rounded"
                            >
                              {question}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <ProductCard
                      product={product}
                      isSelected={selectedProductId === product.shopify_id}
                      onClick={() => handleProductFocus(product.shopify_id, product)}
                      showCompact={exactToShow.length > 1}
                    />
                  </div>
                ))}
              </div>

              {/* More Exact Matches Button */}
              {message.has_more_exact && onRequestMore && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => onRequestMore('exact')}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                  >
                    See More Matches ({(message.total_exact_matches || 0) - exactMatches.length} remaining)
                  </button>
                </div>
              )}

              {!showAllExact && exactMatches.length > 5 && (
                <div className="mt-2 text-center text-sm text-gray-500">
                  Showing 5 of {exactMatches.length} matches
                </div>
              )}
            </div>
          )}

          {/* Suggestions Slider */}
          {hasSuggestions && (
            <div className="mt-4 w-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-semibold text-gray-700">
                    You Might Also Like
                  </h4>
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                </div>
                
                {suggestions.length > 3 && (
                  <button
                    onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                    className="text-sm text-amber-600 hover:text-amber-800 font-medium flex items-center"
                  >
                    {showAllSuggestions ? 'Show Less' : `Show All ${suggestions.length}`}
                    <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${showAllSuggestions ? 'rotate-90' : ''}`} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestionsToShow.map((product, index) => (
                  <ProductCard
                    key={`suggestion-${product.shopify_id}-${index}`}
                    product={product}
                    isSelected={selectedProductId === product.shopify_id}
                    onClick={() => handleProductFocus(product.shopify_id, product)}
                    showCompact={true}
                    variant="suggestion"
                  />
                ))}
              </div>

              {/* More Suggestions Button */}
              {message.has_more_suggestions && onRequestMore && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => onRequestMore('suggestions')}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm"
                  >
                    More Suggestions
                  </button>
                </div>
              )}

              {!showAllSuggestions && suggestions.length > 3 && (
                <div className="mt-2 text-center text-sm text-gray-500">
                  Showing 3 of {suggestions.length} suggestions
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {hasOrders && (
            <div className="mt-4 w-full">
              <h4 className="text-sm font-semibold text-gray-800 mb-3">Order Information</h4>
              <div className="space-y-3">
                {message.orders!.map((order, index) => (
                  <OrderCard 
                    key={`order-${order.id}-${index}`} 
                    order={order} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* ENHANCED: Suggested Questions with better context handling */}
          {hasSuggestedQuestions && isBot && (
            <div className="mt-4 w-full">
              <div className="flex items-center mb-2">
                <Lightbulb className="w-4 h-4 text-amber-500 mr-2" />
                <span className="text-sm text-gray-600">You might also ask:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {message.suggested_questions!.map((question, index) => (
                  <button
                    key={`suggestion-${index}`}
                    onClick={() => {
                      console.log('Suggestion button clicked:', question);
                      handleSuggestedClick(question);
                    }}
                    className="inline-flex items-center px-3 py-2 bg-white border border-amber-300 
                             rounded-full text-sm text-amber-800 hover:bg-amber-50 
                             hover:border-amber-400 transition-colors duration-200 shadow-sm
                             cursor-pointer active:bg-amber-100"
                    title={`Ask: ${question}`}
                  >
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {question}
                  </button>
                ))}
              </div>
              
              {/* Debug info for context product */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2 text-xs text-gray-400 bg-gray-50 p-2 rounded">
                  <div><strong>Debug Context Info:</strong></div>
                  <div>Message Context: {message.context_product?.title || 'None'}</div>
                  <div>Selected ID: {selectedProductId || 'None'}</div>
                  <div>Exact Matches: {exactMatches.length}</div>
                  <div>Suggestions: {suggestions.length}</div>
                  <div>Contains Images: {containsProductImages(message.message) ? 'Yes' : 'No'}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;