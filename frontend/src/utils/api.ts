// # File Path: /Users/nikhil/Sites/localhost/22-sep-11-12-Ai-Ecommerce-Chatbot/frontend/src/utils/api.ts

// # REPLACE YOUR EXISTING api.ts WITH THIS ENHANCED VERSION

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface EnhancedChatResponse {
  response: string;
  intent: string;
  confidence: number;
  // Dual slider support
  exact_matches?: any[];
  suggestions?: any[];
  orders?: any[];
  context_product?: any;
  show_exact_slider?: boolean;
  show_suggestions_slider?: boolean;
  suggested_questions?: string[];
  // Enhanced metadata
  total_exact_matches?: number;
  total_suggestions?: number;
  current_page?: number;
  has_more_exact?: boolean;
  has_more_suggestions?: boolean;
  applied_filters?: Record<string, any>;
  search_metadata?: Record<string, any>;
}

// Legacy interface for backward compatibility
export interface ChatResponse extends EnhancedChatResponse {
  products?: any[]; // Maps to exact_matches for backward compatibility
}

export const sendChatMessage = async (
  message: string,
  email?: string,
  sessionId?: string,
  selectedProductId?: string,
  conversationHistory?: any[],
  maxResults?: number,
  filters?: Record<string, any>,
  pageNumber?: number
): Promise<EnhancedChatResponse> => {
  try {
    const requestBody: any = {
      message,
      email,
      session_id: sessionId,
      selected_product_id: selectedProductId,
      conversation_history: conversationHistory || []
    };

    // Add enhanced parameters
    if (maxResults !== undefined) {
      requestBody.max_results = maxResults;
    }
    
    if (filters && Object.keys(filters).length > 0) {
      requestBody.filters = filters;
    }
    
    if (pageNumber && pageNumber > 1) {
      requestBody.page_number = pageNumber;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Ensure backward compatibility by mapping exact_matches to products if needed
    if (data.exact_matches && !data.products) {
      data.products = data.exact_matches;
    }
    
    return data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
};

export const getProducts = async (
  limit: number = 10,
  offset: number = 0,
  search?: string
) => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (search) {
      params.append('search', search);
    }

    const response = await fetch(`${API_BASE_URL}/products?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getOrders = async (
  limit: number = 10,
  offset: number = 0,
  email?: string,
  orderNumber?: string
) => {
  try {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    
    if (email) {
      params.append('email', email);
    }
    
    if (orderNumber) {
      params.append('order_number', orderNumber);
    }

    const response = await fetch(`${API_BASE_URL}/orders?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
};

// Enhanced API functions
export const clearChatContext = async (sessionId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat/clear-context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error clearing chat context:', error);
    throw error;
  }
};

export const getChatContext = async (sessionId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/context/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting chat context:', error);
    throw error;
  }
};

export const getMoreProducts = async (
  sessionId: string,
  page: number,
  type: 'exact' | 'suggestions' = 'exact'
) => {
  try {
    const params = new URLSearchParams({
      session_id: sessionId,
      page: page.toString(),
      type: type
    });

    const response = await fetch(`${API_BASE_URL}/chat/products/more?${params}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting more products:', error);
    throw error;
  }
};

export const syncData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error syncing data:', error);
    throw error;
  }
};

// Quick search helpers
export const quickProductSearch = async (
  query: string,
  options?: {
    maxResults?: number;
    priceMax?: number;
    brand?: string;
    sessionId?: string;
  }
): Promise<EnhancedChatResponse> => {
  let enhancedMessage = query;
  const filters: Record<string, any> = {};

  if (options?.maxResults) {
    enhancedMessage += ` (show ${options.maxResults})`;
  }
  
  if (options?.priceMax) {
    enhancedMessage += ` under $${options.priceMax}`;
    filters.price_filter = { max: options.priceMax };
  }
  
  if (options?.brand) {
    enhancedMessage += ` from ${options.brand}`;
    filters.brand_filter = options.brand;
  }

  return sendChatMessage(
    enhancedMessage,
    undefined, // email
    options?.sessionId,
    undefined, // selectedProductId
    [], // conversationHistory
    options?.maxResults,
    filters
  );
};

// Product filtering utilities
export const buildFilterQuery = (baseQuery: string, filters: {
  maxResults?: number;
  priceMax?: number;
  priceMin?: number;
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
}): string => {
  let query = baseQuery;
  
  if (filters.maxResults) {
    query += ` show ${filters.maxResults}`;
  }
  
  if (filters.priceMax) {
    query += ` under $${filters.priceMax}`;
  }
  
  if (filters.priceMin) {
    query += ` over $${filters.priceMin}`;
  }
  
  if (filters.brand) {
    query += ` from ${filters.brand}`;
  }
  
  if (filters.category) {
    query += ` in ${filters.category}`;
  }
  
  if (filters.color) {
    query += ` ${filters.color} color`;
  }
  
  if (filters.size) {
    query += ` size ${filters.size}`;
  }
  
  return query.trim();
};

// Export types for TypeScript support
export type ProductFilter = {
  maxResults?: number;
  priceMax?: number;
  priceMin?: number;
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
};

export type QuickSearchOptions = {
  maxResults?: number;
  priceMax?: number;
  brand?: string;
  sessionId?: string;
};