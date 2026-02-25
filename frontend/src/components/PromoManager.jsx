import { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, Copy } from 'lucide-react';
import api from '../utils/api';
import './PromoManager.css';

export default function PromoManager() {
    const [promos, setPromos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxUses: '',
    });

    const fetchPromos = async () => {
        try {
            const res = await api.get('/promos/');
            setPromos(res.data || []);
        } catch (e) { /* ignore */ }
        setLoading(false);
    };

    useEffect(() => { fetchPromos(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/promos/', {
                code: form.code,
                discountType: form.discountType,
                discountValue: Number(form.discountValue),
                minOrderAmount: Number(form.minOrderAmount) || 0,
                maxUses: Number(form.maxUses) || 0,
            });
            setForm({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxUses: '' });
            setShowForm(false);
            fetchPromos();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to create promo');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this promo code?')) return;
        try {
            await api.delete(`/promos/${id}`);
            fetchPromos();
        } catch (e) { alert('Failed to delete'); }
    };

    return (
        <div className="promo-manager">
            <div className="promo-header">
                <h2 className="promo-title">
                    <Tag size={20} />
                    Promo Codes
                </h2>
                <button className="promo-add-btn" onClick={() => setShowForm(!showForm)}>
                    <Plus size={16} /> {showForm ? 'Cancel' : 'New Promo'}
                </button>
            </div>

            {/* Create Form */}
            {showForm && (
                <form className="promo-form" onSubmit={handleCreate}>
                    <div className="promo-form-row">
                        <input
                            className="promo-input"
                            placeholder="PROMO CODE"
                            value={form.code}
                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                            required
                        />
                        <select
                            className="promo-select"
                            value={form.discountType}
                            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                        >
                            <option value="percentage">% Off</option>
                            <option value="fixed">Fixed (Rp)</option>
                        </select>
                        <input
                            className="promo-input"
                            type="number"
                            placeholder={form.discountType === 'percentage' ? 'Discount %' : 'Amount (Rp)'}
                            value={form.discountValue}
                            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                            required
                        />
                    </div>
                    <div className="promo-form-row">
                        <input
                            className="promo-input"
                            type="number"
                            placeholder="Min order (Rp) — optional"
                            value={form.minOrderAmount}
                            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                        />
                        <input
                            className="promo-input"
                            type="number"
                            placeholder="Max uses (0 = unlimited)"
                            value={form.maxUses}
                            onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                        />
                        <button type="submit" className="promo-submit-btn">Create</button>
                    </div>
                </form>
            )}

            {/* Promo List */}
            {loading ? (
                <p className="promo-loading">Loading...</p>
            ) : promos.length === 0 ? (
                <p className="promo-empty">No promo codes yet. Create one to attract more buyers!</p>
            ) : (
                <div className="promo-list">
                    {promos.map((p) => (
                        <div key={p._id} className="promo-card">
                            <div className="promo-code-display">
                                <code>{p.code}</code>
                                <button className="promo-copy" onClick={() => { navigator.clipboard.writeText(p.code); }} title="Copy">
                                    <Copy size={12} />
                                </button>
                            </div>
                            <div className="promo-details">
                                <span className="promo-discount">
                                    {p.discountType === 'percentage' ? `${p.discountValue}% off` : `Rp ${p.discountValue?.toLocaleString('id-ID')} off`}
                                </span>
                                {p.minOrderAmount > 0 && <span className="promo-meta">Min order: Rp {p.minOrderAmount?.toLocaleString('id-ID')}</span>}
                                <span className="promo-meta">Uses: {p.currentUses}/{p.maxUses || '∞'}</span>
                            </div>
                            <button className="promo-delete" onClick={() => handleDelete(p._id)}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
