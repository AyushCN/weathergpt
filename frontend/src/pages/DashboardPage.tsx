'use client';

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Settings, 
  LogOut, 
  History, 
  Plus, 
  Trash2, 
  Star,
  Clock,
  Bell,
  Palette,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { formatTemperature, formatDateTime, getWeatherInfo, cn } from '../utils/weather';
import { weatherApi, authApi, chatApi } from '../services/api';
import type { UserLocation, ChatSession, SearchHistory, CurrentWeatherResponse } from '../types';

export function DashboardPage() {
  const { 
    user, 
    isLoading: authLoading, 
    logout, 
    locations, 
    defaultLocation,
    fetchLocations,
    chatSessions,
    fetchChatSessions,
    searchHistory,
    fetchSearchHistory,
    clearSearchHistory,
    updatePreferences,
  } = useAuth();
  
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'locations' | 'history' | 'chats' | 'settings'>('overview');
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherResponse | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState('');
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', lat: '', lon: '' });
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // Load weather for default location on mount
  useEffect(() => {
    if (defaultLocation && !authLoading) {
      loadWeather();
    }
  }, [defaultLocation, authLoading]);

  const loadWeather = async () => {
    if (!defaultLocation) return;
    
    setIsLoadingWeather(true);
    setWeatherError('');
    try {
      const weather = await weatherApi.getCurrent(defaultLocation.latitude, defaultLocation.longitude, defaultLocation.location_name);
      setCurrentWeather(weather);
    } catch (err: any) {
      setWeatherError('Failed to load weather data');
      console.error('Weather load error:', err);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocation.name || !newLocation.lat || !newLocation.lon) return;
    
    setIsAddingLocation(true);
    try {
      await authApi.createLocation({
        location_name: newLocation.name,
        latitude: parseFloat(newLocation.lat),
        longitude: parseFloat(newLocation.lon),
        is_default: locations.length === 0,
      });
      await fetchLocations();
      setNewLocation({ name: '', lat: '', lon: '' });
      setShowAddLocation(false);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add location');
    } finally {
      setIsAddingLocation(false);
    }
  };

  const handleSetDefault = async (location: UserLocation) => {
    try {
      await authApi.updateLocation(location.id, { is_default: true });
      await fetchLocations();
    } catch (err: any) {
      alert('Failed to set default location');
    }
  };

  const handleDeleteLocation = async (id: number) => {
    if (!confirm('Delete this saved location?')) return;
    try {
      await authApi.deleteLocation(id);
      await fetchLocations();
    } catch (err: any) {
      alert('Failed to delete location');
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all search history?')) return;
    await clearSearchHistory();
  };

  const handlePreferenceChange = async (key: string, value: any) => {
    try {
      await updatePreferences({ [key]: value } as any);
    } catch (err) {
      console.error('Failed to update preference:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-weather-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please log in to access your dashboard</p>
          <Link href="/login" className="btn-primary">Sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-weather-500 to-weather-700 flex items-center justify-center">
                  <span className="text-white text-xl">🌤️</span>
                </div>
                <span className="text-xl font-bold text-gray-900">WeatherGPT</span>
              </Link>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
              </div>
              
              <div className="relative group">
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-weather-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-weather-700">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-gray-700">{user.name}</span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href="/dashboard" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Dashboard</Link>
                  <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Settings</Link>
                  <hr className="my-1 border-gray-100" />
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <nav className="mb-8" aria-label="Dashboard tabs">
          <div className="flex overflow-x-auto space-x-1" role="tablist">
            {[
              { id: 'overview', label: 'Overview', icon: <div className="w-5 h-5 rounded bg-weather-100 flex items-center justify-center"><span className="text-weather-600 text-xl">🌤️</span></div> },
              { id: 'locations', label: 'Saved Locations', icon: <MapPin className="w-5 h-5 text-weather-600" /> },
              { id: 'chats', label: 'Chat History', icon: <MessageSquare className="w-5 h-5 text-weather-600" /> },
              { id: 'history', label: 'Search History', icon: <History className="w-5 h-5 text-weather-600" /> },
              { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5 text-weather-600" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  activeTab === tab.id
                    ? 'bg-weather-50 text-weather-600 border border-weather-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in">
              {/* Welcome & Current Weather */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 card">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">Current Weather</h2>
                        <p className="text-gray-500">
                          {defaultLocation ? defaultLocation.location_name : 'No default location set'}
                        </p>
                      </div>
                      {!defaultLocation && (
                        <Link href="#locations" className="btn-primary text-sm">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Location
                        </Link>
                      )}
                    </div>
                    
                    {isLoadingWeather && (
                      <div className="flex items-center justify-center h-48">
                        <Loader2 className="w-8 h-8 animate-spin text-weather-600" />
                      </div>
                    )}
                    
                    {weatherError && (
                      <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        <AlertCircle className="w-5 h-5" />
                        <span>{weatherError}</span>
                      </div>
                    )}
                    
                    {currentWeather && !isLoadingWeather && (
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0">
                          <span className="text-6xl" aria-hidden="true">
                            {getWeatherInfo(currentWeather.observation.weather_code || 0).icon}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-4xl font-light text-gray-900">
                            {formatTemperature(currentWeather.observation.temperature)}
                          </p>
                          <p className="text-lg text-gray-600 capitalize">
                            {getWeatherInfo(currentWeather.observation.weather_code || 0).description}
                          </p>
                        </div>
                        <div className="text-right text-gray-600">
                          <p className="text-sm">Feels like</p>
                          <p className="text-2xl font-medium">
                            {formatTemperature(currentWeather.observation.raw_data?.apparent_temperature)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {currentWeather && (
                    <div className="px-6 pb-6 border-t border-gray-100">
                      <div className="grid grid-cols-4 gap-4">
                        <StatItem 
                          icon={<span className="text-2xl">💧</span>} 
                          label="Humidity" 
                          value={`${currentWeather.observation.humidity}%`} 
                        />
                        <StatItem 
                          icon={<span className="text-2xl">💨</span>} 
                          label="Wind" 
                          value={`${currentWeather.observation.wind_speed} km/h`} 
                        />
                        <StatItem 
                          icon={<span className="text-2xl">📊</span>} 
                          label="Pressure" 
                          value={`${currentWeather.observation.pressure} hPa`} 
                        />
                        <StatItem 
                          icon={<span className="text-2xl">☀️</span>} 
                          label="UV Index" 
                          value={currentWeather.observation.uv_index?.toString() || '—'} 
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="card">
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <Link 
                        href="/chat" 
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Ask WeatherGPT</p>
                          <p className="text-sm text-gray-500">Chat about weather</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                      </Link>
                      
                      <Link 
                        href="#locations" 
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Saved Locations</p>
                          <p className="text-sm text-gray-500">Manage {locations.length} locations</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                      </Link>
                      
                      <Link 
                        href="#history" 
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                          <History className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Search History</p>
                          <p className="text-sm text-gray-500">{searchHistory.length} recent searches</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                      </Link>
                      
                      <Link 
                        href="#chats" 
                        className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Chat Sessions</p>
                          <p className="text-sm text-gray-500">{chatSessions.length} conversations</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* ML Predictions */}
              {currentWeather?.predictions && (
                <div className="card">
                  <div className="p-6">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-xl">🤖</span>
                      AI Predictions (XGBoost)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      {Object.entries(currentWeather.predictions).map(([key, value]) => {
                        if (key === 'generated_at') return null;
                        return (
                          <div key={key} className="p-4 bg-gray-50 rounded-lg">
                            <h4 className="font-medium text-gray-700 capitalize mb-2">{key} Forecast</h4>
                            {value.temperature && (
                              <div className="space-y-1 text-sm">
                                {Object.entries(value.temperature).slice(0, 3).map(([horizon, pred]: any) => (
                                  <div key={horizon} className="flex justify-between">
                                    <span className="text-gray-500">{horizon}</span>
                                    <span className="font-medium">
                                      {formatTemperature(pred.predicted_value)} ({Math.round(pred.confidence * 100)}%)
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {value.rain && (
                              <div className="space-y-1 text-sm mt-2">
                                {Object.entries(value.rain).slice(0, 3).map(([horizon, pred]: any) => (
                                  <div key={horizon} className="flex justify-between">
                                    <span className="text-gray-500">{horizon}</span>
                                    <span className="font-medium text-blue-600">
                                      {Math.round(pred.probability * 100)}% chance
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Locations Tab */}
          {activeTab === 'locations' && (
            <div className="card animate-in">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Saved Locations</h2>
                <button
                  onClick={() => setShowAddLocation(true)}
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Location
                </button>
              </div>
              
              <div className="p-6">
                {locations.length === 0 ? (
                  <div className="text-center py-12">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No saved locations</h3>
                    <p className="text-gray-500 mb-4">Add your first location to get personalized weather</p>
                    <button
                      onClick={() => setShowAddLocation(true)}
                      className="btn-primary"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Location
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {locations.map((location) => (
                      <div 
                        key={location.id} 
                        className={cn(
                          'flex items-center justify-between p-4 rounded-lg border transition-colors',
                          location.is_default ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            location.is_default ? 'bg-blue-100' : 'bg-gray-100'
                          )}>
                            <MapPin className={cn('w-5 h-5', location.is_default ? 'text-blue-600' : 'text-gray-600')} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900">{location.location_name}</h3>
                              {location.is_default && (
                                <span className="badge bg-blue-100 text-blue-700">
                                  <Star className="w-3 h-3 mr-1" />
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                              {location.state && ` • ${location.state}`}
                              {location.country && `, ${location.country}`}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {!location.is_default && (
                            <button
                              onClick={() => handleSetDefault(location)}
                              className="btn-secondary text-sm"
                            >
                              <Star className="w-4 h-4 mr-1" />
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteLocation(location.id)}
                            className="btn-ghost text-red-600 hover:bg-red-50"
                            aria-label="Delete location"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chat History Tab */}
          {activeTab === 'chats' && (
            <div className="card animate-in">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Chat History</h2>
              </div>
              
              <div className="p-6">
                {chatSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No chat history</h3>
                    <p className="text-gray-500 mb-4">Start a conversation with WeatherGPT</p>
                    <Link href="/chat" className="btn-primary">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Start Chatting
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatSessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/chat?session=${session.session_id}`}
                        className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-weather-300 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {session.title || 'Weather Conversation'}
                            </h3>
                            <p className="text-sm text-gray-500">
                              {formatDateTime(session.updated_at || session.created_at)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search History Tab */}
          {activeTab === 'history' && (
            <div className="card animate-in">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Search History</h2>
                {searchHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="btn-ghost text-red-600 hover:bg-red-50 text-sm"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Clear All
                  </button>
                )}
              </div>
              
              <div className="p-6">
                {searchHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No search history</h3>
                    <p className="text-gray-500">Your recent searches will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchHistory.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                            <Clock className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.query}</p>
                            <p className="text-sm text-gray-500">
                              {item.location_name || `${item.latitude?.toFixed(4)}, ${item.longitude?.toFixed(4)}`}
                              • {formatDateTime(item.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="card animate-in">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-bold text-gray-900">Settings</h2>
              </div>
              
              <div className="p-6 space-y-8">
                {/* Profile */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-weather-600" />
                    Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                      <input
                        type="text"
                        value={user.name}
                        onChange={(e) => updateProfile({ name: e.target.value })}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={user.email}
                        onChange={(e) => updateProfile({ email: e.target.value })}
                        className="input"
                      />
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-weather-600" />
                    Preferences
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Temperature Unit</label>
                      <select
                        value={user.preferences?.temperature_unit || 'c'}
                        onChange={(e) => handlePreferenceChange('temperature_unit', e.target.value)}
                        className="input"
                      >
                        <option value="c">Celsius (°C)</option>
                        <option value="f">Fahrenheit (°F)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Wind Unit</label>
                      <select
                        value={user.preferences?.wind_unit || 'kmh'}
                        onChange={(e) => handlePreferenceChange('wind_unit', e.target.value)}
                        className="input"
                      >
                        <option value="kmh">km/h</option>
                        <option value="mph">mph</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Forecast View</label>
                      <select
                        value={user.preferences?.default_forecast_view || 'daily'}
                        onChange={(e) => handlePreferenceChange('default_forecast_view', e.target.value)}
                        className="input"
                      >
                        <option value="daily">Daily (7-day)</option>
                        <option value="hourly">Hourly (24h)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                      <select
                        value={user.preferences?.language || 'en'}
                        onChange={(e) => handlePreferenceChange('language', e.target.value)}
                        className="input"
                      >
                        <option value="en">English</option>
                        <option value="hi">हिंदी</option>
                        <option value="ta">தமிழ்</option>
                        <option value="te">తెలుగు</option>
                        <option value="kn">ಕನ್ನಡ</option>
                        <option value="ml">മലയാളം</option>
                        <option value="mr">मराठी</option>
                        <option value="gu">ગુજરાતી</option>
                        <option value="bn">বাংলা</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="notifications"
                        checked={user.preferences?.notifications_enabled ?? true}
                        onChange={(e) => handlePreferenceChange('notifications_enabled', e.target.checked)}
                        className="h-4 w-4 text-weather-600 focus:ring-weather-500 border-gray-300 rounded"
                      />
                      <label htmlFor="notifications" className="ml-2 text-sm text-gray-700">
                        Enable notifications
                      </label>
                    </div>
                  </div>
                </div>

                {/* Change Password */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Lock className="w-5 h-5 text-weather-600" />
                    Change Password
                  </h3>
                  <ChangePasswordForm />
                </div>

                {/* Danger Zone */}
                <div className="border-t border-gray-100 pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    Danger Zone
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">Once deleted, your account and all data cannot be recovered.</p>
                  <button className="btn-ghost text-red-600 hover:bg-red-50">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 p-3 bg-gray-50 rounded-lg">
      <div>{icon}</div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { changePassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      <div>
        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Current Password
        </label>
        <div className="relative">
          <input
            id="currentPassword"
            type={showPassword ? 'text' : 'password'}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input pr-10"
            required
          />
        </div>
      </div>

      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
          New Password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={showPassword ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input pr-10"
            required
            minLength={8}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
          Confirm New Password
        </label>
        <input
          id="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="input"
          required
        />
      </div>

      <button type="submit" disabled={isLoading} className="btn-primary">
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Updating...
          </span>
        ) : (
          'Change Password'
        )}
      </button>
    </form>
  );
}

// Add Location Modal
export function AddLocationModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (name: string, lat: number, lon: number) => Promise<void>;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !lat || !lon) return;
    
    try {
      await onSubmit(name, parseFloat(lat), parseFloat(lon));
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add location');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-900/50" onClick={onClose} />
        <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Add Location</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g., Mumbai, India"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="input"
                  placeholder="12.9716"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="input"
                  placeholder="77.5946"
                  required
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">Tip: Use the search on the home page to find coordinates</p>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="btn-primary flex-1">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Add Location'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}