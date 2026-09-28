'use client';

import React from 'react';
import { formatTime, formatTemperature, getWeatherInfo, cn } from '../utils/weather';
import type { WeatherForecast } from '../types';

interface HourlyForecastProps {
  forecasts: WeatherForecast[];
  unit?: 'c' | 'f';
  hours?: number;
}

export function HourlyForecast({ forecasts, unit = 'c', hours = 24 }: HourlyForecastProps) {
  const displayForecasts = forecasts.slice(0, hours);
  
  return (
    <div className="card animate-in">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Hourly Forecast</h3>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-2 min-w-max px-4">
          {displayForecasts.map((forecast) => {
            const weatherInfo = getWeatherInfo(forecast.weather_code || 0);
            const time = formatTime(forecast.valid_time);
            const temp = formatTemperature(forecast.temperature, unit);
            const rainProb = forecast.precipitation_probability;
            
            return (
              <div
                key={forecast.valid_time}
                className={cn(
                  'flex flex-col items-center gap-2 w-20 flex-shrink-0 p-3 rounded-lg',
                  rainProb && rainProb > 50 && 'bg-blue-50'
                )}
              >
                <p className="text-xs font-medium text-gray-600">{time}</p>
                <span className="text-2xl" aria-hidden="true">{weatherInfo.icon}</span>
                <p className="text-lg font-semibold text-gray-900">{temp}</p>
                {rainProb !== undefined && rainProb > 0 && (
                  <p className="text-xs text-blue-600 font-medium">{rainProb}% 🌧️</p>
                )}
                <p className="text-xs text-gray-500 capitalize truncate w-full text-center">
                  {weatherInfo.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}