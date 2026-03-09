import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SocialLinks from './pages/SocialLinks';
import Home from './pages/new-ui/Index';
import Products from './pages/new-ui/Products';
import ProductDetail from './pages/new-ui/ProductDetail';
import Login from './pages/new-ui/Login';
import Register from './pages/new-ui/Register';
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
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import TrackingPage from './pages/TrackingPage';
import AdminMembership from './pages/AdminMembership';
import Notifications from './pages/Notifications';
import Invoice from './pages/Invoice';
import NotFound from './pages/new-ui/NotFound';
import ScrollToTop from './components/ScrollToTop';
import { useAuthStore } from './store/authStore';
import { useThemeStore } from './store/themeStore';
import { useLanguageStore } from './store/languageStore';
import Layout from './components/layout/Layout';

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
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/products" element={<Products />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/nearby" element={<NearbyMap />} />
              <Route path="/store/:id" element={<SellerStore />} />
              <Route path="/seller/dashboard" element={<SellerDashboard />} />
              <Route path="/seller/add-product" element={<AddProduct />} />
              <Route path="/add-product" element={<Navigate to="/seller/add-product" replace />} />
              <Route path="/seller/product-tracking" element={<SellerProductTracking />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/sell" element={<Sell />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/forums" element={<Forums />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/forum/new" element={<NewThread />} />
              <Route path="/forum/:id/edit" element={<EditThread />} />
              <Route path="/forum/:id" element={<ThreadDetail />} />
              <Route path="/saved-products" element={<SavedProducts />} />
              <Route path="/automation" element={<Automation />} />
              <Route path="/social-links" element={<SocialLinks />} />
              <Route path="/logo-generator" element={<LogoGenerator />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:id" element={<ProjectDetail />} />
              <Route path="/admin/membership" element={<AdminMembership />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/invoice/:orderId" element={<Invoice />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
