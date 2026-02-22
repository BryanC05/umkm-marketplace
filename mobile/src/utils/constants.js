import * as Location from 'expo-location';

// Default location coordinates
export const DEFAULT_LOCATION = {
    Bekasi: { lat: -6.2349, lng: 106.9896 },
    Jakarta: { lat: -6.2088, lng: 106.8456 },
};

export const DEFAULT_RADIUS_METERS = 25000;
export const MAX_RADIUS_METERS = 100000;
export const MIN_RADIUS_METERS = 1000;

// Earth radius in kilometers (for distance calculations)
export const EARTH_RADIUS_KM = 6371;

// Geolocation settings
export const LOCATION_TIMEOUT = 15000;
export const LOCATION_ACCURACY = Location.Accuracy.High;

// Map settings
export const DEFAULT_MAP_ZOOM = 13;

// Search radius options (in meters)
export const RADIUS_OPTIONS = [
    { label: '1 km', value: 1000 },
    { label: '5 km', value: 5000 },
    { label: '10 km', value: 10000 },
    { label: '25 km', value: 25000 },
    { label: '50 km', value: 50000 },
];
