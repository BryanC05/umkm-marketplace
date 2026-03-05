import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Search,
  Menu,
  X,
  ShoppingCart,
  User,
  MapPin,
  Bell,
  Moon,
  Sun,
  Languages,
  Store,
  LogOut,
  Package,
  Heart,
  Sparkles,
  BarChart3,
  PlusCircle,
  ChevronDown,
  Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore, useCartStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useLanguageStore } from "@/store/languageStore";
import { useTranslation } from "@/hooks/useTranslation";
import api from "@/utils/api";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { t } = useTranslation();
  // All users are now sellers by default - no more buyer/seller classification
  const isSeller = true;

  const cartCount = getTotalItems();

  useEffect(() => {
    if (isAuthenticated && localStorage.getItem("token")) {
      api
        .get("/orders/my-orders")
        .then((res) => {
          const active = (res.data || []).filter((o) => !["delivered", "cancelled"].includes(o.status));
          setActiveOrderCount(active.length);
        })
        .catch(() => setActiveOrderCount(0));
      return;
    }
    setActiveOrderCount(0);
  }, [isAuthenticated, user]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const navLinks = [
    { to: "/", label: "Beranda" },
    { to: "/products", label: "Produk" },
    { to: "/nearby", label: "Penjual Terdekat" },
    { to: "/forums", label: "Forum" },
  ];

  const accountLinks = [
    { to: "/profile", label: t("nav.profile") || "Profil", icon: User },
    { to: "/orders", label: t("nav.orders") || "Pesanan", icon: Package, badge: activeOrderCount },
    { to: "/saved-products", label: t("nav.savedProducts") || "Tersimpan", icon: Heart },
    ...(isSeller
      ? [
          { to: "/seller/dashboard", label: t("nav.dashboard") || "Dashboard Penjual", icon: Store },
          { to: "/seller/product-tracking", label: "Product Tracker", icon: BarChart3 },
          { to: "/seller/add-product", label: "Tambah Produk", icon: PlusCircle },
        ]
      : []),
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const query = search.trim();
    if (!query) {
      navigate("/products");
      return;
    }
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMobileOpen(false);
    navigate("/");
  };

  const handleNavigate = (to) => {
    navigate(to);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="container flex h-16 items-center gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-lg">T</span>
          </div>
          <span className="font-display text-xl font-bold tracking-wider hidden sm:block">
            Troli<span className="text-primary">Toko</span>
          </span>
        </Link>

        <form onSubmit={submitSearch} className="flex-1 max-w-md hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder={t("nav.searchPlaceholder") || "Cari produk UMKM..."}
              className="pl-9 bg-muted border-border text-foreground placeholder:text-muted-foreground"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </form>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`relative px-3 py-2 text-sm font-medium rounded-sm transition-colors ${
                isActive(link.to) ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {isActive(link.to) && <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary" />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 ml-auto">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/notifications">
              <Bell className="h-5 w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/cart">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleLanguage} aria-label="Toggle Language">
            <Languages className="h-5 w-5" />
          </Button>

          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle Theme">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          <Button variant="ghost" size="icon" className="xl:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>

          <div className="hidden xl:flex items-center gap-2 ml-2">
            {isAuthenticated ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/orders" className="relative">
                    Pesanan
                    {activeOrderCount > 0 && (
                      <span className="ml-1 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                        {activeOrderCount > 9 ? "9+" : activeOrderCount}
                      </span>
                    )}
                  </Link>
                </Button>

                {isSeller && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1.5">
                        <Store className="h-4 w-4" />
                        Seller
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52 bg-white/50 dark:bg-black/50 backdrop-blur-sm border-border">
                      <DropdownMenuLabel>Seller Menu</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => handleNavigate("/seller/dashboard")}>
                        <Store className="h-4 w-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleNavigate("/seller/product-tracking")}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Product Tracker
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleNavigate("/seller/add-product")}>
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Product
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleNavigate("/logo-generator")}>
                        <Palette className="h-4 w-4 mr-2" />
                        Logo Generator
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="font-display tracking-wide gap-1.5">
                      <User className="h-4 w-4" />
                      {user?.name?.split(" ")[0] || "Akun"}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52 bg-white/50 dark:bg-black/50 backdrop-blur-sm border-border">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => handleNavigate("/profile")}>
                      <User className="h-4 w-4 mr-2" />
                      Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleNavigate("/saved-products")}>
                      <Heart className="h-4 w-4 mr-2" />
                      Tersimpan
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleNavigate("/notifications")}>
                      <Bell className="h-4 w-4 mr-2" />
                      Notifikasi
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" className="text-foreground hover:text-primary" asChild>
                  <Link to="/login">Masuk</Link>
                </Button>
                <Button size="sm" className="font-display tracking-wide bg-primary hover:bg-primary/90 text-primary-foreground" asChild>
                  <Link to="/register">Daftar</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="fixed top-16 right-0 z-50 h-[calc(100%-4rem)] w-80 max-w-[90vw] bg-card border-l border-border p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <span className="font-display text-lg font-bold tracking-wider">
                MART<span className="text-primary">KU</span>
              </span>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <form onSubmit={submitSearch} className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("nav.searchPlaceholder") || "Cari produk..."}
                className="pl-9 bg-surface"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </form>

            <nav className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium transition-colors ${
                    isActive(link.to)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              ))}
            </nav>

            {isAuthenticated && (
              <>
                <div className="my-4 border-t border-border" />
                <div className="space-y-1">
                  {accountLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center justify-between px-3 py-3 rounded-sm text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <span className="flex items-center gap-3">
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </span>
                      {!!link.badge && (
                        <span className="inline-flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                          {link.badge > 9 ? "9+" : link.badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="my-4 border-t border-border" />
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={toggleLanguage}>
                {language.toUpperCase()}
              </Button>
              <Button variant="outline" onClick={toggleTheme}>
                {theme === "light" ? "Dark" : "Light"}
              </Button>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {isAuthenticated ? (
                <Button variant="destructive" className="w-full" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Keluar
                </Button>
              ) : (
                <>
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      Masuk
                    </Link>
                  </Button>
                  <Button className="w-full font-display tracking-wide" asChild>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      Daftar
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </aside>
        </>
      )}
    </header>
  );
};

export default Navbar;
