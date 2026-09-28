'use client';

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { LocationSearch } from './components/LocationSearch';
import { CurrentWeatherCard } from './components/CurrentWeatherCard';
import { HourlyForecast } from './components/HourlyForecast';
import { DailyForecast } from './components/DailyForecast';
import { AlertsPanel } from './components/AlertsPanel';
import { ChatInterface } from './components/ChatInterface';
import { TemperatureChart, RainfallChart, MonthlyChart } from './components/Charts';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { formatTemperature, formatDateTime } from './utils/weather';
import type { Location, CurrentWeatherResponse, HistoricalAnalysisResponse, WeatherForecast } from './types';
import { weatherApi, chatApi } from './services/api';
import { PredictionsSummary, StatisticsSummary, StatCard } from './components/StatComponents';

// Main App with Router
function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          
          {/* Main App (Public but enhanced with auth) */}
          <Route path="/" element={<MainApp />} />
          
          {/* Redirects */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Main Weather App Component
function MainApp() {
  const [location, setLocation] = React.useState<Location | null>(null);
  const [currentWeather, setCurrentWeather] = React.useState<CurrentWeatherResponse | null>(null);
  const [forecast, setForecast] = React.useState<WeatherForecast[]>([]);
  const [historical, setHistorical] = React.useState<HistoricalAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'current' | 'forecast' | 'historical' | 'chat'>('current');
  const [unit, setUnit] = React.useState<'c' | 'f'>('c');

  // Default location (Bangalore)
  const defaultLocation: Location = {
    id: 0,
    name: 'Bangalore',
    latitude: 12.9716,
    longitude: 77.5946,
    country: 'India',
    state: 'Karnataka',
    district: 'Bangalore Urban',
    timezone: 'Asia/Kolkata',
    elevation: 920,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const loadWeatherData = React.useCallback(async (loc: Location) => {
    setIsLoading(true);
    try {
      const [current, forecastData, historicalData] = await Promise.all([
        weatherApi.getCurrent(loc.latitude, loc.longitude, loc.name),
        weatherApi.getForecast(loc.latitude, loc.longitude, loc.name, 7),
        weatherApi.getHistorical(loc.latitude, loc.longitude, loc.name, 10),
      ]);
      setCurrentWeather(current);
      setForecast(forecastData.hourly);
      setHistorical(historicalData);
      setLocation(loc);
    } catch (error) {
      console.error('Failed to load weather data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load default location on mount
  React.useEffect(() => {
    loadWeatherData(defaultLocation);
  }, [loadWeatherData]);

  const handleLocationSelect = (loc: Location) => {
    loadWeatherData(loc);
    setActiveTab('current');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-weather-500 to-weather-700 flex items-center justify-center">
                <span className="text-white text-xl">🌤️</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">WeatherGPT</h1>
                <p className="text-xs text-gray-500">AI-Powered Weather Intelligence</p>
              </div>
            </div>
            
            <LocationSearch 
              onSelect={handleLocationSelect} 
              defaultLocation={location || defaultLocation}
            />
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUnit(u => u === 'c' ? 'f' : 'c')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  unit === 'c' 
                    ? 'bg-weather-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                °C
              </button>
              <button
                onClick={() => setUnit(u => u === 'c' ? 'f' : 'c')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  unit === 'f' 
                    ? 'bg-weather-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                °F
              </button>
              
              <AuthNavLink />
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex overflow-x-auto" role="tablist">
            {[
              { id: 'current', label: 'Current', icon: '🌡️' },
              { id: 'forecast', label: 'Forecast', icon: '📅' },
              { id: 'historical', label: 'Historical', icon: '📊' },
              { id: 'chat', label: 'Chat', icon: '💬' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-weather-600 text-weather-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && (
          <div className="fixed top-16 left-0 right-0 h-2 bg-weather-500 animate-pulse z-50" />
        )}

        {activeTab === 'current' && currentWeather && (
          <div className="space-y-6 animate-in">
            <CurrentWeatherCard 
              location={currentWeather.location} 
              observation={currentWeather.observation} 
              unit={unit}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HourlyForecast forecasts={forecast} unit={unit} hours={24} />
              <AlertsPanel alerts={currentWeather.alerts} />
            </div>
            
            {currentWeather.predictions && (
              <div className="card animate-in">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <span>🤖</span>
                    ML Predictions (XGBoost)
                  </h3>
                </div>
                <div className="p-4">
                  <PredictionsSummary predictions={currentWeather.predictions} unit={unit} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'forecast' && (
          <div className="space-y-6 animate-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <HourlyForecast forecasts={forecast} unit={unit} hours={48} />
              </div>
              <div>
                <AlertsPanel alerts={currentWeather?.alerts || []} />
              </div>
            </div>
            
            <DailyForecast forecasts={forecast} unit={unit} />
          </div>
        )}

        {activeTab === 'historical' && historical && (
          <div className="space-y-6 animate-in">
            <div className="card">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Historical Analysis for {historical.location.name}</h3>
              </div>
              <div className="p-4">
                {historical.statistics && Object.keys(historical.statistics).length > 0 && (
                  <StatisticsSummary stats={historical.statistics} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Yearly Temperature Trend</h3>
                </div>
                <div className="p-4">
                  <TemperatureChart data={historical.temperature_trend} />
                </div>
              </div>
              
              <div className="card">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Yearly Rainfall Trend</h3>
                </div>
                <div className="p-4">
                  <RainfallChart data={historical.rainfall_trend} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Monthly Average Temperature</h3>
                </div>
                <div className="p-4">
                  <MonthlyChart data={historical.temperature_trend} metric="temperature" />
                </div>
              </div>
              
              <div className="card">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Monthly Average Rainfall</h3>
                </div>
                <div className="p-4">
                  <MonthlyChart data={historical.rainfall_trend} metric="rainfall" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && location && (
          <div className="animate-in h-[calc(100vh-280px)] min-h-[500px]">
            <ChatInterface
              latitude={location.latitude}
              longitude={location.longitude}
              locationName={location.name}
              language="en"
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            WeatherGPT • Data from Open-Meteo (ECMWF) • ML Predictions via XGBoost • Powered by Gemini
          </p>
        </div>
      </footer>
    </div>
  );
}

// Auth Navigation Link Component
function AuthNavLink() {
  const { isAuthenticated, isLoading, user, logout } = React.useContext(
    require('./hooks/useAuth').AuthContext
  );
  
  if (isLoading) {
    return <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />;
  }
  
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-weather-100 flex items-center justify-center">
          <span className="text-sm font-medium text-weather-700">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
        <button 
          onClick={logout}
          className="btn-ghost text-sm"
        >
          Logout
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <a href="/login" className="btn-ghost text-sm">Sign in</a>
      <a href="/register" className="btn-primary text-sm">Get Started</a>
    </div>
  );
}

export default AppRouter;