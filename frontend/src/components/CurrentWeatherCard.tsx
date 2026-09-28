'use client';

import React from 'react';
import { 
  Droplets, 
  Wind, 
  Sun, 
  Cloud, 
  Thermometer, 
  Eye,
  Compass 
} from 'lucide-react';
import { formatTemperature, formatHumidity, formatWindSpeed, formatWindDirection, formatPressure, formatRainfall, getWeatherInfo, cn } from '../utils/weather';
import type { WeatherObservation, Location } from '../types';

interface CurrentWeatherCardProps {
  location: Location;
  observation: WeatherObservation;
  unit?: 'c' | 'f';
}

export function CurrentWeatherCard({ location, observation, unit = 'c' }: CurrentWeatherCardProps) {
  const weatherInfo = getWeatherInfo(observation.weather_code || 0);
  const temp = observation.temperature;
  const feelsLike = observation.raw_data?.apparent_temperature as number | undefined;
  
  return (
    <div className="card animate-in">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{location.name}</h2>
            <p className="text-gray-500 mt-1">
              {location.state && `${location.state}, `}{location.country}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Updated just now</p>
            <p className="text-xs text-gray-400">{new Date(observation.timestamp).toLocaleTimeString()}</p>
          </div>
        </div>

        {/* Main Weather Display */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-6xl" aria-hidden="true">{weatherInfo.icon}</span>
            <div>
              <p className="text-5xl font-light text-gray-900">
                {formatTemperature(temp, unit)}
              </p>
              <p className="text-lg text-gray-600 capitalize">{weatherInfo.description}</p>
            </div>
          </div>
          {feelsLike !== undefined && (
            <div className="text-right text-gray-600">
              <p className="text-sm">Feels like</p>
              <p className="text-2xl font-medium">{formatTemperature(feelsLike, unit)}</p>
            </div>
          )}
        </div>

        {/* Weather Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <WeatherDetailItem
            icon={<Droplets className="w-5 h-5 text-weather-500" />}
            label="Humidity"
            value={formatHumidity(observation.humidity)}
          />
          <WeatherDetailItem
            icon={<Wind className="w-5 h-5 text-weather-500" />}
            label="Wind"
            value={`${formatWindSpeed(observation.wind_speed)} ${formatWindDirection(observation.wind_direction)}`}
          />
          <WeatherDetailItem
            icon={<Thermometer className="w-5 h-5 text-weather-500" />}
            label="Pressure"
            value={formatPressure(observation.pressure)}
          />
          <WeatherDetailItem
            icon={<Cloud className="w-5 h-5 text-weather-500" />}
            label="Cloud Cover"
            value={observation.cloud_cover !== undefined ? `${Math.round(observation.cloud_cover)}%` : '—'}
          />
          <WeatherDetailItem
            icon={<Droplets className="w-5 h-5 text-weather-500" />}
            label="Rainfall"
            value={formatRainfall(observation.rainfall)}
          />
          <WeatherDetailItem
            icon={<Eye className="w-5 h-5 text-weather-500" />}
            label="Visibility"
            value={observation.visibility ? `${(observation.visibility / 1000).toFixed(1)} km` : '—'}
          />
          <WeatherDetailItem
            icon={<Sun className="w-5 h-5 text-weather-500" />}
            label="UV Index"
            value={observation.uv_index !== undefined ? observation.uv_index.toFixed(1) : '—'}
          />
          <WeatherDetailItem
            icon={<Compass className="w-5 h-5 text-weather-500" />}
            label="Wind Dir"
            value={formatWindDirection(observation.wind_direction)}
          />
        </div>
      </div>
    </div>
  );
}

function WeatherDetailItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-center">{icon}</div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-sm font-semibold text-gray-900 text-center">{value}</p>
    </div>
  );
}