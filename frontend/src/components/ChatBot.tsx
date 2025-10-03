import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageCircle, X, RotateCcw, Mail, ArrowRight } from 'lucide-react';

interface ChatBotProps {
  isOpen: boolean;
  onToggle: () => void;
  fullScreen?: boolean;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onToggle, fullScreen = false }) => {
  const { messages, sendMessage, clearMessages, isLoading, error, selectedProductId, selectProduct } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Email collection state
  const [userEmail, setUserEmail] = useState<string>('');
  const [isEmailCollected, setIsEmailCollected] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>('');
  const [isValidatingEmail, setIsValidatingEmail] = useState<boolean>(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userEmail.trim()) {
      setEmailError('Please enter your email address');
      return;
    }

    if (!validateEmail(userEmail)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsValidatingEmail(true);
    setEmailError('');

    try {
      // Simulate email validation/storage (you can add API call here if needed)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setIsEmailCollected(true);
      
      // Send welcome message with email context
      await sendMessage(`Hello, my email is ${userEmail}`, userEmail);
      
    } catch (error) {
      setEmailError('Something went wrong. Please try again.');
    } finally {
      setIsValidatingEmail(false);
    }
  };

  // Reset email collection when clearing messages
  const handleClearMessages = () => {
    clearMessages();
    setIsEmailCollected(false);
    setUserEmail('');
    setEmailError('');
  };

  // Enhanced sendMessage wrapper that includes email
  const handleSendMessage = async (message: string) => {
    await sendMessage(message, userEmail);
  };

  if (!isOpen && !fullScreen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 z-50"
        aria-label="Open chat"
      >
        <MessageCircle size={24} />
      </button>
    );
  }

  const containerClasses = fullScreen
    ? "h-full flex flex-col"
    : "fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl w-96 h-[32rem] flex flex-col z-50";

  const headerClasses = fullScreen
    ? "hidden"
    : "flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl";

  return (
    <div className={containerClasses}>
      {/* Header - only show in popup mode */}
      {!fullScreen && (
        <div className={headerClasses}>
          <div className="flex items-center space-x-2">
            <MessageCircle size={20} />
            <span className="font-semibold">AI Shopping Assistant</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleClearMessages}
              className="text-white/80 hover:text-white transition-colors p-1 rounded"
              title="Clear conversation"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onToggle}
              className="text-white/80 hover:text-white transition-colors p-1 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Email Collection Screen */}
      {!isEmailCollected ? (
        <div className="flex-1 flex flex-col justify-center items-center p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="text-white" size={24} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome to AI Shopping Assistant!
            </h3>
            <p className="text-gray-600 text-sm">
              To provide you with personalized assistance and manage your conversations, 
              please enter your email address.
            </p>
          </div>

          <form onSubmit={handleEmailSubmit} className="w-full max-w-sm">
            <div className="mb-4">
              <input
                type="email"
                value={userEmail}
                onChange={(e) => {
                  setUserEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="Enter your email address"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  emailError ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isValidatingEmail}
                required
              />
              {emailError && (
                <p className="text-red-500 text-xs mt-1">{emailError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isValidatingEmail || !userEmail.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isValidatingEmail ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  <span>Start Chatting</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
              We respect your privacy. Your email will only be used to manage your chat sessions.
            </p>
          </form>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div className={fullScreen 
            ? "flex-1 overflow-y-auto p-6 bg-gray-50" 
            : "flex-1 overflow-y-auto p-4 bg-gray-50"
          }>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Welcome back!</p>
                <p className="text-sm">Ask me about products, orders, or anything else. I'm here to help!</p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    selectedProductId={selectedProductId}
                    onFocusProduct={selectProduct}
                  />
                ))}
                {error && (
                  <div className="text-red-500 text-sm mt-2 p-3 bg-red-50 rounded-lg">
                    {error}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* User Email Display & Input */}
          {isEmailCollected && (
            <>
              {/* User email indicator */}
              <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-center">
                <p className="text-xs text-blue-600">
                  Chatting as: <span className="font-medium">{userEmail}</span>
                  <button
                    onClick={() => {
                      setIsEmailCollected(false);
                      setUserEmail('');
                      handleClearMessages();
                    }}
                    className="ml-2 text-blue-500 hover:text-blue-700 underline text-xs"
                  >
                    Change
                  </button>
                </p>
              </div>

              {/* Chat Input */}
              <div className={fullScreen 
                ? "p-6 bg-white border-t border-gray-200" 
                : "p-4 bg-white rounded-b-2xl border-t border-gray-200"
              }>
                <ChatInput
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  fullScreen={fullScreen}
                />
                {fullScreen && (
                  <button
                    onClick={handleClearMessages}
                    className="mt-4 flex items-center space-x-2 text-gray-500 hover:text-gray-700 transition-colors text-sm"
                  >
                    <RotateCcw size={16} />
                    <span>Clear conversation</span>
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ChatBot;