// File Path: /frontend/src/utils/api.ts

import { ChatResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export async function sendChatMessage(
  message: string,
  email?: string,
  sessionId?: string,
  selectedProductId?: string,
  conversationHistory?: any[],
  maxResults?: number,
  filters?: Record<string, any>,
  pageNumber?: number
): Promise<ChatResponse> {
  console.log('=== API: Sending Chat Message ===');
  console.log('Message:', message);
  console.log('Selected Product ID:', selectedProductId);
  console.log('Session ID:', sessionId);
  
  const payload = {
    message: message.trim(),
    user_id: null,
    email: email || null,
    session_id: sessionId || null,
    selected_product_id: selectedProductId || null, // CRITICAL: Always send this
    conversation_history: conversationHistory || [],
    max_results: maxResults,
    filters: filters || {},
    page_number: pageNumber || 1,
  };

  console.log('API Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('API Error Response:', errorData);
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('API Response:', data);
  
  return data;
}

// Enhanced query builders for common use cases
export const QueryBuilder = {
  // Build a product search query with filters
  productSearch: (query: string, options?: {
    maxResults?: number;
    priceMax?: number;
    brand?: string;
  }) => {
    let enhancedQuery = query;
    
    if (options?.maxResults) {
      enhancedQuery += ` (show ${options.maxResults})`;
    }
    if (options?.priceMax) {
      enhancedQuery += ` under $${options.priceMax}`;
    }
    if (options?.brand) {
      enhancedQuery += ` from ${options.brand}`;
    }
    
    return enhancedQuery;
  },

  // Build position-based queries
  positionQuery: (position: number, question: string) => {
    const ordinals = ['first', 'second', 'third', 'fourth', 'fifth'];
    const ordinal = position <= 5 ? ordinals[position - 1] : `${position}th`;
    return `${question} for the ${ordinal} product`;
  },

  // Build color/size questions for selected products
  productAttributeQuery: (attribute: 'color' | 'size' | 'price' | 'discount', selected: boolean = false) => {
    const queries = {
      color: selected ? 'give me which colors are available of the product i selected?' : 'what colors are available?',
      size: selected ? 'give me which sizes are available of the product i selected?' : 'what sizes are available?',
      price: selected ? 'what is the price of the selected product?' : 'what is the price?',
      discount: selected ? 'is there any discount on the selected product?' : 'is there any discount?'
    };
    
    return queries[attribute];
  }
};

export default {
  sendChatMessage,
  QueryBuilder,
};