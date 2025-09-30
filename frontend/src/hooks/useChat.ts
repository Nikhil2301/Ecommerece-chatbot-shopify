// # File Path: /Users/nikhil/Sites/localhost/22-sep-11-12-Ai-Ecommerce-Chatbot/frontend/src/hooks/useChat.ts

import { useState, useCallback, useMemo } from 'react';
import { ChatMessage, EnhancedChatResponse } from '@/types';
import { sendChatMessage } from '@/utils/api';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      message: "Hello! I'm your AI shopping assistant. I can help you find products and check your order status. You can ask for specific amounts like 'show me 3 products' or filter by price like 'under $50'. What can I help you with today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [contextProduct, setContextProduct] = useState<any>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  // Stable session id for this browser tab
  const sessionId = useMemo(() => {
    const existing = typeof window !== 'undefined' ? window.sessionStorage.getItem('chat_session_id') : null;
    if (existing) return existing;
    
    const id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== 'undefined') window.sessionStorage.setItem('chat_session_id', id);
    return id;
  }, []);

  const sendMessage = useCallback(async (
    message: string, 
    email?: string, 
    maxResults?: number,
    filters?: Record<string, any>,
    pageNumber?: number
  ) => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: message.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Enhanced context-aware chat request
      const response: EnhancedChatResponse = await sendChatMessage(
        message,
        email,
        sessionId,
        selectedProductId,
        conversationHistory,
        maxResults,
        filters,
        pageNumber
      );

      // Handle enhanced response with dual sliders
      const exactMatches: any[] = response.exact_matches || [];
      const suggestions: any[] = response.suggestions || [];
      const orders = response.orders || [];

      // Create enhanced bot response message
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: response.response,
        sender: 'bot',
        timestamp: new Date(),
        // Dual slider data
        exact_matches: exactMatches.length > 0 ? exactMatches : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        orders: orders.length > 0 ? orders : undefined,
        suggested_questions: response.suggested_questions || [],
        context_product: response.context_product,
        show_exact_slider: response.show_exact_slider,
        show_suggestions_slider: response.show_suggestions_slider,
        // Enhanced metadata
        total_exact_matches: response.total_exact_matches,
        total_suggestions: response.total_suggestions,
        current_page: response.current_page,
        has_more_exact: response.has_more_exact,
        has_more_suggestions: response.has_more_suggestions,
        applied_filters: response.applied_filters,
        search_metadata: response.search_metadata,
      };

      setMessages(prev => [...prev, botMessage]);

      // Update context product if provided
      if (response.context_product) {
        setContextProduct(response.context_product);
        setSelectedProductId(response.context_product.shopify_id);
      }

      // Update conversation history
      const newHistory = [
        ...conversationHistory.slice(-8), // Keep last 8 messages
        { role: 'user', message: message, timestamp: new Date().toISOString() },
        { role: 'assistant', message: response.response, timestamp: new Date().toISOString() }
      ];
      setConversationHistory(newHistory);

      // Auto-select first product if no current selection and products available
      if (!selectedProductId && exactMatches && exactMatches.length > 0) {
        const first = exactMatches[0];
        if (first && first.shopify_id) {
          setSelectedProductId(first.shopify_id);
          setContextProduct(first);
        }
      }

    } catch (err: any) {
      console.error('Chat error:', err);
      setError('Sorry, I encountered an error. Please try again.');
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, selectedProductId, conversationHistory]);

  const sendQuickQuery = useCallback(async (query: string, options?: {
    maxResults?: number;
    priceFilter?: { max: number };
    brandFilter?: string;
  }) => {
    let enhancedQuery = query;
    
    if (options?.maxResults) {
      enhancedQuery += ` (show ${options.maxResults})`;
    }
    if (options?.priceFilter?.max) {
      enhancedQuery += ` under $${options.priceFilter.max}`;
    }
    if (options?.brandFilter) {
      enhancedQuery += ` from ${options.brandFilter}`;
    }
    
    await sendMessage(enhancedQuery);
  }, [sendMessage]);

  const selectProduct = useCallback((productId: string) => {
    setSelectedProductId(productId);
    
    // Find the product in recent messages to set context
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      
      // Check both exact matches and suggestions
      const allProducts = [
        ...(msg.exact_matches || []),
        ...(msg.suggestions || []),
        ...(msg.products || []) // Fallback for old format
      ];
      
      const foundProduct = allProducts.find((p: any) => p.shopify_id === productId);
      if (foundProduct) {
        setContextProduct(foundProduct);
        break;
      }
    }
  }, [messages]);

  const sendSuggestedQuestion = useCallback(async (question: string) => {
    // Use the suggested question as if user typed it
    await sendMessage(question);
  }, [sendMessage]);

  const requestMoreProducts = useCallback(async (type: 'exact' | 'suggestions', page: number = 1) => {
    // Request more products for pagination
    const message = type === 'exact' ? 'Show me more results' : 'Show me more suggestions';
    await sendMessage(message, undefined, undefined, undefined, page);
  }, [sendMessage]);

  const askAboutProduct = useCallback(async (productNumber: number, question: string) => {
    // Ask about a specific numbered product
    const enhancedQuestion = `${question} for product #${productNumber}`;
    await sendMessage(enhancedQuestion);
  }, [sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: '1',
        message: "Hello! I'm your AI shopping assistant. I can help you find products with specific requirements like 'show me 2 red shirts under $30' or ask about order status. How can I help you today?",
        sender: 'bot',
        timestamp: new Date(),
      },
    ]);
    setError(null);
    setSelectedProductId(undefined);
    setContextProduct(null);
    setConversationHistory([]);
    
    // Clear session storage
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem('chat_session_id');
    }
  }, []);

  // Get current context information
  const getCurrentContext = useCallback(() => {
    return {
      selectedProductId,
      contextProduct,
      conversationHistory: conversationHistory.slice(-5) // Last 5 for display
    };
  }, [selectedProductId, contextProduct, conversationHistory]);

  // Enhanced filtering helpers
  const applyFilters = useCallback(async (filters: {
    maxResults?: number;
    priceMax?: number;
    brand?: string;
    query?: string;
  }) => {
    let filterQuery = filters.query || "show me products";
    
    if (filters.maxResults) {
      filterQuery += ` (limit ${filters.maxResults})`;
    }
    if (filters.priceMax) {
      filterQuery += ` under $${filters.priceMax}`;
    }
    if (filters.brand) {
      filterQuery += ` from ${filters.brand}`;
    }
    
    await sendMessage(filterQuery);
  }, [sendMessage]);

  return {
    // Core functionality
    messages,
    sendMessage,
    sendSuggestedQuestion,
    clearMessages,
    isLoading,
    error,
    selectedProductId,
    selectProduct,
    contextProduct,
    getCurrentContext,
    sessionId,
    
    // Enhanced functionality
    sendQuickQuery,
    requestMoreProducts,
    askAboutProduct,
    applyFilters,
  };
};