// Enhanced ChatMessage.tsx - Complete File with All Current Functionality + Fixes for Issues #6
// File: frontend/src/components/ChatMessage.tsx

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
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
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

  // Function to detect and extract image URLs from message
  const extractImageUrls = (text: string): string[] => {
    const imageUrlPattern = /\*\*Image \d+:\*\*\s*(https?:\/\/[^\s\n]+)/g;
    const matches = [];
    let match;

    while ((match = imageUrlPattern.exec(text)) !== null) {
      matches.push(match[1]);
    }

    return matches;
  };

  // Function to check if message contains product images
  const containsProductImages = (text: string): boolean => {
    return /Here are the available images for/.test(text) && 
           /\*\*Image \d+:\*\*/.test(text);
  };

  // Render message content with image support
  const renderMessageContent = (text: string) => {
    if (!containsProductImages(text)) {
      return <div className="whitespace-pre-wrap">{text}</div>;
    }

    const titleMatch = text.match(/Here are the available images for \*\*(.*?)\*\*/);
    const productTitle = titleMatch ? titleMatch[1] : 'this product';
    const imageUrls = extractImageUrls(text);

    if (imageUrls.length === 0) {
      return <div className="whitespace-pre-wrap">{text}</div>;
    }

    return (
      <div className="space-y-3">
        <p>Here are the available images for <strong>{productTitle}</strong>:</p>
        
        <button
          onClick={() => setShowImagesAsText(!showImagesAsText)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
        >
          {showImagesAsText ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showImagesAsText ? 'Show URLs' : 'Show Images'}
          ({imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''} found)
        </button>

        {showImagesAsText ? (
          <div className="space-y-1 text-sm">
            {imageUrls.map((url, index) => (
              <div key={index}>
                <strong>Image {index + 1}:</strong>{' '}
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {url}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-w-md">
            {imageUrls.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Product image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg shadow-sm"
                  onLoad={() => {
                    setTimeout(() => {
                      const event = new CustomEvent('imageLoaded');
                      window.dispatchEvent(event);
                    }, 50);
                  }}
                  onError={(e) => {
                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMiA4VjE2TTggMTJIMTYiIHN0cm9rZT0iIzlDQTNBRiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KPHN2Zz4K';
                    e.currentTarget.alt = 'Image failed to load';
                  }}
                />
                <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Eye className="w-6 h-6 text-white" />
                </a>
                <p className="text-xs text-gray-600 mt-1 text-center">
                  Image {index + 1} of {imageUrls.length}
                </p>
              </div>
            ))}
          </div>
        )}

        {text.includes('*And ') && (
          <p className="text-sm text-gray-600">
            {text.match(/\*And .*?\*/)?.[0]?.replace(/\*/g, '')}
          </p>
        )}
      </div>
    );
  };

  // Handle suggested question clicks with context
  const handleSuggestedClick = (question: string) => {
    console.log('=== ChatMessage: Suggested Question Clicked ===');
    console.log('Question:', question);
    console.log('Message context product:', message.context_product?.title || 'None');
    console.log('Selected product ID:', selectedProductId);

    if (onSendSuggestedQuestion) {
      onSendSuggestedQuestion(question, message.context_product);
    } else {
      console.warn('ChatMessage: onSendSuggestedQuestion handler not provided');
    }
  };

  // Handle product focus with context update
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

  // Handle "See more matches" with proper backend communication
  const handleShowMoreExact = () => {
    console.log('=== SHOW MORE EXACT MATCHES ===');
    if (showAllExact || exactMatches.length >= (message.total_exact_matches || exactMatches.length)) {
      if (message.has_more_exact && onRequestMore) {
        console.log('Requesting more exact matches from backend');
        onRequestMore('exact');
      }
    } else {
      console.log('Showing more from current exact matches');
      setShowAllExact(true);
    }
  };

  const handleShowMoreSuggestions = () => {
    console.log('=== SHOW MORE SUGGESTIONS ===');
    if (showAllSuggestions || suggestions.length >= (message.total_suggestions || suggestions.length)) {
      if (message.has_more_suggestions && onRequestMore) {
        console.log('Requesting more suggestions from backend');
        onRequestMore('suggestions');
      }
    } else {
      console.log('Showing more from current suggestions');
      setShowAllSuggestions(true);
    }
  };

  // Determine how many products to show in each slider
  const exactToShow = hasExactMatches ?
    (showAllExact ? exactMatches : exactMatches.slice(0, 3)) : [];
    
  const suggestionsToShow = hasSuggestions ?
    (showAllSuggestions ? suggestions : suggestions.slice(0, 3)) : [];

  // CRITICAL FIX for Issue #6: ALWAYS show "Asking about" context for user messages when there's a context product
  const shouldShowProductContext = !isBot && message.reply_to?.product;
  const productForContext = message.reply_to?.product;

  // ===================================
  // USER MESSAGE - RIGHT ALIGNED
  // ===================================
  if (!isBot) {
    return (
      <div className={`flex items-start space-x-3 justify-end ${className}`}>
        <div className="flex-1 space-y-2 max-w-xs md:max-w-md">
          {/* CRITICAL FIX for Issue #6: ALWAYS show Product Context Display for User Messages when context exists */}
          {shouldShowProductContext && productForContext && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
              <div className="flex items-center space-x-3">
                {/* Product Image */}
                <div className="w-12 h-12 flex-shrink-0">
                  {productForContext.images && productForContext.images.length > 0 ? (
                    <img 
                      src={productForContext.images[0].src}
                      alt={productForContext.title}
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-blue-800 mb-1">Asking about:</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{productForContext.title}</p>
                  {productForContext.price && (
                    <p className="text-sm text-gray-600">
                      ${typeof productForContext.price === 'string' ? 
                          productForContext.price : 
                          productForContext.price.toFixed(2)
                        }
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-500 text-white rounded-lg px-4 py-2 ml-auto">
            <p>{message.message}</p>
          </div>
          
          <div className="flex items-center justify-end space-x-2 text-xs text-gray-500">
            <span>{formatTimestamp(message.timestamp)}</span>
            <Clock className="w-3 h-3" />
          </div>
        </div>
        
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
      </div>
    );
  }

  // ===================================
  // BOT MESSAGE - LEFT ALIGNED
  // ===================================
  return (
    <div className={`flex items-start space-x-3 ${className}`}>
      {/* Bot Avatar */}
      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>

      {/* Message Content */}
      <div className="flex-1 space-y-3">
        {/* CRITICAL FIX for Issue #6: Reply Context - ALWAYS show product context for product-related messages */}
        {message.reply_to && (
          <div className="bg-gray-50 border-l-4 border-gray-300 pl-4 py-2">
            <p className="text-xs text-gray-600 mb-2">
              {message.reply_to.product && message.context_product ? 'Responding to your question about:' : formatReplyTimestamp(message.reply_to.timestamp)}
            </p>

            {/* CRITICAL FIX for Issue #6: ALWAYS show Product Context when available */}
            {message.reply_to.product && message.context_product ? (
              <div className="flex items-center space-x-3 bg-white rounded-lg p-2 border">
                {/* Product Image */}
                <div className="w-10 h-10 flex-shrink-0">
                  {message.reply_to.product.images && message.reply_to.product.images.length > 0 ? (
                    <img 
                      src={message.reply_to.product.images[0].src}
                      alt={message.reply_to.product.title}
                      className="w-full h-full object-cover rounded"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{message.reply_to.product.title}</p>
                  {message.reply_to.product.price && (
                    <p className="text-xs text-gray-600">
                      ${typeof message.reply_to.product.price === 'string' ? 
                          message.reply_to.product.price : 
                          message.reply_to.product.price.toFixed(2)
                        }
                    </p>
                  )}
                  {message.reply_to.product.vendor && (
                    <p className="text-xs text-gray-500">by {message.reply_to.product.vendor}</p>
                  )}
                </div>
              </div>
            ) : (
              /* Show just the user's question without product context for order/general queries */
              <p className="text-sm text-gray-700 italic">
                "{message.reply_to.message.length > 100 ? 
                    `${message.reply_to.message.substring(0, 100)}...` : 
                    message.reply_to.message}"
              </p>
            )}

            {/* User's question - Only show if there's product context, otherwise it's redundant */}
            {message.reply_to.product && message.context_product && (
              <p className="text-xs text-gray-600 mt-1 italic">
                "{message.reply_to.message.length > 80 ? 
                    `${message.reply_to.message.substring(0, 80)}...` : 
                    message.reply_to.message}"
              </p>
            )}
          </div>
        )}

        {/* Text Response */}
        {message.message && (
          <div className="bg-white rounded-lg px-4 py-3 shadow-sm border">
            {/* ENHANCED: Message Text with Image Support */}
            {renderMessageContent(message.message)}
            
            {/* Timestamp and Context */}
            <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3" />
                <span>{formatTimestamp(message.timestamp)}</span>
              </div>
              {message.context_product && (
                <span className="text-blue-600">
                  Context: {message.context_product.title?.substring(0, 20)}...
                </span>
              )}
            </div>
          </div>
        )}

        {/* Applied Filters Display */}
        {hasAppliedFilters && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Filters applied:</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {message.applied_filters!.max && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  Under ${message.applied_filters!.max}
                </span>
              )}
              {message.applied_filters!.price_filter?.max && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  Under ${message.applied_filters!.price_filter.max}
                </span>
              )}
              {message.applied_filters!.brand_filter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  {message.applied_filters!.brand_filter}
                </span>
              )}
              {message.applied_filters!.brand && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
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
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                {exactMatches.length === 1 ? 'Perfect Match' : `${message.total_exact_matches || exactMatches.length} Exact Matches`}
              </h4>
              {exactMatches.length > 3 && (
                <button
                  onClick={() => setShowAllExact(!showAllExact)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAllExact ? 'rotate-90' : ''}`} />
                  {showAllExact ? 'Show Less' : `Show All ${exactMatches.length}`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {exactToShow.map((product, index) => (
                <div key={`exact-${product.shopify_id || product.id}-${index}`} className="relative">
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
                    <div className="absolute top-6 left-0 z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-2 min-w-48">
                      <p className="text-xs font-medium text-gray-700 mb-2">Quick questions:</p>
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
                    isSelected={product.shopify_id === selectedProductId}
                    onClick={() => handleProductFocus(product.shopify_id, product)}
                    onReply={onQuoteProduct}
                    showCompact={exactToShow.length > 1}
                  />
                </div>
              ))}
            </div>

            {/* More Exact Matches Button */}
            {(!showAllExact && exactMatches.length > 3) || message.has_more_exact ? (
              <button
                onClick={handleShowMoreExact}
                className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
              >
                {!showAllExact && exactMatches.length > 3
                  ? `See ${exactMatches.length - 3} more matches`
                  : message.has_more_exact
                  ? `Load more products (${(message.total_exact_matches || 0) - exactMatches.length} remaining)`
                  : 'See more matches'
                }
              </button>
            ) : null}

            {!showAllExact && exactMatches.length > 3 && (
              <p className="text-xs text-gray-500 text-center">
                Showing 3 of {exactMatches.length} matches
              </p>
            )}
          </div>
        )}

        {/* Suggestions Slider */}
        {hasSuggestions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                You Might Also Like
              </h4>
              {suggestions.length > 3 && (
                <button
                  onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                  className="text-sm text-amber-600 hover:text-amber-800 font-medium flex items-center"
                >
                  <ChevronRight className={`w-4 h-4 transition-transform ${showAllSuggestions ? 'rotate-90' : ''}`} />
                  {showAllSuggestions ? 'Show Less' : `Show All ${suggestions.length}`}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestionsToShow.map((product, index) => (
                <ProductCard
                  key={`suggestion-${product.shopify_id || product.id}-${index}`}
                  product={product}
                  isSelected={product.shopify_id === selectedProductId}
                  onClick={() => handleProductFocus(product.shopify_id, product)}
                  onReply={onQuoteProduct}
                  showCompact={true}
                  variant="suggestion"
                />
              ))}
            </div>

            {/* More Suggestions Button */}
            {(!showAllSuggestions && suggestions.length > 3) || message.has_more_suggestions ? (
              <button
                onClick={handleShowMoreSuggestions}
                className="w-full py-2 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors text-sm font-medium"
              >
                {!showAllSuggestions && suggestions.length > 3
                  ? `See ${suggestions.length - 3} more suggestions`
                  : 'More Suggestions'
                }
              </button>
            ) : null}

            {!showAllSuggestions && suggestions.length > 3 && (
              <p className="text-xs text-gray-500 text-center">
                Showing 3 of {suggestions.length} suggestions
              </p>
            )}
          </div>
        )}

        {/* Orders */}
        {hasOrders && (
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Order Information
            </h4>
            {message.orders!.map((order, index) => (
              <OrderCard key={`order-${order.id || index}`} order={order} />
            ))}
          </div>
        )}

        {/* ENHANCED for Issue #4: Contextual Suggested Questions */}
        {hasSuggestedQuestions && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
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
                  <Lightbulb className="w-3 h-3 mr-1" />
                  {question}
                </button>
              ))}
            </div>

            {/* Debug info for context product */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                <strong>Debug Context Info:</strong><br />
                Message Context: {message.context_product?.title || 'None'}<br />
                Selected ID: {selectedProductId || 'None'}<br />
                Exact Matches: {exactMatches.length}<br />
                Suggestions: {suggestions.length}<br />
                Contains Images: {containsProductImages(message.message) ? 'Yes' : 'No'}<br />
                Reply To Product: {message.reply_to?.product?.title || 'None'}<br />
                Should Show Context: {shouldShowProductContext ? 'Yes' : 'No'}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;