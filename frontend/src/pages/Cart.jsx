import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, ArrowRight, ArrowLeft, ShoppingBag, MapPin, Plus, Minus, CreditCard, Check, Store, ChevronDown, ChevronUp, Truck, Clock, Navigation, AlertCircle } from 'lucide-react';
import { useCartStore, useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { resolveImageUrl } from '@/utils/imageUrl';
import ProgressSteps from '@/components/ui/ProgressSteps';
import DeliveryMapPicker from '@/components/DeliveryMapPicker';

function Cart() {
    const navigate = useNavigate();
    const { items, updateQuantity, removeFromCart, clearSellerCart, getTotalPrice, getItemsBySeller, getSellerTotal } = useCartStore();
    const { user, isAuthenticated } = useAuthStore();
    const { t } = useTranslation();

    const [expandedSellers, setExpandedSellers] = useState({});
    const [checkoutSeller, setCheckoutSeller] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);
    const [address, setAddress] = useState({
        address: user?.location?.address || '',
        city: user?.location?.city || '',
        state: user?.location?.state || '',
        pincode: user?.location?.pincode || '',
        coordinates: user?.location?.coordinates || [0, 0],
    });
    const [notes, setNotes] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [deliveryType, setDeliveryType] = useState('delivery');
    const [preorderTime, setPreorderTime] = useState('');
    const [preorderDate, setPreorderDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [deliveryLocation, setDeliveryLocation] = useState(null);
    const [distanceError, setDistanceError] = useState(null);

    const subtotal = checkoutSeller ? getSellerTotal(checkoutSeller.sellerId) : 0;
    const deliveryFee = deliveryType === 'delivery' ? 15000 : 0;
    const total = subtotal + deliveryFee;

    // Get seller location from first product
    const getSellerLocation = () => {
        if (!checkoutSeller || !checkoutSeller.items.length) return null;
        const firstItem = checkoutSeller.items[0];
        const seller = firstItem.product.seller;
        if (seller?.location?.coordinates && seller.location.coordinates.length >= 2) {
            return {
                lat: seller.location.coordinates[1],
                lng: seller.location.coordinates[0]
            };
        }
        return null;
    };

    const steps = [
        { label: t('checkout.step1') },
        { label: t('checkout.step2') },
        { label: t('checkout.step3') },
        { label: t('checkout.step4') },
    ];

    const paymentMethods = [
        { id: 'cash', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when you receive' },
        { id: 'qris', label: 'QRIS', icon: '📱', desc: 'Scan QR code to pay' },
        { id: 'ewallet', label: 'E-Wallet', icon: '💳', desc: 'GoPay, OVO, Dana' },
        { id: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', desc: 'Transfer to bank account' },
    ];

    const deliveryTypes = [
        { id: 'delivery', label: 'Delivery', icon: '🚗', desc: 'Delivered by driver to your address' },
        { id: 'pickup', label: 'Pickup', icon: '🏪', desc: 'Pick up at store yourself' },
    ];

    const toggleSeller = (sellerId) => {
        setExpandedSellers(prev => ({
            ...prev,
            [sellerId]: !prev[sellerId]
        }));
    };

    const startCheckout = (sellerGroup) => {
        setCheckoutSeller(sellerGroup);
        setCurrentStep(1);
        setDistanceError(null);
    };

    const cancelCheckout = () => {
        setCheckoutSeller(null);
        setCurrentStep(1);
        setDeliveryLocation(null);
        setDistanceError(null);
    };

    const handleDeliveryTypeChange = (typeId) => {
        setDeliveryType(typeId);
        setDistanceError(null);
        if (typeId === 'pickup') {
            setDeliveryLocation(null);
        }
    };

    const handleLocationSelect = (location) => {
        setDeliveryLocation(location);
        setAddress({
            ...address,
            address: location.address,
            coordinates: [location.lng, location.lat]
        });
        setDistanceError(null);
    };

    const nextStep = () => {
        // Validate delivery location before proceeding
        if (currentStep === 2 && deliveryType === 'delivery' && !deliveryLocation) {
            setDistanceError('Please select a delivery location on the map');
            return;
        }
        setDistanceError(null);
        setCurrentStep(prev => Math.min(prev + 1, 4));
    };

    const prevStep = () => {
        setDistanceError(null);
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    const handleCheckout = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            alert(t('cart.loginRequired'));
            navigate('/login');
            return;
        }

        // Validate delivery location
        if (deliveryType === 'delivery' && !deliveryLocation) {
            setDistanceError('Please select a delivery location on the map');
            return;
        }

        setLoading(true);
        setDistanceError(null);

        try {
            const orderData = {
                products: checkoutSeller.items.map(item => ({
                    productId: item.product._id,
                    quantity: item.quantity,
                    variantName: item.variant?.name || null,
                    selectedOptions: (item.selectedOptions || []).map(o => ({
                        groupName: o.groupName,
                        chosen: o.chosen
                    }))
                })),
                deliveryAddress: {
                    address: address.address,
                    city: address.city,
                    state: address.state,
                    pincode: address.pincode,
                    coordinates: address.coordinates,
                },
                notes,
                paymentMethod,
                deliveryType,
                isPreorder: !!preorderTime || !!preorderDate,
                preorderTime: preorderTime || null,
                deliveryDate: preorderDate || null
            };

            await api.post('/orders', orderData);
            clearSellerCart(checkoutSeller.sellerId);
            alert('Order placed successfully!');
            setCheckoutSeller(null);
            setDeliveryLocation(null);
            navigate('/orders');
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.response?.data?.error || 'Failed to place order';
            setDistanceError(errorMsg);
            if (error.response?.data?.distance) {
                setDistanceError(`Location is ${error.response.data.distance.toFixed(2)}km away. Maximum allowed is 5km.`);
            }
        } finally {
            setLoading(false);
        }
    };

    const sellerGroups = getItemsBySeller();

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <div className="space-y-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <ShoppingBag className="h-6 w-6" />
                            {t('checkout.reviewCart')}
                        </h2>
                        <p className="text-muted-foreground">{checkoutSeller.sellerName}</p>
                        {checkoutSeller.items.map((item) => {
                            const unitPrice = item.variant ? item.variant.price : item.product.price;
                            const optionAdjust = (item.selectedOptions || []).reduce((sum, o) => sum + (o.priceAdjust || 0), 0);
                            const linePrice = unitPrice + optionAdjust;
                            return (
                                <Card key={`${item.product._id}-${item.variant?.name || ''}`}>
                                    <CardContent className="p-4 flex gap-4">
                                        <div className="h-20 w-20 rounded-md overflow-hidden border shrink-0">
                                            {resolveImageUrl(item.product.images?.[0]) ? (
                                                <img
                                                    src={resolveImageUrl(item.product.images?.[0])}
                                                    alt={item.product.name}
                                                    className="h-full w-full object-cover"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                            ) : null}
                                        </div>
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-base">{item.product.name}</h3>
                                                    {item.variant && (
                                                        <p className="text-sm text-primary font-medium mt-0.5">Variant: {item.variant.name}</p>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="default"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10 h-10 w-10 p-0"
                                                    onClick={() => removeFromCart(item.product._id, item.variant, item.selectedOptions)}
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <p className="font-bold text-lg">Rp {linePrice.toLocaleString('id-ID')}</p>
                                                <div className="flex items-center gap-2 border rounded-md p-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => updateQuantity(item.product._id, item.quantity - 1, item.variant, item.selectedOptions)}
                                                        disabled={item.quantity <= 1}
                                                    >
                                                        <Minus className="h-4 w-4" />
                                                    </Button>
                                                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => updateQuantity(item.product._id, item.quantity + 1, item.variant, item.selectedOptions)}
                                                        disabled={item.quantity >= item.product.stock}
                                                    >
                                                        <Plus className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Truck className="h-6 w-6" />
                            Delivery Options
                        </h2>

                        <div className="space-y-4">
                            <Label className="text-base font-semibold">How do you want to receive your order?</Label>
                            <div className="grid gap-3">
                                {deliveryTypes.map((type) => (
                                    <div
                                        key={type.id}
                                        onClick={() => handleDeliveryTypeChange(type.id)}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            deliveryType === type.id
                                                ? 'border-primary bg-primary/5'
                                                : 'border-border hover:border-primary/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className="text-2xl">{type.icon}</span>
                                            <div className="flex-1">
                                                <p className="font-semibold text-base">{type.label}</p>
                                                <p className="text-sm text-muted-foreground">{type.desc}</p>
                                            </div>
                                            {deliveryType === type.id && (
                                                <Check className="h-6 w-6 text-primary" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {distanceError && (
                            <Alert variant="destructive">
                                <Navigation className="h-4 w-4" />
                                <AlertDescription>{distanceError}</AlertDescription>
                            </Alert>
                        )}

                        {deliveryType === 'pickup' && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <Store className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-blue-900">Pickup at Store</p>
                                        <p className="text-sm text-blue-700">
                                            You will pick up your order at the seller's store. No delivery fee applied.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <Separator />

                        {deliveryType === 'delivery' && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                                        <MapPin className="h-5 w-5" />
                                        Select Delivery Location
                                    </Label>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Click on the map to select your delivery address. The location must be within 5km of the store.
                                    </p>
                                    
                                    <DeliveryMapPicker
                                        sellerLocation={getSellerLocation()}
                                        onLocationSelect={handleLocationSelect}
                                        maxDistance={5}
                                        initialLocation={deliveryLocation}
                                    />
                                </div>

                                <Separator />
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <Label className="text-base font-semibold flex items-center gap-2 mb-3">
                                    <Clock className="h-5 w-5" />
                                    {deliveryType === 'pickup' ? 'When do you want to pick up?' : 'When should we deliver?'}
                                </Label>
                                <Input
                                    type="time"
                                    value={preorderTime}
                                    onChange={(e) => setPreorderTime(e.target.value)}
                                    className="h-12 text-base"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    {deliveryType === 'pickup' 
                                        ? 'Tell the seller when you plan to pick up your order'
                                        : 'Tell the driver when to deliver your order'
                                    }
                                </p>
                            </div>

                            {/* Preorder Date - Optional for advance orders */}
                            <div className="border rounded-lg p-4 bg-secondary/30">
                                <div className="flex items-center gap-2 mb-3">
                                    <input
                                        type="checkbox"
                                        id="enablePreorder"
                                        checked={!!preorderDate}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                // Set default to tomorrow
                                                const tomorrow = new Date();
                                                tomorrow.setDate(tomorrow.getDate() + 1);
                                                setPreorderDate(tomorrow.toISOString().split('T')[0]);
                                            } else {
                                                setPreorderDate('');
                                            }
                                        }}
                                        className="w-4 h-4"
                                    />
                                    <Label htmlFor="enablePreorder" className="text-base font-semibold cursor-pointer">
                                        Preorder for a future date
                                    </Label>
                                </div>
                                {preorderDate && (
                                    <div className="space-y-3">
                                        <div>
                                            <Label className="text-sm">Select Date</Label>
                                            <Input
                                                type="date"
                                                value={preorderDate}
                                                min={new Date().toISOString().split('T')[0]}
                                                max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                                                onChange={(e) => setPreorderDate(e.target.value)}
                                                className="h-10"
                                            />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Order will be prepared for this date. Maximum 30 days in advance.
                                            </p>
                                        </div>
                                        <Alert>
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription className="text-sm">
                                                Seller needs to approve your preorder request before payment.
                                            </AlertDescription>
                                        </Alert>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label className="text-base font-semibold mb-2 block">Note for seller (optional)</Label>
                                <Textarea
                                    placeholder="Any special requests? e.g., extra spicy, no onions, etc."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="text-base min-h-[80px]"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <CreditCard className="h-6 w-6" />
                            {t('checkout.selectPayment')}
                        </h2>
                        <div className="grid gap-3">
                            {paymentMethods.map((method) => (
                                <div
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                        paymentMethod === method.id
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-2xl">{method.icon}</span>
                                        <div className="flex-1">
                                            <p className="font-semibold text-base">{method.label}</p>
                                            <p className="text-sm text-muted-foreground">{method.desc}</p>
                                        </div>
                                        {paymentMethod === method.id && (
                                            <Check className="h-6 w-6 text-primary" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Check className="h-6 w-6" />
                            {t('checkout.confirmOrder')}
                        </h2>
                        <Card>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Store</p>
                                    <p className="font-medium">{checkoutSeller.sellerName}</p>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Delivery Type</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">
                                            {deliveryType === 'pickup' ? '🏪' : '🚗'}
                                        </span>
                                        <p className="font-medium">
                                            {deliveryType === 'pickup' ? 'Pickup at Store' : 'Delivery by Driver'}
                                        </p>
                                    </div>
                                </div>

                                {preorderTime && (
                                    <>
                                        <Separator />
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                            <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
                                                {deliveryType === 'pickup' ? 'Pickup at' : 'Delivery at'}: {preorderTime}
                                            </p>
                                        </div>
                                    </>
                                )}

                                {deliveryType === 'delivery' && deliveryLocation && (
                                    <>
                                        <Separator />
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Delivery Address</p>
                                            <p className="font-medium">{deliveryLocation.address}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Coordinates: {deliveryLocation.lat.toFixed(4)}, {deliveryLocation.lng.toFixed(4)}
                                            </p>
                                        </div>
                                    </>
                                )}
                                <Separator />
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">Payment Method</p>
                                    <p className="font-medium">
                                        {paymentMethods.find(m => m.id === paymentMethod)?.label}
                                    </p>
                                </div>
                                {notes && (
                                    <>
                                        <Separator />
                                        <div>
                                            <p className="text-sm text-muted-foreground mb-1">Notes</p>
                                            <p className="text-sm">{notes}</p>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="p-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-base">
                                        <span className="text-muted-foreground">{t('cart.subtotal')}</span>
                                        <span>Rp {subtotal.toLocaleString('id-ID')}</span>
                                    </div>
                                    <div className="flex justify-between text-base">
                                        <span className="text-muted-foreground">
                                            {deliveryType === 'pickup' ? 'Pickup (Free)' : t('cart.deliveryFee')}
                                        </span>
                                        <span>Rp {deliveryFee.toLocaleString('id-ID')}</span>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between font-bold text-xl pt-2">
                                        <span>{t('cart.total')}</span>
                                        <span className="text-primary">Rp {total.toLocaleString('id-ID')}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                );

            default:
                return null;
        }
    };

    if (checkoutSeller) {
        return (
            <Layout>
                <div className="container py-8">
                    <div className="max-w-2xl mx-auto">
                        <Button variant="ghost" className="mb-4 gap-2" onClick={cancelCheckout}>
                            <ArrowLeft className="h-5 w-5" />
                            Back to Cart
                        </Button>
                        <ProgressSteps steps={steps} currentStep={currentStep} />
                        <div className="mt-8">
                            {renderStepContent()}
                        </div>
                        <div className="flex gap-4 mt-8">
                            {currentStep > 1 && (
                                <Button 
                                    variant="outline" 
                                    size="lg" 
                                    className="flex-1 gap-2 h-12"
                                    onClick={prevStep}
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                    {t('common.back')}
                                </Button>
                            )}
                            {currentStep < 4 ? (
                                <Button 
                                    size="lg" 
                                    className="flex-1 gap-2 h-12"
                                    onClick={nextStep}
                                >
                                    {t('common.next')}
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                            ) : (
                                <Button 
                                    size="lg" 
                                    className="flex-1 gap-2 h-12"
                                    onClick={handleCheckout}
                                    disabled={loading}
                                >
                                    {loading ? t('cart.processing') : t('cart.placeOrder')}
                                    {!loading && <Check className="h-5 w-5" />}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="container py-8">
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <ShoppingBag className="h-7 w-7" />
                    {t('cart.title')}
                    {items.length > 0 && <span className="text-muted-foreground text-lg font-normal">({items.length} {t('cart.items')})</span>}
                </h1>

                {items.length === 0 ? (
                    <Card className="py-16 text-center">
                        <CardContent>
                            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                            <h2 className="text-xl font-semibold mb-2">{t('cart.empty')}</h2>
                            <p className="text-muted-foreground mb-6">Your cart is empty</p>
                            <Button asChild size="lg" className="gap-2 h-12">
                                <Link to="/products">
                                    <ShoppingBag className="h-5 w-5" />
                                    {t('cart.continueShopping')}
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {sellerGroups.map((group) => {
                            const isExpanded = expandedSellers[group.sellerId] !== false;
                            const sellerTotal = getSellerTotal(group.sellerId);
                            const hasStoreName = group.sellerName !== group.sellerRealName && group.sellerRealName !== 'Unknown';
                            
                            return (
                                <Card key={group.sellerId}>
                                    <CardHeader className="pb-3">
                                        <div 
                                            className="flex items-center justify-between cursor-pointer"
                                            onClick={() => toggleSeller(group.sellerId)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <Store className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">{group.sellerName}</h3>
                                                    {hasStoreName && (
                                                        <p className="text-xs text-muted-foreground">by {group.sellerRealName}</p>
                                                    )}
                                                    <p className="text-sm text-muted-foreground">{group.items.length} items</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-bold text-lg">Rp {sellerTotal.toLocaleString('id-ID')}</p>
                                                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    
                                    {isExpanded && (
                                        <CardContent className="pt-0">
                                            <Separator className="mb-4" />
                                            <div className="space-y-3 mb-4">
                                                {group.items.map((item) => {
                                                    const unitPrice = item.variant ? item.variant.price : item.product.price;
                                                    const optionAdjust = (item.selectedOptions || []).reduce((sum, o) => sum + (o.priceAdjust || 0), 0);
                                                    const linePrice = unitPrice + optionAdjust;
                                                    
                                                    return (
                                                        <div key={`${item.product._id}-${item.variant?.name || ''}`} className="flex gap-3 p-3 bg-secondary/30 rounded-lg">
                                                            <div className="h-16 w-16 rounded-md overflow-hidden border shrink-0">
                                                                {resolveImageUrl(item.product.images?.[0]) ? (
                                                                    <img
                                                                        src={resolveImageUrl(item.product.images?.[0])}
                                                                        alt={item.product.name}
                                                                        className="h-full w-full object-cover"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                ) : null}
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-between min-w-0">
                                                                <div className="flex justify-between items-start gap-2">
                                                                    <div className="min-w-0">
                                                                        <h4 className="font-medium text-sm truncate">{item.product.name}</h4>
                                                                        {item.variant && (
                                                                            <p className="text-xs text-primary">{item.variant.name}</p>
                                                                        )}
                                                                    </div>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                                                                        onClick={() => removeFromCart(item.product._id, item.variant, item.selectedOptions)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="flex justify-between items-center">
                                                                    <p className="font-semibold">Rp {linePrice.toLocaleString('id-ID')}</p>
                                                                    <div className="flex items-center gap-1 border rounded-md p-0.5">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            onClick={() => updateQuantity(item.product._id, item.quantity - 1, item.variant, item.selectedOptions)}
                                                                            disabled={item.quantity <= 1}
                                                                        >
                                                                            <Minus className="h-3 w-3" />
                                                                        </Button>
                                                                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-7 w-7"
                                                                            onClick={() => updateQuantity(item.product._id, item.quantity + 1, item.variant, item.selectedOptions)}
                                                                            disabled={item.quantity >= item.product.stock}
                                                                        >
                                                                            <Plus className="h-3 w-3" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <Button 
                                                className="w-full h-11 gap-2" 
                                                onClick={() => startCheckout(group)}
                                            >
                                                <ShoppingBag className="h-5 w-5" />
                                                Checkout from {group.sellerName}
                                            </Button>
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}

export default Cart;
