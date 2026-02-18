import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import SellerDashboard from './pages/SellerDashboard';
import AddProduct from './pages/AddProduct';
import SellerProductTracking from './pages/SellerProductTracking';
import Orders from './pages/Orders';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import NearbyMap from './pages/NearbyMap';
import SellerStore from './pages/SellerStore';
import Chat from './pages/Chat';
import Forum from './pages/Forum';
import ThreadDetail from './pages/ThreadDetail';
import NewThread from './pages/NewThread';
import EditThread from './pages/EditThread';
import Sell from './pages/Sell';
import Messages from './pages/Messages';
import Forums from './pages/Forums';
import SavedProducts from './pages/SavedProducts';
import Automation from './pages/Automation/Automation';
import LogoGenerator from './pages/LogoGenerator';
import ScrollToTop from './components/ScrollToTop';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useLanguageStore } from './store/languageStore';
// Removed: import './App.css'; // Assuming Tailwind handles global styles now or we just rely on index.css

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  const { initializeAuth } = useAuthStore();
  const { initializeTheme } = useThemeStore();
  const { initializeLanguage } = useLanguageStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
    initializeTheme();
    initializeLanguage();
    setIsLoading(false);
  }, [initializeAuth, initializeTheme, initializeLanguage]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ScrollToTop />
        <div className="min-h-screen bg-background text-foreground font-sans antialiased">
          {/* Navbar removed from here as it's included in Layout component used by pages */}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/nearby" element={<NearbyMap />} />
            <Route path="/store/:id" element={<SellerStore />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/seller/dashboard" element={<SellerDashboard />} />
            <Route path="/seller/add-product" element={<AddProduct />} />
            <Route path="/add-product" element={<Navigate to="/seller/add-product" replace />} />
            <Route path="/seller/product-tracking" element={<SellerProductTracking />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/chat" element={<Chat />} />
            {/* New Routes */}
            <Route path="/sell" element={<Sell />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/forums" element={<Forums />} />
            {/* Old Forum routes kept purely for backward compat or if needed, but Forums is the new page */}
            <Route path="/forum" element={<Forum />} />
            <Route path="/forum/new" element={<NewThread />} />
            <Route path="/forum/:id/edit" element={<EditThread />} />
            <Route path="/forum/:id" element={<ThreadDetail />} />
            <Route path="/saved-products" element={<SavedProducts />} />
            <Route path="/automation" element={<Automation />} />
            <Route path="/logo-generator" element={<LogoGenerator />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
