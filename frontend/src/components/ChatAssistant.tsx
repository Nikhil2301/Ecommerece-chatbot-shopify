// ChatAssistant.tsx - Unified Chat UI for both full and corner modes
'use client';

import { useState, useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import RequireEmail from '@/components/RequireEmail';
import ThemeToggle from '@/components/ThemeToggle';
import { ArrowLeft, MessageCircle, Minimize2, Maximize2, RotateCcw, Sparkles, TrendingUp, Package, ShoppingBag } from 'lucide-react';

interface ChatAssistantProps {
  mode: 'full' | 'corner';
  onClose?: () => void;
  showHeader?: boolean;
  showThemeToggle?: boolean;
  showBackButton?: boolean;
}

export default function ChatAssistant({
  mode = 'full',
  onClose,
  showHeader = true,
  showThemeToggle = true,
  showBackButton = false,
}: ChatAssistantProps) {
  const [isMinimized, setIsMinimized] = useState(false);
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
      loadChatHistory(email);
    }
  }, [loadChatHistory]);

  // Auto-scroll functionality
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } catch {}
    }
  };

  const toggleMinimize = () => setIsMinimized(!isMinimized);

  const handleSendSuggestedQuestion = (question: string, contextProduct?: any) => {
    sendSuggestedQuestion(question, contextProduct);
  };
  const handleFocusProduct = (productId: string) => selectProduct(productId);
  const handleRequestMore = (type: 'exact' | 'suggestions') => requestMoreProducts(type);
  const handleAskAboutProduct = (productNumber: number, question: string) => askAboutProduct(productNumber, question);
  const handleProductReply = (product: any) => {
    quoteProduct(product);
    selectProduct(product.shopify_id);
  };

  const sampleQuestions = [
    { text: "Show me 3 red shirts under $50", icon: TrendingUp },
    { text: "Find me a black dress", icon: ShoppingBag },
    { text: "What's on sale?", icon: Package },
    { text: "Check my order status", icon: MessageCircle }
  ];

  // Dynamic classes for full/corner mode
  const containerClass = mode === 'full'
    ? 'flex flex-col h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800'
    : 'fixed bottom-6 right-6 z-50 w-full max-w-sm shadow-2xl rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col';
  const chatAreaClass = mode === 'full' ? 'flex-1 overflow-auto' : 'flex-1 overflow-auto max-h-[60vh]';
  const inputAreaClass = mode === 'full' ? '' : 'py-2';

  return (
    <RequireEmail>
      <div className={containerClass} style={mode === 'corner' ? {height: isMinimized ? 60 : undefined, minHeight: 60} : {}}>
        {/* Header */}
        {showHeader && (
          <div className={`sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-lg`}>  
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {showBackButton && (
                  <button onClick={onClose} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-base bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  AI Shopping Assistant
                </span>
              </div>
              <div className="flex items-center gap-2">
                {showThemeToggle && <ThemeToggle compact={mode==='corner'} />}
                <button onClick={clearMessages} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={toggleMinimize} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                  {isMinimized ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
                </button>
                {mode === 'corner' && onClose && (
                  <button onClick={onClose} className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">✕</button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Chat Area */}
        <div className={chatAreaClass} style={isMinimized ? {display:'none'} : {}}>
          <div className="px-4 py-4 space-y-4">
            {messages.length <= 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
                <div className="text-center space-y-2 py-6">
                  <div className="inline-flex p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mb-2">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                    Welcome to AI Shopping Assistant!
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Ask me about products, orders, or anything else. I'm here to help you find exactly what you're looking for!
                  </p>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">
                    Try asking me:
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {sampleQuestions.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={index}
                          onClick={() => sendMessage(item.text)}
                          className="group p-3 text-left bg-white dark:bg-gray-800 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 rounded-xl transition-all duration-300 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg"
                        >
                          <div className="flex items-center gap-2">
                            <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg group-hover:scale-110 transition-transform">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-medium">"{item.text}"</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                selectedProductId={selectedProductId}
                onFocusProduct={handleFocusProduct}
                onSendSuggestedQuestion={handleSendSuggestedQuestion}
                onRequestMore={handleRequestMore}
                onAskAboutProduct={handleAskAboutProduct}
                onQuoteProduct={handleProductReply}
              />
            ))}
            {isLoading && (
              <div className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-100 dark:border-blue-900 animate-pulse">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  AI is thinking...
                </span>
              </div>
            )}
            {error && (
              <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl animate-in slide-in-from-top">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        {/* Input */}
        <div className={`sticky bottom-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-2xl ${inputAreaClass}`}>
          <div className="px-4 py-2">
            <ChatInput
              onSendMessage={sendMessage}
              isLoading={isLoading}
              fullScreen={mode === 'full'}
              quotedProduct={quotedProduct}
              onClearQuote={clearQuotedProduct}
            />
          </div>
        </div>
      </div>
    </RequireEmail>
  );
}
