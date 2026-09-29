import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { AuthProvider, AuthContext, useAuth } from './hooks/useAuth';
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
import { LandingPage } from './pages/LandingPage';
import { formatTemperature, formatDateTime } from './utils/weather';
import type { Location, CurrentWeatherResponse, HistoricalAnalysisResponse, WeatherForecast } from './types';
import { weatherApi } from './services/api';
import { PredictionsSummary, StatisticsSummary } from './components/StatComponents';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';

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
          
          {/* Main App (Protected) */}
          <Route path="/app" element={<ProtectedRoute><MainApp /></ProtectedRoute>} />
          
          {/* Landing Page */}
          <Route path="/" element={<LandingPage />} />
          
          {/* Redirects */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

// Main Weather App Component
function MainApp() {
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session_id') || undefined;

  const [location, setLocation] = React.useState<Location | null>(null);
  const [currentWeather, setCurrentWeather] = React.useState<CurrentWeatherResponse | null>(null);
  const [forecast, setForecast] = React.useState<WeatherForecast[]>([]);
  const [historical, setHistorical] = React.useState<HistoricalAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'current' | 'forecast' | 'historical' | 'chat'>(initialSessionId ? 'chat' : 'current');
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
    <div className="min-h-screen bg-brand-50 relative font-sans">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 -left-40 w-72 h-72 bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30 transform hover:scale-105 transition-transform duration-300">
                  <span className="text-white text-2xl material-symbols-outlined">routine</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-900 to-brand-600 tracking-tight">WeatherGPT</h1>
                  <p className="text-sm text-brand-500 font-medium">AI-Powered Weather Intelligence</p>
                </div>
              </div>
              
              <LocationSearch 
                onSelect={handleLocationSelect} 
                defaultLocation={location || defaultLocation}
              />
              
              <div className="flex items-center gap-3">
                <div className="bg-white/50 backdrop-blur-md p-1 rounded-xl border border-white/40 shadow-sm flex items-center">
                  <button
                    onClick={() => setUnit('c')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      unit === 'c' 
                        ? 'bg-brand-600 text-white shadow-md' 
                        : 'text-brand-600 hover:bg-white/60'
                    }`}
                  >
                    °C
                  </button>
                  <button
                    onClick={() => setUnit('f')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                      unit === 'f' 
                        ? 'bg-brand-600 text-white shadow-md' 
                        : 'text-brand-600 hover:bg-white/60'
                    }`}
                  >
                    °F
                  </button>
                </div>
                
                <AuthNavLink />
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="bg-white/40 backdrop-blur-md border-b border-white/30 sticky top-20 z-30 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-2 p-2 overflow-x-auto" role="tablist">
              {[
                { id: 'current', label: 'Current', icon: 'thermometer' },
                { id: 'forecast', label: 'Forecast', icon: 'calendar_month' },
                { id: 'historical', label: 'Historical', icon: 'bar_chart' },
                { id: 'chat', label: 'Chat', icon: 'chat_bubble' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-white text-brand-700 shadow-sm border border-brand-100'
                      : 'text-brand-600 hover:bg-white/60 hover:text-brand-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* Content */}
        <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 relative z-10">
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
              initialSessionId={initialSessionId}
            />
          </div>
        )}
        
        {/* PWA Install Prompt & Offline/Update Indicators */}
        <PWAInstallPrompt />

      </main>

      {/* Footer */}
      <footer className="bg-white/40 backdrop-blur-md border-t border-white/40 mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-brand-600 font-medium">
            WeatherGPT • Data from Open-Meteo (ECMWF) • ML Predictions via XGBoost • Powered by Gemini
          </p>
        </div>
      </footer>
      </div>
    </div>
  );
}

// Auth Navigation Link Component
function AuthNavLink() {
  const { isAuthenticated, logout, user } = useAuth();
  
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/40 shadow-sm">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-sm text-white">
          <span className="text-sm font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <span className="hidden sm:block text-sm font-semibold text-brand-900">{user?.name}</span>
        <button 
          onClick={logout}
          className="btn-ghost text-sm px-2 py-1 text-brand-600 hover:text-brand-800"
        >
          Logout
        </button>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <a href="/login" className="btn-ghost text-sm">Sign in</a>
      <a href="/register" className="btn-primary text-sm shadow-brand-500/30">Get Started</a>
    </div>
  );
}

export default AppRouter;