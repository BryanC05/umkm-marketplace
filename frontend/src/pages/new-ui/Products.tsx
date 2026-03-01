import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, Grid3X3, List, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from "@/components/products/ProductCard";
import api from "@/utils/api";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

const normalizeProductsPayload = (payload: any) => {
  if (Array.isArray(payload)) {
    return { products: payload, pagination: { page: 1, total: payload.length, pages: 1 } };
  }
  if (Array.isArray(payload?.products)) {
    return { products: payload.products, pagination: payload.pagination || { page: 1, total: payload.products.length, pages: 1 } };
  }
  if (Array.isArray(payload?.data)) {
    return { products: payload.data, pagination: payload.pagination || { page: 1, total: payload.data.length, pages: 1 } };
  }
  return { products: [], pagination: { page: 1, total: 0, pages: 1 } };
};

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const categoryOptions = [
    { id: "all", name: t("products.allCategories") },
    { id: "food", name: t("categories.food") },
    { id: "clothing", name: t("categories.clothing") },
    { id: "electronics", name: t("categories.electronics") },
    { id: "handicrafts", name: t("categories.handicrafts") },
    { id: "home", name: t("categories.home") },
    { id: "beauty", name: t("categories.beauty") },
    { id: "agriculture", name: t("categories.agriculture") },
  ];

  const sortOptions = [
    { id: "newest", name: t("products.newest") },
    { id: "price-low", name: t("products.priceLowHigh") },
    { id: "price-high", name: t("products.priceHighLow") },
    { id: "rating", name: t("products.highestRated") },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.append("search", search);
        if (category && category !== "all") params.append("category", category);
        if (sort) params.append("sort", sort);
        params.append("page", String(page));
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
  }, [search, category, sort, page]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category && category !== "all") params.set("category", category);
    if (search) params.set("search", search);
    setSearchParams(params);
  }, [category, search, setSearchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="container py-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-wide mb-2">{t("products.browseProducts")}</h1>
        <p className="text-muted-foreground">
          {loading ? t("common.loading") : `${t("products.showing")} ${pagination.total} ${t("products.productsCount")}`}
        </p>
      </motion.div>
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("products.searchPlaceholder")}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-card h-10 w-full"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="md:hidden flex-shrink-0"
            onClick={() => setShowMobileFilters(!showMobileFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {t("navigation.filters") || "Filters"}
          </Button>
        </div>

        <div className={`mt-3 gap-3 md:mt-0 md:flex ${showMobileFilters ? "flex flex-col" : "hidden"}`}>
          <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
            <SelectTrigger className="w-full md:w-40 bg-card">
              <SlidersHorizontal className="h-4 w-4 mr-2 hidden md:inline-block" />
              <SelectValue placeholder={t("products.allCategories")} />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-full md:w-40 bg-card">
              <SelectValue placeholder={t("products.sortBy")} />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1 ml-auto">
            <Button variant={view === "grid" ? "default" : "outline"} size="icon" onClick={() => setView("grid")} type="button">
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant={view === "list" ? "default" : "outline"} size="icon" onClick={() => setView("list")} type="button">
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="endfield-card bg-card animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-muted rounded w-1/3" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="endfield-card bg-card p-12 text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">{t("products.noProducts")}</p>
          <Button variant="outline" onClick={() => { setSearch(""); setCategory("all"); }}>
            {t("products.clearFilters")}
          </Button>
        </div>
      ) : (
        <div className={view === "grid"
          ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
          : "flex flex-col gap-3"
        }>
          {products.map((product: any, i: number) => (
            <ProductCard key={product._id || product.id} product={product} index={i} />
          ))}
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-4">
            {t("products.page")} {page} / {pagination.pages}
          </span>
          <Button variant="outline" size="icon" disabled={page >= pagination.pages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
