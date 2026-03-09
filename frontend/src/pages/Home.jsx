import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/products/ProductCard";
import { OnboardingPrompt } from "@/components/ui/OnboardingTour";
import {
  ArrowRight,
  MapPin,
  Users,
  ShoppingBag,
  Search,
  CreditCard,
  Package,
  Handshake
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/utils/api";
import { useTranslation } from "@/hooks/useTranslation";

const normalizeProductsPayload = (payload) => {
  if (Array.isArray(payload)) {
    return {
      products: payload,
      pagination: { total: payload.length },
    };
  }

  if (Array.isArray(payload?.products)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return {
      products: payload.data,
      pagination: payload.pagination || { total: payload.data.length },
    };
  }

  return { products: [], pagination: { total: 0 } };
};

const categoryDefs = [
  { id: "food", key: "food", icon: "🍜", color: "bg-orange-100" },
  { id: "handicrafts", key: "handicrafts", icon: "🎨", color: "bg-purple-100" },
  { id: "clothing", key: "fashion", icon: "👗", color: "bg-pink-100" },
  { id: "beauty", key: "health", icon: "🌿", color: "bg-green-100" },
  { id: "home", key: "home", icon: "🏠", color: "bg-blue-100" },
  { id: "electronics", key: "electronics", icon: "📱", color: "bg-slate-100" },
];

const Home = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryCounts, setCategoryCounts] = useState({});
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [stats, setStats] = useState({ sellers: 0, products: 0 });

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const response = await api.get('/products/categories/counts');
        setCategoryCounts(response.data);
      } catch (error) {
        console.error('Failed to fetch category counts:', error);
      }
    };

    const fetchFeaturedProducts = async () => {
      try {
        const response = await api.get('/products?limit=4&sort=newest');
        const normalized = normalizeProductsPayload(response.data);
        setFeaturedProducts(normalized.products || []);
        setStats(prev => ({ ...prev, products: normalized.pagination?.total || 0 }));
      } catch (error) {
        console.error('Failed to fetch featured products:', error);
        setFeaturedProducts([]);
      }
    };

    const fetchSellerCount = async () => {
      try {
        const response = await api.get('/users/sellers/count');
        setStats(prev => ({ ...prev, sellers: response.data.count || 0 }));
      } catch (error) {
        console.error('Failed to fetch seller count:', error);
      }
    };

    fetchCategoryCounts();
    fetchFeaturedProducts();
    fetchSellerCount();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const howToSteps = [
    { icon: Search, title: t('onboarding.step1Title'), desc: t('onboarding.step1Desc') },
    { icon: ShoppingBag, title: t('onboarding.step2Title'), desc: t('onboarding.step2Desc') },
    { icon: CreditCard, title: t('onboarding.step3Title'), desc: t('onboarding.step3Desc') },
    { icon: Package, title: t('onboarding.step4Title'), desc: t('onboarding.step4Desc') },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-background">
        <div className="container py-16 md:py-24">
          <OnboardingPrompt />
          
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 px-4 py-1.5 text-sm border-primary/30 text-primary bg-primary/10 rounded-full inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              MARKETPLACE UMKM INDONESIA
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-4">
              Temukan Produk{" "}
              <span className="text-primary">Lokal Terbaik</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto">
              Hubungkan langsung dengan penjual UMKM di sekitarmu. Belanja mudah, dukung ekonomi lokal.
            </p>

            <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
                <Input
                  type="search"
                  placeholder={t('products.searchPlaceholder') || "Cari produk, toko, atau kategori..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-base bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-lg"
                />
                <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground">
                  Cari
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-foreground">Kategori</h2>
            <Link to="/products" className="text-primary text-sm hover:underline">
              Lihat semua →
            </Link>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
            {[
              { id: "food", name: "Makanan", icon: "🍜" },
              { id: "fashion", name: "Fashion", icon: "👕" },
              { id: "handicrafts", name: "Kerajinan", icon: "🎨" },
              { id: "beauty", name: "Kecantikan", icon: "💄" },
              { id: "electronics", name: "Elektronik", icon: "📱" },
              { id: "home", name: "Rumah Tangga", icon: "🏠" },
              { id: "agriculture", name: "Pertanian", icon: "🌾" },
              { id: "services", name: "Jasa", icon: "🛠️" },
            ].map((category) => {
              const count = categoryCounts[category.id] || 0;
              return (
                <Link key={category.id} to={`/products?category=${category.id}`}>
                  <div className="bg-card border border-border rounded-xl p-4 text-center hover:bg-accent hover:border-accent transition-all">
                    <span className="text-3xl mb-3 block">{category.icon}</span>
                    <p className="text-sm text-card-foreground font-medium mb-1">{category.name}</p>
                    <p className="text-xs text-muted-foreground">{count} produk</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-foreground">Produk Unggulan</h2>
            <Link to="/products" className="text-primary text-sm hover:underline">
              Lihat semua →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product} />
              ))
            ) : (
              <p className="text-gray-500 col-span-full text-center py-8">
                Memuat produk...
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="py-12 bg-card">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('home.featureEasy')}</h2>
            <p className="text-muted-foreground">{t('home.featureEasyDesc')}</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {howToSteps.map((step, index) => (
              <div key={index} className="text-center p-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mb-3">
                  <step.icon className="h-7 w-7 text-primary" />
                </div>
                <div className="text-sm font-bold text-muted-foreground mb-1">Step {index + 1}</div>
                <h3 className="font-semibold mb-1">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            {t('home.ctaTitle')}
          </h2>
          <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
            {t('home.ctaDescription')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/sell">
              <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto h-12">
                {t('home.startSelling')}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link to="/nearby">
              <Button size="lg" variant="outline" className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto h-12">
                {t('home.findShopsNearby')}
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};
export default Home;
