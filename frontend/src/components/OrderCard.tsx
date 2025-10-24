// OrderCard.tsx - Enhanced Design Version
import React, { useState } from 'react';
import { Order } from '@/types';
import { 
  Package, 
  CreditCard, 
  Truck, 
  ChevronDown, 
  ChevronUp, 
  Image as ImageIcon, 
  Calendar, 
  MapPin, 
  Clock, 
  FileText, 
  Box, 
  Tag, 
  Info,
  Mail,
  Phone,
  Home,
  Navigation,
  CreditCard as CreditCardIcon,
  ShoppingBag,
  ShoppingCart,
  Percent,
  Truck as TruckIcon,
  FileCheck,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { formatPrice } from '@/utils/currency';

interface OrderCardProps {
  order: Order;
}

// Helper component for displaying addresses
const AddressDisplay: React.FC<{ address: any }> = ({ address }) => {
  if (!address) return null;
  
  return (
    <div className="text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
      <div className="font-medium text-gray-900 dark:text-gray-100">
        {address.first_name} {address.last_name}
      </div>
      {address.company && <div>{address.company}</div>}
      <div>{address.address1}</div>
      {address.address2 && <div>{address.address2}</div>}
      <div>
        {address.city}, {address.province_code} {address.zip}
      </div>
      <div>{address.country}</div>
      {address.phone && (
        <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <Phone className="w-3.5 h-3.5" />
            {address.phone}
          </div>
        </div>
      )}
    </div>
  );
};

const OrderCard: React.FC<OrderCardProps> = ({ order }) => {
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const MAX_ITEMS_TO_SHOW = 2;
  
  // Calculate order totals
  const subtotal = order.subtotal_price || (order.line_items?.reduce((sum: number, item: any) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : Number(item.price) || 0;
    return sum + (price * (Number(item.quantity) || 1));
  }, 0) || 0);
  
  const shippingPrice = order.shipping_lines?.reduce((sum: number, line: any) => {
    const price = typeof line.price === 'string' ? parseFloat(line.price) : Number(line.price) || 0;
    return sum + price;
  }, 0) || 0;
  
  const taxPrice = order.total_tax ? (typeof order.total_tax === 'string' ? parseFloat(order.total_tax) : Number(order.total_tax)) : 0;
  
  const discountAmount = order.discount_codes?.reduce((sum: number, code: any) => {
    const amount = typeof code.amount === 'string' ? parseFloat(code.amount) : Number(code.amount) || 0;
    return sum + amount;
  }, 0) || 0;

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
      case 'fulfilled':
        return 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/30 border-green-200 dark:border-green-800';
      case 'pending':
      case 'unfulfilled':
        return 'text-yellow-700 bg-yellow-50 dark:text-yellow-300 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800';
      case 'refunded':
      case 'cancelled':
        return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/30 border-red-200 dark:border-red-800';
      default:
        return 'text-gray-700 bg-gray-50 dark:text-gray-300 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'fulfilled':
        return <Truck className="w-4 h-4" />;
      case 'paid':
        return <CreditCard className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header Section with Gradient */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 px-6 py-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Order #{order.order_number}
              </h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="w-4 h-4" />
              {order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              }) : 'N/A'}
            </div>
          </div>
          
          <div className="text-right space-y-2">
            <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              {formatPrice(order.total_price, order.currency)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {order.line_items?.length || 0} item(s)
            </div>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-3">
          {/* Payment Status */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" />
              Payment
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(order.financial_status || 'pending')}`}>
              {getStatusIcon(order.financial_status || 'pending')}
              {order.financial_status || 'Pending'}
            </div>
          </div>

          {/* Shipping Status */}
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5" />
              Shipping
            </div>
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold border ${getStatusColor(order.fulfillment_status || 'unfulfilled')}`}>
              {getStatusIcon(order.fulfillment_status || 'unfulfilled')}
              {order.fulfillment_status || 'Unfulfilled'}
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      {order.line_items && order.line_items.length > 0 && (
        <div className="px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-gray-500" />
              Items ({order.line_items.length})
            </h4>
            
            {order.line_items.length > MAX_ITEMS_TO_SHOW && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 
                         font-medium flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30 
                         transition-colors"
              >
                {expanded ? (
                  <>
                    Show Less
                    <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show All
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {order.line_items.slice(0, expanded ? order.line_items.length : MAX_ITEMS_TO_SHOW).map((item, index) => {
              const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price || 0;
              const productImage = item.image_url || (item.images && item.images[0]?.src);

              return (
                <div
                  key={index}
                  className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-900/30 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-900/50 transition-colors border border-gray-200 dark:border-gray-700"
                >
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-white dark:bg-gray-800 shadow-sm">
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
                            fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800';
                            fallback.innerHTML = '<svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {item.title}
                    </h5>
                    
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {item.sku && (
                        <span className="px-2 py-1 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-md border border-gray-200 dark:border-gray-700">
                          SKU: {item.sku}
                        </span>
                      )}
                      {item.vendor && (
                        <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md border border-blue-200 dark:border-blue-800">
                          {item.vendor}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Qty: <span className="font-semibold text-gray-900 dark:text-gray-100">{item.quantity}</span>
                        {' × '}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {formatPrice(price, order.currency)}
                        </span>
                      </div>
                      <div className="text-base font-bold text-gray-900 dark:text-gray-100">
                        {formatPrice(price * (item.quantity || 1), order.currency)}
                      </div>
                    </div>
                    
                    {/* Item specific discounts */}
                    {item.discount_allocations && item.discount_allocations.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                        <Tag className="w-3 h-3" />
                        {item.discount_allocations.map((discount: any, idx: number) => {
                          const amount = typeof discount.amount === 'string' 
                            ? parseFloat(discount.amount) 
                            : Number(discount.amount) || 0;
                          return (
                            <span key={idx}>
                              {amount > 0 && `-${formatPrice(amount, order.currency || 'USD')}`}
                              {discount.discount_application_title && ` (${discount.discount_application_title})`}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Order Summary */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-5">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              Order Summary
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {formatPrice(subtotal, order.currency)}
                </span>
              </div>
              
              {shippingPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatPrice(shippingPrice, order.currency)}
                  </span>
                </div>
              )}
              
              {taxPrice > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {formatPrice(taxPrice, order.currency)}
                  </span>
                </div>
              )}
              
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Discounts</span>
                  <span className="font-medium">
                    -{formatPrice(discountAmount, order.currency)}
                  </span>
                </div>
              )}
              
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between font-bold">
                <span>Total</span>
                <span className="text-lg">
                  {formatPrice(order.total_price, order.currency)}
                </span>
              </div>
              
              {order.discount_codes && order.discount_codes.length > 0 && (
                <div className="mt-2 text-sm text-green-600 dark:text-green-400">
                  <div className="font-medium mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Discount Applied
                  </div>
                  {order.discount_codes.map((code: any, idx: number) => {
                    const amount = typeof code.amount === 'string' 
                      ? parseFloat(code.amount) 
                      : Number(code.amount) || 0;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded">
                          {code.code}
                        </span>
                        <span className="text-xs">
                          {amount > 0 ? `-${formatPrice(amount, order.currency || 'USD')}` : code.type}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          
          {/* Addresses */}
          {(order.shipping_address || order.billing_address) && (
            <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-500" />
                Address Information
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.shipping_address && (
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <TruckIcon className="w-4 h-4" />
                      Shipping Address
                      {order.fulfillment_status === 'fulfilled' && (
                        <span className="ml-auto text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" /> Shipped
                        </span>
                      )}
                    </div>
                    <AddressDisplay address={order.shipping_address} />
                    
                    {/* Tracking Information */}
                    {order.fulfillments?.map((fulfillment, idx) => (
                      <div key={idx} className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          <Truck className="w-3.5 h-3.5 inline-block mr-1" />
                          Tracking #{fulfillment.tracking_number || 'Not available'}
                        </div>
                        {fulfillment.tracking_company && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            {fulfillment.tracking_company}
                          </div>
                        )}
                        {fulfillment.tracking_url && (
                          <a 
                            href={fulfillment.tracking_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Navigation className="w-3 h-3" />
                            Track Package
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {order.billing_address && (
                  <div className="bg-gray-50 dark:bg-gray-900/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <CreditCardIcon className="w-4 h-4" />
                      Billing Address
                      {order.financial_status === 'paid' ? (
                        <span className="ml-auto text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1" /> Paid
                        </span>
                      ) : (
                        <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" /> {order.financial_status || 'Pending'}
                        </span>
                      )}
                    </div>
                    <AddressDisplay address={order.billing_address} />
                    
                    {order.payment_details && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          <CreditCardIcon className="w-3.5 h-3.5 inline-block mr-1" />
                          {order.payment_details.credit_card_company || 'Payment Method'}
                        </div>
                        {order.payment_details.credit_card_number && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            •••• •••• •••• {order.payment_details.credit_card_number.slice(-4)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer with Total */}
      <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-900/30 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
            Order Total
          </span>
          <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            {formatPrice(order.total_price, order.currency)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;
