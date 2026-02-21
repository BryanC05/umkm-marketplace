import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBackendUrl } from "@/config";
import {
    Store,
    Search,
    User,
    Menu,
    X,
    ShoppingBag,
    MapPin,
    Globe,
    Sun,
    Moon,
    LogOut,
    Heart,
    Package,
    ChevronDown,
    Settings,
    Sparkles,
    Map,
    Zap,
    HelpCircle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuthStore, useCartStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useLanguageStore } from "@/store/languageStore";
import { useTranslation } from "@/hooks/useTranslation";
import api from "@/utils/api";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isSellerMenuOpen, setIsSellerMenuOpen] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const sellerMenuRef = useRef(null);
    const profileMenuRef = useRef(null);
    const location = useLocation();
    const navigate = useNavigate();

    const { user, logout } = useAuthStore();
    const { getTotalItems } = useCartStore();
    const { theme, toggleTheme } = useThemeStore();
    const { language, toggleLanguage } = useLanguageStore();
    const { t } = useTranslation();

    const cartItemCount = getTotalItems();

    const [activeOrderCount, setActiveOrderCount] = useState(0);
    useEffect(() => {
        if (user && localStorage.getItem('token')) {
            api.get('/orders/my-orders')
                .then(res => {
                    const active = (res.data || []).filter(o => !['delivered', 'cancelled'].includes(o.status));
                    setActiveOrderCount(active.length);
                })
                .catch(() => {
                    setActiveOrderCount(0);
                });
        } else {
            setActiveOrderCount(0);
        }
    }, [user]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sellerMenuRef.current && !sellerMenuRef.current.contains(event.target)) {
                setIsSellerMenuOpen(false);
            }
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false);
        setIsProfileMenuOpen(false);
    };

    const mainNavLinks = [
        { href: "/products", label: t('nav.products'), icon: ShoppingBag },
        { href: "/nearby", label: t('nav.nearby'), icon: MapPin },
    ];

    const sellerLinks = [
        { href: "/seller/dashboard", label: t('nav.dashboard'), icon: Store },
        { href: "/seller/product-tracking", label: t('nav.tracking'), icon: Map },
        { href: "/logo-generator", label: t('nav.logoGenerator'), icon: Sparkles },
    ];

    if (user?.automationEnabled) {
        sellerLinks.push({ href: "/automation", label: t('nav.automation'), icon: Zap });
    }

    const isActive = (path) => location.pathname === path;

    return (
        <header className="sticky top-0 z-[1000] w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="container flex h-16 items-center justify-between">
                <Link to="/" className="flex items-center gap-2 shrink-0">
                    <img
                        src={`${getBackendUrl()}/uploads/TroliTokoLogo.png`}
                        alt="TroliToko"
                        className="h-10 w-auto object-contain transition-transform hover:scale-105"
                    />
                </Link>

                <div className="hidden flex-1 max-w-md mx-8 md:flex">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('nav.searchPlaceholder')}
                            className="pl-10 h-11 text-base bg-secondary/50"
                        />
                    </div>
                </div>

                <nav className="hidden md:flex items-center gap-2">
                    {mainNavLinks.map((link) => (
                        <Link key={link.href} to={link.href}>
                            <Button
                                variant={isActive(link.href) ? "secondary" : "ghost"}
                                size="default"
                                className="gap-2 h-10"
                            >
                                <link.icon className="h-5 w-5" />
                                <span>{link.label}</span>
                            </Button>
                        </Link>
                    ))}

                    <Link to="/cart">
                        <Button variant={isActive("/cart") ? "secondary" : "ghost"} size="default" className="gap-2 h-10 relative">
                            <ShoppingBag className="h-5 w-5" />
                            <span>{t('nav.cart')}</span>
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-bold">
                                    {cartItemCount}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {user && (
                        <Link to="/orders">
                            <Button variant={isActive("/orders") ? "secondary" : "ghost"} size="default" className="gap-2 h-10 relative">
                                <Package className="h-5 w-5" />
                                <span>{t('nav.orders')}</span>
                                {activeOrderCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs text-white font-bold">
                                        {activeOrderCount}
                                    </span>
                                )}
                            </Button>
                        </Link>
                    )}

                    <div className="h-6 w-px bg-border mx-1" />

                    <Button 
                        variant="ghost" 
                        size="default" 
                        onClick={toggleLanguage} 
                        className="gap-2 h-10"
                        title={`Switch to ${language === 'en' ? 'Indonesian' : 'English'}`}
                    >
                        <Globe className="h-5 w-5" />
                        <span className="text-sm font-medium">{language.toUpperCase()}</span>
                    </Button>

                    <Button 
                        variant="ghost" 
                        size="default" 
                        onClick={toggleTheme} 
                        className="gap-2 h-10"
                        title="Toggle Theme"
                    >
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                        <span className="text-sm">{theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}</span>
                    </Button>

                    <div className="h-6 w-px bg-border mx-1" />

                    {user ? (
                        <>
                            <div className="relative" ref={sellerMenuRef}>
                                <Button
                                    variant="ghost"
                                    size="default"
                                    className="gap-2 h-10"
                                    onClick={() => setIsSellerMenuOpen(!isSellerMenuOpen)}
                                >
                                    <Store className="h-5 w-5" />
                                    <span>{t('nav.sellerMenu')}</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isSellerMenuOpen ? 'rotate-180' : ''}`} />
                                </Button>
                                {isSellerMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-card shadow-lg py-1 z-[1100]">
                                        {sellerLinks.map((link) => (
                                            <Link
                                                key={link.href}
                                                to={link.href}
                                                onClick={() => setIsSellerMenuOpen(false)}
                                                className="flex items-center gap-3 px-4 py-3 text-base hover:bg-secondary transition-colors"
                                            >
                                                <link.icon className="h-5 w-5" />
                                                <span>{link.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="relative" ref={profileMenuRef}>
                                <Button
                                    variant="ghost"
                                    size="default"
                                    className="gap-2 h-10"
                                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                >
                                    <User className="h-5 w-5" />
                                    <span className="max-w-[100px] truncate">{user.name?.split(' ')[0]}</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                                </Button>
                                {isProfileMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 rounded-lg border bg-card shadow-lg py-1 z-[1100]">
                                        <Link
                                            to="/profile"
                                            onClick={() => setIsProfileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 text-base hover:bg-secondary transition-colors"
                                        >
                                            <User className="h-5 w-5" />
                                            <span>{t('nav.profile')}</span>
                                        </Link>
                                        <Link
                                            to="/saved-products"
                                            onClick={() => setIsProfileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 text-base hover:bg-secondary transition-colors"
                                        >
                                            <Heart className="h-5 w-5" />
                                            <span>{t('nav.savedProducts')}</span>
                                        </Link>
                                        <div className="border-t my-1" />
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-3 px-4 py-3 text-base text-destructive hover:bg-destructive/10 transition-colors w-full"
                                        >
                                            <LogOut className="h-5 w-5" />
                                            <span>{t('nav.logout')}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link to="/login">
                                <Button variant="ghost" size="default" className="h-10">{t('nav.login')}</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="default" className="h-10">{t('nav.register')}</Button>
                            </Link>
                        </div>
                    )}
                </nav>

                <Button
                    variant="ghost"
                    size="default"
                    className="md:hidden h-10 w-10"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
            </div>

            {isMenuOpen && (
                <div className="border-t md:hidden animate-fade-in bg-background">
                    <div className="container py-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('nav.searchPlaceholder')}
                                className="pl-10 h-11 text-base"
                            />
                        </div>

                        <nav className="flex flex-col gap-1">
                            <Link to="/products" onClick={() => setIsMenuOpen(false)}>
                                <Button
                                    variant={isActive("/products") ? "secondary" : "ghost"}
                                    className="w-full justify-start gap-3 h-11 text-base"
                                >
                                    <ShoppingBag className="h-5 w-5" />
                                    {t('nav.products')}
                                </Button>
                            </Link>
                            <Link to="/nearby" onClick={() => setIsMenuOpen(false)}>
                                <Button
                                    variant={isActive("/nearby") ? "secondary" : "ghost"}
                                    className="w-full justify-start gap-3 h-11 text-base"
                                >
                                    <MapPin className="h-5 w-5" />
                                    {t('nav.nearby')}
                                </Button>
                            </Link>

                            <Link to="/cart" onClick={() => setIsMenuOpen(false)}>
                                <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-base">
                                    <ShoppingBag className="h-5 w-5" />
                                    {t('nav.cart')} {cartItemCount > 0 && `(${cartItemCount})`}
                                </Button>
                            </Link>

                            {user && (
                                <>
                                    <Link to="/orders" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-base">
                                            <Package className="h-5 w-5" />
                                            {t('nav.orders')} {activeOrderCount > 0 && `(${activeOrderCount})`}
                                        </Button>
                                    </Link>
                                    <Link to="/saved-products" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-base">
                                            <Heart className="h-5 w-5" />
                                            {t('nav.savedProducts')}
                                        </Button>
                                    </Link>

                                    <div className="border-t my-2" />

                                    <p className="px-4 py-2 text-sm font-semibold text-muted-foreground">
                                        {t('nav.sellerMenu')}
                                    </p>
                                    {sellerLinks.map((link) => (
                                        <Link key={link.href} to={link.href} onClick={() => setIsMenuOpen(false)}>
                                            <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-base">
                                                <link.icon className="h-5 w-5" />
                                                {link.label}
                                            </Button>
                                        </Link>
                                    ))}
                                </>
                            )}

                            <div className="border-t my-2" />

                            <div className="flex gap-2">
                                <Button variant="outline" size="default" onClick={toggleLanguage} className="flex-1 h-11 gap-2">
                                    <Globe className="h-5 w-5" />
                                    {language.toUpperCase()}
                                </Button>
                                <Button variant="outline" size="default" onClick={toggleTheme} className="flex-1 h-11 gap-2">
                                    {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                                    {theme === 'light' ? t('nav.darkMode') : t('nav.lightMode')}
                                </Button>
                            </div>

                            {user ? (
                                <>
                                    <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-base">
                                            <User className="h-5 w-5" />
                                            {t('nav.profile')}
                                        </Button>
                                    </Link>
                                    <Button 
                                        variant="destructive" 
                                        className="w-full justify-start gap-3 h-11 text-base mt-2" 
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="h-5 w-5" />
                                        {t('nav.logout')}
                                    </Button>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="outline" className="w-full h-11">{t('nav.login')}</Button>
                                    </Link>
                                    <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                                        <Button className="w-full h-11">{t('nav.register')}</Button>
                                    </Link>
                                </div>
                            )}
                        </nav>
                    </div>
                </div>
            )}
        </header>
    );
};

export default Navbar;
