// ChatInput.tsx - Enhanced Design Version
import React, { useState, KeyboardEvent } from 'react';
import { Send, Loader2, X, ShoppingBag, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  fullScreen?: boolean;
  quotedProduct?: any;
  onClearQuote?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  fullScreen = false,
  quotedProduct,
  onClearQuote
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const inputClasses = fullScreen
    ? "flex-1 border-0 bg-transparent text-gray-900 dark:text-gray-100 p-4 text-base resize-none focus:outline-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500"
    : "flex-1 border-0 bg-transparent text-gray-900 dark:text-gray-100 p-3 text-sm resize-none focus:outline-none focus:ring-0 placeholder:text-gray-400 dark:placeholder:text-gray-500";

  const buttonClasses = fullScreen
    ? "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-xl p-4 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-3 shadow-lg hover:shadow-xl hover:scale-105 hover:shadow-blue-200 dark:hover:shadow-blue-900/30"
    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-600 dark:hover:to-blue-700 text-white rounded-lg p-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-2 shadow-md hover:shadow-lg hover:scale-105";

  return (
    <div className="space-y-3">
      {/* Quoted Product Display - Enhanced with Modern Design */}
      {quotedProduct && (
        <div className="relative group animate-in slide-in-from-bottom duration-300">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border-2 border-blue-200 dark:border-blue-800 shadow-lg">
            <div className="flex gap-4">
              {/* Product Image */}
              <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-white dark:bg-gray-800 shadow-md">
                {quotedProduct.images && quotedProduct.images.length > 0 ? (
                  <>
                    <img
                      src={quotedProduct.images[0]?.src || quotedProduct.images[0]}
                      alt={quotedProduct.title}
                      className="w-full h-full object-cover"
                      style={{ display: quotedProduct.images.length > 0 ? 'block' : 'none' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const iconFallback = e.currentTarget.nextElementSibling as HTMLElement;
                        if (iconFallback) iconFallback.style.display = 'flex';
                      }}
                    />
                    <div
                      style={{ display: quotedProduct.images.length > 0 ? 'none' : 'flex' }}
                      className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30"
                    >
                      <ShoppingBag className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30">
                    <ShoppingBag className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                  </div>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide mb-1">
                      Currently discussing
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {quotedProduct.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs">
                  {quotedProduct.price && (
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      ${typeof quotedProduct.price === 'string' ? quotedProduct.price : quotedProduct.price.toFixed(2)}
                    </span>
                  )}
                  {quotedProduct.vendor && (
                    <span className="px-2 py-0.5 bg-white/50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-gray-700">
                      by {quotedProduct.vendor}
                    </span>
                  )}
                </div>
              </div>

              {/* Clear Context Button */}
              {onClearQuote && (
                <button
                  onClick={onClearQuote}
                  className="flex-shrink-0 p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 
                           hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 
                           hover:scale-110 group"
                  title="Clear product context"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Context Persistence Indicator */}
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <span className="font-medium">
                  All follow-up questions will be about this product until you change or clear the selection
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input Form with Enhanced Design */}
      <form onSubmit={handleSubmit} className="relative">
        <div className={`
          flex items-end bg-white dark:bg-gray-800 rounded-2xl shadow-lg
          transition-all duration-300
          ${isFocused 
            ? 'ring-2 ring-blue-500 dark:ring-blue-400 shadow-xl shadow-blue-100 dark:shadow-blue-900/20 scale-[1.01]' 
            : 'ring-1 ring-gray-200 dark:ring-gray-700 hover:ring-gray-300 dark:hover:ring-gray-600'
          }
        `}>
          {/* Textarea */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={
              quotedProduct
                ? `Ask about ${quotedProduct.title}...`
                : fullScreen
                ? "Type your message here... (Press Enter to send)"
                : "Type your message..."
            }
            className={inputClasses}
            rows={fullScreen ? 2 : 1}
            disabled={isLoading}
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className={buttonClasses}
          >
            {isLoading ? (
              <Loader2 className={`${fullScreen ? 'w-6 h-6' : 'w-5 h-5'} animate-spin`} />
            ) : (
              <Send className={`${fullScreen ? 'w-6 h-6' : 'w-5 h-5'}`} />
            )}
          </button>
        </div>

        {/* Character Count or Typing Indicator */}
        {message.length > 0 && !isLoading && (
          <div className="absolute -bottom-6 right-0 text-xs text-gray-400 dark:text-gray-500">
            {message.length} characters
          </div>
        )}
      </form>
    </div>
  );
};

export default ChatInput;
