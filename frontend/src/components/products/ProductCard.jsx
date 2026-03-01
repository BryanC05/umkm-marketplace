import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useSavedProductsStore } from "@/store/savedProductsStore";
import { useAuthStore } from "@/store/authStore";
import { resolveImageUrl } from "@/utils/imageUrl";

const ProductCard = ({ product }) => {
    const productId = product._id || product.id;
    const productImage = resolveImageUrl(product.images?.[0] || product.image);
    const sellerName = product.seller?.businessName || product.seller?.name || (typeof product.seller === 'string' ? 'Store' : null);
    const productRating = product.rating || 4.5;
    const reviewCount = product.reviewCount || product.reviews?.length || 0;
    
    // Calculate discount if originalPrice exists
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const discountPercent = hasDiscount 
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) 
        : 0;

    const { isProductSaved, toggleSaveProduct, isLoading } = useSavedProductsStore();
    const { isAuthenticated } = useAuthStore();
    const isSaved = isProductSaved(productId);

    const handleSaveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) return;
        if (!isSaved) {
            window.dispatchEvent(new CustomEvent('particle-burst', {
                detail: { type: 'save', x: e.clientX, y: e.clientY },
            }));
        }
        await toggleSaveProduct(productId);
    };

    return (
        <Link to={`/product/${productId}`}>
            <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 bg-card border-border">
                <div className="relative aspect-square overflow-hidden bg-muted">
                    {productImage ? (
                      <img
                        src={productImage}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : null}
                    {!productImage && (
                      <div className="h-full w-full flex items-center justify-center text-gray-500 text-sm">
                        No image
                      </div>
                    )}
                    
                    {/* Discount Badge */}
                    {hasDiscount && (
                        <Badge className="absolute top-2 left-2 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                            -{discountPercent}%
                        </Badge>
                    )}

                    {/* Wishlist Button */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`absolute top-2 right-2 bg-background/60 hover:bg-background/80 backdrop-blur-sm rounded-full h-7 w-7 p-0 border-0 ${isSaved ? 'text-red-500' : 'text-foreground'}`}
                        onClick={handleSaveClick}
                        disabled={isLoading}
                        title="Save product"
                    >
                        <Heart
                            className={`h-3.5 w-3.5 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : ''}`}
                        />
                    </Button>
                </div>
                
                <CardContent className="p-3">
                    {/* Seller Name */}
                    {sellerName && (
                        <p className="text-xs text-gray-500 mb-1">{sellerName}</p>
                    )}
                    
                    {/* Product Name */}
                    <h3 className="font-medium text-sm text-card-foreground line-clamp-2 mb-2 min-h-[40px]">
                        {product.name}
                    </h3>
                    
                    {/* Price */}
                    <div className="mb-2 flex items-center gap-2">
                        <p className="text-primary font-bold text-sm">
                            Rp {product.price?.toLocaleString('id-ID')}
                        </p>
                        {hasDiscount && (
                            <p className="text-xs text-gray-500 line-through">
                                Rp {product.originalPrice?.toLocaleString('id-ID')}
                            </p>
                        )}
                    </div>
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-cyan-400 text-cyan-400" />
                        <span className="text-xs text-gray-400">{productRating.toFixed(1)} ({reviewCount})</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
};

export default ProductCard;
