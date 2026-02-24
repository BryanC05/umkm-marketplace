import { API_HOST, PLACEHOLDER_IMAGE } from '../config';
import { EARTH_RADIUS_KM } from './constants';

const hashToLock = (input = '') => {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash % 100000) + 1;
};

const sanitizeKeywords = (input = '') => {
    const raw = String(input).toLowerCase().trim();
    const cleaned = raw.replace(/[^a-z0-9-]+/g, ',').replace(/^,+|,+$/g, '');
    return cleaned || 'indonesian-food';
};

const sourceUnsplashToKeywordImage = (url) => {
    const queryStart = url.indexOf('?');
    let querySeed = '';
    if (queryStart >= 0) {
        const queryRaw = url.slice(queryStart + 1);
        const firstPart = queryRaw.split('&')[0] || '';
        querySeed = firstPart.includes('=') ? (firstPart.split('=')[1] || '') : firstPart;
        try {
            querySeed = decodeURIComponent(querySeed);
        } catch {
            // Keep raw if decoding fails
        }
    }

    const keywords = sanitizeKeywords(querySeed);
    const lock = hashToLock(keywords);
    return `https://loremflickr.com/640/480/${keywords}?lock=${lock}`;
};

export const getImageUrl = (url) => {
    if (!url) return PLACEHOLDER_IMAGE;
    if (url.includes('source.unsplash.com')) return sourceUnsplashToKeywordImage(url);
    if (url.startsWith('http')) return url;
    return `${API_HOST}${url}`;
};

export const formatPrice = (price) => {
    return `Rp ${price?.toLocaleString('id-ID') || '0'}`;
};

export const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    // Handle zero date (0001-01-01) which shows as "1 Jan 1"
    if (date.getFullYear() < 2000) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

export const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

export const formatRelativeTime = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateString);
};

export const truncateText = (text, maxLength = 100) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
};

export const haversineDistanceKm = (pointA, pointB) => {
    if (!pointA || !pointB) return 0;
    const toRadians = (value) => (value * Math.PI) / 180;
    const dLat = toRadians(pointB.lat - pointA.lat);
    const dLng = toRadians(pointB.lng - pointA.lng);
    const lat1 = toRadians(pointA.lat);
    const lat2 = toRadians(pointB.lat);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
};

export const formatDistance = (distanceKm) => {
    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
};
