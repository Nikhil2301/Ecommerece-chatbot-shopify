// File: useChat.ts - Complete fixed version with auto-scroll and pagination
// Path: /frontend/src/hooks/useChat.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChatMessage, ChatResponse } from '@/types';
import { sendChatMessage } from '@/utils/api';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(undefined);
  const [contextProduct, setContextProduct] = useState<any | null>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  // FIXED: Add states for pagination context
  const [lastSearchResults, setLastSearchResults] = useState<any[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  // Sanitize bot bold markers so raw ** doesn't appear
  const sanitizeBotText = useCallback((text: string): string => {
    if (!text) return text;

    // Preserve **Image N:** markers for ChatMessage image rendering
    return text.replace(/\*\*([^*]+)\*\*/g, (match, p1) => {
      const trimmed = String(p1).trim();
      if (/^Image\s+\d+:$/i.test(trimmed)) {
        return match; // keep as-is for detection
      }
      return trimmed; // strip bold for other segments
    });
  }, []);

  // Generate or get session ID
  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return 'server-session';
    let id = window.localStorage.getItem('chat-session-id');
    if (!id) {
      id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      window.localStorage.setItem('chat-session-id', id);
    }
    return id;
  }, []);

  // Load existing history from server when email/session is known
  const loadChatHistory = useCallback(async (email?: string) => {
    if (!email) return;
    try {
      console.log('Loading chat history for email:', email);
      const response = await fetch(`/api/v1/chat/history?email=${encodeURIComponent(email)}&session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded chat history:', data);
        if (data.messages && data.messages.length > 0) {
          // Transform backend format to frontend format
          const transformedMessages: ChatMessage[] = data.messages.map((m: any, index: number) => ({
            id: `history-${index}`,
            message: m.content || '',
            sender: m.role === 'user' ? 'user' : 'bot',
            timestamp: m.created_at ? new Date(m.created_at) : new Date(),
            // Include extra data if present
            ...(m.extra?.exact_matches && { exact_matches: m.extra.exact_matches }),
            ...(m.extra?.suggestions && { suggestions: m.extra.suggestions }),
            ...(m.extra?.orders && { orders: m.extra.orders }),
            ...(m.extra?.suggested_questions && { suggested_questions: m.extra.suggested_questions }),
            ...(m.extra?.context_product && { context_product: m.extra.context_product }),
          }));
          
          setMessages(transformedMessages);
          
          // Build conversation history from messages
          const convHistory = data.messages.map((m: any) => ({
            role: m.role,
            message: m.content,
            timestamp: m.created_at
          }));
          setConversationHistory(convHistory);
          
          // If there were messages, restore search context
          const lastUserMessage = data.messages
            .filter((m: any) => m.role === 'user')
            .pop();
          if (lastUserMessage) {
            setLastSearchQuery(lastUserMessage.content || '');
          }
        }
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  }, [sessionId]);

  // FIXED: Improved sendMessage function with search context storage
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
      console.log('=== SENDING MESSAGE ===');
      console.log('Message:', message);
      console.log('Selected Product ID:', selectedProductId);
      console.log('Session ID:', sessionId);

      const response: ChatResponse = await sendChatMessage(
        message,
        email,
        sessionId,
        selectedProductId,
        conversationHistory,
        maxResults,
        filters,
        pageNumber
      );

      console.log('Response received:', response);

      // FIXED: Store search results for pagination (only for non-pagination requests)
      if (!message.startsWith('PAGINATION_REQUEST:') && (response.exact_matches?.length > 0)) {
        setLastSearchQuery(message);
        // Store all results that could be paginated
        const allResults = [...(response.exact_matches || []), ...(response.suggestions || [])];
        setLastSearchResults(allResults);
        console.log('Stored search results for pagination:', allResults.length);
      }

      // Handle enhanced response with dual sliders
      const exactMatches: any[] = response.exact_matches || [];
      const suggestions: any[] = response.suggestions || [];
      const orders = response.orders || [];

      // Create enhanced bot response message
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: sanitizeBotText(response.response),
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

      // Update context product if provided in response
      if (response.context_product) {
        setContextProduct(response.context_product);
        console.log('Updated context product from response:', response.context_product.title);
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
          console.log('Auto-selecting first product:', first.title);
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
  }, [sessionId, selectedProductId, conversationHistory, sanitizeBotText]);

  // FIXED: Improved requestMoreProducts function
  const requestMoreProducts = useCallback(async (type: 'exact' | 'suggestions', page: number = 2) => {
    console.log('=== REQUESTING MORE PRODUCTS ===');
    console.log('Type:', type);
    console.log('Page:', page);
    console.log('Last search query:', lastSearchQuery);
    console.log('Session ID:', sessionId);

    if (!lastSearchQuery) {
      console.warn('No previous search query found for pagination');
      setError('No previous search found. Please try a new search.');
      return;
    }

    try {
      setIsLoading(true);

      // Get current email from localStorage
      const email = localStorage.getItem('chatEmail');

      // Send the original search query with pagination parameters
      await sendMessage(
        lastSearchQuery, // Use the original search query
        email || undefined,
        type === 'exact' ? 10 : 5, // More results for the request
        {}, // filters if needed
        page // page number
      );

      console.log('Successfully requested more products');
    } catch (error) {
      console.error('Error requesting more products:', error);
      setError('Failed to load more products. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage, lastSearchQuery, sessionId]);

  const sendSuggestedQuestion = useCallback(async (question: string, contextProduct?: any) => {
    console.log('=== SENDING SUGGESTED QUESTION ===');
    console.log('Question:', question);
    console.log('Context product provided:', contextProduct?.title || 'None');
    console.log('Current selected product ID:', selectedProductId);
    console.log('Current context product:', contextProduct?.title || 'None');

    // If a context product is provided, temporarily set it
    if (contextProduct && contextProduct.shopify_id) {
      console.log('Setting context product from suggestion:', contextProduct.title);
      setSelectedProductId(contextProduct.shopify_id);
      setContextProduct(contextProduct);

      // Small delay to ensure state is updated before sending
      setTimeout(() => {
        const email = localStorage.getItem('chatEmail');
        sendMessage(question, email || undefined);
      }, 50);
    } else {
      // Send with current context
      const email = localStorage.getItem('chatEmail');
      sendMessage(question, email || undefined);
    }
  }, [sendMessage, selectedProductId]);

  const selectProduct = useCallback((productId: string) => {
    console.log('=== SELECTING PRODUCT ===');
    console.log('Product ID:', productId);
    setSelectedProductId(productId);

    // Try to find the product in current messages to set context
    for (const message of messages) {
      const allProducts = [
        ...(message.exact_matches || []),
        ...(message.suggestions || []),
      ];
      const product = allProducts.find(p => p.shopify_id === productId);
      if (product) {
        console.log('Found and set context product:', product.title);
        setContextProduct(product);
        break;
      }
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationHistory([]);
    setSelectedProductId(undefined);
    setContextProduct(null);
    setError(null);
    setLastSearchQuery('');
    setLastSearchResults([]);

    // Clear session storage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('chat-session-id');
      window.sessionStorage.removeItem('paginationRequest');
    }
  }, []);

  const getCurrentContext = useCallback(() => {
    return {
      selectedProductId,
      contextProduct,
      conversationHistory: conversationHistory.slice(-4), // Last 4 exchanges
      sessionId,
    };
  }, [selectedProductId, contextProduct, conversationHistory, sessionId]);

  // Quick query for common requests
  const sendQuickQuery = useCallback(async (
    query: string,
    options?: {
      maxResults?: number;
      filters?: Record<string, any>;
    }
  ) => {
    console.log('=== SENDING QUICK QUERY ===');
    console.log('Query:', query);
    console.log('Options:', options);

    const email = localStorage.getItem('chatEmail');
    await sendMessage(query, email || undefined, options?.maxResults, options?.filters);
  }, [sendMessage]);

  // Ask about a specific product by number
  const askAboutProduct = useCallback(async (productNumber: number, question: string) => {
    console.log('=== ASKING ABOUT PRODUCT ===');
    console.log('Product number:', productNumber);
    console.log('Question:', question);

    // Find the product by number in the current messages
    let targetProduct = null;
    for (const message of messages) {
      const allProducts = [
        ...(message.exact_matches || []),
        ...(message.suggestions || []),
      ];
      if (allProducts[productNumber - 1]) {
        targetProduct = allProducts[productNumber - 1];
        break;
      }
    }

    if (targetProduct) {
      console.log('Found target product:', targetProduct.title);
      // Set as selected product and ask the question
      setSelectedProductId(targetProduct.shopify_id);
      setContextProduct(targetProduct);

      // Send question about the product
      const productQuestion = `Regarding product #${productNumber} (${targetProduct.title}): ${question}`;
      const email = localStorage.getItem('chatEmail');
      await sendMessage(productQuestion, email || undefined);
    } else {
      console.error('Product not found for number:', productNumber);
      setError(`Product #${productNumber} not found in current results.`);
    }
  }, [messages, sendMessage]);

  // Apply filters to current search
  const applyFilters = useCallback(async (filters: Record<string, any>) => {
    console.log('=== APPLYING FILTERS ===');
    console.log('Filters:', filters);

    const email = localStorage.getItem('chatEmail');
    if (lastSearchQuery) {
      console.log('Reapplying filters to last search:', lastSearchQuery);
      await sendMessage(lastSearchQuery, email || undefined, undefined, filters);
    } else {
      console.log('No previous search to filter, starting new search');
      await sendMessage('Show me products with these filters', email || undefined, undefined, filters);
    }
  }, [lastSearchQuery, sendMessage]);

  // Initialize with welcome message (only if no history was loaded)
  useEffect(() => {
    // Wait a bit to see if history will be loaded
    const timer = setTimeout(() => {
      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          message: 'Welcome! I\'m your AI shopping assistant. How can I help you find products today?',
          sender: 'bot',
          timestamp: new Date(),
          suggested_questions: [
            'Show me trending products',
            'Find me a black dress', 
            'What\'s on sale?',
            'Help me find a gift'
          ]
        };
        setMessages([welcomeMessage]);
      }
    }, 500); // Wait 500ms for history to load

    return () => clearTimeout(timer);
  }, []); // Only run once on mount

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
    requestMoreProducts, // FIXED
    askAboutProduct,
    applyFilters,
    loadChatHistory,

    // Debug info
    lastSearchQuery,
    lastSearchResults,
  };
};
