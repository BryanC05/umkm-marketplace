import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
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
        setFeaturedProducts(response.data.products || []);
        setStats(prev => ({ ...prev, products: response.data.pagination?.total || 0 }));
      } catch (error) {
        console.error('Failed to fetch featured products:', error);
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
    <Layout>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container py-12 md:py-20">
          <OnboardingPrompt />
          
          <div className="max-w-3xl mx-auto text-center mb-8">
            <Badge variant="secondary" className="mb-4 text-base px-4 py-1">
              {t('home.heroBadge')}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
              {t('home.heroHeading')}{" "}
              <span className="text-primary">{t('home.heroHeadingAccent')}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8">
              {t('home.heroDescription')}
            </p>

            <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('nav.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 text-lg bg-card border-2 shadow-lg"
                />
                <Button type="submit" size="lg" className="absolute right-2 top-1/2 -translate-y-1/2 h-10 gap-2">
                  <Search className="h-5 w-5" />
                  <span className="hidden sm:inline">{t('common.search')}</span>
                </Button>
              </div>
            </form>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/products">
                <Button size="lg" className="gap-2 w-full sm:w-auto h-12 text-base">
                  <ShoppingBag className="h-5 w-5" />
                  {t('home.browseProducts')}
                </Button>
              </Link>
              <Link to="/nearby">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto h-12 text-base">
                  <MapPin className="h-5 w-5" />
                  {t('home.findNearby')}
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-4 max-w-2xl mx-auto">
            {[
              { label: t('home.activeSellers'), value: stats.sellers.toString(), icon: Users },
              { label: t('home.productsListed'), value: stats.products.toString(), icon: ShoppingBag },
            ].map((stat) => (
              <Card key={stat.label} className="text-center w-36">
                <CardContent className="pt-4 pb-4">
                  <stat.icon className="h-7 w-7 mx-auto mb-2 text-primary" />
                  <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {categoryDefs.filter((cat) => (categoryCounts[cat.id] || 0) > 0).length > 0 && (
        <section className="py-12 bg-card">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold">{t('home.shopByCategory')}</h2>
                <p className="text-muted-foreground mt-1">{t('home.findProductsMatch')}</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {categoryDefs
                .filter((category) => (categoryCounts[category.id] || 0) > 0)
                .map((category) => (
                  <Link key={category.id} to={`/products?category=${category.id}`}>
                    <Card className="text-center hover:shadow-md hover:border-primary/30 transition-all cursor-pointer w-28">
                      <CardContent className="pt-4 pb-4 bg-card rounded-lg m-1">
                        <span className="text-3xl md:text-4xl mb-2 block">{category.icon}</span>
                        <h3 className="font-semibold text-sm text-foreground">{t(`categories.${category.key}`)}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{categoryCounts[category.id]}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">{t('home.featuredProducts')}</h2>
              <p className="text-muted-foreground mt-1">{t('home.handpickedItems')}</p>
            </div>
            <Link to="/products">
              <Button variant="ghost" size="lg" className="gap-2">
                {t('home.viewAll')} <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.length > 0 ? (
              featuredProducts.map((product) => (
                <ProductCard key={product._id || product.id} product={product} />
              ))
            ) : (
              <p className="text-muted-foreground col-span-full text-center py-8">
                {t('common.loading')}
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
    </Layout>
  );
};

export default Home;
