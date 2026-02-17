import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getBackendUrl } from "@/config";
import {
    Store,
    Search,
    MessageCircle,
    Users,
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
    Map,
    Sparkles
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuthStore, useCartStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useLanguageStore } from "@/store/languageStore";
import { useTranslation } from "@/hooks/useTranslation";
import api from "@/utils/api";

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const { user, logout } = useAuthStore();
    const { getTotalItems } = useCartStore();
    const { theme, toggleTheme } = useThemeStore();
    const { language, toggleLanguage } = useLanguageStore();
    const { t } = useTranslation();

    const cartItemCount = getTotalItems();

    // Fetch active orders count
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

    const handleLogout = () => {
        logout();
        navigate('/');
        setIsMenuOpen(false);
    };

    const navLinks = [
        { href: "/products", label: t('nav.products'), icon: ShoppingBag },
        { href: "/nearby", label: t('nav.nearby'), icon: MapPin },
        { href: "/forums", label: t('nav.forums'), icon: Users },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
            <div className="container flex h-16 items-center justify-between">
                {/* Logo */}
                <Link to="/" className="flex items-center gap-2">
                    <img
                        src={`${getBackendUrl()}/uploads/TroliTokoLogo.png`}
                        alt="TroliToko"
                        className="h-10 w-auto object-contain transition-transform hover:scale-105"
                    />
                </Link>

                {/* Desktop Search */}
                <div className="hidden flex-1 max-w-md mx-8 md:flex">
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder={t('nav.searchPlaceholder')}
                            className="pl-10 bg-secondary/50"
                        />
                    </div>
                </div>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-1">
                    {navLinks.map((link) => (
                        <Link key={link.href} to={link.href}>
                            <Button
                                variant={isActive(link.href) ? "secondary" : "ghost"}
                                size="sm"
                                className="gap-2"
                            >
                                <link.icon className="h-4 w-4" />
                                {link.label}
                            </Button>
                        </Link>
                    ))}

                    <Link to="/cart">
                        <Button variant={isActive("/cart") ? "secondary" : "ghost"} size="sm" className="gap-2 relative">
                            <ShoppingBag className="h-4 w-4" />
                            {t('nav.cart')}
                            {cartItemCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                                    {cartItemCount}
                                </span>
                            )}
                        </Button>
                    </Link>

                    {user && (
                        <>
                            <Link to="/orders">
                                <Button variant={isActive("/orders") ? "secondary" : "ghost"} size="sm" className="gap-2 relative">
                                    <Package className="h-4 w-4" />
                                    {t('nav.orders')}
                                    {activeOrderCount > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white font-bold">
                                            {activeOrderCount}
                                        </span>
                                    )}
                                </Button>
                            </Link>
                            <Link to="/saved-products">
                                <Button variant={isActive("/saved-products") ? "secondary" : "ghost"} size="sm" className="gap-2">
                                    <Heart className="h-4 w-4" />
                                    {t('nav.saved')}
                                </Button>
                            </Link>
                        </>
                    )}

                    <Button variant="ghost" size="icon" onClick={toggleLanguage} title={`Switch to ${language === 'en' ? 'Indonesian' : 'English'}`}>
                        <Globe className="h-5 w-5" />
                        <span className="sr-only">Language</span>
                    </Button>

                    <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle Theme">
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </Button>

                    <div className="ml-2 h-6 w-px bg-border" />

                    {user ? (
                        <>
                            <Link to="/seller/dashboard">
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <Store className="h-4 w-4" />
                                    {t('nav.dashboard')}
                                </Button>
                            </Link>
                            <Link to="/seller/product-tracking">
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <Map className="h-4 w-4" />
                                    {t('nav.tracking')}
                                </Button>
                            </Link>
                            <Link to="/logo-generator">
                                <Button variant="ghost" size="sm" className="gap-2">
                                    <Sparkles className="h-4 w-4" />
                                    {t('nav.logoGenerator')}
                                </Button>
                            </Link>
                            {user.automationEnabled && (
                                <Link to="/automation">
                                    <Button
                                        variant={isActive("/automation") ? "secondary" : "ghost"}
                                        size="sm"
                                        className="gap-2"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        {t('nav.automation')}
                                    </Button>
                                </Link>
                            )}
                            <Link to="/profile">
                                <Button variant="ghost" size="icon" title={user.name}>
                                    <User className="h-5 w-5" />
                                </Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout">
                                <LogOut className="h-5 w-5" />
                            </Button>
                        </>
                    ) : (
                        <div className="flex items-center gap-2 ml-2">
                            <Link to="/login">
                                <Button variant="ghost" size="sm">{t('nav.login')}</Button>
                            </Link>
                            <Link to="/register">
                                <Button size="sm">{t('nav.register')}</Button>
                            </Link>
                        </div>
                    )}
                </nav>

                {/* Mobile Menu Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="border-t md:hidden animate-fade-in bg-background">
                    <div className="container py-4 space-y-4">
                        {/* Mobile Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder={t('nav.searchPlaceholder')}
                                className="pl-10"
                            />
                        </div>

                        {/* Mobile Nav Links */}
                        <nav className="flex flex-col gap-1">
                            {navLinks.map((link) => (
                                <Link key={link.href} to={link.href} onClick={() => setIsMenuOpen(false)}>
                                    <Button
                                        variant={isActive(link.href) ? "secondary" : "ghost"}
                                        className="w-full justify-start gap-2"
                                    >
                                        <link.icon className="h-4 w-4" />
                                        {link.label}
                                    </Button>
                                </Link>
                            ))}

                            <Link to="/cart" onClick={() => setIsMenuOpen(false)}>
                                <Button variant="ghost" className="w-full justify-start gap-2">
                                    <ShoppingBag className="h-4 w-4" />
                                    {t('nav.cart')} ({cartItemCount})
                                </Button>
                            </Link>

                            {user && (
                                <>
                                    <Link to="/orders" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant={isActive("/orders") ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                                            <Package className="h-4 w-4" />
                                            {t('nav.orders')} {activeOrderCount > 0 && `(${activeOrderCount})`}
                                        </Button>
                                    </Link>
                                    <Link to="/saved-products" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-2">
                                            <Heart className="h-4 w-4" />
                                            {t('nav.savedProducts')}
                                        </Button>
                                    </Link>
                                </>)
                            }

                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={toggleLanguage} className="flex-1">
                                    <Globe className="mr-2 h-4 w-4" /> {language.toUpperCase()}
                                </Button>
                                <Button variant="outline" size="sm" onClick={toggleTheme} className="flex-1">
                                    {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <Sun className="mr-2 h-4 w-4" />} {t('nav.theme')}
                                </Button>
                            </div>

                            {user ? (
                                <>
                                    <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-2">
                                            <User className="h-4 w-4" />
                                            {t('nav.profile')} ({user.name})
                                        </Button>
                                    </Link>
                                    <Link to="/seller/dashboard" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-2">
                                            <Store className="h-4 w-4" />
                                            {t('nav.dashboard')}
                                        </Button>
                                    </Link>
                                    <Link to="/logo-generator" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="ghost" className="w-full justify-start gap-2">
                                            <Sparkles className="h-4 w-4" />
                                            {t('nav.logoGenerator')}
                                        </Button>
                                    </Link>
                                    <Button variant="destructive" className="w-full justify-start gap-2" onClick={handleLogout}>
                                        <LogOut className="h-4 w-4" />
                                        {t('nav.logout')}
                                    </Button>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="outline" className="w-full">{t('nav.login')}</Button>
                                    </Link>
                                    <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                                        <Button className="w-full">{t('nav.register')}</Button>
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
