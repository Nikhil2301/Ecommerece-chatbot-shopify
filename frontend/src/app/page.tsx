// frontend/src/app/page.tsx
'use client';

import { useState } from 'react';
import ChatBot from '@/components/ChatBot';

export default function HomePage() {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 focus:outline-none"
          aria-label="Open chat"
        >
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none"
            className="text-white"
          >
            <circle cx="12" cy="12" r="12" fill="currentColor"/>
            <path 
              d="M12 17.5c3.037 0 5.5-2.053 5.5-4.5s-2.463-4.5-5.5-4.5-5.5 2.053-5.5 4.5 2.463 4.5 5.5 4.5z" 
              fill="#9333ea"
            />
            <path 
              d="M8.5 12.995c-.197 0-.394-.146-.451-.345.65-2.335 2.341-3.65 4.453-3.65s3.803 1.315 4.453 3.65c-.057.199-.254.345-.451.345H8.5z" 
              fill="#2563eb"
            />
          </svg>
        </button>
      )}
      <ChatBot isOpen={isChatOpen} onToggle={toggleChat} position="right" />
    </div>
  );
}
