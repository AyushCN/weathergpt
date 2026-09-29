'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Loader2, Mic, MicOff, Trash2, Copy } from 'lucide-react';
import { chatApi } from '../services/api';
import { formatTime } from '../utils/weather';
import { cn } from '../utils/weather';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage, ChatRequest, WeatherAlert, WeatherForecast } from '../types';

interface ChatInterfaceProps {
  latitude?: number;
  longitude?: number;
  locationName?: string;
  language?: string;
  initialSessionId?: string;
}

export function ChatInterface({ latitude, longitude, locationName, language = 'en', initialSessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => initialSessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (initialSessionId) {
      chatApi.getHistory(initialSessionId)
        .then(history => {
          if (history && Array.isArray(history)) {
            setMessages(history.map((msg: any) => ({
              id: `msg_${msg.id || Date.now()}`,
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content || msg.user_message || msg.ai_response,
              timestamp: new Date(msg.created_at || Date.now()),
              weather_data: msg.weather_data,
              predictions: msg.predictions,
              alerts: msg.alerts
            })));
          }
        })
        .catch(err => console.error("Failed to load chat history:", err));
    }
  }, [initialSessionId]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const request: ChatRequest = {
        message: currentInput,
        session_id: sessionId,
        latitude,
        longitude,
        location_name: locationName,
        language,
      };

      const response = await chatApi.sendMessage(request);

      const assistantMessage: ChatMessage = {
        id: `msg_${Date.now()}_assistant`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        weather_data: response.weather_data,
        predictions: response.predictions,
        alerts: response.alerts,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="card flex flex-col h-full animate-in">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-weather-100 flex items-center justify-center">
            <span className="text-lg">🤖</span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">WeatherGPT</h3>
            <p className="text-xs text-gray-500">Ask me about the weather</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Clear chat"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
            <div className="w-16 h-16 rounded-full bg-weather-100 flex items-center justify-center mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <p className="text-center font-medium">Start a conversation</p>
            <p className="text-sm text-gray-400 text-center mt-1 max-w-xs">
              Ask me things like "Will it rain tomorrow?" or "What's the temperature in Mumbai?"
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble 
            key={message.id} 
            message={message} 
            onCopy={copyMessage} 
          />
        ))}

        {isLoading && (
          <div className="flex items-start gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-weather-100 flex items-center justify-center">
              <span className="text-lg">🤖</span>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-weather-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-weather-300 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-weather-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-100">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about weather..."
            rows={1}

            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-weather-500 focus:border-transparent bg-white resize-none text-sm"
            style={{ minHeight: '44px' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="btn-primary p-2.5 flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ 
  message, 
  onCopy 
}: { 
  message: ChatMessage; 
  onCopy: (content: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={cn(
      'flex gap-3 animate-in message-enter',
      message.role === 'user' && 'flex-row-reverse'
    )}>
      <div 
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          message.role === 'user' ? 'bg-gray-200' : 'bg-weather-100'
        )}
      >
        {message.role === 'user' ? (
          <span className="text-sm">👤</span>
        ) : (
          <span className="text-lg">🤖</span>
        )}
      </div>
      
      <div className={cn(
        'flex-1 max-w-[calc(100%-3rem)]',
        message.role === 'user' ? 'text-right' : 'text-left'
      )}>
        <div className={cn(
          'inline-block px-4 py-2 rounded-2xl markdown-body break-words',
          message.role === 'user' 
            ? 'bg-weather-600 text-white rounded-tr-none' 
            : 'bg-gray-100 text-gray-900 rounded-tl-none'
        )}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400">
            {formatTime(message.timestamp.toISOString())}
          </span>
          <button
            onClick={() => onCopy(message.content)}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
            aria-label="Copy message"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
        </div>

        {/* Weather data details */}
        {(message.weather_data || message.predictions || message.alerts) && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="mt-2 text-xs text-weather-600 hover:text-weather-700 flex items-center gap-1"
          >
            <span>{showDetails ? 'Hide' : 'Show'} details</span>
          </button>
        )}

        {showDetails && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-left text-sm space-y-2">
            {message.predictions && (
              <PredictionsDisplay predictions={message.predictions} />
            )}
            {message.alerts && message.alerts.length > 0 && (
              <AlertsDisplay alerts={message.alerts} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PredictionsDisplay({ predictions }: { predictions: Record<string, any> }) {
  return (
    <div>
      <p className="font-medium text-gray-700">📊 ML Predictions</p>
      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
        {predictions.temperature && (
          <div className="bg-white p-2 rounded">
            <p className="font-medium text-gray-600">Temperature</p>
            {Object.entries(predictions.temperature).map(([h, t]: any) => (
              <p key={h}>{h}: {t.predicted_value}°C ({Math.round(t.confidence * 100)}%)</p>
            ))}
          </div>
        )}
        {predictions.rain && (
          <div className="bg-white p-2 rounded">
            <p className="font-medium text-gray-600">Rain</p>
            {Object.entries(predictions.rain).map(([h, r]: any) => (
              <p key={h}>{h}: {Math.round(r.probability * 100)}%</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertsDisplay({ alerts }: { alerts: WeatherAlert[] }) {
  return (
    <div>
      <p className="font-medium text-gray-700">⚠️ Active Alerts</p>
      <div className="space-y-1">
        {alerts.map((alert) => (
          <div key={alert.id} className="bg-white p-2 rounded border-l-4 border-amber-500">
            <p className="font-medium text-gray-900">{alert.title}</p>
            <p className="text-xs text-gray-500">{alert.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}