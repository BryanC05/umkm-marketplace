import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation } from 'lucide-react';
import './LocationPicker.css';

function LocationPicker({ onLocationSelect, initialLocation }) {
    const [position, setPosition] = useState(initialLocation || null);
    const [address, setAddress] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [mapReady, setMapReady] = useState(false);
    const [, setMapError] = useState(null);

    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const isInitializingRef = useRef(false);

    // Initialize Map
    useEffect(() => {
        const containerEl = mapContainerRef.current;
        if (!containerEl || mapRef.current || isInitializingRef.current) return;

        let cancelled = false;
        isInitializingRef.current = true;

        const initMap = async () => {
            try {
                const L = (await import('leaflet')).default;
                await import('leaflet/dist/leaflet.css');

                if (cancelled || mapRef.current) return;

                // Fix marker icons
                const markerIcon = await import('leaflet/dist/images/marker-icon.png');
                const markerShadow = await import('leaflet/dist/images/marker-shadow.png');

                const DefaultIcon = L.icon({
                    iconUrl: markerIcon.default,
                    shadowUrl: markerShadow.default,
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                });
                L.Marker.prototype.options.icon = DefaultIcon;

                const container = mapContainerRef.current;
                if (!container || cancelled || mapRef.current) return;

                // In dev strict mode/hot-reload, a stale leaflet id can remain.
                if (container._leaflet_id) {
                    delete container._leaflet_id;
                }

                // Try to get user's current location first
                let startPos;
                if (position) {
                    startPos = [position.lat, position.lng];
                } else if (navigator.geolocation) {
                    try {
                        const pos = await new Promise((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(resolve, reject, {
                                enableHighAccuracy: true,
                                timeout: 5000,
                                maximumAge: 0
                            });
                        });
                        startPos = [pos.coords.latitude, pos.coords.longitude];
                        // Trigger location select with current position
                        handlePositionChange(pos.coords.latitude, pos.coords.longitude);
                    } catch (err) {
                        console.log('Could not get current location, using default:', err);
                        // Fallback to Bekasi, Indonesia if geolocation fails
                        startPos = [-6.2349, 106.9896];
                        handlePositionChange(startPos[0], startPos[1]);
                    }
                } else {
                    // Fallback to Bekasi, Indonesia if geolocation not supported
                    startPos = [-6.2349, 106.9896];
                    handlePositionChange(startPos[0], startPos[1]);
                }

                const map = L.map(container, {
                    center: startPos,
                    zoom: 13,
                    scrollWheelZoom: true,
                });

                // Add tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                }).addTo(map);

                // Add draggable marker
                const marker = L.marker(startPos, {
                    draggable: true
                }).addTo(map);

                marker.on('dragend', async (e) => {
                    const newPos = e.target.getLatLng();
                    handlePositionChange(newPos.lat, newPos.lng);
                });

                // Map click handler
                map.on('click', (e) => {
                    marker.setLatLng(e.latlng);
                    handlePositionChange(e.latlng.lat, e.latlng.lng);
                });

                if (cancelled) {
                    map.remove();
                    return;
                }

                mapRef.current = map;
                markerRef.current = marker;
                setMapReady(true);

                // Don't auto-request location - let user click the map or use "Locate Me" button

            } catch (err) {
                if (!cancelled) {
                    console.error('Error initializing map:', err);
                    setMapError(err.message);
                }
            } finally {
                isInitializingRef.current = false;
            }
        };

        initMap();

        return () => {
            cancelled = true;
            isInitializingRef.current = false;
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markerRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync valid position with marker if updated externally
    useEffect(() => {
        if (mapReady && mapRef.current && markerRef.current && position) {
            const currentLatLng = markerRef.current.getLatLng();
            // Only update if significantly different to avoid loops
            if (Math.abs(currentLatLng.lat - position.lat) > 0.0001 ||
                Math.abs(currentLatLng.lng - position.lng) > 0.0001) {
                const newLatLng = [position.lat, position.lng];
                markerRef.current.setLatLng(newLatLng);
                mapRef.current.setView(newLatLng, 15);
            }
        }
    }, [position, mapReady]);

    const handlePositionChange = async (lat, lng) => {
        setPosition({ lat, lng });

        // Reverse geocoding to get address
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();

            const addr = data.address;
            setAddress(data.display_name);

            const locationData = {
                lat,
                lng,
                address: data.display_name,
                city: addr.city || addr.town || addr.village || addr.county || '',
                state: addr.state || '',
                pincode: addr.postcode || '',
                fullAddress: data.display_name
            };

            onLocationSelect(locationData);
        } catch (error) {
            console.error('Error reverse geocoding:', error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            setSearchResults(data);
        } catch (error) {
            console.error('Error searching location:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const selectSearchResult = (result) => {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        if (mapRef.current && markerRef.current) {
            const newLatLng = [lat, lng];
            mapRef.current.setView(newLatLng, 15);
            markerRef.current.setLatLng(newLatLng);
            handlePositionChange(lat, lng);
        }

        setSearchResults([]);
        setSearchQuery('');
    };

    const handleLocateMe = () => {
        setIsSearching(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude, longitude } = pos.coords;
                    if (mapRef.current && markerRef.current) {
                        const newLatLng = [latitude, longitude];
                        mapRef.current.setView(newLatLng, 15);
                        markerRef.current.setLatLng(newLatLng);
                        handlePositionChange(latitude, longitude);
                    }
                    setIsSearching(false);
                },
                (err) => {
                    console.warn('Geolocation warning (using existing/default map location):', err);
                    setIsSearching(false);

                    let errorMessage = 'Could not access your location.';
                    if (err.code === 1) {
                        errorMessage = 'Location permission denied. Please enable it in browser settings.';
                    } else if (err.code === 2) {
                        errorMessage = 'Location unavailable. Please ensure GPS is enabled.';
                    } else if (err.code === 3) {
                        errorMessage = 'Location request timed out. Please try again.';
                    }

                    const hasExistingLocation = !!position && Number.isFinite(position.lat) && Number.isFinite(position.lng);
                    if (!hasExistingLocation) {
                        alert(errorMessage);
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        } else {
            alert('Geolocation is not supported by your browser.');
            setIsSearching(false);
        }
    };

    return (
        <div className="location-picker">
            <div className="picker-header">
                <div className="search-form">
                    <div className="search-input-wrapper">
                        <Search size={18} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search for an area, street, or landmark..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSearch(e);
                                }
                            }}
                        />
                        {searchResults.length > 0 && (
                            <button type="button" className="clear-search" onClick={() => setSearchResults([])}>×</button>
                        )}
                    </div>
                    <button type="button" className="btn-search" disabled={isSearching} onClick={handleSearch}>
                        {isSearching ? 'Searching...' : 'Search'}
                    </button>
                </div>
                <button type="button" className="btn-locate" onClick={handleLocateMe} title="Use my current location">
                    <Navigation size={18} />
                </button>
            </div>

            {searchResults.length > 0 && (
                <ul className="search-results">
                    {searchResults.map((result) => (
                        <li key={result.place_id} onClick={() => selectSearchResult(result)}>
                            <MapPin size={16} />
                            <span>{result.display_name}</span>
                        </li>
                    ))}
                </ul>
            )}

            <div className="map-wrapper">
                <div ref={mapContainerRef} className="picker-map"></div>
                {address && (
                    <div className="selected-address">
                        <span className="label">Selected Location:</span>
                        <span className="value">{address}</span>
                    </div>
                )}
            </div>

            <div className="picker-instructions">
                <small>📍 Drag the marker or click on the map to pinpoint exact location.</small>
            </div>
        </div>
    );
}

export default LocationPicker;
