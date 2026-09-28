'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, X, ChevronDown, ChevronUp } from 'lucide-react';
import { getSeverityColor, getSeverityIcon, formatDateTime } from '../utils/weather';
import { cn } from '../utils/weather';
import type { WeatherAlert } from '../types';

interface AlertsPanelProps {
  alerts: WeatherAlert[];
}

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [expandedAlerts, setExpandedAlerts] = React.useState<Set<number>>(new Set());

  if (alerts.length === 0) {
    return (
      <div className="card animate-in">
        <div className="p-4">
          <div className="flex items-center gap-3 text-green-600">
            <AlertCircle className="w-6 h-6" />
            <div>
              <p className="font-medium">No Active Alerts</p>
              <p className="text-sm text-gray-500">No weather warnings for this location</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toggleAlert = (id: number) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="card animate-in">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">
            Weather Alerts ({alerts.length})
          </h3>
        </div>
        <span className="text-sm text-gray-500">
          {alerts.filter(a => a.severity === 'extreme' || a.severity === 'severe').length} severe
        </span>
      </div>
      
      <div className="divide-y divide-gray-100">
        {alerts.map((alert) => {
          const isExpanded = expandedAlerts.has(alert.id);
          
          return (
            <div key={alert.id} className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{getSeverityIcon(alert.severity)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={cn(
                        'badge px-2 py-1 text-xs font-medium',
                        getSeverityColor(alert.severity)
                      )}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <h4 className="font-medium text-gray-900 truncate">{alert.title}</h4>
                    </div>
                    <button
                      onClick={() => toggleAlert(alert.id)}
                      className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-500">
                    <span>📍 {alert.areas_affected?.map((a: any) => a.name).join(', ') || 'Local area'}</span>
                    <span>🕐 Issued: {formatDateTime(alert.issued_at)}</span>
                    <span>⏰ Expires: {formatDateTime(alert.expires_at)}</span>
                    <span>📡 Source: {alert.source.toUpperCase()}</span>
                  </div>
                  
                  {isExpanded && alert.recommended_actions && alert.recommended_actions.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Recommended Actions:</p>
                      <ul className="space-y-1">
                        {alert.recommended_actions.map((action, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-center gap-1">
                            <span className="text-amber-500">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}