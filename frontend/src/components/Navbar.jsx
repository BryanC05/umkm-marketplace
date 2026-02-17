import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useCartStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useLanguageStore } from '../store/languageStore';
import { useTranslation } from '../hooks/useTranslation';
import { getBackendUrl } from '../config';
import { MapPin, ShoppingBag, Store, User, LogOut, Sun, Moon, Globe, MessageCircle } from 'lucide-react';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const { theme, toggleTheme } = useThemeStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cartItemCount = getTotalItems();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <img src={`${getBackendUrl()}/uploads/TroliTokoLogo.png`} alt="TroliToko" className="logo-image" />
        </Link>
      </div>

      <div className="navbar-links">
        <Link to="/" className="nav-link">{t('nav.home')}</Link>
        <Link to="/products" className="nav-link">{t('nav.products')}</Link>
        <Link to="/nearby" className="nav-link">
          <MapPin size={18} />
          {t('nav.nearby')}
        </Link>
        <Link to="/cart" className="nav-link cart-link">
          <div className="cart-icon-wrapper">
            <ShoppingBag size={20} />
            {cartItemCount > 0 && <span className="cart-badge">{cartItemCount}</span>}
          </div>
          {t('nav.cart')}
        </Link>
        <Link to="/forum" className="nav-link">
          <MessageCircle size={18} />
          Forum
        </Link>
      </div>

      <div className="navbar-actions">
        <button onClick={toggleLanguage} className="btn-lang-toggle" aria-label="Toggle Language">
          <Globe size={18} />
          <span>{language.toUpperCase()}</span>
        </button>

        <button onClick={toggleTheme} className="btn-theme-toggle" aria-label="Toggle Theme">
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {user ? (
          <>
            {user.role === 'seller' && (
              <Link to="/seller/dashboard" className="btn-seller">
                <Store size={18} />
                {t('nav.dashboard')}
              </Link>
            )}
            <Link to="/orders" className="nav-link">
              <ShoppingBag size={18} />
              {t('nav.myOrders')}
            </Link>
            <Link to="/chat" className="nav-link">
              <MessageCircle size={18} />
              Messages
            </Link>
            <Link to="/profile" className="nav-link">
              <User size={18} />
              {user.name}
            </Link>
            <button onClick={handleLogout} className="btn-logout">
              <LogOut size={18} />
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn-secondary">{t('nav.login')}</Link>
            <Link to="/register" className="btn-primary">{t('nav.register')}</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;