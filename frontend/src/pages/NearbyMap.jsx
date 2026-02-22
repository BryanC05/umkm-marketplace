import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useTranslation } from '../hooks/useTranslation';
import Layout from '@/components/layout/Layout';
import './NearbyMap.css';

const DEFAULT_BEKASI_LOCATION = { lat: -6.2349, lng: 106.9896 };

const isValidCoordinates = (coordinates) =>
  Array.isArray(coordinates) &&
  coordinates.length >= 2 &&
  Number.isFinite(coordinates[0]) &&
  Number.isFinite(coordinates[1]) &&
  (coordinates[0] !== 0 || coordinates[1] !== 0);

const haversineDistanceKm = (pointA, pointB) => {
  if (!pointA || !pointB) return 0;
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(pointB.lat - pointA.lat);
  const dLng = toRadians(pointB.lng - pointA.lng);
  const lat1 = toRadians(pointA.lat);
  const lat2 = toRadians(pointB.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

function NearbyMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [profileLocation, setProfileLocation] = useState(null);
  const [radius, setRadius] = useState(25000); // 25km default for better coverage
  const [searchQuery, setSearchQuery] = useState('');
  const [isUsingDefaultLocation, setIsUsingDefaultLocation] = useState(false);
  const [isUsingProfileLocation, setIsUsingProfileLocation] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const applyCurrentLocation = (location, source = 'gps') => {
    if (!location) return;
    setUserLocation(location);
    setIsUsingDefaultLocation(source === 'default');
    setIsUsingProfileLocation(source === 'profile');
  };

  // Get user location
  useEffect(() => {
    let isActive = true;

    const applyFallbackLocation = () => {
      if (!isActive) return;
      applyCurrentLocation(DEFAULT_BEKASI_LOCATION, 'default');
    };

    const loadProfileLocation = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setProfileLocation(null);
          return null;
        }

        const profileResponse = await api.get('/users/profile');
        const coordinates = profileResponse?.data?.location?.coordinates;
        if (isValidCoordinates(coordinates) && isActive) {
          const normalizedProfileLocation = { lat: coordinates[1], lng: coordinates[0] };
          setProfileLocation(normalizedProfileLocation);
          return normalizedProfileLocation;
        }

        setProfileLocation(null);
        return null;
      } catch (err) {
        console.warn('Could not load profile location:', err);
        setProfileLocation(null);
        return null;
      }
    };

    const resolveLocation = async () => {
      const savedProfileLocation = await loadProfileLocation();

      if (navigator.geolocation) {
        const gotGpsLocation = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!isActive) {
                resolve(false);
                return;
              }
              applyCurrentLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              }, 'gps');
              resolve(true);
            },
            (error) => {
              console.warn('Browser geolocation unavailable, trying profile location:', error);
              resolve(false);
            },
            { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
          );
        });

        if (gotGpsLocation) {
          return;
        }
      }

      if (savedProfileLocation && isActive) {
        applyCurrentLocation(savedProfileLocation, 'profile');
        return;
      }

      if (!navigator.geolocation) {
        // Browser geolocation unsupported and no valid profile location.
        applyFallbackLocation();
        return;
      }
      // Browser geolocation supported but unavailable/denied and profile also missing.
      applyFallbackLocation();
    };

    resolveLocation();

    return () => {
      isActive = false;
    };
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        applyCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }, 'gps');
      },
      (error) => {
        console.warn('Could not refresh GPS location:', error);
      },
      { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  const handleUseProfileLocation = () => {
    if (!profileLocation) return;
    applyCurrentLocation(profileLocation, 'profile');
  };

  // Initialize map
  useEffect(() => {
    if (!userLocation || !mapContainerRef.current || mapRef.current) return;

    let map = null;
    let isActive = true;

    const initMap = async () => {
      try {
        // Dynamic import
        const L = (await import('leaflet')).default;
        await import('leaflet/dist/leaflet.css');

        // Fix marker icons
        const markerIcon = await import('leaflet/dist/images/marker-icon.png');
        const markerShadow = await import('leaflet/dist/images/marker-shadow.png');

        const DefaultIcon = L.icon({
          iconUrl: markerIcon.default,
          shadowUrl: markerShadow.default,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        });
        L.Marker.prototype.options.icon = DefaultIcon;

        // In dev strict mode/hot-reload, a stale leaflet id can remain.
        const container = mapContainerRef.current;
        if (!container || !isActive) {
          return;
        }
        if (container._leaflet_id) {
          delete container._leaflet_id;
        }

        // Create map
        map = L.map(container, {
          center: [userLocation.lat, userLocation.lng],
          zoom: 13,
          scrollWheelZoom: true,
        });

        if (!isActive) {
          map.remove();
          return;
        }

        mapRef.current = map;
        setMapReady(true);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Add user location circle (save ref for dynamic updates)
        radiusCircleRef.current = L.circle([userLocation.lat, userLocation.lng], {
          radius: radius,
          fillColor: '#667eea',
          fillOpacity: 0.1,
          color: '#667eea'
        }).addTo(map);

        // Add user marker
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng])
          .addTo(map)
          .bindPopup(t('nearby.youAreHere') || 'You are here');

      } catch (err) {
        if (isActive) {
          console.error('Map init error:', err);
          setMapError(err.message);
        }
      }
    };

    // Delay to avoid Strict Mode issues
    const timer = setTimeout(initMap, 100);

    return () => {
      isActive = false;
      clearTimeout(timer);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        userMarkerRef.current = null;
        markersLayerRef.current = null;
        radiusCircleRef.current = null;
        setMapReady(false);
      }
    };
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep user marker and radius circle synced with latest location.
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    const latLng = [userLocation.lat, userLocation.lng];
    mapRef.current.setView(latLng, mapRef.current.getZoom());
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng(latLng);
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng);
    }
  }, [userLocation]);

  // Update radius circle when radius changes (without reinitializing map).
  useEffect(() => {
    if (radiusCircleRef.current && mapRef.current) {
      radiusCircleRef.current.setRadius(radius);
    }
  }, [radius]);

  const {
    data: sellers = [],
    isLoading: sellersLoading,
    isError: sellersError,
    error: sellersQueryError,
  } = useQuery({
    queryKey: ['nearbySellers', userLocation, radius],
    queryFn: async () => {
      if (!userLocation) return [];
      try {
        const response = await api.get(
          `/users/nearby-sellers?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=${radius}`
        );
        const payload = response?.data;
        const sellersData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.sellers)
            ? payload.sellers
            : [];

        const validSellers = sellersData.filter((seller) => {
          const sellerId = seller?._id || seller?.id;
          return sellerId && isValidCoordinates(seller?.location?.coordinates);
        });

        console.log('Nearby sellers found:', validSellers.length);
        return validSellers;
      } catch (err) {
        console.error('Error fetching nearby sellers:', err);
        throw err;
      }
    },
    enabled: !!userLocation,
    staleTime: 30000,
    retry: 1,
  });

  // If GPS is far away from seeded/test market and returns no sellers,
  // automatically switch to profile location when available.
  useEffect(() => {
    if (!userLocation || !profileLocation || sellersLoading || sellersError) {
      return;
    }
    if (isUsingProfileLocation || isUsingDefaultLocation) {
      return;
    }
    if (sellers.length > 0) {
      return;
    }

    const distanceKm = haversineDistanceKm(userLocation, profileLocation);
    if (distanceKm >= 2) {
      applyCurrentLocation(profileLocation, 'profile');
    }
  }, [
    sellers,
    sellersLoading,
    sellersError,
    userLocation,
    profileLocation,
    isUsingProfileLocation,
    isUsingDefaultLocation,
  ]);

  const getSellerDisplayName = (seller) => {
    const businessName = typeof seller?.businessName === 'string' ? seller.businessName.trim() : '';
    const username = typeof seller?.name === 'string' ? seller.name.trim() : '';
    return businessName || username || 'Seller';
  };

  const getSellerSubtitle = (seller) => {
    const businessType = typeof seller?.businessType === 'string' ? seller.businessType.trim() : '';
    if (businessType && businessType !== 'none') {
      return `${businessType} Enterprise`;
    }
    return 'Local Seller';
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredSellers = useMemo(() => {
    return sellers.filter((seller) => {
      if (!normalizedSearch) return true;
      const displayName = getSellerDisplayName(seller).toLowerCase();
      const city = (seller.location?.city || '').toLowerCase();
      return displayName.includes(normalizedSearch) || city.includes(normalizedSearch);
    });
  }, [sellers, normalizedSearch]);

  // Add seller markers when sellers data changes and map is ready.
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const addMarkers = async () => {
      try {
        const L = (await import('leaflet')).default;

        if (!markersLayerRef.current) {
          markersLayerRef.current = L.layerGroup().addTo(mapRef.current);
        }
        markersLayerRef.current.clearLayers();

        if (filteredSellers.length === 0) {
          return;
        }

        console.log('Adding seller markers:', filteredSellers.length);

        // Create custom seller icon
        const sellerIcon = L.divIcon({
          className: 'seller-marker',
          html: '<div style="background: #4169E1; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">🏪</div>',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Add seller markers
        filteredSellers.forEach((seller) => {
          const sellerId = seller?._id || seller?.id;
          if (sellerId && isValidCoordinates(seller?.location?.coordinates)) {
            const displayName = getSellerDisplayName(seller);
            const subtitle = getSellerSubtitle(seller);
            const [lng, lat] = seller.location.coordinates;
            const marker = L.marker([lat, lng], { icon: sellerIcon })
              .bindPopup(`
                <div style="min-width: 180px;">
                  <h4 style="margin: 0 0 4px 0;">${displayName}</h4>
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${subtitle}</p>
                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #999;">${seller.location.city || ''}</p>
                  ${seller.rating > 0 ? `<p style="margin: 0 0 8px 0; color: #f59e0b;">⭐ ${seller.rating.toFixed(1)}</p>` : ''}
                  <button onclick="window.location.href='/store/${sellerId}'" style="width: 100%; padding: 8px 12px; background: #4169E1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">View Store</button>
                </div>
              `);
            markersLayerRef.current.addLayer(marker);
          }
        });

        // Fit map to show all markers if we have any
        if (markersLayerRef.current.getLayers().length > 0) {
          const group = new L.featureGroup([
            L.marker([userLocation.lat, userLocation.lng]),
            ...markersLayerRef.current.getLayers()
          ]);
          mapRef.current.fitBounds(group.getBounds().pad(0.1));
        }
      } catch (err) {
        console.error('Error adding seller markers:', err);
      }
    };

    addMarkers();
  }, [filteredSellers, userLocation, mapReady]);



  if (!userLocation) {
    return (
      <Layout>
        <div className="nearby-map-page loading-container">
          <div className="loading">{t('nearby.gettingLocation')}</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="nearby-map-page h-[calc(100vh-theme(spacing.16))] flex flex-col md:flex-row">
        <div className="map-sidebar md:w-1/3 lg:w-1/4 p-4 border-r overflow-y-auto">
          <div className="sidebar-header mb-4">
            <h2 className="text-xl font-bold">{t('nearby.findNearbySellers')}</h2>
            <p className="text-sm text-muted-foreground">{t('nearby.discoverMSMEs')}</p>
            {isUsingDefaultLocation && (
              <p className="mt-2 text-xs bg-yellow-100 text-yellow-800 p-2 rounded">
                📍 {t('nearby.defaultLocation')}
              </p>
            )}
            {isUsingProfileLocation && (
              <p className="mt-2 text-xs bg-blue-100 text-blue-800 p-2 rounded">
                📍 Using your saved profile location
              </p>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Lat: {userLocation.lat.toFixed(5)}, Lng: {userLocation.lng.toFixed(5)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="px-2 py-1 text-xs rounded border border-border hover:bg-muted"
              >
                Use GPS
              </button>
              {profileLocation && (
                <button
                  type="button"
                  onClick={handleUseProfileLocation}
                  className="px-2 py-1 text-xs rounded border border-border hover:bg-muted"
                >
                  Use Profile
                </button>
              )}
            </div>
          </div>

          <div className="search-box mb-4 relative">
            <Search size={16} className="absolute left-3 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder={t('nearby.searchSellers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 p-2 border rounded-md"
            />
          </div>

          <div className="radius-control mb-6">
            <label className="block text-sm font-medium mb-2">{t('nearby.searchRadius')}: {(radius / 1000).toFixed(0)} km</label>
            <input
              type="range"
              min="1000"
              max="100000"
              step="1000"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>1km</span>
              <span>50km</span>
              <span>100km</span>
            </div>
          </div>

          <div className="sellers-list">
            <h3 className="font-semibold mb-3">{t('nearby.nearbySellers')} ({filteredSellers.length})</h3>
            {sellersLoading ? (
              <p className="text-sm text-muted-foreground">{t('nearby.loadingSellers')}</p>
            ) : sellersError ? (
              <p className="text-sm text-destructive">
                {t('nearby.errorLoadingMap')}: {sellersQueryError?.message || 'Failed to load sellers'}
              </p>
            ) : filteredSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('nearby.noSellers')}</p>
            ) : (
              <div className="space-y-3">
                {filteredSellers.map((seller) => {
                  const sellerId = seller?._id || seller?.id;
                  if (!sellerId) return null;
                  const displayName = getSellerDisplayName(seller);
                  const subtitle = getSellerSubtitle(seller);
                  return (
                  <div
                    key={sellerId}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/store/${sellerId}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Store size={16} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{displayName}</h4>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin size={10} />
                          {seller.location?.city}
                        </p>
                        {seller.rating > 0 && (
                          <p className="text-xs text-yellow-500 mt-1">⭐ {seller.rating.toFixed(1)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="map-container flex-1 bg-muted relative">
          {mapError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <p className="text-destructive mb-2">{t('nearby.errorLoadingMap')}: {mapError}</p>
              <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md">{t('nearby.retry')}</button>
            </div>
          ) : (
            <div ref={mapContainerRef} className="h-full w-full" />
          )}
        </div>
      </div>
    </Layout>
  );
}

export default NearbyMap;
