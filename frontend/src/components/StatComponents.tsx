'use client';

import React from 'react';
import { formatTemperature } from '../utils/weather';

interface PredictionsSummaryProps {
  predictions: Record<string, any>;
  unit: 'c' | 'f';
}

export function PredictionsSummary({ predictions, unit }: PredictionsSummaryProps) {
  if (!predictions || Object.keys(predictions).length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {Object.entries(predictions).map(([key, value]) => {
        if (key === 'generated_at') return null;
        return (
          <div key={key} className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-700 capitalize mb-2">{key} Forecast</h4>
            {key === 'temperature' && (
              <div className="space-y-1 text-sm">
                {Object.entries(value).slice(0, 3).map(([horizon, pred]: any) => (
                  <div key={horizon} className="flex justify-between">
                    <span className="text-gray-500">{horizon}</span>
                    <span className="font-medium">
                      {pred.predicted_value !== null ? `${formatTemperature(pred.predicted_value, unit)} (${Math.round(pred.confidence * 100)}%)` : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {key === 'rain' && (
              <div className="space-y-1 text-sm mt-2">
                {Object.entries(value).slice(0, 3).map(([horizon, pred]: any) => (
                  <div key={horizon} className="flex justify-between">
                    <span className="text-gray-500">{horizon}</span>
                    <span className="font-medium text-blue-600">
                      {pred.probability !== null && pred.probability !== undefined ? `${Math.round(pred.probability * 100)}% chance` : 'N/A'}
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

interface StatisticsSummaryProps {
  stats: Record<string, any>;
}

export function StatisticsSummary({ stats }: StatisticsSummaryProps) {
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

interface StatCardProps {
  label: string;
  value: string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}