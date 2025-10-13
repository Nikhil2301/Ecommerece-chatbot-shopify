// Fixed ProductCard Component - Reply Button Restored + Functional Buy & View Buttons
// File: frontend/src/components/ProductCard.tsx

import React from 'react';
import { Star, ShoppingCart, Eye, Tag, Zap, MessageSquare, ExternalLink } from 'lucide-react';

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
    handle?: string;
    images?: Array<{
      src: string;
      alt?: string;
    }>;
    inventory_quantity?: number;
    variants_count?: number;
  };
  isSelected?: boolean;
  onClick?: () => void;
  onReply?: (product: any) => void;
  showCompact?: boolean;
  variant?: 'default' | 'suggestion' | 'featured';
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSelected = false,
  onClick,
  onReply,
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

  // ENHANCED: Generate proper product URLs
  const generateProductUrl = (handle?: string, shopifyId?: string) => {
    if (handle) {
      return `/products/${handle}`;
    } else if (shopifyId) {
      return `/products/id/${shopifyId}`;
    }
    return '#';
  };

  const generateBuyUrl = (handle?: string, shopifyId?: string) => {
    if (handle) {
      return `/cart/add?id=${handle}&quantity=1`;
    } else if (shopifyId) {
      return `/cart/add?id=${shopifyId}&quantity=1`;
    }
    return '#';
  };

  // ENHANCED: Handle Buy button click
  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isOutOfStock) {
      alert('This product is currently out of stock');
      return;
    }

    const buyUrl = generateBuyUrl(product.handle, product.shopify_id);
    
    if (buyUrl === '#') {
      handleViewClick(e);
      return;
    }

    // Navigate to buy URL
    window.location.href = buyUrl;
  };

  // ENHANCED: Handle View button click
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const productUrl = generateProductUrl(product.handle, product.shopify_id);
    
    if (productUrl === '#') {
      const productInfo = `
Product: ${product.title}
Price: ${formatPrice(product.price)}
${product.vendor ? `Vendor: ${product.vendor}` : ''}
${product.description ? `Description: ${product.description.replace(/<[^>]*>/g, '').substring(0, 100)}...` : ''}
${product.inventory_quantity ? `In Stock: ${product.inventory_quantity}` : ''}
      `.trim();
      
      alert(productInfo);
      return;
    }

    // Open product page in new tab
    window.open(productUrl, '_blank');
  };

  // Variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'suggestion':
        return {
          cardClass: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-900',
          badgeClass: 'bg-amber-500 text-white',
          badgeIcon: <Zap className="w-3 h-3" />,
          badgeText: 'Suggested'
        };
      case 'featured':
        return {
          cardClass: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900',
          badgeClass: 'bg-blue-500 text-white',
          badgeIcon: <Star className="w-3 h-3" />,
          badgeText: 'Featured'
        };
      default:
        return {
          cardClass: 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800',
          badgeClass: '',
          badgeIcon: null,
          badgeText: ''
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div 
      className={`relative rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden ${styles.cardClass} ${isSelected ? 'ring-2 ring-blue-500' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Variant Badge */}
      {variant !== 'default' && (
        <div className={`absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${styles.badgeClass}`}>
          {styles.badgeIcon}
          {styles.badgeText}
        </div>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white px-2 py-1 text-xs font-bold rounded">
          -{discountPercent}%
        </div>
      )}

      {/* Out of Stock Overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center z-20">
          <span className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold">
            Out of Stock
          </span>
        </div>
      )}

      {/* Product Image */}
      <div className="aspect-w-1 aspect-h-1 w-full">
        {product.images && product.images.length > 0 ? (
          <img 
            src={product.images[0].src} 
            alt={product.images[0].alt || product.title}
            className="w-full h-48 object-cover"
            onLoad={() => {
              setTimeout(() => {
                const event = new CustomEvent('imageLoaded');
                window.dispatchEvent(event);
              }, 50);
            }}
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <Tag className="w-12 h-12 text-gray-400" />
          </div>
        )}
      </div>

      {/* RESTORED: Quick Action Buttons */}
      <div className="absolute top-12 right-2 z-10 flex flex-col gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
        {/* RESTORED: Reply Button - First Priority */}
        {onReply && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onReply(product);
            }}
            className="p-2 bg-green-500/90 hover:bg-green-600 text-white rounded-full shadow-sm transition-colors"
            title="Reply to this product"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        )}

        {/* View Button */}
        <button
          onClick={handleViewClick}
          className="p-2 bg-gray-500/90 hover:bg-gray-600 text-white rounded-full shadow-sm transition-colors"
          title="View product details"
        >
          <Eye className="w-4 h-4" />
        </button>

        {/* Buy Button */}
        {!isOutOfStock && (
          <button
            onClick={handleBuyClick}
            className="p-2 bg-blue-500/90 hover:bg-blue-600 text-white rounded-full shadow-sm transition-colors"
            title="Add to cart"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 group">
        {/* Vendor */}
        {product.vendor && (
          <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">
            {product.vendor}
          </p>
        )}

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
          {product.title}
        </h3>

        {/* Description - only show in non-compact mode */}
        {!showCompact && product.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
            {product.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
          </p>
        )}

        {/* Price */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 line-through">
              {formatPrice(product.compare_at_price!)}
            </span>
          )}
        </div>

        {/* Stock Status */}
        {product.inventory_quantity !== undefined && (
          <p className={`text-xs mb-2 ${isOutOfStock ? 'text-red-600' : 'text-green-600'}`}>
            {isOutOfStock ? 'Out of stock' : `${product.inventory_quantity} left`}
          </p>
        )}

        {/* ENHANCED: Action Buttons Row */}
        <div className="flex gap-2 mt-3">
          {/* RESTORED: Reply Button - Always Visible */}
          {onReply && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(product);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded transition-colors"
            >
              <MessageSquare className="w-3 h-3" />
              Reply
            </button>
          )}

          {/* View Button */}
          <button
            onClick={handleViewClick}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            View
          </button>

          {/* Buy Button */}
          <button
            onClick={handleBuyClick}
            disabled={isOutOfStock}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              isOutOfStock 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            <ShoppingCart className="w-3 h-3" />
            {isOutOfStock ? 'Sold Out' : 'Buy'}
          </button>
        </div>

        {/* Additional Info */}
        {!showCompact && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            {product.product_type && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {product.product_type}
              </span>
            )}
            {product.variants_count && product.variants_count > 1 && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {product.variants_count} variants
              </span>
            )}
          </div>
        )}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
};

export default ProductCard;