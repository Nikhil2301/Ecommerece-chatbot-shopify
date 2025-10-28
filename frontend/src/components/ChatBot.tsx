import React from 'react';
import { MessageCircle } from 'lucide-react';
import ChatAssistant from '@/components/ChatAssistant';

interface ChatBotProps {
  isOpen: boolean;
  onToggle: () => void;
  position?: 'left' | 'right';
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onToggle, position = 'right' }) => {
  if (!isOpen) {
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
  return (
    <ChatAssistant mode="corner" showHeader showThemeToggle={false} showBackButton={false} onClose={onToggle} />
  );
};

export default ChatBot;
