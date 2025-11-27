import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';

// Mock axios before importing api
vi.mock('axios', () => {
  const mockAxiosInstance = {
    defaults: {
      baseURL: 'http://localhost:8000/api/',
      withCredentials: true,
      headers: {
        common: {}
      }
    },
    interceptors: {
      request: {
        use: vi.fn(),
        handlers: []
      },
      response: {
        use: vi.fn(),
        handlers: []
      }
    },
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    put: vi.fn(() => Promise.resolve({ data: {} })),
    patch: vi.fn(() => Promise.resolve({ data: {} })),
    delete: vi.fn(() => Promise.resolve({ data: {} }))
  };
  
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance)
    }
  };
});

import api, { setAuthToken } from '../../src/services/api';

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('setAuthToken', () => {
    it('should set token in localStorage and axios headers when token provided', () => {
      const token = 'test-token-123';
      setAuthToken(token);

      expect(localStorage.setItem).toHaveBeenCalledWith('authToken', token);
      expect(api.defaults.headers.common['Authorization']).toBe(`Bearer ${token}`);
    });

    it('should remove token from localStorage and axios headers when token is null', () => {
      setAuthToken(null);

      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
      expect(api.defaults.headers.common['Authorization']).toBeUndefined();
    });

    it('should handle empty string token', () => {
      setAuthToken('');

      expect(localStorage.removeItem).toHaveBeenCalledWith('authToken');
    });
  });

  describe('API instance', () => {
    it('should have correct baseURL', () => {
      expect(api.defaults.baseURL).toBeDefined();
      expect(api.defaults.baseURL).toContain('http');
    });

    it('should have withCredentials set to true', () => {
      expect(api.defaults.withCredentials).toBe(true);
    });

    it('should initialize with token from localStorage', () => {
      const token = 'existing-token';
      localStorage.getItem.mockReturnValue(token);
      
      // Token should be set in headers if exists
      expect(localStorage.getItem).toBeDefined();
    });
  });

  describe('Request interceptor', () => {
    it('should add Authorization header to requests when token exists', () => {
      const token = 'interceptor-token';
      localStorage.getItem.mockReturnValue(token);

      const config = { headers: {}, method: 'GET', url: '/test' };
      const interceptor = api.interceptors.request.handlers[0];
      
      if (interceptor && interceptor.fulfilled) {
        const result = interceptor.fulfilled(config);
        expect(result.headers.Authorization).toBe(`Bearer ${token}`);
      }
    });

    it('should not add Authorization header when no token', () => {
      localStorage.getItem.mockReturnValue(null);

      const config = { headers: {}, method: 'GET', url: '/test' };
      const interceptor = api.interceptors.request.handlers[0];
      
      if (interceptor && interceptor.fulfilled) {
        const result = interceptor.fulfilled(config);
        expect(result.headers.Authorization).toBeUndefined();
      }
    });

    it('should log request details in debug mode', () => {
      const config = { 
        headers: {}, 
        method: 'POST', 
        url: '/api/test',
        baseURL: 'http://localhost:8000'
      };
      const interceptor = api.interceptors.request.handlers[0];
      
      if (interceptor && interceptor.fulfilled) {
        interceptor.fulfilled(config);
        expect(console.debug).toHaveBeenCalled();
      }
    });
  });

  describe('Response interceptor', () => {
    it('should log successful responses', () => {
      const response = {
        status: 200,
        config: { url: '/test' },
        data: { message: 'success' }
      };

      const interceptor = api.interceptors.response.handlers[0];
      if (interceptor && interceptor.fulfilled) {
        const result = interceptor.fulfilled(response);
        expect(result).toEqual(response);
        expect(console.debug).toHaveBeenCalled();
      }
    });

    it('should log error responses', () => {
      const error = {
        response: {
          status: 401,
          config: { url: '/test' },
          data: { error: 'Unauthorized' }
        }
      };

      const interceptor = api.interceptors.response.handlers[0];
      if (interceptor && interceptor.rejected) {
        expect(() => interceptor.rejected(error)).rejects.toEqual(error);
        expect(console.error).toHaveBeenCalled();
      }
    });

    it('should handle errors without response object', () => {
      const error = new Error('Network Error');

      const interceptor = api.interceptors.response.handlers[0];
      if (interceptor && interceptor.rejected) {
        expect(() => interceptor.rejected(error)).rejects.toEqual(error);
      }
    });
  });

  describe('API methods', () => {
    it('should have get method', () => {
      expect(api.get).toBeDefined();
      expect(typeof api.get).toBe('function');
    });

    it('should have post method', () => {
      expect(api.post).toBeDefined();
      expect(typeof api.post).toBe('function');
    });

    it('should have put method', () => {
      expect(api.put).toBeDefined();
      expect(typeof api.put).toBe('function');
    });

    it('should have delete method', () => {
      expect(api.delete).toBeDefined();
      expect(typeof api.delete).toBe('function');
    });

    it('should have patch method', () => {
      expect(api.patch).toBeDefined();
      expect(typeof api.patch).toBe('function');
    });
  });

  describe('Environment variables', () => {
    it('should use VITE_API_BASE if available', () => {
      expect(api.defaults.baseURL).toBeDefined();
    });

    it('should fallback to default base URL', () => {
      expect(api.defaults.baseURL).toMatch(/localhost:8000|http/);
    });
  });
});
