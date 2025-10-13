// # Enhanced ProductCard.tsx - Fixed Buy & View Button Functionality
// # File: frontend/src/components/ProductCard.tsx

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

  // ENHANCED: Generate proper product URLs for Issue #5
  const generateProductUrl = (handle?: string, shopifyId?: string) => {
    if (handle) {
      return `/products/${handle}`;
    } else if (shopifyId) {
      return `/products/id/${shopifyId}`;
    }
    return '#';
  };

  const generateBuyUrl = (handle?: string, shopifyId?: string) => {
    // ENHANCED: Better buy URL generation
    if (handle) {
      return `/cart/add?variant=${handle}&quantity=1`;
    } else if (shopifyId) {
      return `/cart/add?id=${shopifyId}&quantity=1`;
    }
    return '#';
  };

  // ENHANCED: Handle Buy button click with better functionality for Issue #5
  const handleBuyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isOutOfStock) {
      alert('This product is currently out of stock');
      return;
    }

    const buyUrl = generateBuyUrl(product.handle, product.shopify_id);
    
    if (buyUrl === '#') {
      // Fallback: show product info and suggest visiting the store
      const productInfo = `
Product: ${product.title}
Price: ${formatPrice(product.price)}
${product.vendor ? `Vendor: ${product.vendor}` : ''}

To purchase this item, please visit our store or contact customer service.
${product.handle ? `Product Handle: ${product.handle}` : ''}
${product.shopify_id ? `Product ID: ${product.shopify_id}` : ''}
      `.trim();
      
      if (confirm(`${productInfo}\n\nWould you like to view the product page instead?`)) {
        handleViewClick(e);
      }
      return;
    }

    // ENHANCED: Navigate to buy URL with better error handling
    try {
      window.location.href = buyUrl;
    } catch (error) {
      console.error('Failed to navigate to buy URL:', error);
      // Fallback to view product
      handleViewClick(e);
    }
  };

  // ENHANCED: Handle View button click with improved functionality for Issue #5
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const productUrl = generateProductUrl(product.handle, product.shopify_id);
    
    if (productUrl === '#') {
      // Enhanced fallback with more detailed product information
      const productInfo = `
🛍️ ${product.title}

💰 Price: ${formatPrice(product.price)}
${hasDiscount ? `💸 Original: ${formatPrice(product.compare_at_price!)} (Save ${discountPercent}%)` : ''}
${product.vendor ? `🏪 Brand: ${product.vendor}` : ''}
${product.product_type ? `📂 Category: ${product.product_type}` : ''}
${product.description ? `📝 Description: ${product.description.replace(/<[^>]*>/g, '').substring(0, 150)}...` : ''}
${product.inventory_quantity !== undefined ? `📦 Stock: ${product.inventory_quantity > 0 ? `${product.inventory_quantity} available` : 'Out of stock'}` : ''}
${product.variants_count && product.variants_count > 1 ? `🎨 ${product.variants_count} variants available` : ''}

Product Information:
${product.handle ? `Handle: ${product.handle}` : ''}
${product.shopify_id ? `ID: ${product.shopify_id}` : ''}
      `.trim();
      
      alert(productInfo);
      return;
    }

    // ENHANCED: Open product page with better error handling
    try {
      window.open(productUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open product URL:', error);
      // Fallback: copy URL to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.origin + productUrl).then(() => {
          alert('Product URL copied to clipboard!');
        }).catch(() => {
          alert(`Product URL: ${window.location.origin + productUrl}`);
        });
      } else {
        alert(`Product URL: ${window.location.origin + productUrl}`);
      }
    }
  };

  // Variant-specific styling
  const getVariantStyles = () => {
    switch (variant) {
      case 'suggestion':
        return {
          cardClass: 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-900',
          badgeClass: 'bg-amber-500 text-white',
          badgeIcon: <Zap size={12} />,
          badgeText: 'Suggested'
        };
      case 'featured':
        return {
          cardClass: 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-900',
          badgeClass: 'bg-blue-500 text-white',
          badgeIcon: <Star size={12} />,
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
      className={`
        ${styles.cardClass}
        relative border rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:border-gray-300 dark:hover:border-gray-600'}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Variant Badge */}
      {variant !== 'default' && (
        <div className={`absolute top-2 left-2 z-10 ${styles.badgeClass} px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
          {styles.badgeIcon}
          {styles.badgeText}
        </div>
      )}

      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-2 right-2 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
          -{discountPercent}%
        </div>
      )}

      {/* Out of Stock Overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-gray-900/50 rounded-lg flex items-center justify-center z-20">
          <span className="bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold">
            Out of Stock
          </span>
        </div>
      )}

      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0].src}
            alt={product.images[0].alt || product.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onLoad={() => {
              // Trigger any image loaded events
              setTimeout(() => {
                const event = new CustomEvent('imageLoaded');
                window.dispatchEvent(event);
              }, 50);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
            <ShoppingCart size={48} />
          </div>
        )}

        {/* ENHANCED: Quick Action Buttons - Positioned for better UX */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* PRIORITY: Reply Button - Always visible for Issue #5 */}
          {onReply && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(product);
              }}
              className="p-2 bg-green-500/90 hover:bg-green-600 text-white rounded-full shadow-sm transition-colors"
              title="Reply to this product"
            >
              <MessageSquare size={16} />
            </button>
          )}

          {/* View Button */}
          <button
            onClick={handleViewClick}
            className="p-2 bg-blue-500/90 hover:bg-blue-600 text-white rounded-full shadow-sm transition-colors"
            title="View product details"
          >
            <Eye size={16} />
          </button>

          {/* Buy Button - ENHANCED functionality */}
          {!isOutOfStock && (
            <button
              onClick={handleBuyClick}
              className="p-2 bg-purple-500/90 hover:bg-purple-600 text-white rounded-full shadow-sm transition-colors"
              title="Add to cart"
            >
              <ShoppingCart size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-2">
        {/* Vendor */}
        {product.vendor && (
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
            {product.vendor}
          </p>
        )}

        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-5">
          {product.title}
        </h3>

        {/* Description - only show in non-compact mode */}
        {!showCompact && product.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {product.description.replace(/<[^>]*>/g, '').substring(0, 100)}...
          </p>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {formatPrice(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
              {formatPrice(product.compare_at_price!)}
            </span>
          )}
        </div>

        {/* Stock Status */}
        {product.inventory_quantity !== undefined && (
          <p className={`text-xs ${isOutOfStock ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
            {isOutOfStock ? 'Out of stock' : `${product.inventory_quantity} left`}
          </p>
        )}

        {/* ENHANCED: Action Buttons Row - Always visible for accessibility */}
        <div className="flex gap-2 pt-2">
          {/* PRIORITY: Reply Button - Always Visible for Issue #5 */}
          {onReply && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReply(product);
              }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded transition-colors"
            >
              <MessageSquare size={14} />
              Reply
            </button>
          )}

          {/* View Button - ENHANCED for Issue #5 */}
          <button
            onClick={handleViewClick}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition-colors"
          >
            <Eye size={14} />
            View
          </button>

          {/* Buy Button - ENHANCED for Issue #5 */}
          <button
            onClick={handleBuyClick}
            disabled={isOutOfStock}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
              isOutOfStock
                ? 'text-gray-400 dark:text-gray-600 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                : 'text-white bg-purple-500 hover:bg-purple-600'
            }`}
          >
            <ShoppingCart size={14} />
            {isOutOfStock ? 'Sold Out' : 'Buy'}
          </button>
        </div>

        {/* Additional Info */}
        {!showCompact && (
          <div className="pt-2 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
            {product.product_type && (
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {product.product_type}
              </span>
            )}
            {product.variants_count && product.variants_count > 1 && (
              <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {product.variants_count} variants
              </span>
            )}
          </div>
        )}
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none border-2 border-blue-500 rounded-lg" />
      )}
    </div>
  );
};

export default ProductCard;