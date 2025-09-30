import React, { useState, KeyboardEvent } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  fullScreen?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, fullScreen = false }) => {
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
    ? "flex-1 border border-gray-300 rounded-xl p-4 text-base resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    : "flex-1 border border-gray-300 rounded-lg p-3 text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  const buttonClasses = fullScreen
    ? "bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-4 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-3"
    : "bg-blue-600 hover:bg-blue-700 text-white rounded-lg p-3 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ml-2";

  return (
    <form onSubmit={handleSubmit} className="flex items-end">
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={fullScreen ? "Type your message here... (Press Enter to send)" : "Type your message..."}
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
  );
};

export default ChatInput;
