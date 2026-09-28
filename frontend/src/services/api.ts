import axios from 'axios';
import type {
  Location,
  WeatherObservation,
  WeatherForecast,
  WeatherPrediction,
  WeatherAlert,
  HistoricalWeather,
  ChatRequest,
  ChatResponse,
  CurrentWeatherResponse,
  ForecastResponse,
  HistoricalAnalysisResponse,
  User,
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserPreferences,
  UserLocation,
  UserLocationCreate,
  ChatSession,
  SearchHistory,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh', { refresh_token: refreshToken }, {
            baseURL: '/api',
            withCredentials: true,
          });
          const { access_token, refresh_token } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (data: LoginRequest) => {
    const response = await api.post<TokenResponse>('/auth/login', data);
    return response.data;
  },

  register: async (data: RegisterRequest) => {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  getMe: async () => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  updateMe: async (data: Partial<User>) => {
    const response = await api.patch<User>('/auth/me', data);
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
    return response.data;
  },

  forgotPassword: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, password: string) => {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  getLocations: async () => {
    const response = await api.get<UserLocation[]>('/auth/locations');
    return response.data;
  },

  createLocation: async (data: UserLocationCreate) => {
    const response = await api.post<UserLocation>('/auth/locations', data);
    return response.data;
  },

  getDefaultLocation: async () => {
    const response = await api.get<UserLocation>('/auth/locations/default');
    return response.data;
  },

  updateLocation: async (id: number, data: Partial<UserLocationCreate>) => {
    const response = await api.patch<UserLocation>(`/auth/locations/${id}`, data);
    return response.data;
  },

  deleteLocation: async (id: number) => {
    const response = await api.delete(`/auth/locations/${id}`);
    return response.data;
  },

  getChatSessions: async (limit = 50) => {
    const response = await api.get<ChatSession[]>('/auth/chat/sessions', { params: { limit } });
    return response.data;
  },

  createChatSession: async (sessionId: string) => {
    const response = await api.post<ChatSession>('/auth/chat/sessions', { session_id: sessionId });
    return response.data;
  },

  getChatSession: async (sessionId: number) => {
    const response = await api.get<ChatSession>(`/auth/chat/sessions/${sessionId}`);
    return response.data;
  },

  deleteChatSession: async (sessionId: number) => {
    const response = await api.delete(`/auth/chat/sessions/${sessionId}`);
    return response.data;
  },

  getSearchHistory: async (limit = 20) => {
    const response = await api.get<SearchHistory[]>('/auth/search-history', { params: { limit } });
    return response.data;
  },

  clearSearchHistory: async () => {
    const response = await api.delete('/auth/search-history');
    return response.data;
  },

  getPreferences: async () => {
    const response = await api.get<UserPreferences>('/auth/preferences');
    return response.data;
  },

  updatePreferences: async (preferences: UserPreferences) => {
    const response = await api.patch<UserPreferences>('/auth/preferences', preferences);
    return response.data;
  },
};

export const weatherApi = {
  getCurrent: async (latitude?: number, longitude?: number, locationName?: string) => {
    const params: Record<string, any> = {};
    if (latitude !== undefined) params.latitude = latitude;
    if (longitude !== undefined) params.longitude = longitude;
    if (locationName) params.location_name = locationName;
    const response = await api.get<CurrentWeatherResponse>('/weather/current', { params });
    return response.data;
  },

  getForecast: async (latitude?: number, longitude?: number, locationName?: string, days = 7) => {
    const params: Record<string, any> = { days };
    if (latitude !== undefined) params.latitude = latitude;
    if (longitude !== undefined) params.longitude = longitude;
    if (locationName) params.location_name = locationName;
    const response = await api.get<ForecastResponse>('/weather/forecast', { params });
    return response.data;
  },

  getHistorical: async (latitude?: number, longitude?: number, locationName?: string, years = 10) => {
    const params: Record<string, any> = { years };
    if (latitude !== undefined) params.latitude = latitude;
    if (longitude !== undefined) params.longitude = longitude;
    if (locationName) params.location_name = locationName;
    const response = await api.get<HistoricalAnalysisResponse>('/weather/historical', { params });
    return response.data;
  },

  getAlerts: async (latitude?: number, longitude?: number) => {
    const params: Record<string, any> = {};
    if (latitude !== undefined) params.latitude = latitude;
    if (longitude !== undefined) params.longitude = longitude;
    const response = await api.get<WeatherAlert[]>('/weather/alerts', { params });
    return response.data;
  },

  searchLocations: async (query: string) => {
    const response = await api.get<Location[]>('/weather/locations/search', {
      params: { query },
    });
    return response.data;
  },
};

export const chatApi = {
  sendMessage: async (request: ChatRequest) => {
    const response = await api.post<ChatResponse>('/chat', request);
    return response.data;
  },

  getHistory: async (sessionId: string, limit = 50) => {
    const response = await api.get<ChatResponse[]>(`/chat/history/${sessionId}`, {
      params: { limit },
    });
    return response.data;
  },

  getSessions: async (limit = 50) => {
    const response = await api.get<ChatSession[]>('/chat/sessions', { params: { limit } });
    return response.data;
  },
};

export default api;