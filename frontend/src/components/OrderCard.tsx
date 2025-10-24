// OrderCard.tsx
import React, { useState } from 'react';
import { Order } from '@/types';
import { Package, CreditCard, Truck, ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface OrderCardProps {
  order: Order;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const [expanded, setExpanded] = useState(false);
  const MAX_ITEMS_TO_SHOW = 2; // Show only 2 items by default when collapsed
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'fulfilled':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'unfulfilled':
        return 'text-yellow-600 bg-yellow-100';
      case 'refunded':
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900">
          Order #{order.order_number}
        </h4>
        <span className="text-lg font-bold text-gray-900">
          {formatPrice(order.total_price, order.currency)}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600">Payment:</span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.financial_status || 'pending')}`}>
            {order.financial_status || 'Pending'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Truck className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600">Shipping:</span>
          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.fulfillment_status || 'unfulfilled')}`}>
            {order.fulfillment_status || 'Unfulfilled'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Package className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-600">
            {order.line_items?.length || 0} item(s)
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          Ordered: {order.created_at ? new Date(order.created_at).toLocaleDateString() : 'N/A'}
        </div>
      </div>

      {order.line_items && order.line_items.length > 0 && (
        <div className="mt-2 pt-2 border-t">
          <div className="flex justify-between items-center mb-1">
            <p className="text-xs font-medium text-gray-600">Items Ordered ({order.line_items.length}):</p>
            {order.line_items.length > MAX_ITEMS_TO_SHOW && (
              <button 
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
              >
                {expanded ? (
                  <>
                    <span>Show Less</span>
                    <ChevronUp className="w-3 h-3 ml-1" />
                  </>
                ) : (
                  <>
                    <span>Show All</span>
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </>
                )}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {order.line_items.slice(0, expanded ? order.line_items.length : MAX_ITEMS_TO_SHOW).map((item, index) => {
              const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0;
              const totalPrice = (price * item.quantity).toFixed(2);
              const productImage = item.image_url || (item.images && item.images[0]?.src);
              
              return (
                <div key={index} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {productImage ? (
                      <img 
                        src={productImage} 
                        alt={item.title} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-full h-full flex items-center justify-center bg-gray-100';
                            fallback.innerHTML = '<ImageIcon className="w-5 h-5 text-gray-400" />';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.title}</div>
                    <div className="text-xs text-gray-500">
                      Qty: {item.quantity} × {formatPrice(price, order.currency)} = <span className="font-medium">{formatPrice(price * item.quantity, order.currency)}</span>
                    </div>
                    {item.sku && (
                      <div className="text-xs text-gray-400 truncate">SKU: {item.sku}</div>
                    )}
                    {item.vendor && (
                      <div className="text-xs text-gray-400 truncate">Vendor: {item.vendor}</div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {!expanded && order.line_items.length > MAX_ITEMS_TO_SHOW && (
              <div className="text-center py-1">
                <span className="text-xs text-gray-500">
                  +{order.line_items.length - MAX_ITEMS_TO_SHOW} more items
                </span>
              </div>
            )}
            
            <div className="text-right text-sm font-medium mt-3 pt-2 border-t">
              <div className="text-base font-semibold">
                Order Total: {formatPrice(order.total_price, order.currency)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
