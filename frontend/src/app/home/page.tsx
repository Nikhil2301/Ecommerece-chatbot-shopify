'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import { 
  ArrowLeft, 
  MessageCircle, 
  Minimize2, 
  Maximize2, 
  RotateCcw, 
  Mail, 
  User, 
  ArrowRight 
} from 'lucide-react';

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
    askAboutProduct,
    userEmail
  } = useChat();

  // Email collection state for full page
  const [isEmailCollected, setIsEmailCollected] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);

  const goBack = () => {
    router.push('/');
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email submission for full page
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!emailInput.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!validateEmail(emailInput)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsValidatingEmail(true);
    setEmailError('');

    try {
      // Simulate email validation/storage
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsEmailCollected(true);
      
      // Send welcome message with email context
      await sendMessage(`Hello, my email is ${emailInput}`, emailInput);
      
    } catch (error) {
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setIsValidatingEmail(false);
    }
  };

  // Enhanced sendMessage wrapper that includes email
  const handleSendMessage = async (message: string) => {
    await sendMessage(message, userEmail || emailInput);
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

  const handleClearConversation = () => {
    clearMessages();
    setIsEmailCollected(false);
    setEmailInput('');
    setEmailError('');
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={goBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center">
                <MessageCircle className="text-white" size={20} />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">AI Shopping Assistant</h1>
                {isEmailCollected && userEmail && (
                  <p className="text-sm text-gray-500 flex items-center space-x-1">
                    <User size={14} />
                    <span>{userEmail}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleMinimize}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title={isMinimized ? "Maximize" : "Minimize"}
            >
              {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
            </button>
            
            {isEmailCollected && (
              <button
                onClick={handleClearConversation}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Clear conversation"
              >
                <RotateCcw size={20} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!isEmailCollected ? (
          /* Email Collection Screen */
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="text-white" size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  Welcome to AI Shopping Assistant!
                </h2>
                <p className="text-gray-600">
                  To provide you with personalized assistance and manage your conversations, 
                  please enter your email address to get started.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl p-8">
                <form onSubmit={handleEmailSubmit}>
                  <div className="mb-6">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={emailInput}
                      onChange={(e) => {
                        setEmailInput(e.target.value);
                        setEmailError('');
                      }}
                      placeholder="Enter your email address"
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      disabled={isValidatingEmail}
                      required
                    />
                    {emailError && (
                      <p className="text-red-500 text-sm mt-2">{emailError}</p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isValidatingEmail || !emailInput.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 font-medium"
                  >
                    {isValidatingEmail ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>Start Shopping Assistant</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <p className="text-xs text-gray-500 mt-4 text-center">
                    We respect your privacy. Your email will only be used to manage your chat sessions 
                    and provide personalized assistance.
                  </p>
                </form>
              </div>

              {/* Sample Questions Preview */}
              <div className="mt-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-4">What you can ask me:</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-white/70 rounded-lg p-3 text-sm text-gray-600">
                    "Show me 5 products under $50"
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 text-sm text-gray-600">
                    "What's the status of my order #12345?"
                  </div>
                  <div className="bg-white/70 rounded-lg p-3 text-sm text-gray-600">
                    "Find me a red dress for a wedding"
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Chat Interface */
          <div className={`flex-1 flex flex-col transition-all duration-300 ${isMinimized ? 'h-20' : ''}`}>
            {!isMinimized && (
              <>
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-6">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-16">
                      <MessageCircle size={64} className="mx-auto mb-6 text-gray-300" />
                      <h3 className="text-xl font-medium mb-2">Welcome back, {userEmail}!</h3>
                      <p className="text-gray-400 mb-8">
                        Ask me about products, orders, or anything else. I'm here to help!
                      </p>
                      
                      {/* Sample Questions */}
                      <div className="max-w-2xl mx-auto">
                        <h4 className="text-lg font-medium text-gray-700 mb-4">Try asking:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {[
                            "Show me popular products",
                            "Find products under $30",
                            "What's new in your store?",
                            "Check my recent orders"
                          ].map((question, index) => (
                            <button
                              key={index}
                              onClick={() => handleSendMessage(question)}
                              className="p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-left text-gray-700 hover:text-blue-700"
                            >
                              "{question}"
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto">
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
                      {error && (
                        <div className="text-red-500 text-sm mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                          {error}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="bg-white border-t border-gray-200 p-6">
                  <div className="max-w-4xl mx-auto">
                    <ChatInput
                      onSendMessage={handleSendMessage}
                      isLoading={isLoading}
                      fullScreen={true}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}