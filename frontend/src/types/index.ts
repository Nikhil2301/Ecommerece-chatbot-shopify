// # File Path: /Users/nikhil/Sites/localhost/22-sep-11-12-Ai-Ecommerce-Chatbot/frontend/src/types/index.ts

export interface ChatMessage {
  id: string;
  message: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  
  // Legacy support
  products?: any[];
  orders?: any[];
  
  // Enhanced dual slider support
  exact_matches?: Product[];
  suggestions?: Product[];
  
  // UI control
  show_exact_slider?: boolean;
  show_suggestions_slider?: boolean;
  
  // Enhanced metadata
  total_exact_matches?: number;
  total_suggestions?: number;
  current_page?: number;
  has_more_exact?: boolean;
  has_more_suggestions?: boolean;
  applied_filters?: AppliedFilters;
  search_metadata?: SearchMetadata;
  
  // Interaction helpers
  suggested_questions?: string[];
  context_product?: Product;
}

export interface Product {
  id: string | number;
  shopify_id: string;
  title: string;
  description?: string;
  price: number | string;
  compare_at_price?: number | string;
  vendor?: string;
  product_type?: string;
  tags?: string;
  handle?: string;
  status?: string;
  inventory_quantity?: number;
  images?: ProductImage[];
  variants_count?: number;
  options_count?: number;
  variants?: ProductVariant[];
  options?: ProductOption[];
}

export interface ProductImage {
  id?: string | number;
  product_id?: string | number;
  src: string;
  alt?: string;
  alt_text?: string;
}

export interface ProductVariant {
  id?: string | number;
  product_id?: string | number;
  title: string;
  price: number | string;
  compare_at_price?: number | string;
  inventory_quantity?: number;
  sku?: string;
  option1?: string;
  option2?: string;
  option3?: string;
}

export interface ProductOption {
  id?: string | number;
  product_id?: string | number;
  name: string;
  position?: number;
  values?: ProductOptionValue[];
}

export interface ProductOptionValue {
  id?: string | number;
  option_id?: string | number;
  value: string;
  position?: number;
}

export interface Order {
  id: string | number;
  shopify_id: string;
  order_number: string;
  email?: string;
  customer_id?: string;
  financial_status?: string;
  fulfillment_status?: string;
  total_price: number | string;
  currency?: string;
  created_at?: string;
  line_items?: OrderLineItem[];
  total_items?: number;
}

export interface OrderLineItem {
  id: string | number;
  shopify_line_id?: string;
  name?: string;
  title: string;
  quantity: number;
  price: number | string;
  total_discount?: number | string;
  vendor?: string;
  sku?: string;
  product_id?: string | number;
}

export interface EnhancedChatResponse {
  response: string;
  intent: string;
  confidence: number;
  
  // Dual slider support
  exact_matches?: Product[];
  suggestions?: Product[];
  orders?: Order[];
  context_product?: Product;
  show_exact_slider?: boolean;
  show_suggestions_slider?: boolean;
  suggested_questions?: string[];
  
  // Enhanced metadata
  total_exact_matches?: number;
  total_suggestions?: number;
  current_page?: number;
  has_more_exact?: boolean;
  has_more_suggestions?: boolean;
  applied_filters?: AppliedFilters;
  search_metadata?: SearchMetadata;
}

// Legacy interface for backward compatibility
export interface ChatResponse extends EnhancedChatResponse {
  products?: Product[];
}

export interface AppliedFilters {
  price_max?: number;
  price_min?: number;
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
  [key: string]: any;
}

export interface SearchMetadata {
  original_query?: string;
  total_vector_results?: number;
  filters_applied?: boolean;
  user_max_results?: number;
  search_time_ms?: number;
  vector_similarity_threshold?: number;
  [key: string]: any;
}

export interface ProductFilter {
  maxResults?: number;
  priceMax?: number;
  priceMin?: number;
  brand?: string;
  category?: string;
  color?: string;
  size?: string;
  inStock?: boolean;
  onSale?: boolean;
}

export interface QuickSearchOptions {
  maxResults?: number;
  priceMax?: number;
  brand?: string;
  sessionId?: string;
  filters?: ProductFilter;
}

export interface ChatHookReturn {
  // Core functionality
  messages: ChatMessage[];
  sendMessage: (
    message: string, 
    email?: string, 
    maxResults?: number,
    filters?: Record<string, any>,
    pageNumber?: number
  ) => Promise<void>;
  sendSuggestedQuestion: (question: string) => Promise<void>;
  clearMessages: () => void;
  isLoading: boolean;
  error: string | null;
  selectedProductId?: string;
  selectProduct: (productId: string) => void;
  contextProduct: Product | null;
  getCurrentContext: () => {
    selectedProductId?: string;
    contextProduct: Product | null;
    conversationHistory: any[];
  };
  sessionId: string;
  
  // Enhanced functionality
  sendQuickQuery: (query: string, options?: QuickSearchOptions) => Promise<void>;
  requestMoreProducts: (type: 'exact' | 'suggestions', page?: number) => Promise<void>;
  askAboutProduct: (productNumber: number, question: string) => Promise<void>;
  applyFilters: (filters: ProductFilter & { query?: string }) => Promise<void>;
}

export interface UserPreferences {
  max_results?: number;
  price_filter?: {
    max?: number;
    min?: number;
  };
  brand_filter?: string;
  color_filter?: string;
  size_filter?: string;
  show_similar_to_id?: number;
}

export interface SessionContext {
  product_ids: string[];
  selected_product_id?: string;
  last_query: string;
  conversation_history: any[];
  last_shown_products: Product[];
  context_product?: Product;
  numbered_products: Record<number, Product>;
}

export interface PaginationInfo {
  current_page: number;
  total_pages?: number;
  has_more: boolean;
  total_items: number;
  items_per_page: number;
}

// Utility types
export type ProductVariant = 'default' | 'suggestion' | 'featured';
export type SliderType = 'exact' | 'suggestions';
export type IntentType = 'PRODUCT_SEARCH' | 'ORDER_INQUIRY' | 'GENERAL_CHAT' | 'HELP';
export type QuestionType = 'price' | 'discount' | 'size' | 'availability' | 'color' | 'material' | 'options' | 'general';

// Component prop types
export interface ProductCardProps {
  product: Product;
  isSelected?: boolean;
  onClick?: () => void;
  showCompact?: boolean;
  variant?: ProductVariant;
  className?: string;
}

export interface ChatMessageProps {
  message: ChatMessage;
  selectedProductId?: string;
  onFocusProduct?: (productId: string) => void;
  onSendSuggestedQuestion?: (question: string) => void;
  onRequestMore?: (type: SliderType) => void;
  onAskAboutProduct?: (productNumber: number, question: string) => void;
  className?: string;
}

export interface OrderCardProps {
  order: Order;
  className?: string;
  showDetails?: boolean;
}