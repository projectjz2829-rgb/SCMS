
import axios from 'axios';

// Get CSRF token from the cookie
const getCsrfToken = () => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrf_token=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
};

const api = axios.create({
  withCredentials: true,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = getCsrfToken();
  if (token && (config.method !== 'get' && config.method !== 'head' && config.method !== 'options')) {
    config.headers['X-CSRFToken'] = token;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error || error.message || 'An unexpected network error occurred';
    window.dispatchEvent(new CustomEvent('global-toast', { detail: { message, type: 'error' } }));
    return Promise.reject(error);
  }
);

export default api;
