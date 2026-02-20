import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, XCircle, MapPin, Phone,
  ShoppingBag, Truck, ChefHat, CreditCard, Banknote,
  Smartphone, Building2, ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resolveImageUrl } from '@/utils/imageUrl';
import './Orders.css';

const statusConfig = {
  pending: { icon: Clock, color: 'var(--status-pending)', bg: 'var(--status-pending-bg)', label: 'Pending' },
  confirmed: { icon: CheckCircle, color: 'var(--status-confirmed)', bg: 'var(--status-confirmed-bg)', label: 'Confirmed' },
  preparing: { icon: ChefHat, color: 'var(--status-preparing)', bg: 'var(--status-preparing-bg)', label: 'Preparing' },
  ready: { icon: Package, color: 'var(--status-ready)', bg: 'var(--status-ready-bg)', label: 'Ready' },
  delivered: { icon: Truck, color: 'var(--status-delivered)', bg: 'var(--status-delivered-bg)', label: 'Delivered' },
  cancelled: { icon: XCircle, color: 'var(--status-cancelled)', bg: 'var(--status-cancelled-bg)', label: 'Cancelled' },
};

const paymentIcons = {
  cash: { icon: Banknote, label: 'Cash on Delivery' },
  qris: { icon: Smartphone, label: 'QRIS' },
  ewallet: { icon: Smartphone, label: 'E-Wallet' },
  bank_transfer: { icon: Building2, label: 'Bank Transfer' },
  credit_card: { icon: CreditCard, label: 'Credit Card' },
};

const filterTabs = [
  { key: 'all', label: 'All Orders' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

const normalizeOrdersPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.orders)) return payload.orders;
  return [];
};

const resolveOrderId = (order, fallback = '') => {
  if (!order) return fallback;
  if (typeof order._id === 'string') return order._id;
  if (typeof order?.id === 'string') return order.id;
  if (typeof order?._id?.$oid === 'string') return order._id.$oid;
  return fallback;
};

