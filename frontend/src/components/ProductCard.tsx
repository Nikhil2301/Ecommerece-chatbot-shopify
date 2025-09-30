// # File Path: /Users/nikhil/Sites/localhost/22-sep-11-12-Ai-Ecommerce-Chatbot/frontend/src/components/ProductCard.tsx

import React from 'react';
import { Star, ShoppingCart, Eye, Tag, Zap } from 'lucide-react';

interface ProductCardProps {
  product: {
    id: string | number;
    shopify_id?: string;
    title: string;
    description?: string;
    price: number | string;
    compare_at_price?: number | string;
    vendor?: string;
    product_type?: string;
    tags?: string;
    images?: Array<{
      src: string;
      alt?: string;
    }>;
    inventory_quantity?: number;
    variants_count?: number;
  };
  isSelected?: boolean;
  onClick?: () => void;
  showCompact?: boolean;
  variant?: 'default' | 'suggestion' | 'featured';
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSelected = false,
  onClick,
  showCompact = false,
  variant = 'default',
  className = ""
}) => {
  const formatPrice = (price: number | string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return isNaN(numPrice) ? 'N/A' : `$${numPrice.toFixed(2)}`;
  };

  const calculateDiscount = (price: number | string, comparePrice: number | string): number => {
    const currentPrice = typeof price === 'string' ? parseFloat(price) : price;
    const originalPrice = typeof comparePrice === 'string' ? parseFloat(comparePrice) : comparePrice;
    
    if (isNaN(currentPrice) || isNaN(originalPrice) || originalPrice <= currentPrice) {
      return 0;
    }
    
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  const hasDiscount = product.compare_at_price && 
    parseFloat(product.compare_at_price.toString()) > parseFloat(product.price.toString());
  
  const discountPercent = hasDiscount ? 
    calculateDiscount(product.price, product.compare_at_price!) : 0;

  const isOutOfStock = product.inventory_quantity === 0;
  
  // Variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'suggestion':
        return {
          cardClass: 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200',
          badgeClass: 'bg-amber-500 text-white',
          badgeIcon: <Zap className="w-3 h-3" />,
          badgeText: 'Suggested'
        };
      case 'featured':
        return {
          cardClass: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
          badgeClass: 'bg-blue-500 text-white',
          badgeIcon: <Star className="w-3 h-3" />,
          badgeText: 'Featured'
        };
      default:
        return {
          cardClass: 'bg-white border-gray-200',
          badgeClass: '',
          badgeIcon: null,
          badgeText: ''
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className={`relative rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${styles.cardClass} ${
        isSelected ? 'ring-2 ring-blue-400 shadow-lg' : ''
      } ${showCompact ? 'p-3' : 'p-4'} ${className}`}
      onClick={onClick}
    >
      {/* Variant Badge */}
      {variant !== 'default' && (
        <div className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${styles.badgeClass}`}>
          {styles.badgeIcon}
          <span>{styles.badgeText}</span>
        </div>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-2 left-2 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
          -{discountPercent}%
        </div>
      )}

      {/* Out of Stock Overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-gray-900 bg-opacity-50 rounded-xl flex items-center justify-center z-20">
          <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm font-medium">
            Out of Stock
          </span>
        </div>
      )}

      {/* Product Image */}
      <div className={`relative ${showCompact ? 'h-32' : 'h-40'} bg-gray-100 rounded-lg overflow-hidden mb-3`}>
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0].src}
            alt={product.images[0].alt || product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-gray-400">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        )}
        
        {/* Quick Action Buttons */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-1">
          <button className="p-1.5 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors">
            <Eye className="w-4 h-4 text-gray-600" />
          </button>
          {!isOutOfStock && (
            <button className="p-1.5 bg-blue-500 text-white rounded-full shadow-md hover:bg-blue-600 transition-colors">
              <ShoppingCart className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        {/* Vendor */}
        {product.vendor && (
          <div className="flex items-center text-xs text-gray-500">
            <Tag className="w-3 h-3 mr-1" />
            {product.vendor}
          </div>
        )}

        {/* Title */}
        <h3 className={`font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600 transition-colors ${
          showCompact ? 'text-sm' : 'text-base'
        }`}>
          {product.title}
        </h3>

        {/* Description - only show in non-compact mode */}
        {!showCompact && product.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {product.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`font-bold text-gray-900 ${showCompact ? 'text-sm' : 'text-lg'}`}>
              {formatPrice(product.price)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-500 line-through">
                {formatPrice(product.compare_at_price!)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="flex items-center">
            {product.inventory_quantity !== undefined && (
              <span className={`text-xs px-2 py-1 rounded-full ${
                product.inventory_quantity > 10 
                  ? 'bg-green-100 text-green-700' 
                  : product.inventory_quantity > 0 
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
              }`}>
                {product.inventory_quantity > 0 ? `${product.inventory_quantity} left` : 'Out of stock'}
              </span>
            )}
          </div>
        </div>

        {/* Additional Info */}
        {!showCompact && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            {product.product_type && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {product.product_type}
              </span>
            )}
            {product.variants_count && product.variants_count > 1 && (
              <span>
                {product.variants_count} variants
              </span>
            )}
          </div>
        )}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none rounded-xl">
          <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCard;