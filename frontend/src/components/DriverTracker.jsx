import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Phone, User, RefreshCw } from 'lucide-react';
import L from 'leaflet';
import api from '@/utils/api';

// Custom driver icon
const driverIcon = L.divIcon({
    className: 'custom-driver-icon',
    html: `
        <div style="
            background-color: #22c55e;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
                <circle cx="7" cy="17" r="2"/>
                <circle cx="17" cy="17" r="2"/>
            </svg>
        </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
});

const destinationIcon = L.divIcon({
    className: 'custom-destination-icon',
    html: `
        <div style="
            background-color: #3b82f6;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

export default function DriverTracker({ orderId, deliveryAddress, driverInfo }) {
    const [driverLocation, setDriverLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchDriverLocation = async () => {
        if (!orderId) return;
        
        setLoading(true);
        try {
            const response = await api.get(`/orders/${orderId}/driver/location`);
            setDriverLocation(response.data);
            setLastUpdated(new Date());
            setError(null);
        } catch (err) {
            if (err.response?.status !== 404) {
                setError('Failed to fetch driver location');
            }
        } finally {
            setLoading(false);
        }
    };

    // Poll for driver location every 10 seconds
    useEffect(() => {
        fetchDriverLocation();
        
        const interval = setInterval(fetchDriverLocation, 10000);
        return () => clearInterval(interval);
    }, [orderId]);

    if (!driverLocation && !driverInfo) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    <Navigation className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Driver hasn't started delivery yet</p>
                    {driverInfo?.driverName && (
                        <p className="text-sm mt-2">
                            Assigned Driver: {driverInfo.driverName}
                        </p>
                    )}
                </CardContent>
            </Card>
        );
    }

    const center = driverLocation ? 
        [driverLocation.latitude, driverLocation.longitude] : 
        [deliveryAddress?.coordinates?.[1] || -6.2088, deliveryAddress?.coordinates?.[0] || 106.8456];

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Navigation className="h-5 w-5" />
                        Live Driver Tracking
                    </span>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={fetchDriverLocation}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Driver Info */}
                {driverInfo && (
                    <div className="flex items-center gap-4 p-3 bg-secondary rounded-lg">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                            <p className="font-medium">{driverInfo.driverName || 'Driver'}</p>
                            {driverInfo.driverPhone && (
                                <a 
                                    href={`tel:${driverInfo.driverPhone}`}
                                    className="text-sm text-primary flex items-center gap-1"
                                >
                                    <Phone className="h-3 w-3" />
                                    {driverInfo.driverPhone}
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Map */}
                <div className="h-[300px] rounded-lg overflow-hidden border">
                    <MapContainer
                        center={center}
                        zoom={14}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        
                        {/* Driver marker */}
                        {driverLocation && (
                            <Marker 
                                position={[driverLocation.latitude, driverLocation.longitude]}
                                icon={driverIcon}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <p className="font-medium">Driver Location</p>
                                        <p className="text-muted-foreground">
                                            Last updated: {new Date(driverLocation.timestamp).toLocaleTimeString()}
                                        </p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                        
                        {/* Destination marker */}
                        {deliveryAddress?.coordinates && (
                            <Marker 
                                position={[
                                    deliveryAddress.coordinates[1], 
                                    deliveryAddress.coordinates[0]
                                ]}
                                icon={destinationIcon}
                            >
                                <Popup>
                                    <div className="text-sm">
                                        <p className="font-medium">Delivery Address</p>
                                        <p className="text-muted-foreground">{deliveryAddress.address}</p>
                                    </div>
                                </Popup>
                            </Marker>
                        )}
                    </MapContainer>
                </div>

                {lastUpdated && (
                    <p className="text-xs text-muted-foreground text-center">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
