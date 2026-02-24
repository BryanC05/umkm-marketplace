// Change this to your machine's local network IP when testing on a physical device
// Use 'localhost' only when testing on iOS Simulator
// Find your IP: run `ifconfig | grep "inet "` in terminal
export const API_HOST = 'https://umkm-marketplace-production.up.railway.app';
export const API_URL = `${API_HOST}/api`;
export const SOCKET_URL = API_HOST;

// English categories (default)
export const CATEGORIES_EN = [
    { id: 'all', name: 'All Categories', icon: '📦' },
    { id: 'food', name: 'Food & Beverages', icon: '🍜' },
    { id: 'handicrafts', name: 'Handicrafts', icon: '🎨' },
    { id: 'clothing', name: 'Fashion & Apparel', icon: '👗' },
    { id: 'beauty', name: 'Health & Beauty', icon: '🌿' },
    { id: 'home', name: 'Home & Living', icon: '🏠' },
    { id: 'electronics', name: 'Electronics', icon: '📱' },
    { id: 'agriculture', name: 'Agriculture', icon: '🌾' },
];

// Indonesian categories
export const CATEGORIES_ID = [
    { id: 'all', name: 'Semua Kategori', icon: '📦' },
    { id: 'food', name: 'Makanan & Minuman', icon: '🍜' },
    { id: 'handicrafts', name: 'Kerajinan', icon: '🎨' },
    { id: 'clothing', name: 'Fashion & Pakaian', icon: '👗' },
    { id: 'beauty', name: 'Kesehatan & Kecantikan', icon: '🌿' },
    { id: 'home', name: 'Rumah & Kehidupan', icon: '🏠' },
    { id: 'electronics', name: 'Elektronik', icon: '📱' },
    { id: 'agriculture', name: 'Pertanian', icon: '🌾' },
];

export const SORT_OPTIONS_EN = [
    { id: 'newest', name: 'Newest' },
    { id: 'price-low', name: 'Price: Low to High' },
    { id: 'price-high', name: 'Price: High to Low' },
    { id: 'rating', name: 'Highest Rated' },
];

export const SORT_OPTIONS_ID = [
    { id: 'newest', name: 'Terbaru' },
    { id: 'price-low', name: 'Harga: Rendah ke Tinggi' },
    { id: 'price-high', name: 'Harga: Tinggi ke Rendah' },
    { id: 'rating', name: 'Rating Tertinggi' },
];

// Default exports (for backward compatibility)
export const CATEGORIES = CATEGORIES_EN;
export const SORT_OPTIONS = SORT_OPTIONS_EN;
