'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { ArrowLeft, MessageCircle, Minimize2, Maximize2, RotateCcw } from 'lucide-react';

export default function FullChatPage() {
  const [isMinimized, setIsMinimized] = useState(false);
  const router = useRouter();
  
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
    askAboutProduct
  } = useChat();

  const goBack = () => {
    router.push('/');
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // ENHANCED: Handle suggested questions
  const handleSendSuggestedQuestion = (question: string, contextProduct?: any) => {
    console.log('=== Page: Handling Suggested Question ===');
    console.log('Question:', question);
    console.log('Context product from message:', contextProduct?.title || 'None');
    
    // Let the useChat hook handle it - it will send the selected product ID automatically
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={goBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center space-x-2">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-800">AI Shopping Assistant</h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={clearMessages}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Clear conversation"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Clear</span>
            </button>
            
            <button
              onClick={toggleMinimize}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="pt-16 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          
          {/* Welcome Message - Only show when no messages or just initial message */}
          {messages.length <= 1 && (
            <div className="text-center py-12">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
                <MessageCircle className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to AI Shopping Assistant!</h2>
                <p className="text-gray-600 mb-6">
                  Ask me about products, orders, or anything else. I'm here to help!
                </p>
                
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
                      className="p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors text-sm text-gray-700"
                    >
                      "{question}"
                    </button>
                  ))}
                </div>
                
                <div className="mt-6 text-sm text-gray-500">
                  ## How can I help you today?
                  <br />
                  Ask about products, orders, recommendations, or anything else!
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className={`space-y-1 ${isMinimized ? 'hidden' : ''}`}>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                selectedProductId={selectedProductId}
                onFocusProduct={handleFocusProduct}
                onSendSuggestedQuestion={handleSendSuggestedQuestion}
                onRequestMore={handleRequestMore}
                onAskAboutProduct={handleAskAboutProduct}
              />
            ))}
            
            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start mb-6">
                <div className="flex items-center space-x-3 max-w-xs">
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Chat Input */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg ${isMinimized ? 'hidden' : ''}`}>
        <div className="max-w-4xl mx-auto p-4">
          <ChatInput
            onSendMessage={sendMessage}
            disabled={isLoading}
            placeholder="Ask me anything about products, orders, or shopping..."
          />
        </div>
      </div>

      {/* ENHANCED: Debug Info with more context details */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-20 right-4 bg-gray-800 text-white p-3 rounded-lg text-xs max-w-xs">
          <div><strong>Debug Info:</strong></div>
          <div>Messages: {messages.length}</div>
          <div>Selected ID: {selectedProductId || 'None'}</div>
          <div>Context Product: {contextProduct?.title || 'None'}</div>
          <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
          {contextProduct && (
            <>
              <div className="mt-1 pt-1 border-t border-gray-600">
                <div>Product ID: {contextProduct.shopify_id}</div>
                <div>Price: ${contextProduct.price}</div>
                <div>Brand: {contextProduct.vendor || 'N/A'}</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}