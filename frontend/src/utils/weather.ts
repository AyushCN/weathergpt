import { format, formatDistanceToNow } from 'date-fns';

export const WEATHER_CODES: Record<number, { code: string; description: string; icon: string }> = {
  0: { code: 'clear', description: 'Clear sky', icon: '☀️' },
  1: { code: 'mainly_clear', description: 'Mainly clear', icon: '🌤️' },
  2: { code: 'partly_cloudy', description: 'Partly cloudy', icon: '⛅' },
  3: { code: 'overcast', description: 'Overcast', icon: '☁️' },
  45: { code: 'fog', description: 'Fog', icon: '🌫️' },
  48: { code: 'fog', description: 'Depositing rime fog', icon: '🌫️' },
  51: { code: 'drizzle', description: 'Light drizzle', icon: '🌦️' },
  53: { code: 'drizzle', description: 'Moderate drizzle', icon: '🌦️' },
  55: { code: 'drizzle', description: 'Dense drizzle', icon: '🌧️' },
  56: { code: 'drizzle', description: 'Light freezing drizzle', icon: '🌧️' },
  57: { code: 'drizzle', description: 'Dense freezing drizzle', icon: '🌧️' },
  61: { code: 'rain', description: 'Slight rain', icon: '🌦️' },
  63: { code: 'rain', description: 'Moderate rain', icon: '🌧️' },
  65: { code: 'rain', description: 'Heavy rain', icon: '🌧️' },
  66: { code: 'rain', description: 'Light freezing rain', icon: '🌧️' },
  67: { code: 'rain', description: 'Heavy freezing rain', icon: '🌧️' },
  71: { code: 'snow', description: 'Slight snow fall', icon: '🌨️' },
  73: { code: 'snow', description: 'Moderate snow fall', icon: '🌨️' },
  75: { code: 'snow', description: 'Heavy snow fall', icon: '🌨️' },
  77: { code: 'snow', description: 'Snow grains', icon: '🌨️' },
  80: { code: 'rain', description: 'Slight rain showers', icon: '🌦️' },
  81: { code: 'rain', description: 'Moderate rain showers', icon: '🌧️' },
  82: { code: 'rain', description: 'Violent rain showers', icon: '⛈️' },
  85: { code: 'snow', description: 'Slight snow showers', icon: '🌨️' },
  86: { code: 'snow', description: 'Heavy snow showers', icon: '🌨️' },
  95: { code: 'thunderstorm', description: 'Thunderstorm', icon: '⛈️' },
  96: { code: 'thunderstorm', description: 'Thunderstorm with slight hail', icon: '⛈️' },
  99: { code: 'thunderstorm', description: 'Thunderstorm with heavy hail', icon: '⛈️' },
};

export function getWeatherInfo(code: number) {
  return WEATHER_CODES[code] || { code: 'unknown', description: 'Unknown', icon: '❓' };
}

export function formatTemperature(temp?: number, unit: 'c' | 'f' = 'c') {
  if (temp === undefined || temp === null) return '—';
  const value = unit === 'f' ? temp * 9/5 + 32 : temp;
  return `${Math.round(value)}°${unit.toUpperCase()}`;
}

export function formatWindSpeed(speed?: number, unit: 'kmh' | 'ms' = 'kmh') {
  if (speed === undefined || speed === null) return '—';
  const value = unit === 'ms' ? speed / 3.6 : speed;
  return `${Math.round(value)} ${unit === 'ms' ? 'm/s' : 'km/h'}`;
}

export function formatWindDirection(deg?: number) {
  if (deg === undefined || deg === null) return '—';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(deg / 22.5) % 16;
  return directions[index];
}

export function formatHumidity(humidity?: number) {
  if (humidity === undefined || humidity === null) return '—';
  return `${Math.round(humidity)}%`;
}

export function formatPressure(pressure?: number) {
  if (pressure === undefined || pressure === null) return '—';
  return `${Math.round(pressure)} hPa`;
}

export function formatRainfall(rain?: number) {
  if (rain === undefined || rain === null) return '0 mm';
  return `${rain.toFixed(1)} mm`;
}

export function formatDateTime(dateString: string, options?: Intl.DateTimeFormatOptions) {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}

export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getRelativeTime(dateString: string) {
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
}

export function getSeverityColor(severity: string) {
  switch (severity) {
    case 'extreme': return 'bg-red-600 text-white';
    case 'severe': return 'bg-red-500 text-white';
    case 'moderate': return 'bg-amber-500 text-white';
    case 'minor': return 'bg-blue-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
}

export function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'extreme': return '🔴';
    case 'severe': return '🟠';
    case 'moderate': return '🟡';
    case 'minor': return '🔵';
    default: return '⚪';
  }
}

export function getConfidenceColor(confidence?: number) {
  if (confidence === undefined || confidence === null) return 'text-gray-500';
  if (confidence >= 0.8) return 'text-green-600';
  if (confidence >= 0.6) return 'text-amber-600';
  return 'text-red-600';
}

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}