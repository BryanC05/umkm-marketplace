import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Package, TrendingUp, DollarSign, ShoppingBag, Save, X, AlertTriangle, BarChart3, Crown, CreditCard, CheckCircle, Clock, Sparkles } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
import { resolveImageUrl } from '@/utils/imageUrl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AnalyticsSection from '@/components/AnalyticsSection';
import PromoManager from '@/components/PromoManager';

function SellerDashboard() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const sellerId = user?._id || user?.id;

  // Edit state - stores product id being edited and its temp values
  const [editingProduct, setEditingProduct] = useState(null);
  const [editValues, setEditValues] = useState({ price: 0, stock: 0 });

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ show: false, productId: null, productName: '' });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['sellerProducts', sellerId],
    queryFn: async () => {
      if (!sellerId) return [];
      const response = await api.get(`/products/seller/${sellerId}`);
      return response.data;
    },
    enabled: !!sellerId,
  });

  const { data: orders } = useQuery({
    queryKey: ['sellerOrders', sellerId],
    queryFn: async () => {
      const response = await api.get('/orders/my-orders');
      return response.data;
    },
    enabled: !!sellerId,
  });

  // Membership query
  const { data: membership, refetch: refetchMembership } = useQuery({
    queryKey: ['membership'],
    queryFn: async () => {
      const response = await api.get('/users/membership/status');
      return response.data;
    },
  });

  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentFile, setPaymentFile] = useState(null);

  const uploadPaymentMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/users/membership/payment', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    },
    onSuccess: () => {
      setShowPaymentDialog(false);
      setPaymentFile(null);
      refetchMembership();
      alert('Payment submitted! Please wait for admin approval.');
    },
    onError: (error) => {
      alert(`Failed to upload: ${error.response?.data?.error || error.message}`);
    },
  });

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (!paymentFile) {
      alert('Please select a payment proof image');
      return;
    }
    const formData = new FormData();
    formData.append('paymentProof', paymentFile);
    uploadPaymentMutation.mutate(formData);
  };

  const deleteMutation = useMutation({
    mutationFn: async (productId) => {
      await api.delete(`/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellerProducts', sellerId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ productId, data }) => {
      const response = await api.put(`/products/${productId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellerProducts', sellerId] });
      setEditingProduct(null);
      setConfirmModal({ show: false, productId: null, productName: '' });
    },
    onError: (error) => {
      alert(`Failed to update: ${error.response?.data?.message || error.message}`);
    },
  });

  const startEditing = (product) => {
    setEditingProduct(product._id);
    setEditValues({ price: product.price, stock: product.stock });
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }) => {
      await api.put(`/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellerOrders', sellerId] });
      queryClient.invalidateQueries({ queryKey: ['sellerProductTracking', sellerId] });
    },
    onError: (error) => {
      alert(`Failed to update status: ${error.response?.data?.message || error.message}`);
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

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      preparing: 'Preparing',
      ready: 'Ready',
      delivered: 'Delivered',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setEditValues({ price: 0, stock: 0 });
  };

  const showConfirmation = (productId, productName) => {
    setConfirmModal({ show: true, productId, productName });
  };

  const confirmUpdate = () => {
    updateMutation.mutate({
      productId: confirmModal.productId,
      data: {
        price: Number(editValues.price),
        stock: Number(editValues.stock),
      },
    });
  };

  if (!user) {
    return (
      <>
        <div className="access-denied container py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('seller.pleaseLogin')}</h2>
          <p className="mb-4">{t('seller.loginRequired')}</p>
          <Link to="/login" className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
            {t('auth.login')}
          </Link>
        </div>
      </>
    );
  }

  const totalSales = orders?.reduce((sum, order) =>
    order.status === 'delivered' ? sum + order.totalAmount : sum, 0
  ) || 0;

  const pendingOrders = orders?.filter(order =>
    ['pending', 'confirmed', 'preparing'].includes(order.status)
  ).length || 0;
  const formatCurrency = (amount) =>
    `Rp ${Number(amount || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;

  return (
    <>
      <div className="container py-8 md:py-10">
        {/* Confirmation Modal */}
        {confirmModal.show && (
          <div className="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="confirm-modal bg-card border rounded-lg p-6 max-w-md w-full shadow-lg">
              <div className="modal-icon warning flex justify-center mb-4 text-warning">
                <AlertTriangle size={48} />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">{t('seller.confirmChanges')}</h3>
              <p className="text-center text-muted-foreground mb-4">{t('seller.aboutToUpdate')} <strong>{confirmModal.productName}</strong>:</p>
              <div className="change-summary bg-muted p-4 rounded-md mb-4 space-y-2">
                <div className="change-item flex justify-between">
                  <span>{t('seller.newPrice')}:</span>
                  <strong>Rp {editValues.price}</strong>
                </div>
                <div className="change-item flex justify-between">
                  <span>{t('seller.newStock')}:</span>
                  <strong>{editValues.stock} {t('seller.units')}</strong>
                </div>
              </div>
              <p className="warning-text text-sm text-muted-foreground text-center mb-6">{t('seller.updateWarning')}</p>
              <div className="modal-actions flex gap-4">
                <button
                  className="btn-cancel flex-1 py-2 border rounded-md hover:bg-muted"
                  onClick={() => setConfirmModal({ show: false, productId: null, productName: '' })}
                  disabled={updateMutation.isPending}
                >
                  {t('common.cancel')}
                </button>
                <button
                  className="btn-confirm flex-1 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  onClick={confirmUpdate}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? t('seller.updating') : t('seller.confirmUpdate')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="endfield-card endfield-gradient p-5 md:p-7 mb-8">
          <div className="dashboard-header flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary mb-2">Seller Console</p>
              <h1 className="text-3xl font-bold">{t('seller.dashboard')}</h1>
              <p className="text-muted-foreground">{t('seller.welcomeBack')}, {user.businessName || user.name}!</p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Link
                to="/seller/product-tracking"
                className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              >
                <BarChart3 size={20} />
                {t('seller.productTracking')}
              </Link>
              <Link
                to="/logo-generator"
                className="inline-flex items-center gap-2 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
              >
                <Sparkles size={18} />
                Logo Generator
              </Link>
              <Link to="/seller/add-product" className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
                <Plus size={20} />
                {t('seller.addProduct')}
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link to="/seller/product-tracking" className="endfield-card p-4 hover:border-primary/60 transition-colors">
            <p className="text-sm font-semibold">Track Deliveries</p>
            <p className="text-xs text-muted-foreground mt-1">Monitor buyer status and delivery locations.</p>
          </Link>
          <Link to="/logo-generator" className="endfield-card p-4 hover:border-primary/60 transition-colors">
            <p className="text-sm font-semibold">Generate Brand Logo</p>
            <p className="text-xs text-muted-foreground mt-1">Create and apply AI logos for your store profile.</p>
          </Link>
          <Link to="/orders" className="endfield-card p-4 hover:border-primary/60 transition-colors">
            <p className="text-sm font-semibold">Manage Orders</p>
            <p className="text-xs text-muted-foreground mt-1">Review new orders and payment status.</p>
          </Link>
          <Link to="/automation" className="endfield-card p-4 hover:border-primary/60 transition-colors">
            <p className="text-sm font-semibold">⚡ Automations</p>
            <p className="text-xs text-muted-foreground mt-1">Connect n8n workflows for emails & alerts.</p>
          </Link>
        </div>

        {/* Membership Section */}
        <div className="mb-8">
          <Card className={membership?.isMember ? "border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20" : "border-red-300 bg-red-50 dark:bg-red-900/20"}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {membership?.isMember ? (
                    <Crown className="h-6 w-6 text-yellow-500" />
                  ) : (
                    <Crown className="h-6 w-6 text-gray-400" />
                  )}
                  <CardTitle className="text-lg">
                    {membership?.isMember ? 'Premium Member' : 'Upgrade to Premium'}
                  </CardTitle>
                </div>
                {membership?.isMember && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Active
                  </span>
                )}
                {!membership?.isMember && membership?.membershipStatus === 'pending' && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-sm font-medium">
                    <Clock className="h-4 w-4" />
                    Pending Approval
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {membership?.isMember ? (
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Your membership is active until{' '}
                      <span className="font-medium text-foreground">
                        {new Date(membership.memberExpiry).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Member since {new Date(membership.memberSince).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    Unlimited product listings enabled
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upgrade to premium for <span className="font-bold text-lg">Rp 10.000/month</span> to unlock:
                  </p>
                  <ul className="text-sm space-y-1 mb-4">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Unlimited product listings
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Priority in search results
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Verified seller badge
                    </li>
                  </ul>
                  <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <CreditCard className="h-4 w-4" />
                        Pay Rp 10.000
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Submit Payment Proof</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handlePaymentSubmit} className="space-y-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                          <p className="text-sm font-medium mb-2">Transfer to:</p>
                          <p className="text-lg font-bold">Bank BCA</p>
                          <p className="text-lg">1234567890</p>
                          <p className="text-sm text-muted-foreground">a/n MSME Marketplace</p>
                          <p className="mt-2 font-bold">Amount: Rp 10.000</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Upload Payment Proof
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setPaymentFile(e.target.files[0])}
                            className="w-full border rounded-md p-2"
                            required
                          />
                        </div>
                        <Button type="submit" className="w-full" disabled={uploadPaymentMutation.isPending}>
                          {uploadPaymentMutation.isPending ? 'Submitting...' : 'Submit Payment Proof'}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card p-6 border rounded-lg bg-card shadow-sm">
            <div className="stat-icon products mb-2 text-primary">
              <Package size={24} />
            </div>
            <div className="stat-info">
              <h3 className="text-2xl font-bold">{products?.length || 0}</h3>
              <p className="text-sm text-muted-foreground">{t('seller.products')}</p>
            </div>
          </div>
          <div className="stat-card p-6 border rounded-lg bg-card shadow-sm">
            <div className="stat-icon orders mb-2 text-blue-500">
              <ShoppingBag size={24} />
            </div>
            <div className="stat-info">
              <h3 className="text-2xl font-bold">{orders?.length || 0}</h3>
              <p className="text-sm text-muted-foreground">{t('seller.totalOrders')}</p>
            </div>
          </div>
          <div className="stat-card p-6 border rounded-lg bg-card shadow-sm">
            <div className="stat-icon pending mb-2 text-orange-500">
              <TrendingUp size={24} />
            </div>
            <div className="stat-info">
              <h3 className="text-2xl font-bold">{pendingOrders}</h3>
              <p className="text-sm text-muted-foreground">{t('seller.pendingOrders')}</p>
            </div>
          </div>
          <div className="stat-card p-6 border rounded-lg bg-card shadow-sm">
            <div className="stat-icon revenue mb-2 text-green-500">
              <DollarSign size={24} />
            </div>
            <div className="stat-info">
              <h3 className="text-2xl font-bold">{formatCurrency(totalSales)}</h3>
              <p className="text-sm text-muted-foreground">{t('seller.totalRevenue')}</p>
            </div>
          </div>
        </div>

        {/* Analytics & Promos */}
        <AnalyticsSection />
        <PromoManager />

        <div className="endfield-card p-4 md:p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">{t('seller.myProducts')}</h2>
          {productsLoading ? (
            <div className="py-6 text-sm text-muted-foreground">{t('seller.loadingProducts')}</div>
          ) : products?.length === 0 ? (
            <div className="empty-state text-center py-12 border rounded-lg">
              <p className="mb-4 text-muted-foreground">{t('seller.noProductsEmpty')}</p>
              <Link to="/seller/add-product" className="btn-primary px-4 py-2 bg-primary text-primary-foreground rounded-md">
                {t('seller.addProduct')}
              </Link>
            </div>
          ) : (
            <div className="products-table-container overflow-x-auto border rounded-lg">
              <table className="products-table w-full text-left">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="p-4 font-medium">{t('seller.product')}</th>
                    <th className="p-4 font-medium">{t('seller.category')}</th>
                    <th className="p-4 font-medium">{t('seller.price')}</th>
                    <th className="p-4 font-medium">{t('seller.stock')}</th>
                    <th className="p-4 font-medium">{t('seller.status')}</th>
                    <th className="p-4 font-medium">{t('seller.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {products?.map((product) => (
                    <tr key={product._id} className={editingProduct === product._id ? 'bg-primary/5' : ''}>
                      <td className="product-cell p-4">
                        <div className="flex items-center gap-3">
                          <div className="product-thumbnail w-12 h-12 rounded border overflow-hidden shrink-0">
                            {product.images?.[0] ? (
                              <img src={resolveImageUrl(product.images[0])} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="placeholder w-full h-full bg-muted flex items-center justify-center text-xs">No image</div>
                            )}
                          </div>
                          <span className="font-medium">{product.name}</span>
                        </div>
                      </td>
                      <td className="p-4 capitalize">{product.category}</td>
                      <td className="p-4">
                        {editingProduct === product._id ? (
                          <input
                            type="number"
                            className="edit-input w-24 p-1 border rounded bg-background text-foreground"
                            value={editValues.price}
                            onChange={(e) => setEditValues({ ...editValues, price: e.target.value })}
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          `Rp ${product.price}`
                        )}
                      </td>
                      <td className="p-4">
                        {editingProduct === product._id ? (
                          <input
                            type="number"
                            className="edit-input w-20 p-1 border rounded bg-background text-foreground"
                            value={editValues.stock}
                            onChange={(e) => setEditValues({ ...editValues, stock: e.target.value })}
                            min="0"
                          />
                        ) : (
                          product.stock
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`status-badge px-2 py-1 rounded-full text-xs font-medium ${product.isAvailable ? 'bg-green-500/15 text-green-600 dark:bg-green-500/20 dark:text-green-400' : 'bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-400'}`}>
                          {product.isAvailable ? t('seller.active') : t('seller.inactive')}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="action-buttons flex gap-2">
                          {editingProduct === product._id ? (
                            <>
                              <button
                                className="btn-save p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 rounded"
                                onClick={() => showConfirmation(product._id, product.name)}
                                title="Save changes"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                className="btn-cancel-edit p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 rounded"
                                onClick={cancelEditing}
                                title="Cancel editing"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn-edit p-1 text-primary hover:text-primary/80 rounded"
                                onClick={() => startEditing(product)}
                                title="Edit price & stock"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                className="btn-delete p-1 text-destructive hover:text-destructive/80 rounded"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this product?')) {
                                    deleteMutation.mutate(product._id);
                                  }
                                }}
                                title="Delete product"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {orders && orders.length > 0 && (
          <div className="endfield-card p-4 md:p-6">
            <h2 className="text-xl font-semibold mb-4">{t('seller.recentOrders')}</h2>
            <div className="orders-list space-y-4">
              {orders.slice(0, 5).map((order) => (
                <div key={order._id} className="order-card p-4 border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center bg-card gap-4">
                  <div className="order-info">
                    <span className="order-id font-medium block">Order #{order._id.slice(-8)}</span>
                    <span className={`order-status text-sm ${order.status === 'delivered' ? 'text-green-600 dark:text-green-400' :
                      order.status === 'cancelled' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'
                      }`}>{t(`orders.status.${order.status}`) || getStatusLabel(order.status)}</span>
                  </div>
                  <div className="order-details text-left md:text-right flex-1 md:flex-none">
                    <span className="block">{order.products.length} {t('seller.items')}</span>
                    <span className="order-amount font-bold text-primary">{formatCurrency(order.totalAmount)}</span>
                  </div>
                  {getNextStatus(order.status) && (
                    <Button
                      size="sm"
                      onClick={() => updateStatusMutation.mutate({ orderId: order._id, status: getNextStatus(order.status) })}
                      disabled={updateStatusMutation.isPending}
                      className="w-full md:w-auto mt-2 md:mt-0"
                    >
                      {t('orders.markAs') || 'Mark As'} {getStatusLabel(getNextStatus(order.status))}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Link to="/orders" className="view-all block mt-4 text-center text-primary hover:underline">{t('seller.viewAllOrders')}</Link>
          </div>
        )}
      </div>
    </>
  );
}

export default SellerDashboard;
