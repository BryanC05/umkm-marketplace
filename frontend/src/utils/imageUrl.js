import { getBackendUrl } from '@/config';

export function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const backend = getBackendUrl();
  if (url.startsWith('/uploads/')) return `${backend}${url}`;
  if (url.startsWith('uploads/')) return `${backend}/${url}`;
  return url;
}
