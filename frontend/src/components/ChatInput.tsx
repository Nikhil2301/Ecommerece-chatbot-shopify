import React, { useState, KeyboardEvent } from 'react';
import { Send, Loader2, X, ShoppingBag } from 'lucide-react';

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
    ? "flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl p-4 text-base resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500"
    : "flex-1 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500";

  const buttonClasses = fullScreen
    ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-xl p-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-3"
    : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg p-3 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-2";

  return (
    <div className="w-full">
      {/* Quoted Product Display */}
      {quotedProduct && (
        <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded-r-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Product Image */}
              {quotedProduct.images && quotedProduct.images.length > 0 ? (
                <img
                  src={quotedProduct.images[0].src}
                  alt={quotedProduct.images[0].alt || quotedProduct.title}
                  className="w-12 h-12 object-cover rounded-lg border border-blue-200 dark:border-blue-700 flex-shrink-0"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    const iconFallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (iconFallback) iconFallback.style.display = 'flex';
                  }}
                />
              ) : null}
              
              {/* Fallback Icon */}
              <div 
                className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-lg border border-blue-200 dark:border-blue-700 flex items-center justify-center flex-shrink-0"
                style={{ display: quotedProduct.images && quotedProduct.images.length > 0 ? 'none' : 'flex' }}
              >
                <ShoppingBag className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              
              {/* Product Details */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Asking about product:
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 font-medium truncate">
                  {quotedProduct.title}
                </div>
                {quotedProduct.price && (
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    ${typeof quotedProduct.price === 'string' ? quotedProduct.price : quotedProduct.price.toFixed(2)}
                  </div>
                )}
                {quotedProduct.vendor && (
                  <div className="text-xs text-blue-500 dark:text-blue-400">
                    by {quotedProduct.vendor}
                  </div>
                )}
              </div>
            </div>
            {onClearQuote && (
              <button
                onClick={onClearQuote}
                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:hover:bg-blue-800 rounded flex-shrink-0"
                title="Clear quoted product"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex items-end">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
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
        <button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={buttonClasses}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
