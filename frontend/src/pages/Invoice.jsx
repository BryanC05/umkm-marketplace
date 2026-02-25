import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import api from '../utils/api';
import Layout from '@/components/layout/Layout';
import './Invoice.css';

export default function Invoice() {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await api.get(`/orders/${orderId}`);
                setOrder(res.data);
            } catch (e) {
                alert('Order not found');
                navigate('/orders');
            }
            setLoading(false);
        };
        fetchOrder();
    }, [orderId]);

    if (loading) return <Layout><div className="container py-12 text-center">Loading...</div></Layout>;
    if (!order) return null;

    return (
        <Layout>
            <div className="container py-8">
                <div className="invoice-actions">
                    <button className="invoice-back" onClick={() => navigate('/orders')}>
                        <ArrowLeft size={16} /> Back to Orders
                    </button>
                    <button className="invoice-print" onClick={() => window.print()}>
                        <Printer size={16} /> Print Receipt
                    </button>
                </div>

                <div className="invoice-card" id="invoice-print">
                    <div className="invoice-header">
                        <div>
                            <h1 className="invoice-brand">UMKM Marketplace</h1>
                            <p className="invoice-subtitle">Order Receipt</p>
                        </div>
                        <div className="invoice-id">
                            <FileText size={20} />
                            <span>#{order._id?.slice(-8).toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="invoice-meta">
                        <div className="invoice-meta-item">
                            <span className="meta-label">Date</span>
                            <span>{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div className="invoice-meta-item">
                            <span className="meta-label">Status</span>
                            <span className={`invoice-status ${order.status}`}>{order.status}</span>
                        </div>
                        <div className="invoice-meta-item">
                            <span className="meta-label">Payment</span>
                            <span>{order.paymentMethod || 'COD'}</span>
                        </div>
                    </div>

                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th className="text-center">Qty</th>
                                <th className="text-right">Price</th>
                                <th className="text-right">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.products?.map((item, i) => (
                                <tr key={i}>
                                    <td>{item.name}</td>
                                    <td className="text-center">{item.quantity}</td>
                                    <td className="text-right">Rp {item.price?.toLocaleString('id-ID')}</td>
                                    <td className="text-right">Rp {(item.price * item.quantity)?.toLocaleString('id-ID')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="invoice-totals">
                        {order.discountAmount > 0 && (
                            <div className="invoice-total-row">
                                <span>Discount</span>
                                <span className="discount">-Rp {order.discountAmount?.toLocaleString('id-ID')}</span>
                            </div>
                        )}
                        <div className="invoice-total-row">
                            <span>Shipping</span>
                            <span>Rp {(order.shippingFee || 0)?.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="invoice-total-row grand">
                            <span>Total</span>
                            <span>Rp {order.totalAmount?.toLocaleString('id-ID')}</span>
                        </div>
                    </div>

                    {order.deliveryAddress && (
                        <div className="invoice-address">
                            <span className="meta-label">Delivery Address</span>
                            <p>{order.deliveryAddress}</p>
                        </div>
                    )}

                    <div className="invoice-footer">
                        <p>Thank you for shopping at UMKM Marketplace!</p>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
