import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowRight, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import ProductCard from "@/components/products/ProductCard";
import api from "@/utils/api";
import { useTranslation } from "@/hooks/useTranslation";

const normalizeProductsPayload = (payload: any) => {
  if (Array.isArray(payload)) {
    return { products: payload, pagination: { total: payload.length } };
  }
  if (Array.isArray(payload?.products)) return payload;
  if (Array.isArray(payload?.data)) {
    return { products: payload.data, pagination: payload.pagination || { total: payload.data.length } };
  }
  return { products: [], pagination: { total: 0 } };
};

export default function Index() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);

  const categoryDefs = [
    { id: "food", name: t("categories.food"), icon: "🍜" },
    { id: "fashion", name: t("categories.fashion"), icon: "👕" },
    { id: "handicrafts", name: t("categories.handicrafts"), icon: "🎨" },
    { id: "beauty", name: t("categories.beauty"), icon: "💄" },
    { id: "electronics", name: t("categories.electronics"), icon: "📱" },
    { id: "home", name: t("categories.home"), icon: "🏠" },
    { id: "agriculture", name: t("categories.agriculture"), icon: "🌾" },
    { id: "other", name: t("categories.other"), icon: "🛠️" },
  ];

  useEffect(() => {
    const fetchCategoryCounts = async () => {
      try {
        const response = await api.get("/products/categories/counts");
        setCategoryCounts(response.data);
      } catch (error) {
        console.error("Failed to fetch category counts:", error);
      }
    };
    const fetchFeaturedProducts = async () => {
      try {
        const response = await api.get("/products?limit=6&sort=newest");
        const normalized = normalizeProductsPayload(response.data);
        setFeaturedProducts(normalized.products || []);
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
        setFeaturedProducts([]);
      }
    };
    fetchCategoryCounts();
    fetchFeaturedProducts();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-12 md:py-32 endfield-gradient">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-10 right-10 w-64 h-64 border border-primary/10 rotate-45" />
          <div className="absolute bottom-20 left-10 w-32 h-32 border border-primary/5 rotate-12" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/5" />
        </div>

        <div className="container relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-mono mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-glow" />
              {t("home.heroBadge")}
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-4 leading-tight">
              {t("home.heroHeading")}
              <span className="text-primary text-glow block sm:inline"> {t("home.heroHeadingAccent")}</span>
            </h1>

            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              {t("home.heroDescription")}
            </p>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("nav.searchPlaceholder")}
                  className="pl-9 h-12 bg-card border-border text-base w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="h-12 font-display tracking-wide px-6 w-full sm:w-auto">
                {t("common.search")}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold tracking-wide">{t("home.shopByCategory")}</h2>
          <Link to="/products" className="text-sm text-primary hover:underline flex items-center gap-1">
            {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 md:grid md:grid-cols-4 lg:grid-cols-8 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {categoryDefs.map((cat, i) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/products?category=${cat.id}`}
                className="endfield-card flex flex-col items-center gap-2 p-4 bg-card hover:endfield-glow hover:border-primary/30 transition-all duration-300 text-center"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {categoryCounts[cat.id] || 0} {t("products.productsCount")}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 container">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold tracking-wide">{t("home.featuredProducts")}</h2>
          <Link to="/products" className="text-sm text-primary hover:underline flex items-center gap-1">
            {t("common.viewAll")} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {featuredProducts.length > 0 ? (
            featuredProducts.map((product: any, i: number) => (
              <ProductCard key={product._id || product.id} product={product} index={i} />
            ))
          ) : (
            <p className="text-muted-foreground col-span-full text-center py-8">
              {t("common.loading")}
            </p>
          )}
        </div>
      </section>

      {/* Nearby Sellers Teaser */}
      <section className="py-12 container">
        <div className="endfield-card bg-card p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 text-primary text-sm font-mono mb-3">
                <MapPin className="h-4 w-4" />
                {t("nearby.findNearbySellers")}
              </div>
              <h2 className="font-display text-3xl font-bold mb-3">
                {t("home.featureNearby")}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("home.featureNearbyDesc")}
              </p>
              <Button className="font-display tracking-wide" asChild>
                <Link to="/nearby">
                  {t("home.findNearby")} <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="w-full md:w-80 h-48 rounded-sm bg-muted border border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-primary/50" />
                <p className="text-sm">{t("home.findNearby")}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="endfield-card bg-card p-8 text-center relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-3 relative">
            {t("home.ctaTitle")}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto relative">
            {t("home.ctaDescription")}
          </p>
          <Button size="lg" className="font-display tracking-wide relative" asChild>
            <Link to="/register">
              {t("home.startSelling")} <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </motion.div>
      </section>
    </div>
  );
}
