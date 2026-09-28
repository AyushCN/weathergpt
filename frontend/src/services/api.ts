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
} from '../types';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const weatherApi = {
  getCurrent: async (latitude: number, longitude: number, locationName?: string) => {
    const response = await api.get<CurrentWeatherResponse>('/weather/current', {
      params: { latitude, longitude, location_name: locationName },
    });
    return response.data;
  },

  getForecast: async (latitude: number, longitude: number, locationName?: string, days = 7) => {
    const response = await api.get<ForecastResponse>('/weather/forecast', {
      params: { latitude, longitude, location_name: locationName, days },
    });
    return response.data;
  },

  getHistorical: async (latitude: number, longitude: number, locationName?: string, years = 10) => {
    const response = await api.get<HistoricalAnalysisResponse>('/weather/historical', {
      params: { latitude, longitude, location_name: locationName, years },
    });
    return response.data;
  },

  getAlerts: async (latitude: number, longitude: number) => {
    const response = await api.get<WeatherAlert[]>('/weather/alerts', {
      params: { latitude, longitude },
    });
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
};

export default api;