import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Package, MapPin, Phone, User, Calendar, 
  DollarSign, ChevronDown, ChevronUp, Search,
  TrendingUp, ShoppingBag, Map, Filter
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { resolveImageUrl } from '@/utils/imageUrl';
import './SellerProductTracking.css';

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: 'Confirmed' },
  preparing: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', label: 'Preparing' },
  ready: { color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200', label: 'Ready' },
  delivered: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Cancelled' }
};

const paymentStatusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200', label: 'Pending' },
  completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: 'Paid' },
  failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: 'Failed' },
  refunded: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200', label: 'Refunded' }
};

function SellerProductTracking() {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedProducts, setExpandedProducts] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');

  const { data: trackingData, isLoading, error } = useQuery({
    queryKey: ['sellerProductTracking', user?.id],
    queryFn: async () => {
      const response = await api.get('/orders/seller/product-tracking');
      return response.data;
    },
    enabled: !!user?.id,
    retry: 1,
    staleTime: 30000
  });

  const toggleProduct = (productId) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString('en-IN')}`;
  };

  // Filter products based on search term and status
  const filteredData = trackingData?.filter(item => {
    // Safety check for product data
    if (!item.product) return false;
    
    const productName = item.product.name || '';
    const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.orders.some(order => 
        (order.buyer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.deliveryAddress?.city || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || 
      item.orders.some(order => order.status === statusFilter);
    
    return matchesSearch && matchesStatus;
  });

  // Calculate summary statistics with safety checks
  const totalProducts = trackingData?.length || 0;
  const totalOrders = trackingData?.reduce((sum, item) => sum + (item.orders?.length || 0), 0) || 0;
  const totalRevenue = trackingData?.reduce((sum, item) => sum + (item.totalRevenue || 0), 0) || 0;
  const totalUnitsSold = trackingData?.reduce((sum, item) => sum + (item.totalSold || 0), 0) || 0;

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="text-center py-12 border rounded-lg bg-card">
            <Package size={48} className="mx-auto mb-4 text-red-500" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Tracking Data</h3>
            <p className="text-muted-foreground">
              {error.response?.data?.message || 'Failed to load product tracking data'}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="seller-tracking container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Product Tracking</h1>
          <p className="text-muted-foreground">
            Track your products, view buyer details, and monitor delivery locations
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="stat-card p-6 border rounded-lg bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-primary">
              <Package size={20} />
              <span className="text-sm font-medium">Products Sold</span>
            </div>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </div>
          <div className="stat-card p-6 border rounded-lg bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-blue-500">
              <ShoppingBag size={20} />
              <span className="text-sm font-medium">Total Orders</span>
            </div>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </div>
          <div className="stat-card p-6 border rounded-lg bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-green-500">
              <TrendingUp size={20} />
              <span className="text-sm font-medium">Units Sold</span>
            </div>
            <div className="text-2xl font-bold">{totalUnitsSold}</div>
          </div>
          <div className="stat-card p-6 border rounded-lg bg-card shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-orange-500">
              <DollarSign size={20} />
              <span className="text-sm font-medium">Total Revenue</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters flex flex-col md:flex-row gap-4 mb-6">
          <div className="search-box flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              type="text"
              placeholder="Search by product name, buyer, or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="status-filter flex items-center gap-2">
            <Filter size={18} className="text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded-md px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Product Tracking List */}
        <div className="space-y-4">
          {!trackingData || trackingData.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card">
              <Package size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                You don't have any orders for your products yet. Once customers start buying your products, they will appear here with tracking information.
              </p>
            </div>
          ) : filteredData?.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card">
              <Package size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Matching Products</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filters to find what you're looking for
              </p>
            </div>
          ) : (
            filteredData?.map((item) => {
              // Safety check for product data
              if (!item.product) return null;
              
              const isExpanded = expandedProducts[item.product._id];
              const pendingOrders = item.orders.filter(o => !['delivered', 'cancelled'].includes(o.status));
              
              return (
                <div key={item.product._id} className="product-tracking-card border rounded-lg bg-card overflow-hidden">
                  {/* Product Header */}
                  <div 
                    className="product-header p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleProduct(item.product._id)}
                  >
                    <div className="product-image w-16 h-16 rounded-lg border overflow-hidden flex-shrink-0">
                      {item.product.images?.[0] ? (
                        <img 
                          src={resolveImageUrl(item.product.images[0])} 
                          alt={item.product.name || 'Product'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <Package size={24} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    
                    <div className="product-info flex-1">
                      <h3 className="font-semibold text-lg">{item.product.name || 'Unnamed Product'}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="capitalize">{item.product.category || 'Uncategorized'}</span>
                        <span>•</span>
                        <span>Price: {formatCurrency(item.product.price)}</span>
                      </div>
                    </div>

                    <div className="product-stats flex items-center gap-6 text-right">
                      <div>
                        <div className="text-2xl font-bold">{item.totalSold}</div>
                        <div className="text-xs text-muted-foreground">Units Sold</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">{formatCurrency(item.totalRevenue)}</div>
                        <div className="text-xs text-muted-foreground">Revenue</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-500">{pendingOrders.length}</div>
                        <div className="text-xs text-muted-foreground">Pending</div>
                      </div>
                      <div className="text-muted-foreground">
                        {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                      </div>
                    </div>
                  </div>

                  {/* Orders List (Expandable) */}
                  {isExpanded && (
                    <div className="orders-list border-t">
                      <div className="p-4 bg-muted/30">
                        <h4 className="font-medium mb-4 flex items-center gap-2">
                          <ShoppingBag size={18} />
                          Orders ({item.orders.length})
                        </h4>
                        
                        <div className="space-y-3">
                          {item.orders.map((order) => (
                            <div key={order.orderId} className="order-detail-card p-4 bg-background border rounded-lg">
                              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                {/* Order Info */}
                                <div className="flex items-start gap-4">
                                  <div className="order-icon p-2 bg-primary/10 rounded-lg">
                                    <ShoppingBag size={20} className="text-primary" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium">Order #{order.orderNumber}</span>
                                      <Badge className={statusConfig[order.status]?.color}>
                                        {statusConfig[order.status]?.label}
                                      </Badge>
                                      <Badge className={paymentStatusConfig[order.paymentStatus]?.color}>
                                        {paymentStatusConfig[order.paymentStatus]?.label}
                                      </Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Calendar size={14} />
                                      {formatDate(order.createdAt)}
                                    </div>
                                  </div>
                                </div>

                                {/* Buyer Info */}
                                <div className="flex items-start gap-3">
                                  <div className="buyer-icon p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                    <User size={18} className="text-blue-600 dark:text-blue-300" />
                                  </div>
                                  <div>
                                    <div className="font-medium">{order.buyer.name}</div>
                                    {order.buyer.phone && (
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Phone size={12} />
                                        {order.buyer.phone}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Location */}
                                {order.deliveryAddress && (
                                  <div className="flex items-start gap-3">
                                    <div className="location-icon p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                                      <MapPin size={18} className="text-green-600 dark:text-green-300" />
                                    </div>
                                    <div className="text-sm">
                                      <div className="font-medium">Delivery Address</div>
                                      <div className="text-muted-foreground">
                                        {order.deliveryAddress.address}
                                        {order.deliveryAddress.city && `, ${order.deliveryAddress.city}`}
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Order Details */}
                                <div className="text-right">
                                  <div className="text-lg font-bold">{formatCurrency(order.totalAmount)}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Qty: {order.quantity} × {formatCurrency(order.price)}
                                  </div>
                                </div>
                              </div>

                              {/* Notes */}
                              {order.notes && (
                                <div className="mt-3 pt-3 border-t text-sm">
                                  <span className="text-muted-foreground">Note: </span>
                                  <span className="italic">{order.notes}</span>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="mt-3 flex justify-end gap-2">
                                {order.deliveryType === 'delivery' && 
                                 order.status !== 'delivered' && 
                                 order.status !== 'cancelled' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(`/tracking/${order.orderId}`, '_blank')}
                                  >
                                    <MapPin size={14} className="mr-1" />
                                    Track Delivery
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(`/orders`, '_blank')}
                                >
                                  View Full Order
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}

export default SellerProductTracking;
