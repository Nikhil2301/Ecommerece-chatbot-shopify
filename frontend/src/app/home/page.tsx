// page.tsx - Enhanced Design Version
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { ArrowLeft, MessageCircle, Minimize2, Maximize2, RotateCcw, Sparkles, TrendingUp, Package, ShoppingBag } from 'lucide-react';
import RequireEmail from '@/components/RequireEmail';
import ThemeToggle from '@/components/ThemeToggle';

export default function FullChatPage() {
  const [isMinimized, setIsMinimized] = useState(false);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
    selectedProductId,
    selectProduct,
    contextProduct,
    sendSuggestedQuestion,
    requestMoreProducts,
    askAboutProduct,
    loadChatHistory,
    quotedProduct,
    quoteProduct,
    clearQuotedProduct
  } = useChat();

  // Load chat history on mount
  useEffect(() => {
    const email = typeof window !== 'undefined' ? localStorage.getItem('chatEmail') : null;
    const savedMessages = typeof window !== 'undefined' ? localStorage.getItem('chatMessages') : null;

    if (email && !savedMessages) {
      console.log('Loading chat history from backend for:', email);
      loadChatHistory(email);
    } else if (savedMessages) {
      console.log('Using saved messages from localStorage');
    }
  }, [loadChatHistory]);

  // Auto-scroll functionality
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const handleImageLoad = () => {
      setTimeout(scrollToBottom, 100);
    };
    window.addEventListener('imageLoaded', handleImageLoad);
    return () => {
      window.removeEventListener('imageLoaded', handleImageLoad);
    };
  }, []);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });
        setTimeout(() => {
          if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({
              behavior: 'auto',
              block: 'end'
            });
          }
        }, 100);
      } catch (error) {
        console.warn('Scroll failed:', error);
        const container = messagesEndRef.current.closest('.overflow-auto') ||
          messagesEndRef.current.closest('[data-scroll-container]') ||
          document.querySelector('.max-w-4xl');
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  };

  const goBack = () => {
    router.push('/');
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleSendSuggestedQuestion = (question: string, contextProduct?: any) => {
    console.log('=== Page: Handling Suggested Question ===');
    console.log('Question:', question);
    console.log('Context product from message:', contextProduct?.title || 'None');
    console.log('Current selected product ID:', selectedProductId);
    sendSuggestedQuestion(question, contextProduct);
  };

  const handleFocusProduct = (productId: string) => {
    console.log('=== Page: Product Focused ===');
    console.log('Product ID:', productId);
    selectProduct(productId);
  };

  const handleRequestMore = (type: 'exact' | 'suggestions') => {
    console.log('Page: Requesting more:', type);
    requestMoreProducts(type);
  };

  const handleAskAboutProduct = (productNumber: number, question: string) => {
    console.log('Page: Ask about product:', productNumber, question);
    askAboutProduct(productNumber, question);
  };

  const handleProductReply = (product: any) => {
    console.log('=== Page: Product Reply Selected ===');
    console.log('Selected product:', product.title);
    console.log('Product ID:', product.shopify_id);
    quoteProduct(product);
    selectProduct(product.shopify_id);
  };

  const sampleQuestions = [
    { text: "Show me 3 red shirts under $50", icon: TrendingUp },
    { text: "Find me a black dress", icon: ShoppingBag },
    { text: "What's on sale?", icon: Package },
    { text: "Check my order status", icon: MessageCircle }
  ];

  return (
    <RequireEmail>
      <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        {/* Enhanced Fixed Header with Gradient */}
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-lg">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={goBack}
                  className="p-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 
                           hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-110"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                      AI Shopping Assistant
                    </h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Powered by AI</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  onClick={() => clearMessages()}
                  className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 
                           hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Clear
                </button>
                <button
                  onClick={toggleMinimize}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 
                           hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all duration-200"
                >
                  {isMinimized ? (
                    <Maximize2 className="w-5 h-5" />
                  ) : (
                    <Minimize2 className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Chat Container */}
        <div
          className={`flex-1 overflow-auto transition-all duration-300 ${
            isMinimized ? 'hidden' : 'block'
          }`}
          data-scroll-container
        >
          <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
            {/* Enhanced Welcome Message */}
            {messages.length <= 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
                {/* Hero Section */}
                <div className="text-center space-y-4 py-12">
                  <div className="inline-flex p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-2xl mb-4">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Welcome to AI Shopping Assistant!
                  </h2>
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Ask me about products, orders, or anything else. I'm here to help you find exactly what you're looking for!
                  </p>
                </div>

                {/* Sample Questions with Icons */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Try asking me:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sampleQuestions.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => sendMessage(item.text)}
                          className="group p-4 text-left bg-white dark:bg-gray-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 
                                   dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 rounded-xl transition-all duration-300 
                                   text-sm text-gray-700 dark:text-gray-200 border-2 border-gray-200 dark:border-gray-700 
                                   hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xl hover:scale-[1.02]"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium">"{item.text}"</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Call to Action */}
                <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-blue-100 dark:border-blue-900">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    How can I help you today?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ask about products, orders, recommendations, or anything else!
                  </p>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                selectedProductId={selectedProductId}
                onFocusProduct={handleFocusProduct}
                onSendSuggestedQuestion={handleSendSuggestedQuestion}
                onRequestMore={handleRequestMore}
                onAskAboutProduct={handleAskAboutProduct}
                onQuoteProduct={handleProductReply} // ENHANCED: Use the new handler
              />
            ))}

            {/* Enhanced Loading indicator */}
            {isLoading && (
              <div className="flex items-center justify-center gap-3 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-blue-100 dark:border-blue-900 animate-pulse">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  AI is thinking...
                </span>
              </div>
            )}

            {/* Enhanced Error Display */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl animate-in slide-in-from-top">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Invisible scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Enhanced Fixed Chat Input */}
        <div className="sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-2xl">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <ChatInput
              onSendMessage={sendMessage}
              isLoading={isLoading}
              fullScreen={true}
              quotedProduct={quotedProduct}
              onClearQuote={clearQuotedProduct}
            />
          </div>
        </div>

        {/* Enhanced Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 p-4 bg-black/90 text-white text-xs rounded-xl shadow-2xl font-mono max-w-xs backdrop-blur-xl">
            <div className="font-bold mb-2 text-green-400">Debug Info:</div>
            <div className="space-y-1">
              <div>Messages: <span className="text-blue-400">{messages.length}</span></div>
              <div>Selected ID: <span className="text-purple-400">{selectedProductId || 'None'}</span></div>
              <div>Context Product: <span className="text-yellow-400">{contextProduct?.title || 'None'}</span></div>
              <div>Quoted Product: <span className="text-pink-400">{quotedProduct?.title || 'None'}</span></div>
              <div>Loading: <span className={isLoading ? 'text-red-400' : 'text-green-400'}>{isLoading ? 'Yes' : 'No'}</span></div>
              {(contextProduct || quotedProduct) && (
                <>
                  <div className="border-t border-gray-700 my-2 pt-2" />
                  <div>Product ID: <span className="text-cyan-400">{(contextProduct || quotedProduct)?.shopify_id}</span></div>
                  <div>Price: <span className="text-green-400">${(contextProduct || quotedProduct)?.price}</span></div>
                  <div>Brand: <span className="text-orange-400">{(contextProduct || quotedProduct)?.vendor || 'N/A'}</span></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </RequireEmail>
  );
}