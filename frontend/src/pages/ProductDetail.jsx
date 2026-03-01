import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Store, Phone, Star, ArrowLeft, ShoppingCart, MessageCircle, Shield, Package, Heart, Share2, Flag } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCartStore, useAuthStore } from '../store/authStore';
import { useSavedProductsStore } from '../store/savedProductsStore';
import { useTranslation } from '../hooks/useTranslation';
import api from '../utils/api';
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
      <>
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
      </>
    );
  }

  if (!product) {
    return (
      <>
        <div className="container py-20">
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">{t('productDetail.productNotFound')}</h2>
            <p className="text-muted-foreground mb-4">{t('productDetail.productNotFoundDesc')}</p>
            <Button onClick={() => navigate('/products')}>{t('profile.browseProducts')}</Button>
          </div>
        </div>
      </>
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
    <>
      <div className="bg-background min-h-screen py-8">
      <div className="container">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Beranda</Link>
          <span>›</span>
          <Link to="/products" className="hover:text-foreground">Produk</Link>
          <span>›</span>
          <span className="text-foreground">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-xl overflow-hidden border border-border">
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
                    className={`aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-primary' : 'border-transparent hover:border-muted-foreground'
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
            {/* Seller Name */}
            <div>
              <Link to={sellerId ? `/store/${sellerId}` : '#'} className="text-primary hover:underline text-sm">
                {seller?.businessName || seller?.name || 'Toko'}
              </Link>
            </div>

            {/* Product Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>

            {/* Rating */}
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 fill-primary text-primary" />
              <span className="text-foreground font-medium">{product.rating?.toFixed(1) || '4.5'}</span>
              <span className="text-gray-400">({product.reviewCount || product.reviews?.length || 0} ulasan)</span>
            </div>

            {/* Price */}
            <div className="text-3xl font-bold text-primary">
              Rp{getUnitPrice().toLocaleString('id-ID')}
            </div>

            {/* Description */}
            <div>
              <p className="text-gray-400 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {product.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="bg-muted border-border text-muted-foreground">
                  #{tag}
                </Badge>
              )) || (
                <>
                  <Badge variant="outline" className="bg-muted border-border text-muted-foreground">#produk-lokal</Badge>
                  <Badge variant="outline" className="bg-muted border-border text-muted-foreground">#umkm</Badge>
                </>
              )}
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

                {getAvailableStock() > 0 && (
                  <div className="space-y-4">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center border border-border rounded-lg bg-muted">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="w-10 h-10 flex items-center justify-center hover:bg-accent rounded-l-lg text-lg font-bold text-foreground disabled:opacity-50 transition-colors"
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-medium text-foreground">{quantity}</span>
                        <button
                          onClick={() => setQuantity(Math.min(getAvailableStock(), quantity + 1))}
                          disabled={quantity >= getAvailableStock()}
                          className="w-10 h-10 flex items-center justify-center hover:bg-accent rounded-r-lg text-lg font-bold text-foreground disabled:opacity-50 transition-colors"
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
                      className="w-full gap-2 bg-primary hover:bg-primary/90 h-12"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      Tambah ke Keranjang
                    </Button>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="lg"
                        className="flex-1 gap-2 bg-transparent border-border text-foreground hover:bg-accent h-12"
                        onClick={async (e) => {
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
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="gap-2 bg-transparent border-border text-foreground hover:bg-accent h-12"
                        onClick={() => {
                          const url = window.location.href;
                          if (navigator.share) {
                            navigator.share({ title: product.name, url });
                          } else {
                            navigator.clipboard.writeText(url);
                            alert('Link disalin!');
                          }
                        }}
                      >
                        <Share2 className="h-5 w-5" />
                      </Button>
                    </div>
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
      </div>
    </>
  );
}

export default ProductDetail;
