import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { AuthResponse, LoginCredentials, RegisterData, User } from '../types/auth';

// Extract API Base URL from Vite environment or default to local NestJS port 8008
const getBaseUrl = (): string => {
  let url = (import.meta as any).env?.VITE_API_URL || (import.meta as any).env?.REACT_APP_API_URL || 'http://localhost:8008';
  // Strip trailing slash if present
  url = url.replace(/\/+$/, '');
  // If user configured http://localhost:8008/api/v1 but backend routes are root /auth, /users
  if (url.endsWith('/api/v1')) {
    url = url.replace('/api/v1', '');
  }
  return url;
};

export const API_BASE_URL = getBaseUrl();

// Create configured Axios instance
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Attach Authorization Bearer Token on every request if present
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('vastu_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor for handling 401 unauthenticated
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Don't wipe if we're on login or register
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('vastu_token');
        localStorage.removeItem('vastu_user');
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service API
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  updateProfile: async (data: Partial<User & { password?: string }>): Promise<User> => {
    const response = await apiClient.patch<User>('/auth/me', data);
    return response.data;
  },

  checkUsername: async (username: string): Promise<{ available: boolean; message?: string }> => {
    const response = await apiClient.get('/auth/check-username', {
      params: { username },
    });
    return response.data;
  },

  seedDefaults: async (): Promise<{
    message: string;
    superAdminCredentials: { email: string; password: string };
  }> => {
    const response = await apiClient.post('/auth/seed');
    return response.data;
  },

  getRoles: async () => {
    const response = await apiClient.get('/auth/roles');
    return response.data;
  },

  getPermissions: async () => {
    const response = await apiClient.get('/auth/permissions');
    return response.data;
  },
};

// Users API
export const usersApi = {
  getAll: async (params?: { search?: string; status?: string; role?: string }) => {
    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  create: async (data: any) => {
    const response = await apiClient.post('/users', data);
    return response.data;
  },

  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/users/${id}`);
    return response.data;
  },
};

// Reels API
export const reelsApi = {
  getFeed: async (params?: { page?: number; limit?: number; category?: string }) => {
    const response = await apiClient.get('/reels/feed', { params });
    return response.data;
  },

  getTrending: async () => {
    const response = await apiClient.get('/reels/trending');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/reels/${id}`);
    return response.data;
  },

  delete: async (id: string) => {
    const response = await apiClient.delete(`/reels/${id}`);
    return response.data;
  },
};

// Analytics API
export const analyticsApi = {
  getOverview: async (timeframe?: string) => {
    const response = await apiClient.get('/analytics/creator/overview', {
      params: { timeframe: timeframe || '30d' },
    });
    return response.data;
  },

  getChartData: async (metric = 'views', timeframe = '30d') => {
    const response = await apiClient.get('/analytics/creator/chart', {
      params: { metric, timeframe },
    });
    return response.data;
  },

  getTopReels: async (timeframe = '30d', limit = 5) => {
    const response = await apiClient.get('/analytics/creator/top-reels', {
      params: { timeframe, limit },
    });
    return response.data;
  },

  getCategories: async (timeframe = '30d') => {
    const response = await apiClient.get('/analytics/creator/categories', {
      params: { timeframe },
    });
    return response.data;
  },

  getAudience: async (timeframe = '30d') => {
    const response = await apiClient.get('/analytics/creator/audience', {
      params: { timeframe },
    });
    return response.data;
  },
};

// Activity Log API
export const activityApi = {
  getMyActivity: async (page = 1, limit = 20) => {
    const response = await apiClient.get('/activity', {
      params: { page, limit },
    });
    return response.data;
  },

  getGlobalActivity: async (page = 1, limit = 20) => {
    const response = await apiClient.get('/activity/global', {
      params: { page, limit },
    });
    return response.data;
  },
};

export default apiClient;
