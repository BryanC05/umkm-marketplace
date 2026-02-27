import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Store, Search, Navigation, X, Clock, Route } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { useTranslation } from '../hooks/useTranslation';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { DEFAULT_LOCATION, DEFAULT_RADIUS_METERS, GEOLOCATION_TIMEOUT, GEOLOCATION_MAX_AGE, NAVIGATION_UPDATE_INTERVAL } from '../utils/constants';
import { isValidCoordinates, haversineDistanceKm } from '../utils/helpers';
import './NearbyMap.css';

const DEFAULT_BEKASI_LOCATION = DEFAULT_LOCATION.Bekasi;

function NearbyMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [profileLocation, setProfileLocation] = useState(null);
  const [radius, setRadius] = useState(DEFAULT_RADIUS_METERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUsingDefaultLocation, setIsUsingDefaultLocation] = useState(false);
  const [isUsingProfileLocation, setIsUsingProfileLocation] = useState(false);
  const [geolocationError, setGeolocationError] = useState(null);
  const [mapError, setMapError] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigationRoute, setNavigationRoute] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const userMarkerRef = useRef(null);
  const markersLayerRef = useRef(null);
  const radiusCircleRef = useRef(null);
  const routeLineRef = useRef(null);
  const navigationMarkerRef = useRef(null);
  const watchIdRef = useRef(null);
  const liveLocationWatchIdRef = useRef(null);
  const lastKnownGpsLocationRef = useRef(null);
  const hasAutoCenteredRef = useRef(false);
  const locationSourceRef = useRef('gps');
  const hasAutoProfileFallbackRef = useRef(false);
  const hasFittedMarkersRef = useRef(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const applyCurrentLocation = (location, source = 'gps') => {
    if (!location) return;
    locationSourceRef.current = source;
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
        console.warn('Geolocation error:', error);
        let errorMessage = 'Unable to access GPS. Please allow location permission in your browser.';
        
        if (error.code === 1) {
          errorMessage = 'Location permission denied. Please allow location access in your browser settings.';
        } else if (error.code === 2) {
          errorMessage = 'Unable to determine location. Please check your GPS is enabled.';
        } else if (error.code === 3) {
          errorMessage = 'Location request timed out. Please try again.';
        } else if (error.code === 0) {
          errorMessage = 'An unexpected error occurred while getting location.';
        }
        
        setGeolocationError(errorMessage);
        resolve(false);
      },
            { timeout: GEOLOCATION_TIMEOUT, enableHighAccuracy: true, maximumAge: GEOLOCATION_MAX_AGE }
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

  // Cleanup navigation on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const stopNavigation = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsNavigating(false);
    setNavigationRoute(null);
    setSelectedSeller(null);
    setCurrentPosition(null);
    
    if (routeLineRef.current && mapRef.current) {
      mapRef.current.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    if (navigationMarkerRef.current && mapRef.current) {
      mapRef.current.removeLayer(navigationMarkerRef.current);
      navigationMarkerRef.current = null;
    }
  }, []);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) return;
    hasAutoProfileFallbackRef.current = true;
    
    const tryGetLocation = (highAccuracy = true) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latestLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setGeolocationError(null);
          applyCurrentLocation(latestLocation, 'gps');
          if (mapRef.current) {
            mapRef.current.setView([latestLocation.lat, latestLocation.lng], mapRef.current.getZoom());
          }
        },
        (error) => {
          console.warn('Geolocation attempt (highAccuracy=' + highAccuracy + '):', error);
          
          if (highAccuracy) {
            tryGetLocation(false);
            return;
          }
          
          let errorMessage = 'Unable to access GPS. Please allow location permission in your browser.';
          
          if (error.code === 1) {
            errorMessage = 'Location permission denied. Please allow location access in your browser settings.';
          } else if (error.code === 2) {
            errorMessage = 'Unable to determine location. Please check your GPS is enabled.';
          } else if (error.code === 3) {
            errorMessage = 'Location request timed out. Please try again.';
          } else if (error.code === 0) {
            errorMessage = 'An unexpected error occurred while getting location.';
          }
          
          setGeolocationError(errorMessage);
        },
        { timeout: highAccuracy ? GEOLOCATION_TIMEOUT : GEOLOCATION_TIMEOUT * 2, enableHighAccuracy: highAccuracy, maximumAge: GEOLOCATION_MAX_AGE }
      );
    };
    
    tryGetLocation(true);
  };

  const handleUseProfileLocation = () => {
    if (!profileLocation) return;
    hasAutoProfileFallbackRef.current = true;
    applyCurrentLocation(profileLocation, 'profile');
    if (mapRef.current) {
      mapRef.current.setView([profileLocation.lat, profileLocation.lng], mapRef.current.getZoom());
    }
  };

  // Initialize map (once, after first location is available)
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

        hasAutoCenteredRef.current = true;

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
    };
  }, [userLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup map only on unmount (avoid remounting map on every location update).
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      userMarkerRef.current = null;
      markersLayerRef.current = null;
      radiusCircleRef.current = null;
      routeLineRef.current = null;
      navigationMarkerRef.current = null;
      setMapReady(false);
      hasAutoCenteredRef.current = false;
    };
  }, []);

  // Keep user marker and radius circle synced with latest location.
  useEffect(() => {
    if (!mapRef.current || !userLocation) return;
    const latLng = [userLocation.lat, userLocation.lng];
    if (!hasAutoCenteredRef.current) {
      mapRef.current.setView(latLng, mapRef.current.getZoom());
      hasAutoCenteredRef.current = true;
    }
    if (radiusCircleRef.current) {
      radiusCircleRef.current.setLatLng(latLng);
    }
    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(latLng);
    }
  }, [userLocation]);

  // Keep tracking user movement continuously, even outside navigation mode.
  useEffect(() => {
    if (!navigator.geolocation || liveLocationWatchIdRef.current !== null) {
      return;
    }

    const startWatching = (highAccuracy = true) => {
      if (liveLocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
      }

      liveLocationWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          if (locationSourceRef.current !== 'gps') {
            return;
          }
          const latestLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          
          lastKnownGpsLocationRef.current = latestLocation;
          setGeolocationError(null);
          setUserLocation((previousLocation) => {
            if (!previousLocation) {
              return latestLocation;
            }
            const movedDistanceKm = haversineDistanceKm(previousLocation, latestLocation);
            if (movedDistanceKm < 0.03) {
              return previousLocation;
            }
            return latestLocation;
          });
          setIsUsingDefaultLocation(false);
          setIsUsingProfileLocation(false);
        },
        (error) => {
          console.warn('Live location tracking error (highAccuracy=' + highAccuracy + '):', error);
          
          if (error.code === 1) {
            setGeolocationError('Location permission denied. Enable location access to track your live position.');
            return;
          }
          
          if (lastKnownGpsLocationRef.current) {
            console.log('Using last known GPS location:', lastKnownGpsLocationRef.current);
          }
          
          if (highAccuracy) {
            setTimeout(() => startWatching(false), 1000);
            return;
          }
          
          setGeolocationError('Live location temporarily unavailable.');
          
          setTimeout(() => {
            if (locationSourceRef.current === 'gps') {
              startWatching(true);
            }
          }, 5000);
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: highAccuracy ? GEOLOCATION_TIMEOUT : GEOLOCATION_TIMEOUT * 2,
          maximumAge: highAccuracy ? 0 : 30000,
        }
      );
    };

    startWatching(true);

    return () => {
      if (liveLocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(liveLocationWatchIdRef.current);
        liveLocationWatchIdRef.current = null;
      }
    };
  }, []);

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
        console.log('API response:', response);
        const payload = response?.data;
        console.log('API payload:', payload);
        const sellersData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.sellers)
            ? payload.sellers
            : [];

        console.log('Sellers data raw:', sellersData);
        const validSellers = sellersData.filter((seller) => {
          const sellerId = seller?._id || seller?.id;
          const hasValidCoords = isValidCoordinates(seller?.location?.coordinates);
          console.log('Seller:', seller?.businessName || seller?.name, 'coords:', seller?.location?.coordinates, 'valid:', hasValidCoords);
          return sellerId && hasValidCoords;
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
    if (hasAutoProfileFallbackRef.current) {
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
      hasAutoProfileFallbackRef.current = true;
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
          hasFittedMarkersRef.current = false;
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
            const marker = L.marker([lat, lng], { icon: sellerIcon });
            
            // When clicking marker, just show popup without starting navigation
            marker.on('click', () => {
              // Just let the popup show - don't set selectedSeller here
            });

            const popupContent = `
              <div style="min-width: 180px;">
                <h4 style="margin: 0 0 4px 0;">${displayName}</h4>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">${subtitle}</p>
                <p style="margin: 0 0 8px 0; font-size: 12px; color: #999;">${seller.location.city || ''}</p>
                ${seller.rating > 0 ? `<p style="margin: 0 0 8px 0; color: #f59e0b;">⭐ ${seller.rating.toFixed(1)}</p>` : ''}
                <button id="nav-btn-${sellerId}" style="width: 100%; padding: 8px 12px; background: #22c55e; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; margin-bottom: 6px;">🚗 Navigate</button>
                <button onclick="window.location.href='/store/${sellerId}'" style="width: 100%; padding: 8px 12px; background: #4169E1; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">View Store</button>
              </div>
            `;
            
            marker.bindPopup(popupContent);
            marker.on('popupopen', () => {
              const navBtn = document.getElementById(`nav-btn-${sellerId}`);
              if (navBtn) {
                navBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  setSelectedSeller(seller);
                });
              }
            });
            
            markersLayerRef.current.addLayer(marker);
          }
        });

        // Fit map to show all markers if we have any
        if (!hasFittedMarkersRef.current && markersLayerRef.current.getLayers().length > 0) {
          const group = new L.featureGroup([
            L.marker([userLocation.lat, userLocation.lng]),
            ...markersLayerRef.current.getLayers()
          ]);
          mapRef.current.fitBounds(group.getBounds().pad(0.1));
          hasFittedMarkersRef.current = true;
        }
      } catch (err) {
        console.error('Error adding seller markers:', err);
      }
    };

    addMarkers();
  }, [filteredSellers, mapReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle navigation when seller is selected
  useEffect(() => {
    if (!selectedSeller || !userLocation || !mapRef.current) return;

    const originRef = { lat: userLocation.lat, lng: userLocation.lng };
    const isNavigatingRef = { current: true };
    
    const fetchRoute = async () => {
      try {
        const [sellerLng, sellerLat] = selectedSeller.location.coordinates;
        const response = await api.get('/navigation/route', {
          params: {
            originLat: originRef.lat,
            originLng: originRef.lng,
            destinationLat: sellerLat,
            destinationLng: sellerLng,
            profile: 'driving',
          },
        });
        
        const routeData = response.data;
        setNavigationRoute(routeData);
        setIsNavigating(true);
        
        // Draw route on map
        const drawRoute = async () => {
          const L = await import('leaflet');
          
          if (routeLineRef.current) {
            mapRef.current.removeLayer(routeLineRef.current);
          }
          
          const path = routeData.path.map(p => [p.lat, p.lng]);
          routeLineRef.current = L.polyline(path, {
            color: '#22c55e',
            weight: 5,
            opacity: 0.8,
          }).addTo(mapRef.current);
          
          // Fit map to show entire route
          if (path.length > 1) {
            mapRef.current.fitBounds(routeLineRef.current.getBounds().pad(0.1));
          }
        };
        
        drawRoute();
        
        // Start real-time location tracking
        if (watchIdRef.current === null && navigator.geolocation) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
              const newPos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
              };
              setCurrentPosition(newPos);
              setUserLocation(newPos);
              
              // Update navigation marker
              const updateNavigationMarker = async () => {
                if (!mapRef.current) return;
                
                const L = await import('leaflet');
                
                if (navigationMarkerRef.current) {
                  navigationMarkerRef.current.setLatLng([newPos.lat, newPos.lng]);
                } else {
                  const navIcon = L.divIcon({
                    className: 'navigation-marker',
                    html: `
                      <div style="
                        background-color: #22c55e;
                        width: 36px;
                        height: 36px;
                        border-radius: 50%;
                        border: 3px solid white;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      ">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                        </svg>
                      </div>
                    `,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                  });
                  
                  navigationMarkerRef.current = L.marker([newPos.lat, newPos.lng], { icon: navIcon })
                    .addTo(mapRef.current)
                    .bindPopup('Your Location');
                }
              };
              
              updateNavigationMarker();
              
              // Recalculate route to destination
              const recalculateRoute = async () => {
                if (!mapRef.current) return;
                
                try {
                  const newResponse = await api.get('/navigation/route', {
                    params: {
                      originLat: newPos.lat,
                      originLng: newPos.lng,
                      destinationLat: sellerLat,
                      destinationLng: sellerLng,
                      profile: 'driving',
                    },
                  });
                  
                  const newRouteData = newResponse.data;
                  setNavigationRoute(newRouteData);
                  
                  // Update route line
                  const L = await import('leaflet');
                  const newPath = newRouteData.path.map(p => [p.lat, p.lng]);
                  
                  if (routeLineRef.current && mapRef.current) {
                    mapRef.current.removeLayer(routeLineRef.current);
                  }
                  
                  routeLineRef.current = L.polyline(newPath, {
                    color: '#22c55e',
                    weight: 5,
                    opacity: 0.8,
                  }).addTo(mapRef.current);
                } catch (err) {
                  console.error('Error recalculating route:', err);
                }
              };
              
              recalculateRoute();
            },
            (error) => {
              console.warn('Location watch error:', error);
            },
            { enableHighAccuracy: true, maximumAge: NAVIGATION_UPDATE_INTERVAL, timeout: NAVIGATION_UPDATE_INTERVAL }
          );
        }
      } catch (err) {
        console.error('Error fetching route:', err);
      }
    };
    
    fetchRoute();
    
    return () => {
      isNavigatingRef.current = false;
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [selectedSeller]); // eslint-disable-line react-hooks/exhaustive-deps



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
            {geolocationError && (
              <p className="mt-2 text-xs bg-amber-100 text-amber-800 p-2 rounded">
                {geolocationError}
              </p>
            )}
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
                  >
                    <div className="flex items-start gap-3" onClick={() => navigate(`/store/${sellerId}`)}>
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Store size={16} className="text-primary" />
                      </div>
                      <div className="flex-1">
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSeller(seller);
                        }}
                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-1 text-xs font-medium"
                        title="Navigate to store"
                      >
                        <Navigation size={14} />
                        Go
                      </button>
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
          
          {isNavigating && navigationRoute && (
            <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card text-card-foreground border border-border rounded-lg shadow-lg p-4 z-[1000]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                    <Navigation className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Navigating to</h3>
                    <p className="font-medium text-sm">{getSellerDisplayName(selectedSeller)}</p>
                  </div>
                </div>
                <button 
                  onClick={stopNavigation}
                  className="p-1 hover:bg-muted rounded-full"
                >
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1">
                  <Route className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {(navigationRoute.distanceMeters / 1000).toFixed(1)} km
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    ~{Math.round(navigationRoute.durationSeconds / 60)} min
                  </span>
                </div>
              </div>
              
              {currentPosition && selectedSeller && (
                <p className="text-xs text-muted-foreground">
                  📍 Distance remaining: {haversineDistanceKm(currentPosition, { 
                    lat: selectedSeller.location.coordinates[1], 
                    lng: selectedSeller.location.coordinates[0] 
                  }).toFixed(1)} km
                </p>
              )}
              
              <div className="mt-3 flex gap-2">
                <Button 
                  onClick={stopNavigation}
                  variant="outline" 
                  className="flex-1"
                  size="sm"
                >
                  Stop Navigation
                </Button>
                <Button 
                  onClick={() => navigate(`/store/${selectedSeller?._id || selectedSeller?.id}`)}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  size="sm"
                >
                  View Store
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default NearbyMap;
