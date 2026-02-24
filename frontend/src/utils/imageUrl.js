import { getBackendUrl } from '@/config';

function hashToLock(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100000) + 1;
}

function sanitizeKeywords(input) {
  const raw = String(input || '').toLowerCase().trim();
  const cleaned = raw.replace(/[^a-z0-9-]+/g, ',').replace(/^,+|,+$/g, '');
  return cleaned || 'indonesian-food';
}

function sourceUnsplashToKeywordImage(url) {
  const queryStart = url.indexOf('?');
  let querySeed = '';
  if (queryStart >= 0) {
    const queryRaw = url.slice(queryStart + 1);
    const firstPart = queryRaw.split('&')[0] || '';
    querySeed = firstPart.includes('=')
      ? (firstPart.split('=')[1] || '')
      : firstPart;
    try {
      querySeed = decodeURIComponent(querySeed);
    } catch {
      // Keep raw if decoding fails
    }
  }

  const keywords = sanitizeKeywords(querySeed);
  const lock = hashToLock(keywords);
  return `https://loremflickr.com/640/480/${keywords}?lock=${lock}`;
}

export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.includes('source.unsplash.com')) return sourceUnsplashToKeywordImage(url);
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const backend = getBackendUrl();
  if (url.startsWith('/uploads/')) return `${backend}${url}`;
  if (url.startsWith('uploads/')) return `${backend}/${url}`;
  return url;
}
