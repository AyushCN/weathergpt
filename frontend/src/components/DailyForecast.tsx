'use client';

import React from 'react';
import { formatDate, formatTemperature, getWeatherInfo, formatRainfall, formatWindSpeed, formatHumidity, cn } from '../utils/weather';
import type { WeatherForecast } from '../types';

interface DailyForecastProps {
  forecasts: WeatherForecast[];
  unit?: 'c' | 'f';
}

export function DailyForecast({ forecasts, unit = 'c' }: DailyForecastProps) {
  // Group by day
  const dailyMap = new Map<string, WeatherForecast[]>();
  
  forecasts.forEach(forecast => {
    const date = formatDate(forecast.valid_time);
    if (!dailyMap.has(date)) {
      dailyMap.set(date, []);
    }
    dailyMap.get(date)!.push(forecast);
  });

  const dailyData = Array.from(dailyMap.entries()).slice(0, 7).map(([date, dayForecasts]) => {
    const temps = dayForecasts.map(f => f.temperature).filter((t): t is number => t !== undefined);
    const maxTemp = temps.length ? Math.max(...temps) : undefined;
    const minTemp = temps.length ? Math.min(...temps) : undefined;
    
    // Get midday forecast for weather icon
    const midday = dayForecasts.find(f => {
      const hour = new Date(f.valid_time).getHours();
      return hour >= 11 && hour <= 14;
    }) || dayForecasts[Math.floor(dayForecasts.length / 2)];
    
    const weatherInfo = getWeatherInfo(midday.weather_code || 0);
    const totalRain = dayForecasts.reduce((sum, f) => sum + (f.rainfall || 0), 0);
    const maxRainProb = Math.max(...dayForecasts.map(f => f.precipitation_probability || 0));
    const avgHumidity = dayForecasts.reduce((sum, f) => sum + (f.humidity || 0), 0) / dayForecasts.length;
    const maxWind = Math.max(...dayForecasts.map(f => f.wind_speed || 0));

    return {
      date,
      maxTemp,
      minTemp,
      weatherInfo,
      totalRain,
      maxRainProb,
      avgHumidity: Math.round(avgHumidity),
      maxWind,
    };
  });

  return (
    <div className="card animate-in">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">7-Day Forecast</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {dailyData.map((day, index) => (
          <div
            key={day.date}
            className={cn(
              'flex items-center justify-between px-4 py-3 transition-colors',
              index === 0 && 'bg-blue-50'
            )}
          >
            <div className="flex items-center gap-4 min-w-[200px]">
              <div className="w-28">
                <p className="font-medium text-gray-900">{day.date}</p>
                <p className="text-sm text-gray-500 capitalize">{day.weatherInfo.description}</p>
              </div>
              <span className="text-3xl" aria-hidden="true">{day.weatherInfo.icon}</span>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-1.5 text-red-600">
                <span>🌡️</span>
                <span className="font-medium">
                  {day.maxTemp !== undefined ? formatTemperature(day.maxTemp, unit) : '—'} / 
                  {day.minTemp !== undefined ? formatTemperature(day.minTemp, unit) : '—'}
                </span>
              </div>
              
              {day.totalRain > 0 && (
                <div className="flex items-center gap-1.5 text-blue-600">
                  <span>🌧️</span>
                  <span>{formatRainfall(day.totalRain)}</span>
                </div>
              )}
              
              {day.maxRainProb > 0 && (
                <div className="flex items-center gap-1.5 text-blue-600">
                  <span>☔</span>
                  <span>{day.maxRainProb}%</span>
                </div>
              )}
              
              <div className="flex items-center gap-1.5 text-gray-600">
                <span>💧</span>
                <span>{day.avgHumidity}%</span>
              </div>
              
              <div className="flex items-center gap-1.5 text-gray-600">
                <span>💨</span>
                <span>{formatWindSpeed(day.maxWind)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}