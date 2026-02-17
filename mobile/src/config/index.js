// Change this to your machine's local network IP when testing on a physical device
// Use 'localhost' only when testing on iOS Simulator
// Find your IP: run `ifconfig | grep "inet "` in terminal
export const API_HOST = 'https://umkm-marketplace-production.up.railway.app';
export const API_URL = `${API_HOST}/api`;
export const SOCKET_URL = API_HOST;

export const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/300x300.png?text=No+Image';

export const CATEGORIES = [
    { id: 'all', name: 'All Categories', icon: '📦' },
    { id: 'food', name: 'Food & Beverages', icon: '🍜' },
    { id: 'handicrafts', name: 'Handicrafts', icon: '🎨' },
    { id: 'clothing', name: 'Fashion & Apparel', icon: '👗' },
    { id: 'beauty', name: 'Health & Beauty', icon: '🌿' },
    { id: 'home', name: 'Home & Living', icon: '🏠' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'agriculture', name: 'Agriculture', icon: '🌾' },
];

export const SORT_OPTIONS = [
    { id: 'newest', name: 'Newest' },
    { id: 'price-low', name: 'Price: Low to High' },
    { id: 'price-high', name: 'Price: High to Low' },
    { id: 'rating', name: 'Highest Rated' },
];
