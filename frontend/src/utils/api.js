import axios from 'axios';
import { getApiUrl } from '@/config';

const API_URL = getApiUrl() || '/api';
const isAbsoluteApiUrl = /^https?:\/\//i.test(API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add cache buster to bypass aggressive 301 cached redirects from previous backend CORS bug
  if (config.method?.toLowerCase() === 'get') {
    config.params = { ...config.params, _cb: 'v2' };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If direct cross-origin call fails in browser, retry once through local /api proxy.
    if (
      error?.code === 'ERR_NETWORK' &&
      isAbsoluteApiUrl &&
      !error?.config?.__proxyRetried
    ) {
      return api.request({
        ...error.config,
        baseURL: '/api',
        __proxyRetried: true,
      });
    }

    if (error.response?.status === 401) {
      // Check if we're already on the login page to avoid redirect loop
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;
