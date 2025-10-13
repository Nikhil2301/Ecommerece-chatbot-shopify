// # Enhanced useChat.ts - Fixed All Frontend Issues
// # File: frontend/src/hooks/useChat.ts

import { useState, useCallback, useMemo, useEffect } from 'react';
import { ChatMessage, ChatResponse, IntentType } from '@/types';
import { sendChatMessage } from '@/utils/api';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem('chatMessages');
      if (savedMessages) {
        try {
          return JSON.parse(savedMessages);
        } catch (e) {
          console.error('Could not parse chat messages from local storage', e);
          return [];
        }
      }
    }
    return [];
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ENHANCED: Intelligent context state management with persistence
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedProductId') || undefined;
    }
    return undefined;
  });

  const [contextProduct, setContextProduct] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('contextProduct');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {
          console.warn('Failed to parse stored context product:', e);
        }
      }
    }
    return null;
  });

  // Type for conversation history items
  type ConversationHistoryItem = {
    role: string;
    message: string;
    timestamp: string;
  };

  const [conversationHistory, setConversationHistory] = useState<ConversationHistoryItem[]>([]);
  const [quotedProduct, setQuotedProduct] = useState<any>(null);
  const [lastSearchResults, setLastSearchResults] = useState<any[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSearchQuery') || '';
    }
    return '';
  });
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('currentPage') || '1', 10);
    }
    return 1;
  });

  // Generate session ID
  const sessionId = useMemo(() => {
    if (typeof window === 'undefined') return 'server-session';
    let id = window.localStorage.getItem('chat-session-id');
    if (!id) {
      id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      window.localStorage.setItem('chat-session-id', id);
    }
    return id;
  }, []);

  // ENHANCED: More conservative context change detection for Issue #1
  const detectContextChange = useCallback((message: string, currentContext?: any) => {
    console.log('🔍 FRONTEND: Detecting context change');
    console.log('Message:', message);
    console.log('Current context:', currentContext?.title || 'None');

    const messageLower = message.toLowerCase().trim();

    // Strong indicators for NEW searches (should clear context)
    const newSearchPatterns = [
      /\b(?:show|find|get|search)\s+(?:me\s+)?(?:some\s+)?(?:a\s+)?\d*\s*[a-zA-Z]+\s*(?:dress|shirt|jacket|pants|shoes|bag|watch|ring|earrings|top|skirt|coat|sweater|hoodie|jeans|shorts|sneakers|boots|sandals|hat|cap|belt|scarf|sunglasses|handbag|backpack|wallet)/i,
      /\b(?:looking\s+for|want|need)\s+(?:some\s+)?(?:a\s+)?[a-zA-Z\s]+\s*(?:dress|shirt|jacket|shoes|bag)/i,
      /\bi\s*(?:want|need|am\s+looking\s+for)\s+[a-zA-Z\s]+/i,
      /\b(?:red|blue|green|black|white|pink|yellow|purple)\s+(?:dress|shirt|jacket|pants|shoes)/i,
      // ENHANCED: Price-based patterns for Issue #7
      /\bunder\s*[$₹]?\d+/i,
      /\bbelow\s*[$₹]?\d+/i,
      /\bproducts?\s+under\s+[$₹]?\d+/i,
      /\bitems?\s+under\s+[$₹]?\d+/i,
      /\bbudget\s+of\s+[$₹]?\d+/i,
      /\bmax\s+[$₹]?\d+/i,
      /\bmaximum\s+[$₹]?\d+/i,
      /\bprice\s+under\s+[$₹]?\d+/i,
      /\bcost\s+under\s+[$₹]?\d+/i,
    ];

    // Order/General inquiry patterns (should clear context)
    const nonProductPatterns = [
      /\b(?:order|orders?)\s+(?:status|number|details?|tracking)/i,
      /\b(?:track|tracking)\s+(?:my\s+)?order/i,
      /\border\s*#?\s*\d+/i,
      /\b(?:hello|hi|hey)\b/i,
      /\b(?:help|support|customer\s+service)/i,
      /\b(?:return|refund|exchange)\s+policy/i,
      /\bthanks?\s+(?:you\s+)?/i,
    ];

    // Product-specific question patterns (should maintain context) - ENHANCED for Issue #1
    const productQuestionPatterns = [
      /\b(?:what|which)\s+(?:colors?|sizes?|materials?)\s+(?:are\s+)?available/i,
      /\b(?:how\s+much|what.s\s+the\s+price|cost)/i,
      /\b(?:is\s+(?:this|it)\s+(?:available|in\s+stock))/i,
      /\b(?:show\s+me\s+(?:images?|photos?))/i,
      /\b(?:tell\s+me\s+(?:about|more))/i,
      /\b(?:and\s+)?(?:what|how)\s+(?:about|is)\s+(?:the\s+)?(?:price|cost|size|color|material)/i,
      /\bwhat\s+(?:sizes?|colors?|options?)\s+(?:does\s+(?:this|it)\s+come\s+in|are\s+there)/i,
      /\b(?:similar|more\s+like\s+this)\s+products?/i,
      /\bis\s+there\s+(?:a\s+)?discount/i,
      // NEW: Direct question words that imply context continuation
      /^\s*(?:what|which|how|is|are|does|can)\s+/i,
      /\b(?:about\s+)?(?:this|it)\b/i,
    ];

    // Check patterns
    const isNewSearch = newSearchPatterns.some(pattern => pattern.test(messageLower));
    const isNonProduct = nonProductPatterns.some(pattern => pattern.test(messageLower));
    const isProductQuestion = productQuestionPatterns.some(pattern => pattern.test(messageLower));

    // Context references (check if message refers to current product)
    let hasContextReference = false;
    if (currentContext) {
      const titleWords = currentContext.title.toLowerCase().split(/\s+/);
      const significantWords = titleWords.filter((word: string) => word.length > 3);
      hasContextReference = significantWords.some((word: string) => messageLower.includes(word));
    }

    // ENHANCED: More conservative context clearing - only clear when very confident
    const shouldClearContext = (isNewSearch || isNonProduct) && !isProductQuestion && !hasContextReference;
    const shouldMaintainContext = currentContext && (isProductQuestion || hasContextReference) && !isNewSearch && !isNonProduct;

    console.log('🎯 FRONTEND ANALYSIS:', {
      isNewSearch,
      isNonProduct,
      isProductQuestion,
      hasContextReference,
      shouldClearContext,
      shouldMaintainContext
    });

    return { shouldClearContext, shouldMaintainContext };
  }, []);

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

  // ENHANCED: Context persistence with localStorage for Issue #6
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (contextProduct) {
        localStorage.setItem('contextProduct', JSON.stringify(contextProduct));
        console.log('💾 Context product persisted:', contextProduct.title);
      } else {
        localStorage.removeItem('contextProduct');
      }
    }
  }, [contextProduct]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedProductId) {
        localStorage.setItem('selectedProductId', selectedProductId);
        console.log('💾 Selected product ID persisted:', selectedProductId);
      } else {
        localStorage.removeItem('selectedProductId');
      }
    }
  }, [selectedProductId]);

  // Smart context clearing
  const clearProductContext = useCallback((reason?: string) => {
    console.log('🧹 CLEARING PRODUCT CONTEXT');
    if (reason) console.log('Reason:', reason);
    setSelectedProductId(undefined);
    setContextProduct(null);
    setQuotedProduct(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('selectedProductId');
      localStorage.removeItem('contextProduct');
    }
  }, []);

  // Load chat history
  const loadChatHistory = useCallback(async (email?: string) => {
    if (!email) return;

    try {
      console.log('📚 Loading chat history for email:', email);
      const response = await fetch(`/api/v1/chat/history?email=${encodeURIComponent(email)}&session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Loaded chat history:', data);

        if (data.messages && data.messages.length > 0) {
          const transformedMessages: ChatMessage[] = data.messages.map((m: any, index: number) => ({
            id: `history-${index}`,
            message: m.content || '',
            sender: m.role === 'user' ? 'user' : 'bot',
            timestamp: m.created_at ? new Date(m.created_at) : new Date(),
            // Include extra data
            ...(m.extra?.exact_matches && { exact_matches: m.extra.exact_matches }),
            ...(m.extra?.suggestions && { suggestions: m.extra.suggestions }),
            ...(m.extra?.orders && { orders: m.extra.orders }),
            ...(m.extra?.suggested_questions && { suggested_questions: m.extra.suggested_questions }),
            ...(m.extra?.context_product && { context_product: m.extra.context_product }),
          }));

          setMessages(transformedMessages);

          // Build conversation history
          const convHistory = data.messages.map((m: any) => ({
            role: m.role,
            message: m.content,
            timestamp: m.created_at
          }));
          setConversationHistory(convHistory);

          // ENHANCED: Restore context from last message if available for Issue #6
          const lastBotMessage = data.messages
            .filter((m: any) => m.role === 'assistant')
            .pop();

          if (lastBotMessage?.extra?.context_product && lastBotMessage?.extra?.context_maintained) {
            console.log('🔄 Restoring context from chat history:', lastBotMessage.extra.context_product.title);
            setContextProduct(lastBotMessage.extra.context_product);
            setSelectedProductId(lastBotMessage.extra.context_product.shopify_id);
          }
        }
      }
    } catch (err) {
      console.error('❌ Failed to load chat history:', err);
    }
  }, [sessionId]);

  // ENHANCED: Intelligent message sending with context management for Issue #1 & #6
  const sendMessage = useCallback(async (
    message: string,
    email?: string,
    maxResults?: number,
    filters?: Record<string, any>,
    pageNumber?: number
  ) => {
    if (!message.trim()) return;

    const trimmedMessage = message.trim();
    console.log('💬 SENDING MESSAGE:', trimmedMessage);

    // ENHANCED: More conservative context change detection for Issue #1
    const contextAnalysis = detectContextChange(trimmedMessage, contextProduct);

    // Only clear context if we're very confident it should be cleared
    if (contextAnalysis.shouldClearContext && !contextAnalysis.shouldMaintainContext) {
      console.log('🧹 Frontend clearing context based on message analysis');
      clearProductContext('Message indicates topic change');
    }

    // Create user message with context if available
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: trimmedMessage,
      sender: 'user',
      timestamp: new Date(),
      // ENHANCED: Always include reply_to context when context exists for Issue #6
      reply_to: (selectedProductId && contextProduct && !contextAnalysis.shouldClearContext) ? {
        message: trimmedMessage,
        timestamp: new Date(),
        product: contextProduct
      } : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      console.log('🚀 BACKEND REQUEST');
      console.log('Selected Product ID:', selectedProductId);
      console.log('Context cleared:', contextAnalysis.shouldClearContext);

      // Send to backend with context information
      const selectedProductIdForRequest = contextAnalysis.shouldClearContext ? undefined : selectedProductId;
      console.log('📤 Sending selected_product_id to backend:', selectedProductIdForRequest);

      const response: ChatResponse = await sendChatMessage(
        message,
        email,
        sessionId,
        selectedProductIdForRequest,
        conversationHistory,
        maxResults,
        filters,
        pageNumber
      );

      console.log('📥 BACKEND RESPONSE:', response);

      // Create bot message
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: sanitizeBotText(response.response),
        sender: 'bot',
        timestamp: new Date(),
        exact_matches: response.exact_matches || [],
        suggestions: response.suggestions || [],
        orders: response.orders || [],
        suggested_questions: response.suggested_questions || [],
        context_product: response.context_product,
        show_exact_slider: response.show_exact_slider,
        show_suggestions_slider: response.show_suggestions_slider,
        total_exact_matches: response.total_exact_matches,
        total_suggestions: response.total_suggestions,
        current_page: response.current_page,
        has_more_exact: response.has_more_exact,
        has_more_suggestions: response.has_more_suggestions,
        applied_filters: response.applied_filters,
        search_metadata: response.search_metadata,
        
        // ENHANCED: Always show reply context for bot messages when context exists for Issue #6
        reply_to: {
          message: userMessage.message,
          timestamp: userMessage.timestamp,
          product: response.context_product || (contextAnalysis.shouldClearContext ? undefined : contextProduct)
        }
      };

      setMessages(prev => [...prev, botMessage]);

      // ENHANCED: Update context based on backend response for Issue #1 & #6
      if (response.context_product && response.intent !== 'ORDER_INQUIRY' && response.intent !== 'GENERAL_CHAT') {
        console.log('🎯 Updating context from backend response:', response.context_product.title);
        setContextProduct(response.context_product);
        if (!selectedProductId) {
          setSelectedProductId(response.context_product.shopify_id);
          console.log('🆔 Auto-setting selected product ID:', response.context_product.shopify_id);
        }
      } else if (response.intent === 'ORDER_INQUIRY' || response.intent === 'GENERAL_CHAT' || response.intent === 'CONTEXT_SWITCH') {
        console.log('🧹 Backend indicated context should be cleared for intent:', response.intent);
        clearProductContext(`Backend intent: ${response.intent}`);
      }

      // Update conversation history
      const newHistory = [
        ...conversationHistory.slice(-8),
        { role: 'user', message: message, timestamp: new Date().toISOString() },
        { role: 'assistant', message: response.response, timestamp: new Date().toISOString() }
      ];
      setConversationHistory(newHistory);

      // Clear quoted product after response
      if (quotedProduct) {
        setQuotedProduct(null);
      }

      // Cache search results
      if (response.exact_matches || response.suggestions) {
        setLastSearchQuery(message);
        setLastSearchResults([...(response.exact_matches || []), ...(response.suggestions || [])]);
        setCurrentPage(response.current_page || 1);
      }

    } catch (err: any) {
      console.error('💥 CHAT ERROR:', err);
      const errorMessage = err?.message || 'Sorry, I encountered an error. Please try again.';
      setError(errorMessage);

      const errorChatMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: `Error: ${errorMessage}`,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, selectedProductId, conversationHistory, contextProduct, quotedProduct, detectContextChange, clearProductContext, sanitizeBotText]);

  // ENHANCED: Send suggested question with context preservation for Issue #4
  const sendSuggestedQuestion = useCallback(async (question: string, messageContextProduct?: any) => {
    console.log('💡 SENDING SUGGESTED QUESTION');
    console.log('Question:', question);
    console.log('Message context product:', messageContextProduct?.title || 'None');
    console.log('Current context product:', contextProduct?.title || 'None');

    // If context product provided, use it; otherwise use current context
    const productToUse = messageContextProduct || contextProduct;

    if (productToUse && productToUse.shopify_id) {
      console.log('🎯 Setting context from suggestion:', productToUse.title);
      setContextProduct(productToUse);
      setSelectedProductId(productToUse.shopify_id);
    }

    const email = localStorage.getItem('chatEmail');
    await sendMessage(question, email || undefined);
  }, [sendMessage, contextProduct]);

  // Select product with context setting for Issue #5 & #6
  const selectProduct = useCallback((productId: string, product?: any) => {
    console.log('🎯 SELECTING PRODUCT');
    console.log('Product ID:', productId);
    console.log('Product:', product?.title || 'Finding...');

    setSelectedProductId(productId);

    if (product) {
      setContextProduct(product);
    } else {
      // Find product in current messages
      for (const message of messages) {
        const allProducts = [
          ...(message.exact_matches || []),
          ...(message.suggestions || []),
        ];
        const foundProduct = allProducts.find(p => p.shopify_id === productId);
        if (foundProduct) {
          console.log('✅ Found and set context product:', foundProduct.title);
          setContextProduct(foundProduct);
          break;
        }
      }
    }
  }, [messages]);

  // Quote product for "Reply to this product" - Issue #5
  const quoteProduct = useCallback((product: any) => {
    console.log('💬 QUOTING PRODUCT FOR REPLY');
    console.log('Product:', product.title);
    setQuotedProduct(product);
    setSelectedProductId(product.shopify_id);
    setContextProduct(product);
  }, []);

  // Clear quoted product
  const clearQuotedProduct = useCallback(() => {
    console.log('🧹 CLEARING QUOTED PRODUCT');
    setQuotedProduct(null);
  }, []);

  // Request more products (pagination)
  const requestMoreProducts = useCallback(async (type: 'exact' | 'suggestions') => {
    console.log('📄 REQUESTING MORE PRODUCTS:', type);
    
    if (!lastSearchQuery) {
      console.warn('No previous search query for pagination');
      setError('No previous search found. Please try a new search.');
      return;
    }

    const email = localStorage.getItem('chatEmail');
    const nextPage = currentPage + 1;

    try {
      setCurrentPage(nextPage);
      await sendMessage(
        `LOAD_MORE_${type.toUpperCase()}_MATCHES: ${lastSearchQuery}`,
        email || undefined,
        undefined,
        {},
        nextPage
      );
    } catch (error) {
      console.error('Error requesting more products:', error);
      setCurrentPage(currentPage); // Reset on error
    }
  }, [lastSearchQuery, currentPage, sendMessage]);

  // Ask about specific product by number
  const askAboutProduct = useCallback(async (productNumber: number, question: string) => {
    console.log('❓ ASKING ABOUT PRODUCT #', productNumber);

    // Find product by number in recent messages
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
      console.log('🎯 Found target product:', targetProduct.title);
      setSelectedProductId(targetProduct.shopify_id);
      setContextProduct(targetProduct);

      const productQuestion = `Regarding product #${productNumber} (${targetProduct.title}): ${question}`;
      const email = localStorage.getItem('chatEmail');
      await sendMessage(productQuestion, email || undefined);
    } else {
      console.error('Product not found for number:', productNumber);
      setError(`Product #${productNumber} not found in current results.`);
    }
  }, [messages, sendMessage]);

  // Clear all messages and context
  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationHistory([]);
    clearProductContext('Manual clear');
    setError(null);
    setLastSearchQuery('');
    setLastSearchResults([]);
    setCurrentPage(1);

    // Clear storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chat-session-id');
      localStorage.removeItem('chatMessages');
      localStorage.removeItem('lastSearchQuery');
      localStorage.removeItem('currentPage');
    }
  }, [clearProductContext]);

  // Get current context for debugging
  const getCurrentContext = useCallback(() => {
    return {
      selectedProductId,
      contextProduct,
      conversationHistory: conversationHistory.slice(-4),
      sessionId,
    };
  }, [selectedProductId, contextProduct, conversationHistory, sessionId]);

  // Initialize with welcome message if empty
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messages.length === 0) {
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          message: 'Welcome! I\'m your intelligent shopping assistant. I can help you find products, answer questions about specific items, and check your orders. How can I help you today?',
          sender: 'bot',
          timestamp: new Date(),
          suggested_questions: [
            'Show me trending dresses',
            'Find me black sneakers under $100',
            'What\'s on sale today?',
            'Check my order status'
          ],
        };
        setMessages([welcomeMessage]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [messages.length]);

  // Save messages to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

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
    requestMoreProducts,
    askAboutProduct,
    loadChatHistory,

    // Product context management - Issue #6
    quotedProduct,
    quoteProduct,
    clearQuotedProduct,
    clearProductContext,

    // Search context
    lastSearchQuery,
    lastSearchResults,
  };
};