'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { weatherApi, chatApi } from './services/api';
import { LocationSearch } from './components/LocationSearch';
import { CurrentWeatherCard } from './components/CurrentWeatherCard';
import { HourlyForecast } from './components/HourlyForecast';
import { DailyForecast } from './components/DailyForecast';
import { AlertsPanel } from './components/AlertsPanel';
import { ChatInterface } from './components/ChatInterface';
import { TemperatureChart, RainfallChart, MonthlyChart } from './components/Charts';
import { formatTemperature, formatDateTime } from './utils/weather';
import type { Location, CurrentWeatherResponse, HistoricalAnalysisResponse, WeatherForecast } from './types';

function App() {
  const [location, setLocation] = useState<Location | null>(null);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeatherResponse | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast[]>([]);
  const [historical, setHistorical] = useState<HistoricalAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'current' | 'forecast' | 'historical' | 'chat'>('current');
  const [unit, setUnit] = useState<'c' | 'f'>('c');

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

  const loadWeatherData = useCallback(async (loc: Location) => {
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
  useEffect(() => {
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

function PredictionsSummary({ predictions, unit }: { predictions: Record<string, any>; unit: 'c' | 'f' }) {
  if (!predictions || Object.keys(predictions).length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Object.entries(predictions).map(([key, value]) => {
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
                      {formatTemperature(pred.predicted_value, unit)} ({Math.round(pred.confidence * 100)}%)
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
  );
}

function StatisticsSummary({ stats }: { stats: Record<string, any> }) {
  if (!stats.temperature && !stats.rainfall) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.temperature && (
        <>
          <StatCard label="Avg Temperature" value={`${stats.temperature.mean?.toFixed(1) || '—'}°C`} />
          <StatCard label="Temperature Range" value={`${stats.temperature.min?.toFixed(1) || '—'}°C - ${stats.temperature.max?.toFixed(1) || '—'}°C`} />
        </>
      )}
      {stats.rainfall && (
        <>
          <StatCard label="Avg Annual Rainfall" value={`${stats.rainfall.mean?.toFixed(0) || '—'} mm`} />
          <StatCard label="Max Annual Rainfall" value={`${stats.rainfall.max?.toFixed(0) || '—'} mm`} />
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default App;