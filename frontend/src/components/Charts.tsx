'use client';

import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { cn } from '../utils/weather';
import type { HistoricalWeather } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface TemperatureChartProps {
  data: HistoricalWeather[];
  className?: string;
}

export function TemperatureChart({ data, className }: TemperatureChartProps) {
  const chartData = React.useMemo(() => {
    if (!data.length) return null;
    
    // Group by year for yearly trend
    const yearlyData = new Map<number, { temps: number[]; rains: number[] }>();
    
    data.forEach(d => {
      if (!yearlyData.has(d.year)) {
        yearlyData.set(d.year, { temps: [], rains: [] });
      }
      const entry = yearlyData.get(d.year)!;
      if (d.avg_temperature !== null && d.avg_temperature !== undefined) {
        entry.temps.push(d.avg_temperature);
      }
      if (d.total_rainfall !== null && d.total_rainfall !== undefined) {
        entry.rains.push(d.total_rainfall);
      }
    });

    const years = Array.from(yearlyData.keys()).sort();
    
    return {
      labels: years.map(String),
      datasets: [
        {
          label: 'Avg Temperature (°C)',
          data: years.map(y => {
            const temps = yearlyData.get(y)?.temps || [];
            return temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : null;
          }),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Max Temperature (°C)',
          data: years.map(y => {
            const temps = data.filter(d => d.year === y && d.max_temperature !== null && d.max_temperature !== undefined)
              .map(d => d.max_temperature!);
            return temps.length ? Math.max(...temps) : null;
          }),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: false,
          borderDash: [5, 5],
          tension: 0.3,
          yAxisID: 'y',
        },
        {
          label: 'Min Temperature (°C)',
          data: years.map(y => {
            const temps = data.filter(d => d.year === y && d.min_temperature !== null && d.min_temperature !== undefined)
              .map(d => d.min_temperature!);
            return temps.length ? Math.min(...temps) : null;
          }),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: false,
          borderDash: [5, 5],
          tension: 0.3,
          yAxisID: 'y',
        },
      ],
    };
  }, [data]);

  if (!chartData) return <div className={cn('h-64 flex items-center justify-center', className)}>No temperature data</div>;

  return (
    <div className={cn('h-64', className)}>
      <Chart
        type="line"
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              position: 'top',
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              titleFont: { size: 14 },
              bodyFont: { size: 13 },
            },
          },
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              title: {
                display: true,
                text: 'Temperature (°C)',
              },
            },
          },
        }}
      />
    </div>
  );
}

interface RainfallChartProps {
  data: HistoricalWeather[];
  className?: string;
}

export function RainfallChart({ data, className }: RainfallChartProps) {
  const chartData = React.useMemo(() => {
    if (!data.length) return null;
    
    const yearlyRain = new Map<number, number[]>();
    
    data.forEach(d => {
      if (d.total_rainfall !== null && d.total_rainfall !== undefined) {
        if (!yearlyRain.has(d.year)) yearlyRain.set(d.year, []);
        yearlyRain.get(d.year)!.push(d.total_rainfall);
      }
    });

    const years = Array.from(yearlyRain.keys()).sort();
    
    return {
      labels: years.map(String),
      datasets: [
        {
          label: 'Total Annual Rainfall (mm)',
          data: years.map(y => {
            const rains = yearlyRain.get(y) || [];
            return rains.reduce((a, b) => a + b, 0);
          }),
          backgroundColor: 'rgba(59, 130, 246, 0.7)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
          borderRadius: 4,
        },
      ],
    };
  }, [data]);

  if (!chartData) return <div className={cn('h-64 flex items-center justify-center', className)}>No rainfall data</div>;

  return (
    <div className={cn('h-64', className)}>
      <Chart
        type="bar"
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
              callbacks: {
                label: (context) => `${context.dataset.label}: ${context.parsed.y?.toFixed(1) || 0} mm`,
              },
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Rainfall (mm)',
              },
            },
          },
        }}
      />
    </div>
  );
}

interface MonthlyChartProps {
  data: HistoricalWeather[];
  metric: 'temperature' | 'rainfall';
  className?: string;
}

export function MonthlyChart({ data, metric, className }: MonthlyChartProps) {
  const chartData = React.useMemo(() => {
    if (!data.length) return null;
    
    const monthlyData = new Map<number, number[]>();
    
    data.forEach(d => {
      const val = metric === 'temperature' ? d.avg_temperature : d.total_rainfall;
      if (val !== null && val !== undefined) {
        if (!monthlyData.has(d.month)) monthlyData.set(d.month, []);
        monthlyData.get(d.month)!.push(val);
      }
    });

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return {
      labels: months.map(m => monthNames[m - 1]),
      datasets: [
        {
          label: metric === 'temperature' ? 'Avg Temperature (°C)' : 'Avg Rainfall (mm)',
          data: months.map(m => {
            const vals = monthlyData.get(m) || [];
            return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
          }),
          borderColor: metric === 'temperature' ? 'rgb(239, 68, 68)' : 'rgb(59, 130, 246)',
          backgroundColor: metric === 'temperature' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [data, metric]);

  if (!chartData) return <div className={cn('h-64 flex items-center justify-center', className)}>No data</div>;

  return (
    <div className={cn('h-64', className)}>
      <Chart
        type="line"
        data={chartData}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 12,
            },
          },
          scales: {
            y: {
              title: {
                display: true,
                text: metric === 'temperature' ? 'Temperature (°C)' : 'Rainfall (mm)',
              },
            },
          },
        }}
      />
    </div>
  );
}