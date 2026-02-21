import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { 
  ArrowLeft, Navigation, Phone, User, Clock, MapPin, 
  Store, Package, CheckCircle, RefreshCw 
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { useTranslation } from '../hooks/useTranslation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom icons
const driverIcon = L.divIcon({
  className: 'custom-driver-icon',
  html: `
    <div style="
      background-color: #22c55e;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
        <circle cx="7" cy="17" r="2"/>
        <circle cx="17" cy="17" r="2"/>
      </svg>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const destinationIcon = L.divIcon({
  className: 'custom-destination-icon',
  html: `
    <div style="
      background-color: #3b82f6;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
        <circle cx="12" cy="10" r="3"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const storeIcon = L.divIcon({
  className: 'custom-store-icon',
  html: `
    <div style="
      background-color: #f59e0b;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/>
        <path d="M2 7h20"/>
        <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 15.5 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 11.5 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 7.5 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
      </svg>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});

const statusConfig = {
  pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
  preparing: { color: 'bg-purple-100 text-purple-800', label: 'Preparing' },
  ready: { color: 'bg-indigo-100 text-indigo-800', label: 'Ready for Pickup' },
  out_for_delivery: { color: 'bg-orange-100 text-orange-800', label: 'Out for Delivery' },
  delivered: { color: 'bg-green-100 text-green-800', label: 'Delivered' },
  cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
};

export default function TrackingPage() {
  const { orderId } = useParams();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch order details
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['order', orderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${orderId}`);
      return response.data;
    },
    enabled: !!orderId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch driver location (buyer only)
  const { data: driverLocation, isLoading: locationLoading } = useQuery({
    queryKey: ['driverLocation', orderId],
    queryFn: async () => {
      const response = await api.get(`/orders/${orderId}/driver/location`);
      setLastUpdated(new Date());
      return response.data;
    },
    enabled: !!orderId && order?.deliveryType === 'delivery' && order?.status !== 'delivered' && order?.status !== 'cancelled',
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const isSeller = order?.seller?._id === user?.id;
  const isBuyer = order?.buyer?._id === user?.id;

  // Update driver location (seller only)
  const updateLocation = useCallback(async (position) => {
    if (!isSeller) return;
    try {
      await api.post(`/orders/${orderId}/driver/location`, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      queryClient.invalidateQueries(['driverLocation', orderId]);
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  }, [isSeller, orderId, queryClient]);

  // Auto-update location for seller
  useEffect(() => {
    if (!isSeller || order?.status === 'delivered') return;

    // Update immediately
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(updateLocation);
    }

    // Update every 15 seconds
    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(updateLocation);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isSeller, order?.status, updateLocation]);

  if (orderLoading) {
    return (
      <Layout>
        <div className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-secondary rounded w-1/4"></div>
            <div className="h-[500px] bg-secondary rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
          <Button asChild>
            <Link to="/orders">Back to Orders</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const status = statusConfig[order.status] || statusConfig.pending;
  const isDelivery = order.deliveryType === 'delivery';

  // Get coordinates
  const storeLocation = order.seller?.location?.coordinates 
    ? [order.seller.location.coordinates[1], order.seller.location.coordinates[0]] 
    : null;
  
  const deliveryLocation = order.deliveryAddress?.coordinates 
    ? [order.deliveryAddress.coordinates[1], order.deliveryAddress.coordinates[0]] 
    : null;
  
  const driverLoc = driverLocation 
    ? [driverLocation.latitude, driverLocation.longitude] 
    : null;

  // Calculate center for map
  let mapCenter = [-6.2088, 106.8456]; // Default Jakarta
  if (driverLoc) {
    mapCenter = driverLoc;
  } else if (deliveryLocation) {
    mapCenter = deliveryLocation;
  } else if (storeLocation) {
    mapCenter = storeLocation;
  }

  return (
    <Layout>
      <div className="container py-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/orders">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Order Tracking</h1>
            <p className="text-sm text-muted-foreground">#{orderId?.slice(-8).toUpperCase()}</p>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Main Map */}
          <div className="lg:col-span-2">
            <Card className="h-[600px]">
              <CardContent className="p-0 h-full">
                <MapContainer
                  center={mapCenter}
                  zoom={14}
                  style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {/* Store Marker */}
                  {storeLocation && (
                    <Marker position={storeLocation} icon={storeIcon}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">{order.seller?.businessName || order.seller?.name}</p>
                          <p className="text-muted-foreground">Store Location</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Delivery Location Marker */}
                  {deliveryLocation && (
                    <Marker position={deliveryLocation} icon={destinationIcon}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">Delivery Address</p>
                          <p className="text-muted-foreground">{order.deliveryAddress?.address}</p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Driver Marker */}
                  {driverLoc && (
                    <Marker position={driverLoc} icon={driverIcon}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold">Driver Location</p>
                          <p className="text-muted-foreground">
                            Last updated: {lastUpdated?.toLocaleTimeString()}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  )}

                  {/* Route Line */}
                  {driverLoc && deliveryLocation && (
                    <Polyline 
                      positions={[driverLoc, deliveryLocation]} 
                      color="#22c55e" 
                      weight={4} 
                      dashArray="10, 10"
                    />
                  )}
                </MapContainer>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-4">
            {/* Order Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Store</p>
                  <p className="font-medium">{order.seller?.businessName || order.seller?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Type</p>
                  <p className="font-medium flex items-center gap-1">
                    {isDelivery ? '🚗 Delivery' : '🏪 Pickup'}
                  </p>
                </div>
                {order.preorderTime && (
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Time</p>
                    <p className="font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {order.preorderTime}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Driver Info */}
            {isDelivery && (order.driverName || driverLocation) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Driver Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {order.driverName && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{order.driverName}</p>
                        <p className="text-sm text-muted-foreground">Driver</p>
                      </div>
                    </div>
                  )}
                  
                  {order.driverPhone && (
                    <a 
                      href={`tel:${order.driverPhone}`}
                      className="flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {order.driverPhone}
                    </a>
                  )}

                  {lastUpdated && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Delivery Address */}
            {isDelivery && order.deliveryAddress && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.deliveryAddress.address}</p>
                  {order.deliveryAddress.city && (
                    <p className="text-sm text-muted-foreground">
                      {order.deliveryAddress.city}, {order.deliveryAddress.pincode}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Seller Actions */}
            {isSeller && isDelivery && order.status !== 'delivered' && order.status !== 'cancelled' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Driver Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button 
                    className="w-full" 
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(updateLocation);
                      }
                    }}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Update Location Now
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Auto-updating every 15 seconds
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Progress Steps */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Delivery Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'].map((step, index) => {
                    const isActive = order.status === step;
                    const isPast = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered']
                      .indexOf(order.status) >= index;
                    
                    if (!isDelivery && step === 'out_for_delivery') return null;
                    
                    return (
                      <div key={step} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isPast ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        } ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}`}>
                          {isPast ? '✓' : index + 1}
                        </div>
                        <span className={`text-sm ${isActive ? 'font-medium' : isPast ? '' : 'text-muted-foreground'}`}>
                          {statusConfig[step]?.label || step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
