export interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  state?: string;
  district?: string;
  timezone: string;
  elevation?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface WeatherObservation {
  id: number;
  location_id: number;
  timestamp: string;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: number;
  rainfall?: number;
  cloud_cover?: number;
  visibility?: number;
  uv_index?: number;
  weather_code?: number;
  weather_description?: string;
  source: string;
  raw_data?: Record<string, any>;
  created_at: string;
}

export interface WeatherForecast {
  id: number;
  location_id: number;
  forecast_timestamp: string;
  valid_time: string;
  horizon_hours: number;
  temperature?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
  wind_direction?: number;
  rainfall?: number;
  cloud_cover?: number;
  visibility?: number;
  uv_index?: number;
  weather_code?: number;
  weather_description?: string;
  precipitation_probability?: number;
  source: string;
  model?: string;
  raw_data?: Record<string, any>;
  created_at: string;
}

export interface WeatherPrediction {
  id: number;
  location_id: number;
  prediction_timestamp: string;
  valid_time: string;
  horizon_hours: number;
  prediction_type: 'temperature' | 'rain';
  predicted_value: number;
  confidence?: number;
  model_version?: string;
  features_used?: Record<string, any>;
  created_at: string;
}

export interface WeatherAlert {
  id: number;
  location_id: number;
  alert_type: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  title: string;
  description?: string;
  issued_at: string;
  expires_at: string;
  source: string;
  source_id?: string;
  areas_affected?: Record<string, any>[];
  recommended_actions?: string[];
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface HistoricalWeather {
  id: number;
  location_id: number;
  date: string;
  year: number;
  month: number;
  day: number;
  avg_temperature?: number;
  min_temperature?: number;
  max_temperature?: number;
  total_rainfall?: number;
  avg_humidity?: number;
  avg_wind_speed?: number;
  source: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  weather_data?: Record<string, any>;
  predictions?: Record<string, any>;
  alerts?: WeatherAlert[];
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  latitude?: number;
  longitude?: number;
  location_name?: string;
  language: string;
}

export interface ChatResponse {
  response: string;
  intent: string;
  entities: Record<string, any>;
  weather_data?: Record<string, any>;
  predictions?: Record<string, any>;
  alerts?: WeatherAlert[];
  session_id: string;
  response_time_ms: number;
}

export interface CurrentWeatherResponse {
  location: Location;
  observation: WeatherObservation;
  forecast: WeatherForecast[];
  alerts: WeatherAlert[];
  predictions: Record<string, any>;
}

export interface ForecastResponse {
  location: Location;
  hourly: WeatherForecast[];
  daily: WeatherForecast[];
  alerts: WeatherAlert[];
}

export interface HistoricalAnalysisResponse {
  location: Location;
  temperature_trend: HistoricalWeather[];
  rainfall_trend: HistoricalWeather[];
  statistics: Record<string, any>;
}

export type IntentType = 
  | 'current_weather'
  | 'forecast'
  | 'rain_probability'
  | 'temperature'
  | 'humidity'
  | 'wind'
  | 'historical'
  | 'alerts'
  | 'comparison'
  | 'general'
  | 'greeting'
  | 'unknown';

export interface WeatherCodeInfo {
  code: string;
  description: string;
  icon: string;
}

// Authentication Types
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  preferences: UserPreferences;
  last_login_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserPreferences {
  temperature_unit: 'c' | 'f';
  wind_unit: 'kmh' | 'mph';
  default_location_id?: number;
  default_forecast_view: 'daily' | 'hourly';
  notifications_enabled: boolean;
  language: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserLocation {
  id: number;
  user_id: number;
  location_name: string;
  latitude: number;
  longitude: number;
  country?: string;
  state?: string;
  district?: string;
  timezone: string;
  is_default: boolean;
  created_at: string;
  updated_at?: string;
}

export interface UserLocationCreate {
  location_name: string;
  latitude: number;
  longitude: number;
  country?: string;
  state?: string;
  district?: string;
  timezone: string;
  is_default: boolean;
}

export interface ChatSession {
  id: number;
  user_id: number;
  session_id: string;
  title?: string;
  created_at: string;
  updated_at?: string;
  messages?: ChatMessage[];
}

export interface SearchHistory {
  id: number;
  user_id: number;
  query: string;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
}