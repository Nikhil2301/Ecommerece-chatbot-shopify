'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { ArrowLeft, MessageCircle, Minimize2, Maximize2, RotateCcw } from 'lucide-react';
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

  // Load chat history on mount - only if no localStorage messages exist
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

  // Auto-scroll to bottom when messages change or component mounts
  useEffect(() => {
    // Delay scroll to ensure DOM is fully rendered, especially for product cards/images
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100); // Small delay to ensure content is rendered

    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  // Initial scroll on page load with longer delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 500); // Longer delay for initial load

    return () => clearTimeout(timeoutId);
  }, []);

  // Listen for image load events and re-scroll
  useEffect(() => {
    const handleImageLoad = () => {
      setTimeout(scrollToBottom, 100);
    };

    window.addEventListener('imageLoaded', handleImageLoad);
    return () => {
      window.removeEventListener('imageLoaded', handleImageLoad);
    };
  }, []);

  // Scroll to bottom function with fallback
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      try {
        // First try smooth scroll
        messagesEndRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end'
        });

        // Fallback: Force scroll if smooth doesn't work
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
        
        // Final fallback: scroll container directly
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

  // ENHANCED: Handle suggested questions with persistent context
  const handleSendSuggestedQuestion = (question: string, contextProduct?: any) => {
    console.log('=== Page: Handling Suggested Question ===');
    console.log('Question:', question);
    console.log('Context product from message:', contextProduct?.title || 'None');
    console.log('Current selected product ID:', selectedProductId);
    
    // CRITICAL: Let the useChat hook handle context - it should maintain selected product ID
    sendSuggestedQuestion(question, contextProduct);
  };

  // ENHANCED: Handle product focus and update context
  const handleFocusProduct = (productId: string) => {
    console.log('=== Page: Product Focused ===');
    console.log('Product ID:', productId);
    
    // Update the selected product which should trigger context update
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

  // ENHANCED: Handle product selection for persistent context
  const handleProductReply = (product: any) => {
    console.log('=== Page: Product Reply Selected ===');
    console.log('Selected product:', product.title);
    console.log('Product ID:', product.shopify_id);
    
    // Set the quoted product and select it for context persistence
    quoteProduct(product);
    selectProduct(product.shopify_id);
  };

  return (
    <RequireEmail>
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950">
        {/* Fixed Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button 
              onClick={goBack} 
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                AI Shopping Assistant
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            
            <button
              onClick={() => clearMessages()}
              className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4 mr-2 inline" />
              Clear
            </button>
            
            <button
              onClick={toggleMinimize}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Chat Container */}
        <div className={`flex-1 overflow-auto ${isMinimized ? 'hidden' : 'block'}`} data-scroll-container>
          <div className="max-w-4xl mx-auto px-4 py-6">
            
            {/* Welcome Message - Only show when no messages or just initial message */}
            {messages.length <= 1 && (
              <div className="text-center py-8 space-y-6">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Welcome to AI Shopping Assistant!
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Ask me about products, orders, or anything else. I'm here to help!
                  </p>
                </div>

                {/* Sample Questions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  {[
                    "Show me 3 red shirts under $50",
                    "Find me a black dress",
                    "What's on sale?",
                    "Check my order status"
                  ].map((question, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(question)}
                      className="p-3 text-left bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm text-gray-700 dark:text-gray-200"
                    >
                      "{question}"
                    </button>
                  ))}
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-500 space-y-1">
                  <p className="font-medium">How can I help you today?</p>
                  <p>Ask about products, orders, recommendations, or anything else!</p>
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

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center py-4">
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>AI is thinking...</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mx-4 my-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Invisible element for scrolling */}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Fixed Chat Input - ENHANCED WITH CONTEXT PERSISTENCE */}
        <ChatInput 
          onSendMessage={sendMessage}
          isLoading={isLoading}
          fullScreen={true}
          quotedProduct={quotedProduct || contextProduct} // Show either quoted or context product
          onClearQuote={clearQuotedProduct}
        />

        {/* ENHANCED: Debug Info with persistent context details */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-20 right-4 bg-black bg-opacity-75 text-white p-2 rounded text-xs max-w-xs">
            <div>Debug Info:</div>
            <div>Messages: {messages.length}</div>
            <div>Selected ID: {selectedProductId || 'None'}</div>
            <div>Context Product: {contextProduct?.title || 'None'}</div>
            <div>Quoted Product: {quotedProduct?.title || 'None'}</div>
            <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
            {(contextProduct || quotedProduct) && (
              <>
                <div>Product ID: {(contextProduct || quotedProduct)?.shopify_id}</div>
                <div>Price: ${(contextProduct || quotedProduct)?.price}</div>
                <div>Brand: {(contextProduct || quotedProduct)?.vendor || 'N/A'}</div>
              </>
            )}
          </div>
        )}
      </div>
    </RequireEmail>
  );
}