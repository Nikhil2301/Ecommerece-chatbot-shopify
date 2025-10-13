// File: useChat.ts - Enhanced version with product context persistence fix

// Path: /frontend/src/hooks/useChat.ts

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

  // ENHANCED: Product context state management with persistence
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

  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [quotedProduct, setQuotedProduct] = useState<any>(null);

  // FIXED: Add states for pagination context with localStorage initialization
  const [lastSearchResults, setLastSearchResults] = useState<any[]>([]);
  const [lastSearchQuery, setLastSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('lastSearchQuery') || '';
    }
    return '';
  });

  const [currentPage, setCurrentPage] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(localStorage.getItem('currentPage') || '1', 10);
    }
    return 1;
  });

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

  // ENHANCED: Persist context product to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (contextProduct) {
        localStorage.setItem('contextProduct', JSON.stringify(contextProduct));
        console.log('Context product persisted:', contextProduct.title);
      } else {
        localStorage.removeItem('contextProduct');
      }
    }
  }, [contextProduct]);

  // ENHANCED: Persist selected product ID to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedProductId) {
        localStorage.setItem('selectedProductId', selectedProductId);
        console.log('Selected product ID persisted:', selectedProductId);
      } else {
        localStorage.removeItem('selectedProductId');
      }
    }
  }, [selectedProductId]);

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

          // ENHANCED: Restore context from last message if available
          const lastBotMessage = data.messages
            .filter((m: any) => m.role === 'assistant')
            .pop();
          
          if (lastBotMessage?.extra?.context_product && lastBotMessage?.extra?.selected_product_id) {
            console.log('Restoring context from chat history:', lastBotMessage.extra.context_product.title);
            setContextProduct(lastBotMessage.extra.context_product);
            setSelectedProductId(lastBotMessage.extra.selected_product_id);
          }

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

  // NEW: Intelligent context change detection
  const detectContextChange = useCallback((message: string, currentContext?: any) => {
    console.log('=== DETECTING CONTEXT CHANGE ===');
    console.log('Message:', message);
    console.log('Current context product:', currentContext?.title || 'None');

    const messageLower = message.toLowerCase().trim();

    // Define patterns for different types of queries
    const newProductSearchPatterns = [
      // Direct product searches
      'show\\s+me\\s+(?:some\\s+)?(?:a\\s+)?(?:\\d+\\s+)?([a-zA-Z\\s]+)(?:dress|shirt|jacket|pants|shoes|bag|watch|ring|necklace|earrings|top|bottom|skirt|coat|sweater|hoodie|jeans|shorts|sneakers|boots|sandals|hat|cap|belt|scarf|sunglasses|handbag|backpack|wallet)',
      'find\\s+me\\s+(?:some\\s+)?(?:a\\s+)?(?:\\d+\\s+)?([a-zA-Z\\s]+)',
      'looking\\s+for\\s+(?:some\\s+)?(?:a\\s+)?(?:\\d+\\s+)?([a-zA-Z\\s]+)',
      'search\\s+for\\s+(?:some\\s+)?(?:a\\s+)?(?:\\d+\\s+)?([a-zA-Z\\s]+)',
      '(?:i\\s+)?(?:want|need)\\s+(?:some\\s+)?(?:a\\s+)?(?:\\d+\\s+)?([a-zA-Z\\s]+)',
      // Color/size specific searches
      '(?:show|find|get)\\s+me\\s+.*?(?:color|size|in|with)',
      // Category searches
      '(?:show|find|get)\\s+me\\s+.*?(?:under|below|above|over)\\s+\\$\\d+',
    ];

    const orderRelatedPatterns = [
      // Direct order requests
      '\\b(?:order|orders)\\s+(?:details?|info|information|status)\\b',
      '\\b(?:give|show|tell)\\s+me.{0,20}\\border',
      '\\b(?:my|the)\\s+order',
      '\\border\\s+(?:number|#)\\s*\\d+',
      // Tracking related
      '\\b(?:track|tracking)\\b',
      '\\b(?:shipping|delivery)\\s+(?:status|info|details?)',
      '\\bwhere\\s+is\\s+my',
      '\\bwhen\\s+will\\s+(?:it|my\\s+order)',
      // Status inquiries
      '\\b(?:order|shipping|delivery)\\s+status\\b',
      '\\bstatus\\s+of\\s+(?:my\\s+)?order\\b',
    ];

    const generalQuestionPatterns = [
      '^(?:hi|hello|hey|thanks|thank\\s+you)\\b',
      '\\b(?:help|support|contact|phone|email|address)\\b',
      '\\b(?:policy|return|refund|exchange|shipping|delivery)\\b',
      '\\b(?:how\\s+(?:to|do|can)|what\\s+(?:is|are)|where\\s+(?:is|are)|when\\s+(?:is|are))\\b',
      '\\b(?:store|location|hours|open|close)\\b',
    ];

    // Check if this is a new product search
    const isNewProductSearch = newProductSearchPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(messageLower);
    });

    // Check if this is an order-related query
    const isOrderQuery = orderRelatedPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(messageLower);
    });

    // Check if this is a general question
    const isGeneralQuestion = generalQuestionPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(messageLower);
    });

    // CRITICAL: Check if message relates to current context (product-specific questions)
    let relatedToCurrentContext = false;
    if (currentContext && currentContext.title) {
      const contextWords = currentContext.title.toLowerCase().split(/\s+/).filter((word: string) => word.length > 2);
      const messageWords = messageLower.split(/\s+/);

      // Check if message contains significant words from current product
      const matchingWords = contextWords.filter((word: string) =>
        messageWords.some((msgWord: string) => msgWord.includes(word) || word.includes(msgWord))
      );

      // ENHANCED: Check for product-specific questions that don't mention the product name
      const productSpecificQuestions = [
        '\\b(?:what|which)\\s+(?:colors?|sizes?|materials?)\\b',
        '\\b(?:is\\s+(?:this|it)\\s+(?:available|in\\s+stock))\\b',
        '\\b(?:how\\s+much|what.s\\s+the\\s+price|cost)\\b',
        '\\b(?:show\\s+me\\s+(?:images?|photos?))\\b',
        '\\b(?:tell\\s+me\\s+(?:about|more))\\b',
        '\\b(?:similar\\s+(?:products?|items?))\\b',
        '\\b(?:and\\s+)?(?:what|how)\\s+(?:about|is)\\s+(?:the\\s+)?(?:price|cost|size|color|material)\\b', // NEW: "and what about the price?"
        '\\b(?:what\\s+)?(?:sizes?|colors?|options?)\\s+(?:are\\s+)?(?:available)\\b', // NEW: "what sizes are available?"
      ];

      const isProductSpecific = productSpecificQuestions.some(pattern => {
        const regex = new RegExp(pattern, 'i');
        return regex.test(messageLower);
      });

      relatedToCurrentContext = matchingWords.length > 0 || isProductSpecific;
    }

    console.log('Analysis results:', {
      isNewProductSearch,
      isOrderQuery,
      isGeneralQuestion,
      relatedToCurrentContext,
      hasCurrentContext: !!currentContext
    });

    // Determine intent
    let intent: IntentType | 'RELATED_TO_CURRENT' | 'NONE' = 'NONE';
    if (relatedToCurrentContext) intent = 'RELATED_TO_CURRENT';
    else if (isOrderQuery) intent = 'ORDER_INQUIRY';
    else if (isGeneralQuestion) intent = 'GENERAL_CHAT';
    else if (isNewProductSearch) intent = 'PRODUCT_SEARCH';

    // CRITICAL: Only clear context for definitively different topics
    const shouldClearContext = !!currentContext && 
      (intent === 'ORDER_INQUIRY' || intent === 'GENERAL_CHAT' || intent === 'PRODUCT_SEARCH') && 
      !relatedToCurrentContext;

    const reasonMap: Record<string, string> = {
      RELATED_TO_CURRENT: 'Message relates to current context',
      ORDER_INQUIRY: 'Order-related query detected',
      GENERAL_CHAT: 'General question detected',
      PRODUCT_SEARCH: 'New product search detected',
      NONE: currentContext ? 'No clear context change detected' : 'No current context to clear'
    };

    return { shouldClearContext, reason: reasonMap[intent || 'NONE'], intent };
  }, []);

  // NEW: Clear context when topic changes
  const clearProductContext = useCallback((reason?: string) => {
    console.log('=== CLEARING PRODUCT CONTEXT ===');
    if (reason) console.log('Reason:', reason);
    setSelectedProductId(undefined);
    setContextProduct(null);
    localStorage.removeItem('selectedProductId');
    localStorage.removeItem('contextProduct');
  }, []);

  // NEW: Clear quoted product
  const clearQuotedProduct = useCallback(() => {
    console.log('=== CLEARING QUOTED PRODUCT ===');
    setQuotedProduct(null);
  }, []);

  // ENHANCED: Improved sendMessage function with context persistence
  const sendMessage = useCallback(async (
    message: string,
    email?: string,
    maxResults?: number,
    filters?: Record<string, any>,
    pageNumber?: number
  ) => {
    if (!message.trim()) return;

    // NEW: Intelligent context change detection
    const trimmedMessage = message.trim();

    // CRITICAL: Check if we should clear product context based on the message
    const contextChangeResult = detectContextChange(trimmedMessage, contextProduct);
    console.log('Context change analysis:', contextChangeResult);

    // Determine if this is a non-product intent (order/general)
    const isNonProductIntent = contextChangeResult.intent === 'ORDER_INQUIRY' || contextChangeResult.intent === 'GENERAL_CHAT';

    if (contextChangeResult.shouldClearContext) {
      console.log(`Clearing product context: ${contextChangeResult.reason}`);
      clearProductContext(contextChangeResult.reason);
      // Also clear quoted product if it's related to the old context
      if (quotedProduct && contextProduct && quotedProduct.shopify_id === contextProduct.shopify_id) {
        console.log('Also clearing quoted product as it relates to cleared context');
        clearQuotedProduct();
      }
    }

    // ENHANCED: Create user message with context information
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: trimmedMessage,
      sender: 'user',
      timestamp: new Date(),
      // CRITICAL: Include reply_to context for user messages when there's a selected product
      reply_to: (selectedProductId && contextProduct && !contextChangeResult.shouldClearContext) ? {
        message: trimmedMessage,
        timestamp: new Date(),
        product: contextProduct
      } : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      console.log('=== SENDING MESSAGE ===');
      console.log('Message:', message);
      console.log('Selected Product ID:', selectedProductId);
      console.log('Context cleared for this message:', contextChangeResult.shouldClearContext);
      console.log('Session ID:', sessionId);

      // CRITICAL: Send selected product ID unless context was cleared for this message
      const selectedProductIdForRequest = contextChangeResult.shouldClearContext ? undefined : selectedProductId;

      console.log('Sending selected_product_id to backend:', selectedProductIdForRequest);

      const response: ChatResponse = await sendChatMessage(
        message,
        email,
        sessionId,
        selectedProductIdForRequest, // This is the key fix!
        conversationHistory,
        maxResults,
        filters,
        pageNumber
      );

      console.log('Response received:', response);

      // FIXED: Store search results for pagination (only for non-pagination requests)
      if (!message.startsWith('LOAD_MORE_EXACT_MATCHES:') && !message.startsWith('LOAD_MORE_SUGGESTIONS:')) {
        setLastSearchQuery(message);
        // Store all results that could be paginated
        const allResults = [...(response.exact_matches || []), ...(response.suggestions || [])];
        setLastSearchResults(allResults);
        setCurrentPage(1); // Reset to page 1 for new search
        console.log('Stored search results for pagination:', allResults.length);
        // Also store in localStorage for persistence across page refreshes
        localStorage.setItem('lastSearchQuery', message);
        localStorage.setItem('currentPage', '1');
      } else {
        // For pagination requests, just update the current page
        console.log('Pagination request - keeping existing search context');
      }

      // Handle enhanced response with dual sliders
      const exactMatches: any[] = response.exact_matches || [];
      const suggestions: any[] = response.suggestions || [];
      const orders = response.orders || [];

      // ENHANCED: Create bot response message with proper reply context
      // Decide whether to include product context in the reply (avoid for non-product intents)
      const replyProduct = (contextChangeResult.intent === 'ORDER_INQUIRY' || contextChangeResult.intent === 'GENERAL_CHAT')
        ? undefined
        : (contextProduct || response.context_product);

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
        context_product: (contextChangeResult.intent === 'ORDER_INQUIRY' || contextChangeResult.intent === 'GENERAL_CHAT') ? undefined : response.context_product,
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
        // ENHANCED: Reply context - what this bot message is responding to
        reply_to: {
          message: userMessage.message,
          timestamp: userMessage.timestamp,
          product: replyProduct
        }
      };

      setMessages(prev => [...prev, botMessage]);

      // Clear quoted product after bot response is added
      if (quotedProduct) {
        console.log('Clearing quoted product after bot response');
        setQuotedProduct(null);
      }

      // CRITICAL: Update context product if provided in response and intent is product-related
      if (response.context_product && !(contextChangeResult.intent === 'ORDER_INQUIRY' || contextChangeResult.intent === 'GENERAL_CHAT')) {
        console.log('=== UPDATING CONTEXT FROM BACKEND ===');
        console.log('Backend context product:', response.context_product.title);
        setContextProduct(response.context_product);
        
        // Also update selected product ID if not already set
        if (!selectedProductId) {
          setSelectedProductId(response.context_product.shopify_id);
          console.log('Auto-setting selected product ID from backend context:', response.context_product.shopify_id);
        }
      }

      // Update conversation history
      const newHistory = [
        ...conversationHistory.slice(-8), // Keep last 8 messages
        { role: 'user', message: message, timestamp: new Date().toISOString() },
        { role: 'assistant', message: response.response, timestamp: new Date().toISOString() }
      ];
      setConversationHistory(newHistory);

      // Auto-select first product if no current selection and products available (only for product-related intents)
      if (!(contextChangeResult.intent === 'ORDER_INQUIRY' || contextChangeResult.intent === 'GENERAL_CHAT')) {
        if (!selectedProductId && exactMatches && exactMatches.length > 0) {
          const first = exactMatches[0];
          if (first && first.shopify_id) {
            console.log('Auto-selecting first product:', first.title);
            setSelectedProductId(first.shopify_id);
            setContextProduct(first);
          }
        }
      }

    } catch (err: any) {
      console.error('=== CHAT ERROR DETAILS ===');
      console.error('Error object:', err);
      console.error('Error message:', err?.message || 'Unknown error');
      console.error('Error stack:', err?.stack);

      const errorMessage = err?.message || 'Sorry, I encountered an error. Please try again.';
      console.error('Setting error state to:', errorMessage);
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
  }, [sessionId, selectedProductId, conversationHistory, sanitizeBotText, detectContextChange, contextProduct, quotedProduct, clearProductContext, clearQuotedProduct]);

  // FIXED: Improved requestMoreProducts function
  const requestMoreProducts = useCallback(async (type: 'exact' | 'suggestions') => {
    console.log('=== REQUESTING MORE PRODUCTS ===');
    console.log('Type:', type);
    console.log('Current page:', currentPage);
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
      // Increment page for next set of results
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      localStorage.setItem('currentPage', nextPage.toString());

      // FIXED: Send a specific pagination request instead of original query
      const paginationMessage = type === 'exact'
        ? 'LOAD_MORE_EXACT_MATCHES'
        : 'LOAD_MORE_SUGGESTIONS';

      // Send the pagination request with the original search context
      await sendMessage(
        `${paginationMessage}: ${lastSearchQuery}`,
        email || undefined,
        undefined, // Don't override max_results
        {}, // filters if needed
        nextPage // page number
      );

      console.log(`Successfully requested page ${nextPage} for ${type}`);
    } catch (error) {
      console.error('Error requesting more products:', error);
      setError('Failed to load more products. Please try again.');
      // Reset page on error
      setCurrentPage(currentPage);
    } finally {
      setIsLoading(false);
    }
  }, [sendMessage, lastSearchQuery, sessionId, currentPage]);

  // ENHANCED: Send suggested question with context preservation
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
  }, [sendMessage, selectedProductId, setSelectedProductId, setContextProduct]);

  // ENHANCED: Select product with context management
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
  }, [messages, setSelectedProductId, setContextProduct]);

  // ENHANCED: Quote product for reply with context setting
  const quoteProduct = useCallback((product: any) => {
    console.log('=== QUOTING PRODUCT ===');
    console.log('Product:', product.title);
    console.log('Setting as selected product and context');
    
    // When quoting, also set as selected and context
    setQuotedProduct(product);
    setSelectedProductId(product.shopify_id);
    setContextProduct(product);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationHistory([]);
    setSelectedProductId(undefined);
    setContextProduct(null);
    setQuotedProduct(null); // Clear quoted product too
    setError(null);
    setLastSearchQuery('');
    setLastSearchResults([]);
    setCurrentPage(1); // Reset pagination

    // Clear session storage
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('chat-session-id');
      window.localStorage.removeItem('chatMessages'); // Also clear saved messages
      window.localStorage.removeItem('lastSearchQuery');
      window.localStorage.removeItem('currentPage');
      window.localStorage.removeItem('selectedProductId');
      window.localStorage.removeItem('contextProduct');
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
  }, [messages.length]); // Re-check if history is empty

  // Save messages to local storage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
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
    sendQuickQuery,
    requestMoreProducts, // FIXED
    askAboutProduct,
    applyFilters,
    loadChatHistory,

    // ENHANCED: Product quoting functionality with context persistence
    quotedProduct,
    quoteProduct,
    clearQuotedProduct,

    // Debug info
    lastSearchQuery,
    lastSearchResults,
  };
};