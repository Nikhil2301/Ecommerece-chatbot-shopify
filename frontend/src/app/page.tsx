'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ChatBot from '@/components/ChatBot';
import ProductCard from '@/components/ProductCard';
import OrderCard from '@/components/OrderCard';
import { MessageCircle, Home, ShoppingBag, Package } from 'lucide-react';

export default function HomePage() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const router = useRouter();

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  const navigateToHome = () => {
    router.push('/home');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <ShoppingBag className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">AI Ecommerce</h1>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex items-center space-x-4">
              <button
                onClick={navigateToHome}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-md font-medium"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Open Chat Assistant
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Your Intelligent Shopping Assistant
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed max-w-3xl mx-auto">
            Discover products, check order status, and get personalized recommendations 
            through our AI-powered chatbot. Powered by GPT-4o-mini and integrated with Shopify.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Smart Product Search</h3>
            <p className="text-gray-600">
              Find exactly what you're looking for with our AI-powered semantic search. 
              Describe products in natural language and get relevant recommendations.
            </p>
          </div>
          
          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Order Tracking</h3>
            <p className="text-gray-600">
              Check your order status, tracking information, and delivery updates 
              instantly by just asking our chatbot assistant.
            </p>
          </div>
          
          <div className="text-center p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Secure & Private</h3>
            <p className="text-gray-600">
              Your data is protected with enterprise-grade security. 
              We never store personal information and all conversations are encrypted.
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-12 text-white">
          <h3 className="text-3xl font-bold mb-4">Ready to Start Shopping?</h3>
          <p className="text-xl text-blue-100 mb-8">
            Try our AI assistant and discover a new way to shop online
          </p>
          <button
            onClick={navigateToHome}
            className="inline-flex items-center px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors duration-200 font-semibold text-lg shadow-lg"
          >
            <MessageCircle className="w-6 h-6 mr-3" />
            Start Chatting Now
          </button>
        </div>
      </main>
    </div>
  );
}
