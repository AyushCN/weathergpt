'use client';

import React, { useState, useEffect } from 'react';
import { Search, X, MapPin, Loader2 } from 'lucide-react';
import { weatherApi } from '../services/api';
import { formatTemperature, getWeatherInfo, cn } from '../utils/weather';
import type { Location } from '../types';

interface LocationSearchProps {
  onSelect: (location: Location) => void;
  defaultLocation?: Location;
}

export function LocationSearch({ onSelect, defaultLocation }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (defaultLocation) {
      setQuery(defaultLocation.name);
    }
  }, [defaultLocation]);

  const handleSearch = async (value: string) => {
    setQuery(value);
    if (value.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const data = await weatherApi.searchLocations(value);
      setResults(data);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      onSelect(results[selectedIndex]);
      setShowResults(false);
      setSelectedIndex(-1);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleResultClick = (location: Location) => {
    onSelect(location);
    setShowResults(false);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (query.length >= 2) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowResults(false), 200);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder="Search location..."
          className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-weather-500 focus:border-transparent bg-white"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {isSearching && (
          <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 text-weather-600 animate-spin w-5 h-5" />
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
          {results.map((location, index) => (
            <button
              key={`${location.latitude}-${location.longitude}`}
              onClick={() => handleResultClick(location)}
              className={cn(
                'w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors',
                index === selectedIndex && 'bg-weather-50'
              )}
            >
              <div className="flex items-center gap-3">
                <MapPin className="text-weather-600 w-5 h-5" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">{location.name}</p>
                  <p className="text-sm text-gray-500">
                    {location.state && `${location.state}, `}
                    {location.country}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && query.length >= 2 && !isSearching && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
          <p className="text-gray-500 text-center">No locations found</p>
        </div>
      )}
    </div>
  );
}