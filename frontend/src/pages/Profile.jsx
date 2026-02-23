import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { getBackendUrl } from "@/config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ProductCard from "@/components/products/ProductCard";
import LocationPicker from "@/components/LocationPicker";
import {
  MapPin,
  Star,
  Package,
  ShoppingBag,
  Edit,
  Heart,
  Loader2,
  User,
  Phone,
  Mail,
  Save,
  X,
  Shield,
  Map,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ChefHat,
  Sparkles,
  ImageIcon,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useTranslation } from "@/hooks/useTranslation";
import api from "@/utils/api";
import { resolveImageUrl } from "@/utils/imageUrl";

const statusConfig = {
  pending: { icon: Clock, color: '#ed8936', label: 'Pending' },
  confirmed: { icon: CheckCircle, color: '#4299e1', label: 'Confirmed' },
  preparing: { icon: ChefHat, color: '#9f7aea', label: 'Preparing' },
  ready: { icon: Package, color: '#48bb78', label: 'Ready' },
  delivered: { icon: Truck, color: '#38a169', label: 'Delivered' },
  cancelled: { icon: XCircle, color: '#f56565', label: 'Cancelled' },
};

const formatCurrency = (amount) => `Rp ${(amount || 0).toLocaleString('id-ID')}`;

const getAssetUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${getBackendUrl()}${url}`;
};

const ProfileOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await api.get('/orders/my-orders');
        setOrders(response.data || []);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-16 w-16 rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const recentOrders = orders.slice(0, 5);
  const activeCount = orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">
          Order History ({orders.length})
        </h2>
        {orders.length > 0 && (
          <Link to="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              {t('profile.viewAllOrders')}
            </Button>
          </Link>
        )}
      </div>

      {activeCount > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-primary font-medium">{activeCount} {t('profile.activeOrders')}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">{t('profile.noOrdersYet')}</p>
            <Link to="/products">
              <Button className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                {t('profile.browseProducts')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recentOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <Card key={order._id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-sm">
                        #{order._id.slice(-8).toUpperCase()}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="gap-1"
                      style={{ color: status.color, borderColor: status.color }}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {order.products.slice(0, 2).map((item) => (
                      <div key={item.product?._id || item._id} className="flex items-center gap-3 text-sm">
                        <div className="w-10 h-10 rounded-md overflow-hidden bg-secondary flex-shrink-0">
                          {item.product?.images?.[0] ? (
                            <img
                              src={resolveImageUrl(item.product.images[0])}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs">📷</div>
                          )}
                        </div>
                        <span className="flex-1 truncate">{item.product?.name || 'Product'}</span>
                        <span className="text-muted-foreground">×{item.quantity}</span>
                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {order.products.length > 2 && (
                      <p className="text-xs text-muted-foreground pl-[52px]">
                        +{order.products.length - 2} more item{order.products.length - 2 !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className="text-sm text-muted-foreground">
                      {order.seller?.businessName || order.seller?.name || 'Seller'}
                    </span>
                    <span className="font-bold text-primary">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {orders.length > 5 && (
            <div className="text-center pt-2">
              <Link to="/orders">
                <Button variant="ghost" size="sm">
                  {t('profile.viewMoreOrders')} →
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, setUser } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [myProducts, setMyProducts] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    businessName: "",
    businessType: "",
    address: "",
    city: "",
    state: "",
    lat: null,
    lng: null,
  });
  const [showMapPicker, setShowMapPicker] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchProfile();
    if (user?.role === "seller") {
      fetchMyProducts();
    }
  }, [isAuthenticated, navigate, user?.role]);

  const fetchProfile = async () => {
    try {
      const response = await api.get("/users/profile");
      setProfile(response.data);
      setEditForm({
        name: response.data.name || "",
        phone: response.data.phone || "",
        businessName: response.data.businessName || "",
        businessType: response.data.businessType || "",
        address: response.data.location?.address || "",
        city: response.data.location?.city || "",
        state: response.data.location?.state || "",
        lat: response.data.location?.coordinates?.[1] || null,
        lng: response.data.location?.coordinates?.[0] || null,
      });
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProducts = async () => {
    try {
      const response = await api.get("/products/my-products");
      setMyProducts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Build location object only if we have coordinates
      const locationUpdate = {
        address: editForm.address,
        city: editForm.city,
        state: editForm.state,
      };

      // Only include coordinates if both lat and lng are valid numbers
      if (editForm.lat && editForm.lng) {
        locationUpdate.type = "Point";
        locationUpdate.coordinates = [editForm.lng, editForm.lat];
      }

      const updateData = {
        name: editForm.name,
        phone: editForm.phone,
        businessName: editForm.businessName,
        location: locationUpdate,
      };

      const response = await api.put("/users/profile", updateData);
      setProfile(response.data);
      setUser(response.data);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Skeleton */}
            <div className="w-full md:w-1/3 space-y-4">
              <Card className="p-6">
                <div className="flex flex-col items-center">
                  <Skeleton className="h-24 w-24 rounded-full mb-4" />
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-24 mb-4" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            </div>
            
            {/* Main Content Skeleton */}
            <div className="w-full md:w-2/3 space-y-4">
              <Card className="p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">{t('profile.profileNotFound')}</h2>
          <Button onClick={() => navigate("/")}>{t('profile.goHome')}</Button>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return "Recently";
    return new Date(dateString).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
    });
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            {isEditing ? (
              // Edit Mode
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{t('profile.editProfile')}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsEditing(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">{t('profile.fullName')}</Label>
                      <Input
                        id="name"
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                        placeholder={t('profile.yourFullName')}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{t('profile.phoneNumber')}</Label>
                      <Input
                        id="phone"
                        value={editForm.phone}
                        onChange={(e) =>
                          setEditForm({ ...editForm, phone: e.target.value })
                        }
                        placeholder="+62 xxx xxx xxx"
                      />
                    </div>
                    {profile.role === "seller" && (
                      <>
                        <div>
                          <Label htmlFor="businessName">{t('profile.businessName')}</Label>
                          <Input
                            id="businessName"
                            value={editForm.businessName}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                businessName: e.target.value,
                              })
                            }
                            placeholder={t('profile.yourStoreName')}
                          />
                        </div>
                        <div>
                          <Label htmlFor="businessType">{t('profile.businessSize')}</Label>
                          <Select
                            value={editForm.businessType}
                            onValueChange={(value) =>
                              setEditForm({ ...editForm, businessType: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t('profile.selectBusinessSize')} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="micro">{t('auth.micro')}</SelectItem>
                              <SelectItem value="small">{t('auth.small')}</SelectItem>
                              <SelectItem value="medium">{t('auth.medium')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Location Info */}
                  <div className="space-y-4">
                    {/* Map Picker Button */}
                    <div>
                      <Label>{t('profile.location')}</Label>
                      <Dialog open={showMapPicker} onOpenChange={setShowMapPicker}>
                        <DialogTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full mt-1 gap-2 justify-start h-auto py-3"
                          >
                            <Map className="h-4 w-4 text-primary" />
                            <div className="text-left flex-1">
                              {editForm.address ? (
                                <div>
                                  <p className="font-medium text-sm">
                                    {editForm.city || t('profile.locationSet')}
                                  </p>
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                    {editForm.address}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">
                                  {t('profile.setLocation')}
                                </span>
                              )}
                            </div>
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              <MapPin className="h-5 w-5 text-primary" />
                              {t('profile.setYourLocation')}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="h-[500px]">
                            <LocationPicker
                              initialLocation={
                                editForm.lat && editForm.lng
                                  ? { lat: editForm.lat, lng: editForm.lng }
                                  : null
                              }
                              onLocationSelect={(locationData) => {
                                setEditForm({
                                  ...editForm,
                                  address: locationData.fullAddress || locationData.address,
                                  city: locationData.city,
                                  state: locationData.state,
                                  lat: locationData.lat,
                                  lng: locationData.lng,
                                });
                              }}
                            />
                          </div>
                          <div className="flex justify-end gap-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => setShowMapPicker(false)}
                            >
                              {t('common.cancel')}
                            </Button>
                            <Button onClick={() => setShowMapPicker(false)}>
                              {t('profile.confirmLocation')}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Manual Address Fields (optional override) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="city">{t('profile.city')}</Label>
                        <Input
                          id="city"
                          value={editForm.city}
                          onChange={(e) =>
                            setEditForm({ ...editForm, city: e.target.value })
                          }
                          placeholder={t('profile.city')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="state">{t('profile.stateProvince')}</Label>
                        <Input
                          id="state"
                          value={editForm.state}
                          onChange={(e) =>
                            setEditForm({ ...editForm, state: e.target.value })
                          }
                          placeholder={t('profile.stateProvince')}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t('profile.saving')}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {t('profile.saveChanges')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.profileImage} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {profile.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-2">
                    <h1 className="text-2xl font-bold">
                      {profile.role === "seller"
                        ? profile.businessName || profile.name
                        : profile.name}
                    </h1>
                    {profile.role === "seller" && profile.isVerified && (
                      <Badge className="w-fit gap-1">
                        <Shield className="h-3 w-3" />
                        {t('profile.verifiedSeller')}
                      </Badge>
                    )}
                    {profile.role === "buyer" && (
                      <Badge variant="secondary" className="w-fit">
                        {t('profile.buyer')}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {profile.email}
                    </span>
                    {profile.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {profile.phone}
                      </span>
                    )}
                    {profile.location?.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {profile.location.city}, {profile.location.state}
                      </span>
                    )}
                    {profile.role === "seller" && profile.rating > 0 && (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-warning text-warning" />
                        {profile.rating.toFixed(1)} {t('profile.rating')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('profile.memberSince')} {formatDate(profile.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <Button
                    variant="outline"
                    className="gap-2 flex-1 md:flex-none"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="h-4 w-4" />
                    {t('profile.editProfile')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Logo Section */}
        {profile.role === "seller" && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    {t('profile.businessLogo')}
                  </CardTitle>
                  <CardDescription>
                    {t('profile.logoDesc')}
                  </CardDescription>
                </div>
                <Link to="/logo-generator">
                  <Button variant="outline" className="gap-2">
                    <Sparkles className="h-4 w-4" />
                    {profile.businessLogo ? t('profile.changeLogo') : t('profile.createLogo')}
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {profile.businessLogo ? (
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img
                      src={getAssetUrl(profile.businessLogo)}
                      alt="Business Logo"
                      className="w-32 h-32 object-contain border rounded-lg bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {profile.hasCustomLogo
                        ? t('profile.customLogo')
                        : t('profile.aiLogo')}
                    </p>
                    <div className="flex gap-2">
                      <Link to="/logo-generator">
                        <Button variant="outline" size="sm">
                          {t('profile.manageLogo')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-2">
                    You don't have a business logo yet
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a professional logo using AI or upload your own
                  </p>
                  <Link to="/logo-generator">
                    <Button className="gap-2">
                      <Sparkles className="h-4 w-4" />
                      {t('profile.createLogo')}
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue={profile.role === "seller" ? "products" : "orders"}>
          <TabsList className="mb-6">
            {profile.role === "seller" && (
              <TabsTrigger value="products" className="gap-2">
                <Package className="h-4 w-4" />
                {t('profile.myProducts')}
              </TabsTrigger>
            )}
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag className="h-4 w-4" />
              {t('profile.ordersTab')}
            </TabsTrigger>
            <TabsTrigger value="saved" className="gap-2">
              <Heart className="h-4 w-4" />
              {t('profile.savedTab')}
            </TabsTrigger>
          </TabsList>

          {/* My Products (Seller only) */}
          {profile.role === "seller" && (
            <TabsContent value="products">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">
                  My Products ({myProducts.length})
                </h2>
                <Button className="gap-2" onClick={() => navigate("/seller/add-product")}>
                  <Package className="h-4 w-4" />
                  {t('profile.addNewProduct')}
                </Button>
              </div>
              {myProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {myProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              ) : (
                <Card className="py-12 text-center">
                  <CardContent>
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">
                      {t('profile.noProductsYet')}
                    </p>
                    <Button onClick={() => navigate("/seller/add-product")}>
                      {t('profile.addFirstProduct')}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          {/* Orders */}
          <TabsContent value="orders">
            <ProfileOrders />
          </TabsContent>

          {/* Saved Products */}
          <TabsContent value="saved">
            <h2 className="text-xl font-semibold mb-6">{t('profile.savedProducts')}</h2>
            <Card className="py-12 text-center">
              <CardContent>
                <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {t('profile.noSavedProducts')}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Profile;
