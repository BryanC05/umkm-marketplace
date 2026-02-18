import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useSavedProductsStore } from "@/store/savedProductsStore";
import { useAuthStore } from "@/store/authStore";
import { PLACEHOLDER_IMAGE } from "@/utils/constants";
import { resolveImageUrl } from "@/utils/imageUrl";

const ProductCard = ({ product }) => {
    // Handle both API data structure and mock data structure
    const productId = product._id || product.id;
    const productImage = resolveImageUrl(product.images?.[0] || product.image) || PLACEHOLDER_IMAGE;
    const sellerName = product.seller?.businessName || product.seller?.name || 'Local Seller';
    const sellerRating = product.seller?.rating || product.rating || 4.5;

    const { isProductSaved, toggleSaveProduct, isLoading } = useSavedProductsStore();
    const { isAuthenticated } = useAuthStore();
    const isSaved = isProductSaved(productId);

    const handleSaveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isAuthenticated) {
            // Could redirect to login or show a toast
            return;
        }
        await toggleSaveProduct(productId);
    };

    // Handle location - can be string or object
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
                    <img
                        src={productImage}
                        alt={product.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                    />
                    {product.isNew && (
                        <Badge className="absolute top-2 left-2 bg-accent text-accent-foreground">
                            New
                        </Badge>
                    )}
                    {isAuthenticated && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-2 right-2 bg-white/80 hover:bg-white backdrop-blur-sm rounded-full"
                            onClick={handleSaveClick}
                            disabled={isLoading}
                        >
                            <Heart 
                                className={`h-4 w-4 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} 
                            />
                        </Button>
                    )}
                </div>
                <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        {product.category}
                    </p>
                    <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {product.name}
                    </h3>
                    <p className="text-lg font-bold text-primary mt-1">
                        Rp{product.price?.toLocaleString('id-ID') || product.price}
                    </p>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{getLocationDisplay()}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            <span>{sellerRating?.toFixed(1) || '4.5'}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
};

export default ProductCard;
