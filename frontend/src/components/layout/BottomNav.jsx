import { Link, useLocation } from "react-router-dom";
import { Home, ShoppingBag, MapPin, Package, User } from "lucide-react";
import { useAuthStore, useCartStore } from "@/store/authStore";
import { useTranslation } from "@/hooks/useTranslation";
import { useState, useEffect } from "react";
import api from "@/utils/api";

const BottomNav = () => {
    const location = useLocation();
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { getTotalItems } = useCartStore();
    const [activeOrderCount, setActiveOrderCount] = useState(0);

    const cartItemCount = getTotalItems();

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
        }
    }, [user]);

    const navItems = [
        { href: "/", label: t('nav.home'), icon: Home },
        { href: "/products", label: t('nav.products'), icon: ShoppingBag },
        { 
            href: "/cart", 
            label: t('nav.cart'), 
            icon: ShoppingBag,
            badge: cartItemCount 
        },
        { 
            href: "/orders", 
            label: t('nav.orders'), 
            icon: Package,
            badge: activeOrderCount 
        },
        { href: user ? "/profile" : "/login", label: user ? t('nav.profile') : t('nav.login'), icon: User },
    ];

    const isActive = (path) => {
        if (path === "/") return location.pathname === "/";
        return location.pathname.startsWith(path);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-pb">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    
                    return (
                        <Link
                            key={item.href}
                            to={item.href}
                            className={`flex flex-col items-center justify-center min-w-[64px] h-14 px-2 py-1 rounded-lg transition-colors relative ${
                                active 
                                    ? 'text-primary' 
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            <div className="relative">
                                <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5]' : ''}`} />
                                {item.badge > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                            </div>
                            <span className={`text-xs mt-1 ${active ? 'font-semibold' : ''}`}>
                                {item.label}
                            </span>
                            {active && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
