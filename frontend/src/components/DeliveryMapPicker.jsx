import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, AlertCircle, Navigation } from 'lucide-react';
import { DEFAULT_LOCATION, EARTH_RADIUS_KM } from '../utils/constants';
import { haversineDistanceKm } from '../utils/helpers';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

function LocationMarker({ position, setPosition }) {
    useMapEvents({
        click(e) {
            setPosition(e.latlng);
        },
    });

    return position ? (
        <Marker position={position} />
    ) : null;
}

export default function DeliveryMapPicker({ 
    sellerLocation, 
    onLocationSelect, 
    maxDistance = 5,
    initialLocation = null 
}) {
    const [position, setPosition] = useState(initialLocation);
    const [distance, setDistance] = useState(null);
    const [address, setAddress] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Default center (Jakarta)
    const defaultCenter = sellerLocation || DEFAULT_LOCATION.Jakarta;
    
    useEffect(() => {
        if (position && sellerLocation) {
            const dist = haversineDistanceKm(
                sellerLocation, 
                position
            );
            setDistance(dist);
            
            // Reverse geocode to get address
            fetchAddress(position.lat, position.lng);
        }
    }, [position, sellerLocation]);

    const fetchAddress = async (lat, lng) => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.display_name) {
                setAddress(data.display_name);
            }
        } catch (error) {
            console.error('Failed to fetch address:', error);
        }
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLoading(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const newPos = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    setPosition(newPos);
                    setIsLoading(false);
                },
                (error) => {
                    console.error('Geolocation error:', error?.message || error);
                    setIsLoading(false);
                    alert('Could not get your location. Please allow location access or select manually.');
                }
            );
        }
    };

    const handleConfirm = () => {
        if (position && distance <= maxDistance) {
            onLocationSelect({
                lat: position.lat,
                lng: position.lng,
                address: address
            });
        }
    };

    const isValid = position && distance && distance <= maxDistance;

    return (
        <div className="space-y-4">
            <div className="h-[400px] w-full rounded-lg overflow-hidden border">
                <MapContainer
                    center={defaultCenter}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    
                    {/* Seller location marker */}
                    {sellerLocation && (
                        <Marker 
                            position={sellerLocation}
                            icon={L.divIcon({
                                className: 'custom-div-icon',
                                html: `<div style="background-color: #3b82f6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                                iconSize: [12, 12],
                                iconAnchor: [6, 6]
                            })}
                        />
                    )}
                    
                    {/* 5km radius circle */}
                    {sellerLocation && (
                        <Circle
                            center={sellerLocation}
                            radius={maxDistance * 1000} // Convert km to meters
                            pathOptions={{
                                fillColor: '#3b82f6',
                                fillOpacity: 0.1,
                                color: '#3b82f6',
                                weight: 2,
                                dashArray: '5, 10'
                            }}
                        />
                    )}
                    
                    <LocationMarker 
                        position={position} 
                        setPosition={setPosition}
                    />
                </MapContainer>
            </div>

            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    onClick={handleGetCurrentLocation}
                    disabled={isLoading}
                    className="flex-1"
                >
                    <Navigation className="h-4 w-4 mr-2" />
                    {isLoading ? 'Getting location...' : 'Use My Location'}
                </Button>
            </div>

            {distance !== null && (
                <Alert variant={isValid ? "default" : "destructive"}>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        Distance from store: <strong>{distance.toFixed(2)} km</strong>
                        {distance > maxDistance && (
                            <span className="block mt-1 text-red-600">
                                ⚠️ Location is outside {maxDistance}km delivery range
                            </span>
                        )}
                        {isValid && (
                            <span className="block mt-1 text-green-600">
                                ✅ Within delivery range
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {address && (
                <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm font-medium">Selected Address:</p>
                    <p className="text-sm text-muted-foreground">{address}</p>
                </div>
            )}

            <Button 
                onClick={handleConfirm} 
                disabled={!isValid}
                className="w-full"
            >
                <MapPin className="h-4 w-4 mr-2" />
                Confirm Delivery Location
            </Button>
        </div>
    );
}
