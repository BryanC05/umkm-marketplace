import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, ShoppingBag, MapPin, Plus, Minus } from 'lucide-react';
import { useCartStore, useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PLACEHOLDER_IMAGE } from '@/utils/constants';
import { resolveImageUrl } from '@/utils/imageUrl';

function Cart() {
    const navigate = useNavigate();
    const { items, updateQuantity, removeFromCart, clearCart, getTotalPrice } = useCartStore();
    const { user, isAuthenticated } = useAuthStore();
    const { t } = useTranslation();

    const [isCheckingOut, setIsCheckingOut] = useState(false);
    const [address, setAddress] = useState({
        address: user?.location?.address || '',
        city: user?.location?.city || '',
        state: user?.location?.state || '',
        pincode: user?.location?.pincode || '',
    });
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [loading, setLoading] = useState(false);

    const subtotal = getTotalPrice();
    const deliveryFee = 15000;
    const total = subtotal + deliveryFee;

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            alert(t('cart.loginRequired'));
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            const orderData = {
                products: items.map(item => ({
                    productId: item.product._id,
                    quantity: item.quantity,
                    variantName: item.variant?.name || null,
                    selectedOptions: (item.selectedOptions || []).map(o => ({
                        groupName: o.groupName,
                        chosen: o.chosen
                    }))
                })),
                deliveryAddress: address,
                notes,
                paymentMethod
            };

            await api.post('/orders', orderData);

            clearCart();
            alert('Order placed successfully!');
            navigate('/orders');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to place order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="container py-8">
                <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
                    <ShoppingBag className="h-8 w-8" />
                    {t('cart.title')}
                    {items.length > 0 && <span className="text-muted-foreground text-lg font-normal">({items.length} {t('cart.items')})</span>}
                </h1>

                {items.length === 0 ? (
                    <Card className="py-16 text-center">
                        <CardContent>
                            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h2 className="text-xl font-semibold mb-2">{t('cart.empty')}</h2>
                            <p className="text-muted-foreground mb-6">Looks like you haven't added anything to your cart yet.</p>
                            <Button asChild>
                                <Link to="/nearby">
                                    {t('cart.continueShopping')}
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Cart Items */}
                        <div className="lg:col-span-2 space-y-4">
                            {items.map((item) => {
                                const unitPrice = item.variant ? item.variant.price : item.product.price;
                                const optionAdjust = (item.selectedOptions || []).reduce((sum, o) => sum + (o.priceAdjust || 0), 0);
                                const linePrice = unitPrice + optionAdjust;
                                return (
                                    <Card key={`${item.product._id}-${item.variant?.name || ''}-${(item.selectedOptions || []).map(o => o.chosen?.join(',')).join('-')}`}>
                                        <CardContent className="p-4 flex gap-4">
                                            <div className="h-24 w-24 rounded-md overflow-hidden border shrink-0">
                                                <img
                                                    src={resolveImageUrl(item.product.images?.[0]) || PLACEHOLDER_IMAGE}
                                                    alt={item.product.name}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-semibold">{item.product.name}</h3>
                                                        {item.variant && (
                                                            <p className="text-xs text-primary font-medium mt-0.5">Variant: {item.variant.name}</p>
                                                        )}
                                                        {item.selectedOptions?.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {item.selectedOptions.map((opt, oi) => (
                                                                    <span key={oi} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                                                        {opt.groupName}: {opt.chosen?.join(', ')}
                                                                        {opt.priceAdjust > 0 && ` (+Rp${opt.priceAdjust.toLocaleString('id-ID')})`}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <p className="text-sm text-muted-foreground">{item.product.stock} in stock</p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => removeFromCart(item.product._id, item.variant, item.selectedOptions)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                                <div className="flex justify-between items-end">
                                                    <p className="font-semibold">Rp {linePrice.toLocaleString('id-ID')}</p>
                                                    <div className="flex items-center gap-2 border rounded-md p-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => updateQuantity(item.product._id, item.quantity - 1, item.variant, item.selectedOptions)}
                                                            disabled={item.quantity <= 1}
                                                        >
                                                            <Minus className="h-3 w-3" />
                                                        </Button>
                                                        <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() => updateQuantity(item.product._id, item.quantity + 1, item.variant, item.selectedOptions)}
                                                            disabled={item.quantity >= item.product.stock}
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Order Summary */}
                        <div className="lg:col-span-1">
                            <Card className="sticky top-24">
                                <CardHeader>
                                    <CardTitle>{t('cart.orderSummary')}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                                        <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">{t('cart.deliveryFee')}</span>
                                        <span>Rp {deliveryFee.toLocaleString('id-ID')}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-semibold text-lg">
                                        <span>{t('cart.total')}</span>
                                        <span>Rp {total.toLocaleString('id-ID')}</span>
                                    </div>

                                    {!isCheckingOut ? (
                                        <Button className="w-full" onClick={() => setIsCheckingOut(true)}>
                                            {t('cart.checkout')}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <form onSubmit={handleCheckout} className="space-y-4 pt-4 border-t">
                                            <h3 className="font-medium flex items-center gap-2">
                                                <MapPin className="h-4 w-4" />
                                                {t('cart.deliveryAddress')}
                                            </h3>

                                            <div className="space-y-2">
                                                <Input
                                                    placeholder={t('cart.streetAddress')}
                                                    value={address.address}
                                                    onChange={(e) => setAddress({ ...address, address: e.target.value })}
                                                    required
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input
                                                        placeholder={t('cart.city')}
                                                        value={address.city}
                                                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                                                        required
                                                    />
                                                    <Input
                                                        placeholder={t('cart.postalCode')}
                                                        value={address.state}
                                                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                                                        required
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Payment Method</Label>
                                                <select
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                    value={paymentMethod}
                                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                                >
                                                    <option value="cash">💵 Cash on Delivery</option>
                                                    <option value="qris">📱 QRIS</option>
                                                    <option value="ewallet">💳 E-Wallet</option>
                                                    <option value="bank_transfer">🏦 Bank Transfer</option>
                                                    <option value="credit_card">💳 Credit Card</option>
                                                </select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{t('cart.notes')}</Label>
                                                <Textarea
                                                    placeholder={t('cart.notesPlaceholder')}
                                                    value={notes}
                                                    onChange={(e) => setNotes(e.target.value)}
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    className="flex-1"
                                                    onClick={() => setIsCheckingOut(false)}
                                                >
                                                    {t('common.cancel')}
                                                </Button>
                                                <Button
                                                    type="submit"
                                                    className="flex-1"
                                                    disabled={loading}
                                                >
                                                    {loading ? t('cart.processing') : t('cart.placeOrder')}
                                                </Button>
                                            </div>
                                        </form>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default Cart;
