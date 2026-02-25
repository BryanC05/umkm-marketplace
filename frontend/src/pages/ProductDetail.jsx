import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Store, Phone, Star, ArrowLeft, ShoppingCart, MessageCircle, Shield, Package, Heart, Share2, Flag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore, useAuthStore } from '../store/authStore';
import { useSavedProductsStore } from '../store/savedProductsStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { resolveImageUrl } from '@/utils/imageUrl';
import { Skeleton } from '@/components/ui/skeleton';
import ReviewSection from '../components/ReviewSection';

function MarkdownContent({ content }) {
  if (!content) return null;

  const paragraphs = content.split(/\n\n+/);
  
  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => {
        const formattedText = paragraph
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/__(.*?)__/g, '<strong>$1</strong>')
          .replace(/_(.*?)_/g, '<em>$1</em>');
        
        return (
          <p 
            key={index} 
            className="text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedText }}
          />
        );
      })}
    </div>
  );
}

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const { addToCart } = useCartStore();
  const { user } = useAuthStore();
  const { t } = useTranslation();

  // Track where user came from for back navigation
  useEffect(() => {
    const chatReturnUrl = sessionStorage.getItem('chatReturnUrl');
    if (!chatReturnUrl || chatReturnUrl !== location.pathname) {
      const referrer = document.referrer;
      if (referrer && referrer.includes('/products')) {
        sessionStorage.setItem('productDetailReturnUrl', '/products');
      } else if (!sessionStorage.getItem('productDetailReturnUrl')) {
        sessionStorage.setItem('productDetailReturnUrl', '/products');
      }
    }
  }, [location.pathname]);

  const handleBack = () => {
    const returnUrl = sessionStorage.getItem('productDetailReturnUrl') || '/products';
    navigate(returnUrl);
  };

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const response = await api.get(`/products/${id}`);
      return response.data;
    },
  });

  // Compute dynamic price
  const getUnitPrice = () => {
    if (!product) return 0;
    let price = product.hasVariants && selectedVariant ? selectedVariant.price : product.price;
    Object.values(selectedOptions).forEach(sel => {
      price += (sel.priceAdjust || 0);
    });
    return price;
  };

  const getAvailableStock = () => {
    if (!product) return 0;
    if (product.hasVariants && selectedVariant) return selectedVariant.stock;
    return product.stock;
  };

  const handleOptionSelect = (groupName, optionName, priceAdjust, isMultiple) => {
    setSelectedOptions(prev => {
      if (isMultiple) {
        const current = prev[groupName] || { chosen: [], priceAdjust: 0 };
        const isSelected = current.chosen.includes(optionName);
        const group = product.optionGroups.find(g => g.name === groupName);
        if (isSelected) {
          const newChosen = current.chosen.filter(n => n !== optionName);
          const newAdjust = newChosen.reduce((sum, n) => {
            const opt = group?.options.find(o => o.name === n);
            return sum + (opt?.priceAdjust || 0);
          }, 0);
          return { ...prev, [groupName]: { groupName, chosen: newChosen, priceAdjust: newAdjust } };
        } else {
          const newChosen = [...current.chosen, optionName];
          return { ...prev, [groupName]: { groupName, chosen: newChosen, priceAdjust: current.priceAdjust + priceAdjust } };
        }
      } else {
        return { ...prev, [groupName]: { groupName, chosen: [optionName], priceAdjust } };
      }
    });
  };

  const handleAddToCart = () => {
    if (!product) return;
    if (product.hasVariants && !selectedVariant) {
      alert('Please select a variant first.');
      return;
    }
    // Check required option groups
    const missingRequired = product.optionGroups?.filter(g => g.required && (!selectedOptions[g.name] || selectedOptions[g.name].chosen.length === 0));
    if (missingRequired?.length > 0) {
      alert(`Please select: ${missingRequired.map(g => g.name).join(', ')}`);
      return;
    }
    const variant = selectedVariant ? { name: selectedVariant.name, price: selectedVariant.price } : null;
    const optionsArr = Object.values(selectedOptions).filter(o => o.chosen.length > 0);
    addToCart(product, quantity, variant, optionsArr);
    alert(`Added ${quantity} ${product.name} to cart!`);
  };

  const { isProductSaved, toggleSaveProduct, isLoading: isSaveLoading } = useSavedProductsStore();
  const isSaved = product ? isProductSaved(product._id) : false;

  const handleToggleSave = async () => {
    if (!product) return;
    const success = await toggleSaveProduct(product._id);
    if (success) {
      // Optional: show toast notification
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image Skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-[400px] w-full rounded-lg" />
              <div className="flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-20 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Details Skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-10 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <div className="flex gap-2 pt-4">
                <Skeleton className="h-12 w-40" />
                <Skeleton className="h-12 w-40" />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="container py-20">
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">{t('productDetail.productNotFound')}</h2>
            <p className="text-muted-foreground mb-4">{t('productDetail.productNotFoundDesc')}</p>
            <Button onClick={() => navigate('/products')}>{t('profile.browseProducts')}</Button>
          </div>
        </div>
      </Layout>
    );
  }

  const productImages = Array.isArray(product.images)
    ? product.images.map((img) => resolveImageUrl(img)).filter(Boolean)
    : [];
  const seller = typeof product.seller === 'object' && product.seller !== null ? product.seller : null;
  const sellerId =
    (typeof product.seller === 'string' ? product.seller : null) ||
    seller?._id ||
    seller?.id ||
    null;

  return (
    <Layout>
      <div className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={handleBack} className="mb-6 gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t('productDetail.back')}
        </Button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-xl overflow-hidden border">
              {productImages[selectedImage] ? (
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </div>

            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {productImages.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-primary' : 'border-transparent hover:border-muted-foreground/30'
                      }`}
                  >
                    <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category & Title */}
            <div>
              <Badge variant="secondary" className="mb-3 capitalize">
                {product.category}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{product.name}</h1>

              {/* Seller Info Card */}
              {sellerId ? (
                <Link to={`/store/${sellerId}`}>
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Store className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-lg">{seller?.businessName || t('productDetail.localStore')}</span>
                            {seller?.isVerified && (
                              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                <Shield className="h-3 w-3 mr-1" />
                                {t('productDetail.verified')}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            {seller?.rating > 0 && (
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">{seller.rating.toFixed(1)}</span>
                              </div>
                            )}
                            <span className="text-sm text-muted-foreground">
                              {product.location?.city || 'Bekasi'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <Store className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-lg">{t('productDetail.localStore')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Description */}
            <div>
              <h3 className="font-semibold mb-2">{t('productDetail.description')}</h3>
              <div className="max-h-64 overflow-y-auto pr-2">
                <MarkdownContent content={product.description} />
              </div>
            </div>

            {/* Location */}
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="text-sm">
                <p className="font-medium">{product.location?.address || t('productDetail.localPickup')}</p>
                <p className="text-muted-foreground">{product.location?.city}, {product.location?.state}</p>
              </div>
            </div>

            {/* Price & Purchase Card */}
            <Card>
              <CardContent className="p-6 space-y-6">
                {/* Variant Selector */}
                {product.hasVariants && product.variants?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-3">Select Variant</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v) => (
                        <button
                          key={v.name}
                          type="button"
                          onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${selectedVariant?.name === v.name
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 hover:bg-muted border-border'
                            } ${v.stock <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                          disabled={v.stock <= 0}
                        >
                          <span>{v.name}</span>
                          <span className="block text-xs mt-0.5">Rp{v.price?.toLocaleString('id-ID')}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Option Groups */}
                {product.optionGroups?.length > 0 && product.optionGroups.map((group) => (
                  <div key={group.name}>
                    <h4 className="text-sm font-medium mb-2">
                      {group.name} {group.required && <span className="text-destructive">*</span>}
                      {group.multiple && <span className="text-xs text-muted-foreground ml-1">(select multiple)</span>}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((opt) => {
                        const isSelected = selectedOptions[group.name]?.chosen?.includes(opt.name);
                        return (
                          <button
                            key={opt.name}
                            type="button"
                            onClick={() => handleOptionSelect(group.name, opt.name, opt.priceAdjust || 0, group.multiple)}
                            className={`px-3 py-1.5 rounded-lg border text-sm transition-colors ${isSelected
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-muted/50 hover:bg-muted border-border'
                              }`}
                          >
                            {opt.name}
                            {opt.priceAdjust > 0 && <span className="text-xs ml-1">(+Rp{opt.priceAdjust.toLocaleString('id-ID')})</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Price Display */}
                <div className="flex justify-between items-baseline">
                  <div>
                    <span className="text-3xl font-bold text-primary">
                      Rp{getUnitPrice().toLocaleString('id-ID')}
                    </span>
                    <span className="text-muted-foreground ml-1">/ {product.unit || 'item'}</span>
                  </div>
                  <Badge variant={getAvailableStock() > 0 ? 'default' : 'destructive'}>
                    {getAvailableStock() > 0 ? `${getAvailableStock()} ${t('productDetail.inStock')}` : t('productDetail.outOfStock')}
                  </Badge>
                </div>

                {getAvailableStock() > 0 && (
                  <div className="space-y-4">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{t('productDetail.quantity')}:</span>
                      <div className="flex items-center border rounded-lg">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-l-lg text-lg font-bold disabled:opacity-50 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-medium">{quantity}</span>
                        <button
                          onClick={() => setQuantity(Math.min(getAvailableStock(), quantity + 1))}
                          disabled={quantity >= getAvailableStock()}
                          className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-r-lg text-lg font-bold disabled:opacity-50 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Add to Cart Button */}
                    <Button
                      onClick={(e) => {
                        handleAddToCart();
                        window.dispatchEvent(new CustomEvent('particle-burst', {
                          detail: { type: 'add-to-cart', x: e.clientX, y: e.clientY },
                        }));
                      }}
                      size="lg"
                      className="w-full gap-2"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {t('productDetail.addToCart')} - Rp{(getUnitPrice() * quantity).toLocaleString('id-ID')}
                    </Button>

                    {/* Save Product Button */}
                    {user && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="lg"
                          className="flex-1 gap-2"
                          onClick={async (e) => {
                            // Only burst when SAVING — not when removing
                            if (!isSaved) {
                              window.dispatchEvent(new CustomEvent('particle-burst', {
                                detail: { type: 'save', x: e.clientX, y: e.clientY },
                              }));
                            }
                            await handleToggleSave();
                          }}
                          disabled={isSaveLoading}
                        >
                          <Heart className={`h-5 w-5 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
                          {isSaved ? t('productDetail.saved') : t('productDetail.saveProduct')}
                        </Button>
                        <Button
                          variant="outline"
                          size="lg"
                          className="gap-2"
                          onClick={() => {
                            const url = window.location.href;
                            const text = `Check out ${product.name} on UMKM Marketplace!`;
                            if (navigator.share) {
                              navigator.share({ title: product.name, text, url });
                            } else {
                              navigator.clipboard.writeText(`${text} ${url}`);
                              alert('Link copied to clipboard!');
                            }
                          }}
                        >
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Section */}
                <div className="pt-4 border-t space-y-3">
                  {seller?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{t('productDetail.contact')}: {seller.phone}</span>
                    </div>
                  )}

                  {user && user.role === 'buyer' && sellerId && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => navigate(`/chat?seller=${sellerId}&from=product&productId=${product._id}`)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {t('productDetail.chatWithSeller')}
                    </Button>
                  )}

                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-2 text-muted-foreground"
                      onClick={async () => {
                        const reason = prompt('Why are you reporting this product?');
                        if (!reason) return;
                        try {
                          const { getApiUrl } = await import('../config');
                          await fetch(`${getApiUrl()}/reports/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
                            body: JSON.stringify({ targetType: 'product', targetId: product._id, reason }),
                          });
                          alert('Report submitted. Thank you!');
                        } catch (e) { alert('Failed to submit report'); }
                      }}
                    >
                      <Flag className="h-4 w-4" />
                      Report Product
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Tags */}
            {product.tags?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 text-muted-foreground">{t('productDetail.tags')}</h4>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews Section */}
            <ReviewSection productId={id} />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default ProductDetail;
