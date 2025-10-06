import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '@/hooks/useChat';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { MessageCircle, X, RotateCcw } from 'lucide-react';
import EmailGate from './EmailGate';

interface ChatBotProps {
  isOpen: boolean;
  onToggle: () => void;
  fullScreen?: boolean;
  position?: 'left' | 'right';
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onToggle, fullScreen = false, position = 'right' }) => {
  const { messages, sendMessage, clearMessages, isLoading, error, selectedProductId, selectProduct } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setReady(!!localStorage.getItem('chatEmail'));
    }
  }, []);

  if (!ready) {
    return (
      <div className={`fixed bottom-4 ${position === 'left' ? 'left-4' : 'right-4'} w-full max-w-md rounded-2xl shadow-xl bg-white`}>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold">AI Assistant</div>
          <button onClick={onToggle} className="p-1">✕</button>
        </div>
        <EmailGate onReady={() => setReady(true)} />
      </div>
    );
  }
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (!isOpen && !fullScreen) {
    return (
      <button
        onClick={onToggle}
        className={`fixed bottom-6 ${position === 'left' ? 'left-6' : 'right-6'} bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-colors duration-200 z-50`}
        aria-label="Open chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    );
  }

  const containerClasses = fullScreen 
    ? "h-full flex flex-col"
    : `fixed bottom-6 ${position === 'left' ? 'left-6' : 'right-6'} bg-white rounded-2xl shadow-2xl w-96 h-[32rem] flex flex-col z-50`;

  const headerClasses = fullScreen
    ? "hidden"
    : "flex items-center justify-between p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-2xl";

  const messagesClasses = fullScreen
    ? "flex-1 overflow-y-auto p-6 bg-gray-50"
    : "flex-1 overflow-y-auto p-4 bg-gray-50";

  const inputContainerClasses = fullScreen
    ? "p-6 bg-white border-t border-gray-200"
    : "p-4 bg-white rounded-b-2xl border-t border-gray-200";

  return (
    <div className={containerClasses}>
      {/* Header - only show in popup mode */}
      {!fullScreen && (
        <div className={headerClasses}>
          <div className="flex items-center">
            <MessageCircle className="w-5 h-5 mr-2" />
            <h3 className="text-lg font-semibold">AI Shopping Assistant</h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearMessages}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors duration-200"
              title="Clear conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={onToggle}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors duration-200"
              title="Close chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className={messagesClasses}>
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Welcome to AI Shopping Assistant!</p>
            <p className="text-sm">
              Ask me about products, orders, or anything else. I'm here to help!
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                selectedProductId={selectedProductId}
                onFocusProduct={selectProduct}
                className={fullScreen ? "mb-6" : "mb-4"}
              />
            ))}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={inputContainerClasses}>
        <ChatInput 
          onSendMessage={sendMessage} 
          isLoading={isLoading} 
          fullScreen={fullScreen}
        />
        {fullScreen && (
          <button
            onClick={clearMessages}
            className="mt-4 flex items-center justify-center w-full py-2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatBot;
