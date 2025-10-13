// File Path: /frontend/src/components/ChatMessage.tsx

// ENHANCED version with persistent product context display

import React, { useState } from 'react';
import { Bot, User, Clock, MessageSquare, Lightbulb, ChevronRight, Filter, Star, Eye, EyeOff, ShoppingBag, Package, Heart } from 'lucide-react';
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
    reply_to?: {
      message: string;
      timestamp?: Date | string;
      product?: any;
    };
  };
  selectedProductId?: string;
  onFocusProduct?: (productId: string) => void;
  onSendSuggestedQuestion?: (question: string, contextProduct?: any) => void;
  onRequestMore?: (type: 'exact' | 'suggestions') => void;
  onAskAboutProduct?: (productNumber: number, question: string) => void;
  onQuoteProduct?: (product: any) => void;
  className?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  selectedProductId,
  onFocusProduct,
  onSendSuggestedQuestion,
  onRequestMore,
  onAskAboutProduct,
  onQuoteProduct,
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

  const formatTimestamp = (timestamp: Date | string) => {
    // Ensure timestamp is a valid Date object
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatReplyTimestamp = (timestamp: Date | string | undefined): string => {
    if (!timestamp) return 'Replying to your message:';
    
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return isNaN(date.getTime()) ? 
        'Replying to your message:' : 
        `Replying to message from ${date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })}`;
    } catch (e) {
      return 'Replying to your message:';
    }
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
      return <div className="whitespace-pre-wrap">{text}</div>;
    }

    // Extract product title and images
    const titleMatch = text.match(/Here are the available images for \*\*(.*?)\*\*/);
    const productTitle = titleMatch ? titleMatch[1] : 'this product';
    const imageUrls = extractImageUrls(text);

    if (imageUrls.length === 0) {
      return <div className="whitespace-pre-wrap">{text}</div>;
    }

    return (
      <div className="space-y-3">
        <p>Here are the available images for <strong>{productTitle}</strong>:</p>
        
        {/* Toggle button for image view */}
        <button
          onClick={() => setShowImagesAsText(!showImagesAsText)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          {showImagesAsText ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {showImagesAsText ? 'Show URLs' : 'Show Images'}
          <span className="text-gray-500">({imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''} found)</span>
        </button>

        {showImagesAsText ? (
          // Show as text URLs (original format)
          <div className="space-y-1">
            {imageUrls.map((url, index) => (
              <div key={index} className="text-sm">
                <strong>Image {index + 1}:</strong>{' '}
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {url}
                </a>
              </div>
            ))}
          </div>
        ) : (
          // Show actual images
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`${productTitle} - Image ${index + 1}`}
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onLoad={() => {
                    // Trigger a scroll check after image loads
                    setTimeout(() => {
                      const event = new CustomEvent('imageLoaded');
                      window.dispatchEvent(event);
                    }, 50);
                  }}
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
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all"
                >
                  <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                    View Full Size
                  </span>
                </a>
                
                {/* Image caption */}
                <div className="mt-1 text-xs text-gray-500 text-center">
                  Image {index + 1} of {imageUrls.length}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Additional text after images */}
        {text.includes('*And ') && (
          <p className="text-sm text-gray-600 italic">
            {text.match(/\*And .*?\*/)?.[0]?.replace(/\*/g, '')}
          </p>
        )}
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

  // FIXED: Handle "See more matches" with proper backend communication
  const handleShowMoreExact = () => {
    console.log('=== SHOW MORE EXACT MATCHES ===');
    console.log('Current exact matches:', exactMatches.length);
    console.log('Total exact matches:', message.total_exact_matches);
    console.log('Has more exact:', message.has_more_exact);

    if (showAllExact || exactMatches.length >= (message.total_exact_matches || exactMatches.length)) {
      // Already showing all or need to request more from backend
      if (message.has_more_exact && onRequestMore) {
        console.log('Requesting more exact matches from backend');
        onRequestMore('exact');
      }
    } else {
      // Show more from current results
      console.log('Showing more from current exact matches');
      setShowAllExact(true);
    }
  };

  const handleShowMoreSuggestions = () => {
    console.log('=== SHOW MORE SUGGESTIONS ===');
    console.log('Current suggestions:', suggestions.length);
    console.log('Total suggestions:', message.total_suggestions);
    console.log('Has more suggestions:', message.has_more_suggestions);

    if (showAllSuggestions || suggestions.length >= (message.total_suggestions || suggestions.length)) {
      // Already showing all or need to request more from backend
      if (message.has_more_suggestions && onRequestMore) {
        console.log('Requesting more suggestions from backend');
        onRequestMore('suggestions');
      }
    } else {
      // Show more from current results
      console.log('Showing more from current suggestions');
      setShowAllSuggestions(true);
    }
  };

  // Determine how many products to show in each slider
  const exactToShow = hasExactMatches ? 
    (showAllExact ? exactMatches : exactMatches.slice(0, 3)) : [];

  const suggestionsToShow = hasSuggestions ? 
    (showAllSuggestions ? suggestions : suggestions.slice(0, 3)) : [];

  // CRITICAL: Determine if we should show "Asking about" context
  // Show it for user messages when there's a context product OR reply_to product
  const shouldShowProductContext = !isBot && (message.reply_to?.product || selectedProductId);
  const productForContext = message.reply_to?.product;

  // User message
  if (!isBot) {
    return (
      <div className={`flex justify-end mb-6 ${className}`}>
        <div className="max-w-3xl">
          {/* ENHANCED: Product Context Display for User Messages */}
          {shouldShowProductContext && productForContext && (
            <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center space-x-3">
                {/* Product Image */}
                {productForContext.images && productForContext.images.length > 0 ? (
                  <img
                    src={productForContext.images[0].src}
                    alt={productForContext.title}
                    className="w-10 h-10 object-cover rounded-lg"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-gray-400" />
                  </div>
                )}
                
                {/* Product Details */}
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Asking about:
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {productForContext.title}
                  </div>
                  {productForContext.price && (
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      ${typeof productForContext.price === 'string' ? 
                        productForContext.price : 
                        productForContext.price.toFixed(2)
                      }
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-sm">
            <div className="whitespace-pre-wrap">{message.message}</div>
          </div>
          
          <div className="text-xs text-gray-500 mt-1 text-right">
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  // Bot message
  return (
    <div className={`flex justify-start mb-6 ${className}`}>
      <div className="flex space-x-3 max-w-4xl w-full">
        {/* Bot Avatar */}
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>

        {/* Message Content */}
        <div className="flex-1 space-y-3">
          
          {/* Reply Context - Only show product context for product-related messages */}
          {message.reply_to && (
            <div className="text-xs text-gray-500 dark:text-gray-400 border-l-2 border-gray-300 dark:border-gray-600 pl-3">
              <div className="font-medium mb-1">
                {message.reply_to.product && message.context_product ? 'Responding to your question about:' : formatReplyTimestamp(message.reply_to.timestamp)}
              </div>
              
              {/* Enhanced Product Context Display - Only show if context_product exists */}
              {message.reply_to.product && message.context_product ? (
                <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                  {/* Product Image */}
                  {message.reply_to.product.images && message.reply_to.product.images.length > 0 ? (
                    <img
                      src={message.reply_to.product.images[0].src}
                      alt={message.reply_to.product.title}
                      className="w-8 h-8 object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Product Details */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-xs">
                      {message.reply_to.product.title}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      {message.reply_to.product.price && (
                        <span>${typeof message.reply_to.product.price === 'string' ? 
                          message.reply_to.product.price : 
                          message.reply_to.product.price.toFixed(2)
                        }</span>
                      )}
                      {message.reply_to.product.vendor && (
                        <span>by {message.reply_to.product.vendor}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Show just the user's question without product context for order/general queries */
                <div className="italic">
                  "{message.reply_to.message.length > 100 ? 
                    `${message.reply_to.message.substring(0, 100)}...` : 
                    message.reply_to.message}"
                </div>
              )}

              {/* User's question - Only show if there's product context, otherwise it's redundant */}
              {message.reply_to.product && message.context_product && (
                <div className="italic mt-1">
                  "{message.reply_to.message.length > 80 ? 
                    `${message.reply_to.message.substring(0, 80)}...` : 
                    message.reply_to.message}"
                </div>
              )}
            </div>
          )}

          {/* Text Response */}
          {message.message && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
              
              {/* ENHANCED: Message Text with Image Support */}
              <div className="text-gray-900 dark:text-gray-100">
                {renderMessageContent(message.message)}
              </div>

              {/* Timestamp and Context */}
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                <div className="text-xs text-gray-500">
                  {formatTimestamp(message.timestamp)}
                </div>
                {message.context_product && (
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    Context: {message.context_product.title?.substring(0, 20)}...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Applied Filters Display */}
          {hasAppliedFilters && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
              <div className="flex items-center space-x-2 text-sm text-amber-800 dark:text-amber-200">
                <Filter className="w-4 h-4" />
                <span className="font-medium">Filters applied:</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {message.applied_filters!.price_max && (
                  <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded text-xs">
                    Under ${message.applied_filters!.price_max}
                  </span>
                )}
                {message.applied_filters!.brand && (
                  <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded text-xs">
                    {message.applied_filters!.brand}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Exact Matches Slider */}
          {hasExactMatches && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-blue-600" />
                  {exactMatches.length === 1 ? 'Perfect Match' : `${message.total_exact_matches || exactMatches.length} Exact Matches`}
                </h3>
                {exactMatches.length > 3 && (
                  <button
                    onClick={() => setShowAllExact(!showAllExact)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                  >
                    <ChevronRight className="w-4 h-4 mr-1" />
                    {showAllExact ? 'Show Less' : `Show All ${exactMatches.length}`}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {exactToShow.map((product, index) => (
                  <div key={product.id || index} className="relative">
                    {/* Product Number Badge */}
                    <button
                      onClick={() => handleProductNumberClick(index + 1)}
                      className="absolute -top-2 -left-2 z-10 w-6 h-6 bg-blue-500 text-white rounded-full text-xs font-bold hover:bg-blue-600 transition-colors"
                      title="Quick actions"
                    >
                      {index + 1}
                    </button>

                    {/* Quick Actions Dropdown */}
                    {activeProductNumber === index + 1 && (
                      <div className="absolute top-6 left-0 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-40">
                        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quick questions:</div>
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

                    <ProductCard
                      product={product}
                      isSelected={selectedProductId === product.shopify_id}
                      onClick={() => handleProductFocus(product.shopify_id, product)}
                      onReply={onQuoteProduct}
                      showCompact={exactToShow.length > 1}
                    />
                  </div>
                ))}
              </div>

              {/* ENHANCED: More Exact Matches Button with Smart Strategy */}
              {(!showAllExact && exactMatches.length > 3) || message.has_more_exact ? (
                <div className="text-center space-y-2">
                  <button
                    onClick={handleShowMoreExact}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {!showAllExact && exactMatches.length > 3
                      ? `See ${exactMatches.length - 3} more matches`
                      : message.has_more_exact
                      ? `Load more products (${(message.total_exact_matches || 0) - exactMatches.length} remaining)`
                      : 'See more matches'
                    }
                  </button>

                  {/* Show "Show All" option if total is reasonable (≤50) */}
                  {message.has_more_exact && (message.total_exact_matches || 0) <= 50 && (message.total_exact_matches || 0) > exactMatches.length && (
                    <button
                      onClick={() => {
                        console.log('Show all products requested');
                        if (onRequestMore) {
                          // Request all remaining pages at once
                          onRequestMore('exact');
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      or show all {message.total_exact_matches} at once
                    </button>
                  )}
                </div>
              ) : null}

              {!showAllExact && exactMatches.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  Showing 3 of {exactMatches.length} matches
                </div>
              )}
            </div>
          )}

          {/* Suggestions Slider */}
          {hasSuggestions && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-amber-600" />
                  You Might Also Like
                </h3>
                {suggestions.length > 3 && (
                  <button
                    onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                    className="text-sm text-amber-600 hover:text-amber-800 font-medium flex items-center"
                  >
                    <ChevronRight className="w-4 h-4 mr-1" />
                    {showAllSuggestions ? 'Show Less' : `Show All ${suggestions.length}`}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suggestionsToShow.map((product, index) => (
                  <ProductCard
                    key={product.id || index}
                    product={product}
                    isSelected={selectedProductId === product.shopify_id}
                    onClick={() => handleProductFocus(product.shopify_id, product)}
                    onReply={onQuoteProduct}
                    showCompact={true}
                    variant="suggestion"
                  />
                ))}
              </div>

              {/* More Suggestions Button */}
              {(!showAllSuggestions && suggestions.length > 3) || message.has_more_suggestions ? (
                <div className="text-center">
                  <button
                    onClick={handleShowMoreSuggestions}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                  >
                    {!showAllSuggestions && suggestions.length > 3
                      ? `See ${suggestions.length - 3} more suggestions`
                      : 'More Suggestions'
                    }
                  </button>
                </div>
              ) : null}

              {!showAllSuggestions && suggestions.length > 3 && (
                <div className="text-xs text-gray-500 text-center">
                  Showing 3 of {suggestions.length} suggestions
                </div>
              )}
            </div>
          )}

          {/* Orders */}
          {hasOrders && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center">
                <Package className="w-5 h-5 mr-2 text-green-600" />
                Order Information
              </h3>
              
              {message.orders!.map((order, index) => (
                <OrderCard key={order.id || index} order={order} />
              ))}
            </div>
          )}

          {/* ENHANCED: Suggested Questions with better context handling */}
          {hasSuggestedQuestions && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                You might also ask:
              </h4>
              
              <div className="flex flex-wrap gap-2">
                {message.suggested_questions!.map((question, index) => (
                  <button
                    key={index}
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
                    {question}
                  </button>
                ))}
              </div>

              {/* Debug info for context product */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded mt-2">
                  <div>Debug Context Info:</div>
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