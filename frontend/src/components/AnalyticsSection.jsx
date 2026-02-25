import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Package } from 'lucide-react';
import api from '../utils/api';
import './AnalyticsSection.css';

export default function AnalyticsSection() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get('/analytics/sales');
                setData(res.data);
            } catch (e) { /* ignore */ }
            setLoading(false);
        };
        fetch();
    }, []);

    if (loading) return <div className="analytics-loading">Loading analytics...</div>;
    if (!data) return null;

    const maxRevenue = Math.max(...(data.recentDays?.map(d => d.revenue) || [1]), 1);

    return (
        <div className="analytics-section">
            <h2 className="analytics-title">
                <TrendingUp size={20} />
                Sales Analytics
            </h2>

            {/* Quick Stats */}
            <div className="analytics-stats">
                <div className="analytics-stat">
                    <DollarSign size={18} className="stat-icon-green" />
                    <div>
                        <span className="stat-value">Rp {data.totalRevenue?.toLocaleString('id-ID')}</span>
                        <span className="stat-label">Total Revenue</span>
                    </div>
                </div>
                <div className="analytics-stat">
                    <ShoppingBag size={18} className="stat-icon-blue" />
                    <div>
                        <span className="stat-value">{data.completedOrders}</span>
                        <span className="stat-label">Completed</span>
                    </div>
                </div>
                <div className="analytics-stat">
                    <Package size={18} className="stat-icon-orange" />
                    <div>
                        <span className="stat-value">{data.pendingOrders}</span>
                        <span className="stat-label">Pending</span>
                    </div>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="analytics-chart">
                <h3 className="chart-title">Last 7 Days</h3>
                <div className="chart-bars">
                    {data.recentDays?.map((day, i) => (
                        <div key={i} className="chart-col">
                            <div className="chart-bar-wrapper">
                                <div
                                    className="chart-bar"
                                    style={{ height: `${(day.revenue / maxRevenue) * 100}%` }}
                                    title={`Rp ${day.revenue.toLocaleString('id-ID')}`}
                                />
                            </div>
                            <span className="chart-label">{day.label?.slice(0, 3)}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Products */}
            {data.topProducts?.length > 0 && (
                <div className="top-products">
                    <h3 className="chart-title">Top Products</h3>
                    {data.topProducts.map((p, i) => (
                        <div key={i} className="top-product-row">
                            <span className="top-rank">#{i + 1}</span>
                            <span className="top-name">{p.name}</span>
                            <span className="top-sold">{p.totalSold} sold</span>
                            <span className="top-revenue">Rp {p.revenue?.toLocaleString('id-ID')}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
