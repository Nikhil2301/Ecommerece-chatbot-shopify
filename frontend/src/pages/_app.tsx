import { useEffect, useState } from 'react';
import ChatBot from '@/components/ChatBot';

declare global {
  interface Window {
    ChatbotLoaded?: boolean;
  }
}

function MyApp({ Component, pageProps }: { Component: any; pageProps: any }) {
  // Only show the chatbot if window.shopifyEmbed is true (set by embed.js)
  const [showChatbot, setShowChatbot] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ChatbotLoaded) {
      setShowChatbot(true);
    }
  }, []);
  return (
    <>
      <Component {...pageProps} />
      {showChatbot && <ChatBot isOpen={true} onToggle={() => {}} position="right" />}
    </>
  );
}

export default MyApp;