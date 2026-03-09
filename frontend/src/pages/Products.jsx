import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "@/components/products/ProductCard";
import { ProductsGridSkeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, SlidersHorizontal, X, Loader2, Package } from "lucide-react";
import api from "@/utils/api";
import { useTranslation } from "@/hooks/useTranslation";

const normalizeProductsPayload = (payload) => {
  if (Array.isArray(payload)) {
    return {
      products: payload,
      pagination: { page: 1, total: payload.length, pages: 1 },
    };
  }

  if (Array.isArray(payload?.products)) {
    return {
      products: payload.products,
      pagination: payload.pagination || { page: 1, total: payload.products.length, pages: 1 },
    };
  }

  if (Array.isArray(payload?.data)) {
    return {
      products: payload.data,
      pagination: payload.pagination || { page: 1, total: payload.data.length, pages: 1 },
    };
  }

  return { products: [], pagination: { page: 1, total: 0, pages: 1 } };
};

const Products = () => {
  const { t, language } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("category") || "all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [activeFilter, setActiveFilter] = useState("all");

  // Quick filter options - use translation
  const filterOptions = [
    { id: 'all', nameEn: t('products.all') || 'All', nameId: 'Semua' },
    { id: 'price-low', nameEn: 'Price ↑', nameId: 'Harga Rendah' },
    { id: 'price-high', nameEn: 'Price ↓', nameId: 'Harga Tinggi' },
    { id: 'rating', nameEn: '⭐ 4+', nameId: 'Rating 4+' },
    { id: 'new', nameEn: 'New', nameId: 'Terbaru' },
  ];

  // Categories matching the seeded data
  const categories = [
    { id: "all", name: t('products.allCategories') },
    { id: "food", name: t('categories.food') },
    { id: "clothing", name: t('categories.fashion') },
    { id: "electronics", name: t('categories.electronics') },
    { id: "handicrafts", name: t('categories.handicrafts') },
    { id: "home", name: t('categories.home') },
    { id: "beauty", name: t('categories.health') },
    { id: "agriculture", name: t('categories.agriculture') },
  ];

  const sortOptions = [
    { id: "newest", name: t('products.newest') },
    { id: "price-low", name: t('products.priceLowHigh') },
    { id: "price-high", name: t('products.priceHighLow') },
    { id: "rating", name: t('products.highestRated') },
  ];

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.append("search", searchQuery);
        if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
        if (sortBy) params.append("sort", sortBy);
        if (priceRange.min) params.append("minPrice", priceRange.min);
        if (priceRange.max) params.append("maxPrice", priceRange.max);
        params.append("page", pagination.page);
        params.append("limit", "20");

        const response = await api.get(`/products?${params.toString()}`);
        const normalized = normalizeProductsPayload(response.data);
        setProducts(normalized.products);
        setPagination(normalized.pagination);
      } catch (error) {
        console.error("Failed to fetch products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, selectedCategory, sortBy, priceRange.min, priceRange.max, pagination.page]);

  // Update URL params when category changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory && selectedCategory !== "all") {
      params.set("category", selectedCategory);
    }
    if (searchQuery) {
      params.set("search", searchQuery);
    }
    setSearchParams(params);
  }, [selectedCategory, searchQuery, setSearchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Search is already reactive via useEffect
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setPriceRange({ min: "", max: "" });
    setSearchQuery("");
  };

  const activeFiltersCount = [
    selectedCategory !== "all",
    priceRange.min,
    priceRange.max,
  ].filter(Boolean).length;

  const getCategoryName = (id) => {
    return categories.find(c => c.id === id)?.name || id;
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Produk UMKM</h1>
          <p className="text-muted-foreground">
            Jelajahi {pagination.total} produk dari penjual lokal
          </p>
        </div>

        {/* Search and Filters */}
        <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              type="search"
              placeholder={t('products.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2 bg-card border-border text-card-foreground hover:bg-accent"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Semua
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 bg-primary text-primary-foreground">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 bg-card border-border text-card-foreground hover:bg-accent"
            >
              Terbaru
            </Button>
            <Button
              type="button"
              variant="default"
              className="bg-primary hover:bg-primary/90"
            >
              Grid
            </Button>
            <Button
              type="button"
              variant="outline"
              className="bg-card border-border text-card-foreground hover:bg-accent"
            >
              List
            </Button>
          </div>
        </form>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filterOptions.map((filter) => (
            <button
              key={filter.id}
              onClick={() => {
                setActiveFilter(filter.id);
                // Apply filter
                if (filter.id === 'price-low') setSortBy('price-asc');
                else if (filter.id === 'price-high') setSortBy('price-desc');
                else if (filter.id === 'rating') setSortBy('rating');
                else if (filter.id === 'new') setSortBy('newest');
                else setSortBy('newest');
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeFilter === filter.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {language === 'id' ? filter.nameId : filter.nameEn}
            </button>
          ))}
        </div>

        {/* Active Filters */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {selectedCategory !== "all" && (
              <Badge variant="secondary" className="gap-1">
                {getCategoryName(selectedCategory)}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setSelectedCategory("all")}
                />
              </Badge>
            )}
            {(priceRange.min || priceRange.max) && (
              <Badge variant="secondary" className="gap-1">
                Rp{priceRange.min || "0"} - Rp{priceRange.max || "∞"}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => setPriceRange({ min: "", max: "" })}
                />
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t('products.clearAll')}
            </Button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          {showFilters && (
            <Card className="w-64 shrink-0 h-fit sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">{t('products.filters')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Range */}
                <div>
                  <h4 className="font-medium mb-3">{t('products.priceRange')}</h4>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({ ...priceRange, min: e.target.value })}
                      className="w-24"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({ ...priceRange, max: e.target.value })}
                      className="w-24"
                    />
                  </div>
                </div>

                {/* Seller Type */}
                <div>
                  <h4 className="font-medium mb-3">{t('products.sellerType')}</h4>
                  <div className="space-y-2">
                    {[t('products.verifiedSellers'), t('products.topRated'), t('products.newSellers')].map((type) => (
                      <div key={type} className="flex items-center gap-2">
                        <Checkbox id={type} />
                        <Label htmlFor={type} className="text-sm">
                          {type}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground">
                {loading ? t('common.loading') : `${t('products.showing')} ${products.length} ${t('products.of')} ${pagination.total} ${t('products.productsCount')}`}
              </p>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('products.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <ProductsGridSkeleton count={12} />
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-8">
                    <Button
                      variant="outline"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                    >
                      {t('products.previous')}
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                      {t('products.page')} {pagination.page} {t('products.of')} {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                    >
                      {t('products.next')}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card className="py-12 text-center">
                <CardContent>
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    {t('products.noProductsDesc')}
                  </p>
                  <Button variant="outline" onClick={clearFilters}>
                    {t('products.clearFilters')}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
