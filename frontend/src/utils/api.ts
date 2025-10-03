// File Path: /frontend/src/utils/api.ts

import { ChatResponse } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api/v1';

export async function identifyUser(email: string, metadata?: Record<string, any>) {
  const res = await fetch(`${API_BASE_URL}/auth/identify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, metadata }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ user_id: number; email: string; session_id: string }>;
}

export async function sendChatMessage(
  message: string,
  _email?: string,
  _sessionId?: string,
  selectedProductId?: string,
  conversationHistory?: any[],
  maxResults?: number,
  filters?: Record<string, any>,
  pageNumber?: number
) {
  const email = _email ?? localStorage.getItem('chatEmail') ?? '';
  const sessionId = _sessionId ?? localStorage.getItem('chatSessionId') ?? '';
  const emailLS = (typeof window !== 'undefined' && window.localStorage.getItem('chatEmail')) || null;
  const sessionLS = (typeof window !== 'undefined' && window.localStorage.getItem('chatSessionId')) || null;

  const res = await fetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message.trim(),
      user_id: null,
      email: email || emailLS,
      session_id: sessionId || sessionLS || 'default',
      selected_product_id: selectedProductId || null,
      conversation_history: conversationHistory || [],
      max_results: maxResults,
      filters: filters || {},
      page_number: pageNumber || 1,
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<ChatResponse>;
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