function Orders() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedOrders, setExpandedOrders] = useState({});

  const hasToken = !!localStorage.getItem('token');
  const { data: rawOrders, isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const response = await api.get('/orders/my-orders');
      return normalizeOrdersPayload(response.data);
    },
    enabled: !!user?.id && hasToken,
  });
  const orders = normalizeOrdersPayload(rawOrders);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      await api.put(`/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['sellerProductTracking', user?.id] });
    },
  });

  const getNextStatus = (currentStatus) => {
    const statusFlow = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];
    const currentIndex = statusFlow.indexOf(currentStatus);
    if (currentIndex < statusFlow.length - 1) {
      return statusFlow[currentIndex + 1];
    }
    return null;
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'active') {
      return !['delivered', 'cancelled'].includes(order.status);
    }
    if (activeFilter === 'completed') {
      return ['delivered', 'cancelled'].includes(order.status);
    }
    return true;
  });

  const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;
  const completedCount = orders.filter(o => ['delivered', 'cancelled'].includes(o.status)).length;

  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount) => {
    return `Rp ${(amount || 0).toLocaleString('id-ID')}`;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="orders-page container py-12">
          <div className="orders-skeleton">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Layout>
        <div className="orders-page container py-12">
          <div className="empty-orders">
            <div className="empty-icon-wrapper">
              <ShoppingBag size={48} />
            </div>
            <h2>{t('orders.noOrdersTitle')}</h2>
            <p>{t('orders.startShopping')}</p>
            <Link to="/products">
              <Button className="mt-4 gap-2">
                <ShoppingBag className="h-4 w-4" />
                {t('orders.browseProducts')}
              </Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="orders-page container py-8">
        {/* Header */}
        <div className="orders-header">
          <div>
            <h1>{t('orders.title')}</h1>
            <p className="orders-subtitle">{orders.length} {t('orders.totalOrders')}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {filterTabs.map(tab => (
            <button
              key={tab.key}
              className={`filter-tab ${activeFilter === tab.key ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label}
              <span className="tab-count">
                {tab.key === 'all' ? orders.length : tab.key === 'active' ? activeCount : completedCount}
              </span>
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="orders-list">
          {filteredOrders.length === 0 ? (
            <div className="no-filtered-orders">
              <p>No {activeFilter} orders found</p>
            </div>
          ) : (
            filteredOrders.map((order, orderIndex) => {
              const orderId = resolveOrderId(order, `order-${orderIndex}`);
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const nextStatus = getNextStatus(order.status);
              const isExpanded = !!expandedOrders[orderId];
              const payment = paymentIcons[order.paymentMethod] || paymentIcons.cash;
              const PaymentIcon = payment.icon;

              return (
                <div key={orderId} className={`order-card ${order.status}`}>
                  {/* Order Header */}
                  <div className="order-header" onClick={() => toggleExpand(orderId)}>
                    <div className="order-header-left">
                      <div className="order-id-section">
                        <span className="order-label">{t('orders.order')}</span>
                        <span className="order-id">#{orderId.slice(-8).toUpperCase()}</span>
                      </div>
                      <div className="order-date">
                        <Calendar size={14} />
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="order-header-right">
                      <div className="order-status-badge" style={{ color: status.color, background: status.bg }}>
                        <StatusIcon size={14} />
                        <span>{status.label}</span>
                      </div>
                      <div className="order-total-compact">
                        {formatCurrency(order.totalAmount)}
                      </div>
                      <button className="expand-toggle">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Order Body - Expandable */}
                  {isExpanded && (
                    <div className="order-body">
                      {/* Items */}
                      <div className="order-items">
                        {(order.products || []).map((item, itemIndex) => {
                          const itemKey = `${orderId}-${item._id || item.product?._id || 'item'}-${itemIndex}`;
                          return (
                            <div key={itemKey} className="order-item">
                              <div className="item-image">
                                {item.product?.images?.[0] ? (
                                  <img
                                    src={resolveImageUrl(item.product.images[0])}
                                    alt={item.product.name}
                                    onError={(event) => {
                                      event.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <div className="placeholder">📷</div>
                                )}
                              </div>
                              <div className="item-details">
                                <h4>{item.product?.name || 'Product'}</h4>
                                {item.variantName && (
                                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>Variant: {item.variantName}</p>
                                )}
                                {item.selectedOptions?.length > 0 && (
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.15rem' }}>
                                    {item.selectedOptions.map((opt, oi) => (
                                      <span key={`${itemKey}-${opt.groupName || 'option'}-${oi}`} style={{ fontSize: '0.7rem', background: 'var(--muted)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                                        {opt.groupName}: {opt.chosen?.join(', ')}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                <p>Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                              </div>
                              <div className="item-total">{formatCurrency(item.quantity * item.price)}</div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer Info */}
                      <div className="order-footer">
                        <div className="order-meta">
                          {/* Seller/Buyer Info - Check if user is seller of this order */}
                          {order.seller?._id === user?.id ? (
                            <div className="meta-row">
                              <span className="meta-label">{t('orders.buyer')}</span>
                              <span className="meta-value">
                                {order.buyer?.name}
                                {order.buyer?.phone && (
                                  <span className="contact-inline">
                                    <Phone size={12} /> {order.buyer.phone}
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <div className="meta-row">
                              <span className="meta-label">{t('orders.seller')}</span>
                              <span className="meta-value">
                                {order.seller?.businessName || order.seller?.name}
                                {order.seller?.phone && (
                                  <span className="contact-inline">
                                    <Phone size={12} /> {order.seller.phone}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Delivery Address */}
                          {order.deliveryAddress && (
                            <div className="meta-row">
                              <span className="meta-label">{t('orders.delivery')}</span>
                              <span className="meta-value">
                                <MapPin size={12} />
                                {order.deliveryAddress.address}
                                {order.deliveryAddress.city && `, ${order.deliveryAddress.city}`}
                              </span>
                            </div>
                          )}

                          {/* Payment Method */}
                          <div className="meta-row">
                            <span className="meta-label">{t('orders.payment')}</span>
                            <span className="meta-value payment-badge">
                              <PaymentIcon size={14} />
                              {payment.label}
                            </span>
                          </div>

                          {/* Notes */}
                          {order.notes && (
                            <div className="meta-row">
                              <span className="meta-label">{t('orders.notes')}</span>
                              <span className="meta-value note-text">{order.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Total + Action */}
                        <div className="order-total-section">
                          <div className="total-row">
                            <span>{t('orders.total')}</span>
                            <span className="total-amount">{formatCurrency(order.totalAmount)}</span>
                          </div>

                          {/* Show status update button only if user is the seller of this order */}
                          {order.seller?._id === user?.id && nextStatus && (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateStatusMutation.mutate({
                                  orderId,
                                  status: nextStatus,
                                });
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="update-status-btn"
                            >
                              {t('orders.markAs')} {statusConfig[nextStatus].label}
                            </Button>
                          )}
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

export default Orders;
