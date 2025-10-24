// ProductCard.tsx - Enhanced Design Version
import React, { useState } from 'react';
import { Product, ProductImage } from '@/types';
import { ShoppingCart, Eye, MessageSquare, Heart, Image as ImageIcon, Package, ArrowRight, Star, Zap } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface ProductCardProps {
  product: Product & {
    compare_at_price?: number | string;
    variants_count?: number;
    handle?: string;
    product_type?: string;
  };
  onAskQuestion?: (product: Product) => void;
  onViewImages?: (product: Product) => void;
  onReply?: (product: Product) => void;
  selectedProductId?: string | null;
  onFocusProduct?: (productId: string) => void;
  onClick?: () => void;
  showCompact?: boolean;
  variant?: 'default' | 'suggestion' | 'featured';
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAskQuestion,
  onViewImages,
  onReply,
  selectedProductId,
  onFocusProduct,
  onClick,
  showCompact = false,
  variant = 'default',
  className = ''
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const isSelected = selectedProductId === product.shopify_id;
  const isOutOfStock = product.inventory_quantity === 0;
  const isLowStock = product.inventory_quantity && product.inventory_quantity > 0 && product.inventory_quantity <= 5;

  const images = product.images || [];
  
  // Get variant styles - single implementation
  const getVariantStyles = (variantType: string) => {
    switch (variantType) {
      case 'suggestion':
        return {
          badgeClass: 'bg-amber-500 text-white',
          badgeText: 'Suggested',
          cardClass: 'border-2 border-amber-200 dark:border-amber-900',
          icon: <Zap className="w-3 h-3" />
        };
      case 'featured':
        return {
          badgeClass: 'bg-blue-500 text-white',
          badgeText: 'Featured',
          cardClass: 'border-2 border-blue-200 dark:border-blue-900',
          icon: <Star className="w-3 h-3" />
        };
      default:
        return {
          badgeClass: '',
          badgeText: '',
          cardClass: '',
          icon: null
        };
    }
  };
  
  const variantStyles = getVariantStyles(variant);
  const hasMultipleImages = images.length > 1;
  
  // Calculate discount if compare_at_price exists
  const calculateDiscount = (price: number | string, comparePrice: number | string): number => {
    const currentPrice = typeof price === 'string' ? parseFloat(price) : price;
    const originalPrice = typeof comparePrice === 'string' ? parseFloat(comparePrice) : comparePrice;
    
    if (isNaN(currentPrice) || isNaN(originalPrice) || originalPrice <= currentPrice) {
      return 0;
    }
    
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  };

  const compareAtPrice = product.compare_at_price;
  const currentPrice = product.price;
  
  const hasDiscount = compareAtPrice && 
    parseFloat(compareAtPrice.toString()) > parseFloat(currentPrice.toString());
  
  const discountPercent = (hasDiscount && compareAtPrice) ? 
    calculateDiscount(currentPrice, compareAtPrice) : 0;
    
  // Generate product URL
  const generateProductUrl = (handle?: string, shopifyId?: string) => {
    if (handle) {
      return `/products/${handle}`;
    } else if (shopifyId) {
      return `/products/id/${shopifyId}`;
    }
    return '#';
  };
  
  // Handle buy now click
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
Price: ${formatPrice(product.price, 'USD')}
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

    // Navigate to buy URL with error handling
    try {
      window.location.href = buyUrl;
    } catch (error) {
      console.error('Failed to navigate to buy URL:', error);
      handleViewClick(e);
    }
  };

  // Handle view click
  const handleViewClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const productUrl = generateProductUrl(product.handle, product.shopify_id);
    
    if (productUrl === '#') {
      // Show detailed product info if URL generation fails
      const productInfo = `
🛍️ ${product.title}

💰 Price: ${formatPrice(product.price, 'USD')}
${hasDiscount ? `💸 Original: ${formatPrice(product.compare_at_price || '', 'USD')} (Save ${discountPercent}%)` : ''}
${product.vendor ? `🏪 Brand: ${product.vendor}` : ''}
${product.product_type ? `📂 Category: ${product.product_type}` : ''}
${product.description ? `📝 Description: ${product.description.replace(/<[^>]*>/g, '').substring(0, 150)}...` : ''}
${product.inventory_quantity !== undefined ? `📦 Stock: ${product.inventory_quantity > 0 ? `${product.inventory_quantity} available` : 'Out of stock'}` : ''}
${product.variants_count && product.variants_count > 1 ? `🎨 ${product.variants_count} variants available` : ''}
      `.trim();
      
      alert(productInfo);
      return;
    }

    try {
      window.open(productUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Failed to open product URL:', error);
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
  
  // Generate buy URL
  const generateBuyUrl = (handle?: string, shopifyId?: string) => {
    if (handle) {
      return `/cart/add?variant=${handle}&quantity=1`;
    } else if (shopifyId) {
      return `/cart/add?id=${shopifyId}&quantity=1`;
    }
    return '#';
  };
  
  // Get stock status text
  const getStockStatus = () => {
    if (isOutOfStock) return 'Out of stock';
    if (isLowStock) return `Only ${product.inventory_quantity} left`;
    return 'In stock';
  };
  
  // Handle view details - single implementation
  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewImages) {
      onViewImages(product);
    } else if (onClick) {
      handleCardClick();
    }
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
    setImageError(false);
  };

  const handlePreviousImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else if (onFocusProduct && product.shopify_id) {
      onFocusProduct(product.shopify_id);
    }
  };

  // Handle ask about product
  const handleAskAbout = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAskQuestion) {
      onAskQuestion(product);
    } else if (onReply) {
      onReply(product);
    }
  };

  // Handle quick view - opens the image gallery
  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onViewImages) {
      onViewImages(product);
    }
  };

  // Handle buy now - redirects to checkout or shows product details
  const handleBuyNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) {
      alert('This product is currently out of stock');
      return;
    }
    // This would typically add to cart and redirect to checkout
    alert(`Added ${product.title} to cart`);
  };

  const getStockBadge = () => {
    if (isOutOfStock) {
      return (
        <div className="absolute top-3 right-3 z-10">
          <span className="px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-full shadow-lg backdrop-blur-sm">
            Out of Stock
          </span>
        </div>
      );
    }
    if (isLowStock) {
      return (
        <div className="absolute top-3 right-3 z-10">
          <span className="px-3 py-1.5 text-xs font-semibold text-white bg-orange-500 rounded-full shadow-lg backdrop-blur-sm flex items-center gap-1">
            <Package className="w-3 h-3" />
            Only {product.inventory_quantity} left
          </span>
        </div>
      );
    }
    return null;
  };

  // Get stock status text for display
  const stockStatus = (() => {
    if (isOutOfStock) return 'Out of stock';
    if (isLowStock) return `Only ${product.inventory_quantity} left`;
    return 'In stock';
  })();

  return (
    <div
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden
        transition-all duration-300 ease-out cursor-pointer
        ${isSelected
          ? 'ring-4 ring-blue-500 dark:ring-blue-400 shadow-2xl shadow-blue-100 dark:shadow-blue-900/30 scale-[1.03]'
          : 'hover:shadow-2xl hover:shadow-gray-200 dark:hover:shadow-gray-900/30 hover:scale-[1.01]'
        }
        ${isOutOfStock ? 'opacity-75' : ''}
        ${variant !== 'default' ? 'border-2' : ''}
        ${variant === 'suggestion' ? 'border-amber-200 dark:border-amber-900' : ''}
        ${variant === 'featured' ? 'border-blue-200 dark:border-blue-900' : ''}
        ${className}
      `}
    >
      {/* Image Container with Enhanced Gradient Overlay */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
        {/* Variant Badge */}
        {variant !== 'default' && (
          <div className={`absolute top-3 left-3 z-10 ${variantStyles.badgeClass} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
            {variant === 'suggestion' && <Zap className="w-3 h-3" />}
            {variant === 'featured' && <Star className="w-3 h-3" />}
            {variantStyles.badgeText}
          </div>
        )}

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-3 right-3 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
            -{discountPercent}%
          </div>
        )}

        {/* Stock Badge */}
        {getStockBadge()}

        {/* Like Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLiked(!isLiked);
          }}
          className="absolute top-3 left-3 z-10 p-2.5 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg
                     hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110"
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 ${
              isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600 dark:text-gray-400'
            }`}
          />
        </button>

        {/* Product Image */}
        {images.length > 0 && !imageError ? (
          <>
            <img
              src={typeof images[currentImageIndex] === 'string' 
                ? images[currentImageIndex] as string 
                : (images[currentImageIndex] as ProductImage)?.src}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              onError={handleImageError}
              loading="lazy"
            />

            {/* Gradient Overlay on Hover */}
            <div className={`
              absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent
              transition-opacity duration-300
              ${isHovered ? 'opacity-100' : 'opacity-0'}
            `} />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
            <ImageIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-2" />
            <span className="text-sm text-gray-500 dark:text-gray-400">No image available</span>
          </div>
        )}

        {/* Image Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePreviousImage}
              className={`
                absolute left-2 top-1/2 -translate-y-1/2 z-20
                p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg
                transition-all duration-200 hover:bg-white dark:hover:bg-gray-800 hover:scale-110
                ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
              `}
            >
              <svg className="w-5 h-5 text-gray-800 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={handleNextImage}
              className={`
                absolute right-2 top-1/2 -translate-y-1/2 z-20
                p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full shadow-lg
                transition-all duration-200 hover:bg-white dark:hover:bg-gray-800 hover:scale-110
                ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}
              `}
            >
              <svg className="w-5 h-5 text-gray-800 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Image Dots Indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                    setImageError(false);
                  }}
                  className={`
                    transition-all duration-200
                    ${index === currentImageIndex
                      ? 'w-6 h-1.5 bg-white rounded-full'
                      : 'w-1.5 h-1.5 bg-white/60 rounded-full hover:bg-white/80'
                    }
                  `}
                />
              ))}
            </div>
          </>
        )}

        {/* Quick View Overlay - Shows on Hover */}
        {onViewImages && images.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewImages(product);
            }}
            className={`
              absolute inset-x-0 bottom-0 z-10 px-4 py-3
              bg-white/95 dark:bg-gray-800/95 backdrop-blur-md
              text-sm font-medium text-gray-900 dark:text-gray-100
              transition-all duration-300 flex items-center justify-center gap-2
              hover:bg-white dark:hover:bg-gray-800
              ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
            `}
          >
            <Eye className="w-4 h-4" />
            View All {images.length} Images
          </button>
        )}
      </div>

      {/* Product Details Section */}
      <div className="p-5 space-y-3">
        {/* Vendor Badge */}
        {product.vendor && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {product.vendor}
            </span>
            {product.product_type && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                {product.product_type}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {product.title}
        </h3>

        {/* Description */}
        {product.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
            {product.description.replace(/<[^>]*>/g, '').substring(0, 120)}
            {product.description.length > 120 ? '...' : ''}
          </p>
        )}

        {/* Price and Inventory Section - Compact View */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {formatPrice(product.price, 'USD')}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-sm text-gray-500 dark:text-gray-400 line-through">
                    {formatPrice(compareAtPrice, 'USD')}
                  </span>
                  <span className="text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-1.5 py-0.5 rounded">
                    {discountPercent}% OFF
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${
                isOutOfStock
                  ? 'text-red-600 dark:text-red-400'
                  : isLowStock
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-green-600 dark:text-green-400'
              }`}>
                {stockStatus}
              </span>
              {product.variants_count && product.variants_count > 1 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  • {product.variants_count} variants
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons - Compact Layout */}
          <div className="mt-3 flex items-center justify-between gap-2 px-1">
            {/* Reply/Ask Button */}
            {(onAskQuestion || onReply) && (
              <button
                onClick={handleAskAbout}
                className="flex flex-col items-center justify-center text-center w-16"
              >
                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300">{onReply ? 'Reply' : 'Ask'}</span>
              </button>
            )}

            {/* View Details Button */}
            <button
              onClick={handleViewDetails}
              className="flex flex-col items-center justify-center text-center w-16"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-1 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                <Eye className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300">View</span>
            </button>

            {/* Buy Now Button - Only show if in stock */}
            {!isOutOfStock && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleBuyClick(e);
                }}
                className="flex flex-col items-center justify-center text-center w-16"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-1 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors">
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-300" />
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-300 font-medium">Buy Now</span>
              </button>
            )}
          </div>

          {/* Main Buy Now Button - Full width, below icons */}
          {!isOutOfStock && (
            <div className="mt-4 flex w-full">
              <button
                onClick={handleBuyClick}
                className="w-full px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700
                           dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800
                           text-white text-sm font-medium rounded-md transition-all duration-200
                           hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900/30
                           flex items-center justify-center gap-2 group"
              >
                <ShoppingCart className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Buy Now
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
          <span className="z-10 px-4 py-1.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-lg border border-white dark:border-gray-800">Selected</span>
        </div>
      )}
    </div>
  );
};

export default ProductCard;