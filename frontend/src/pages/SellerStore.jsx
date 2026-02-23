
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Store, Star, Package, ArrowLeft, Phone, Clock, MessageCircle, Share2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';
import ProductCard from '../components/ProductCard';
import Layout from '@/components/layout/Layout';
import { ProductsGridSkeleton, SellersListSkeleton } from '@/components/ui/skeleton';
import './SellerStore.css';

function SellerStore() {
    const { id } = useParams();
    const sellerId = id && id !== 'undefined' && id !== 'null' ? id : null;
    const navigate = useNavigate();
    const { user } = useAuthStore();

    // Fetch seller details
    const { data: seller, isLoading: sellerLoading } = useQuery({
        queryKey: ['seller', sellerId],
        queryFn: async () => {
            if (!sellerId) return null;
            const response = await api.get(`/users/seller/${sellerId}`);
            return response.data;
        },
        enabled: !!sellerId,
    });

    // Fetch seller's products
    const { data: products, isLoading: productsLoading } = useQuery({
        queryKey: ['sellerProducts', sellerId],
        queryFn: async () => {
            if (!sellerId) return [];
            const response = await api.get(`/products/seller/${sellerId}`);
            return response.data;
        },
        enabled: !!sellerId,
    });

    if (sellerLoading) {
        return (
            <Layout>
                <div className="seller-store-page container py-8">
                    <ProductsGridSkeleton count={8} />
                </div>
            </Layout>
        );
    }

    if (!seller) {
        return (
            <Layout>
                <div className="seller-store-page container py-8">
                    <div className="not-found text-center">
                        <h2 className="text-2xl font-bold mb-2">Store Not Found</h2>
                        <p className="text-muted-foreground mb-4">This seller does not exist or is no longer available.</p>
                        <Link to="/nearby" className="btn-primary">Find Nearby Sellers</Link>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="seller-store-page container py-8">
                {/* Back Button */}
                <Link to="/nearby" className="back-link inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground">
                    <ArrowLeft size={20} />
                    Back to Nearby Sellers
                </Link>

                {/* Store Header */}
                <div className="store-header flex flex-col md:flex-row gap-8 mb-12 p-6 border rounded-xl bg-card">
                    <div className="store-image shrink-0">
                        {seller.profileImage ? (
                            <img src={seller.profileImage} alt={seller.businessName} className="w-32 h-32 rounded-full object-cover" />
                        ) : (
                            <div className="store-placeholder w-32 h-32 rounded-full flex items-center justify-center text-3xl font-bold text-white">
                                {(seller.businessName || seller.name || 'S')
                                    .split(' ')
                                    .map(w => w[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2)}
                            </div>
                        )}
                    </div>
                    <div className="store-info flex-1">
                        <div className="store-badges flex gap-2 mb-2">
                            <span className="business-type text-xs px-2 py-1 bg-secondary rounded-full capitalize">{seller.businessType} Enterprise</span>
                            {seller.isVerified && (
                                <span className="verified-badge text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">✓ Verified</span>
                            )}
                        </div>
                        <h1 className="store-name text-3xl font-bold mb-1">{seller.businessName || seller.name}</h1>
                        <p className="store-owner text-muted-foreground mb-4">by {seller.name}</p>

                        <div className="store-meta flex flex-wrap gap-4 mb-6 text-sm">
                            {seller.rating > 0 && (
                                <div className="meta-item rating flex items-center gap-1">
                                    <Star size={16} fill="#f59e0b" className="text-yellow-500" />
                                    <span>{seller.rating.toFixed(1)}</span>
                                </div>
                            )}
                            {seller.location?.city && (
                                <div className="meta-item location flex items-center gap-1 text-muted-foreground">
                                    <MapPin size={16} />
                                    <span>{seller.location.city}, {seller.location.state}</span>
                                </div>
                            )}
                            {seller.location?.address && (
                                <div className="meta-item address hidden md:flex items-center gap-1 text-muted-foreground">
                                    <span>{seller.location.address}</span>
                                </div>
                            )}
                        </div>

                        <div className="store-stats flex gap-6 text-sm mb-6">
                            <div className="stat flex items-center gap-2">
                                <Package size={16} />
                                <span>{products?.length || 0} Products</span>
                            </div>
                            <div className="stat flex items-center gap-2">
                                <Clock size={16} />
                                <span>Member since {new Date(seller.createdAt).getFullYear()}</span>
                            </div>
                        </div>

                        {/* Chat Button */}
                        {user && user.role === 'buyer' && (
                            <button
                                className="btn-chat-store inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                                onClick={() => navigate(`/chat?seller=${sellerId}`)}
                            >
                                <MessageCircle size={18} />
                                Chat with Store
                            </button>
                        )}
                        
                        {/* Share Store Location Button */}
                        {seller.location?.coordinates && (
                            <button
                                className="btn-share-store inline-flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors ml-2"
                                onClick={() => {
                                    const [lng, lat] = seller.location.coordinates;
                                    const mapUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16`;
                                    const shareText = `Check out ${seller.businessName || seller.name}!\n${mapUrl}`;
                                    
                                    if (navigator.share) {
                                        navigator.share({
                                            title: seller.businessName || seller.name,
                                            text: shareText,
                                        }).catch(() => {
                                            navigator.clipboard.writeText(shareText);
                                            alert('Store link copied to clipboard!');
                                        });
                                    } else {
                                        navigator.clipboard.writeText(shareText);
                                        alert('Store link copied to clipboard!');
                                    }
                                }}
                            >
                                <Share2 size={18} />
                                Share Location
                            </button>
                        )}
                    </div>
                </div>

                {/* Products Section */}
                <section className="store-products">
                    <h2 className="text-2xl font-bold mb-6">Products from this Store</h2>

                    {productsLoading ? (
                        <div className="loading">Loading products...</div>
                    ) : products?.length === 0 ? (
                        <div className="no-products text-center py-12 border rounded-lg">
                            <p className="text-muted-foreground">This seller hasn't listed any products yet.</p>
                        </div>
                    ) : (
                        <div className="products-grid grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {products?.map((product) => (
                                <ProductCard key={product._id} product={product} />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </Layout>
    );
}

export default SellerStore;
