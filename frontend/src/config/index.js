const API_URL = import.meta.env.VITE_API_URL || '';
const BACKEND_URL = API_URL.replace('/api', '');

export const getBackendUrl = () => BACKEND_URL;
export const getApiUrl = () => API_URL;
