// OrderCard.tsx
import React from 'react';
import { Order } from '@/types';
import { Package, CreditCard, Truck } from 'lucide-react';

interface OrderCardProps {
  order: Order;
}

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
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
          ${order.total_price} {order.currency}
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
          <p className="text-xs font-medium text-gray-600 mb-1">Items:</p>
          <div className="space-y-1">
            {order.line_items.slice(0, 2).map((item, index) => (
              <div key={index} className="text-xs text-gray-600">
                {item.quantity}x {item.title}
              </div>
            ))}
            {order.line_items.length > 2 && (
              <div className="text-xs text-gray-500">
                +{order.line_items.length - 2} more items
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderCard;
