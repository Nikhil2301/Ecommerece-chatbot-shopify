// # File Path: /Users/nikhil/Sites/localhost/22-sep-11-12-Ai-Ecommerce-Chatbot/frontend/src/components/ChatMessage.tsx

import React, { useState } from 'react';
import { Bot, User, Clock, MessageSquare, Lightbulb, ChevronRight, Filter, Star } from 'lucide-react';
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
  onSendSuggestedQuestion?: (question: string) => void;
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

  const handleSuggestedClick = (question: string) => {
    if (onSendSuggestedQuestion) {
      onSendSuggestedQuestion(question);
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
            {/* Message Text */}
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.message}
            </div>
            
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
                          {['What colors?', 'What sizes?', 'Price?', 'Similar products?'].map((question) => (
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
                      onClick={() => onFocusProduct?.(product.shopify_id)}
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
                    onClick={() => onFocusProduct?.(product.shopify_id)}
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

          {/* Suggested Questions */}
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
                    onClick={() => handleSuggestedClick(question)}
                    className="inline-flex items-center px-3 py-2 bg-white border border-amber-300 
                             rounded-full text-sm text-amber-800 hover:bg-amber-50 
                             hover:border-amber-400 transition-colors duration-200 shadow-sm"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;