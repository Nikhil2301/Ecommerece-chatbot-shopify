"use client";

import React from "react";
import { Product } from "@/types";

interface ProductTileProps {
  product: Product;
}

const ProductTile: React.FC<ProductTileProps> = ({ product }) => {
  const priceNum = typeof product.price === "string" ? parseFloat(product.price as any) : product.price;
  const compareNum = product.compare_at_price
    ? typeof product.compare_at_price === "string"
      ? parseFloat(product.compare_at_price as any)
      : (product.compare_at_price as number)
    : undefined;
  const onSale = !!(compareNum && priceNum && compareNum > priceNum);
  const soldOut = (product.inventory_quantity ?? 0) <= 0;

  return (
    <div className="bg-white rounded-xl overflow-hidden hover:shadow-md transition-shadow border border-gray-200">
      {/* Image */}
      <div className="relative w-full h-64 bg-gray-100">
        {soldOut && (
          <div className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-800 shadow-sm">Sold out</div>
        )}
        {onSale && !soldOut && (
          <div className="absolute top-3 right-3 text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-800 shadow-sm">Sale</div>
        )}
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0].src}
            alt={product.images[0].alt || product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="text-base font-medium text-gray-900 line-clamp-2 min-h-[3rem]">{product.title}</h3>
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-base font-semibold text-gray-900">Rs. {priceNum?.toFixed(2)}</span>
          {onSale && (
            <span className="text-sm text-gray-400 line-through">Rs. {compareNum?.toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductTile;
