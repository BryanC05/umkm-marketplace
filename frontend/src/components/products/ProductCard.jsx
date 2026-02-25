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
    const sellerRating = product.seller?.rating || product.rating || 4.5;

    const { isProductSaved, toggleSaveProduct, isLoading } = useSavedProductsStore();
    const { isAuthenticated } = useAuthStore();
    const isSaved = isProductSaved(productId);

    const handleSaveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) return;
        // Only burst hearts when SAVING — not when removing from wishlist
        if (!isSaved) {
            window.dispatchEvent(new CustomEvent('particle-burst', {
                detail: { type: 'save', x: e.clientX, y: e.clientY },
            }));
        }
        await toggleSaveProduct(productId);
    };

    const getLocationDisplay = () => {
        if (!product.seller?.location && !product.location) return 'Nearby';
        const loc = product.seller?.location || product.location;
        if (typeof loc === 'string') return loc;
        return loc.city || loc.address || 'Nearby';
    };

    return (
        <Link to={`/product/${productId}`}>
            <Card className="group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                <div className="relative aspect-square overflow-hidden bg-muted">
                    {productImage ? (
                        <img
                            src={productImage}
                            alt={product.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                    ) : null}
                    {product.isNew && (
                        <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground text-sm px-2 py-1">
                            New
                        </Badge>
                    )}
                    {isAuthenticated && (
                        <Button
                            variant="ghost"
                            size="default"
                            className={`absolute top-2 right-2 bg-white/90 hover:bg-white backdrop-blur-sm rounded-full h-10 w-10 p-0 ${isSaved ? 'text-red-500' : 'text-gray-600'}`}
                            onClick={handleSaveClick}
                            disabled={isLoading}
                            title="Save product"
                        >
                            <Heart
                                className={`h-5 w-5 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : ''}`}
                            />
                        </Button>
                    )}
                </div>
                <CardContent className="p-4">
                    {product.category && (
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            {product.category}
                        </p>
                    )}
                    <h3 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                    <p className="text-xl font-bold text-primary mt-2">
                        Rp{product.price?.toLocaleString('id-ID') || product.price}
                    </p>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            <span className="truncate max-w-[100px]">{getLocationDisplay()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-warning text-warning" />
                            <span className="font-medium">{sellerRating?.toFixed(1) || '4.5'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
};

export default ProductCard;
