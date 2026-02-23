import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, ArrowLeft, Package } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ProductCard from '@/components/products/ProductCard';
import { ProductsGridSkeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useSavedProductsStore } from '@/store/savedProductsStore';
import { useAuthStore } from '@/store/authStore';

function SavedProducts() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const { savedProducts, isLoading, fetchSavedProducts } = useSavedProductsStore();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/saved-products' } });
      return;
    }
    fetchSavedProducts();
  }, [isAuthenticated, navigate, fetchSavedProducts]);

  return (
    <Layout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-3">
            <Heart className="h-6 w-6 text-red-500" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Saved Products</h1>
              <p className="text-muted-foreground text-sm">
                Your favorite items in one place
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <ProductsGridSkeleton count={8} />}

        {/* Empty State */}
        {!isLoading && savedProducts.length === 0 && (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No saved products yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Browse our marketplace and save products you love. They'll appear here for easy access.
            </p>
            <Button onClick={() => navigate('/products')}>
              <Package className="h-4 w-4 mr-2" />
              Browse Products
            </Button>
          </div>
        )}

        {/* Saved Products Grid */}
        {!isLoading && savedProducts.length > 0 && (
          <>
            <p className="text-muted-foreground mb-6">
              {savedProducts.length} {savedProducts.length === 1 ? 'product' : 'products'} saved
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {savedProducts.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default SavedProducts;