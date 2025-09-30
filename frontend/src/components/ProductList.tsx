'use client';

import React from 'react';
import { Product } from '@/types';
import ProductTile from './ProductTile';

interface ProductListProps {
  products: Product[];
}

const ProductList: React.FC<ProductListProps> = ({ products }) => {
  if (products.length === 0) {
    return (
      <div className="py-16 text-center text-gray-500">
        No products available.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductTile key={product.id ?? product.shopify_id} product={product} />
      ))}
    </div>
  );
};

export default ProductList;
