import axios from "axios";

const DEFAULT_BASE = "http://localhost:8000/api/";
const BASE = import.meta?.env?.VITE_API_BASE || DEFAULT_BASE;

const api = axios.create({
  baseURL: BASE,
  withCredentials: true,
});

// Initialize auth header from localStorage if present
const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Simple request logger and ensure base is used
api.interceptors.request.use((config) => {
  // Ensure URL uses baseURL for debugging
  try {
    // eslint-disable-next-line no-console
    console.debug('[api] Request:', config.method?.toUpperCase(), config.baseURL + config.url);
  } catch (e) {
    // ignore
  }
  return config;
});

api.interceptors.response.use((response) => {
  try {
    // eslint-disable-next-line no-console
    console.debug('[api] Response:', response.status, response.config?.url, response.data);
  } catch (e) {}
  return response;
}, (error) => {
  try {
    // eslint-disable-next-line no-console
    console.error('[api] Response error:', error?.response?.status, error?.response?.config?.url, error?.response?.data || error.message);
  } catch (e) {}
  return Promise.reject(error);
});

export function setAuthToken(newToken) {
  if (newToken) {
    localStorage.setItem('authToken', newToken);
    // backend expects 'Bearer <token>' in Authorization header
    api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
  } else {
    localStorage.removeItem('authToken');
    delete api.defaults.headers.common['Authorization'];
  }
}

export function logout() {
  setAuthToken(null);
}

export default api;
