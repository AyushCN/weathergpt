import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { weatherApi } from '../services/api';
import type { Location } from '../types';

const features = [
  {
    icon: 'chat_bubble',
    title: 'Conversational Weather',
    description: 'Ask naturally: "Will it rain in Bangalore tomorrow?" Get intelligent responses powered by Groq LLM with real weather context.',
  },
  {
    icon: 'thermometer',
    title: 'Hyper-Local Forecasts',
    description: 'Current conditions, 7-day hourly/daily forecasts, and historical analysis from Open-Meteo (ECMWF IFS model).',
  },
  {
    icon: 'psychology',
    title: 'ML Predictions',
    description: 'Local XGBoost models predict temperature and rain probability at 1h, 3h, 6h, 12h, 24h horizons — no external API calls.',
  },
  {
    icon: 'history',
    title: 'Historical Intelligence',
    description: '10+ years of historical data with trends, statistics, and monthly averages visualized in interactive charts.',
  },
  {
    icon: 'warning',
    title: 'Weather Alerts',
    description: 'Real-time severe weather alerts with severity levels, affected areas, and recommended actions.',
  },
  {
    icon: 'map',
    title: 'Smart Location Search',
    description: 'Autocomplete geocoding via Open-Meteo. Save favorite locations and set defaults for instant access.',
  },
];

const techStack = [
  { name: 'React 18', category: 'Frontend' },
  { name: 'TypeScript', category: 'Frontend' },
  { name: 'Tailwind CSS', category: 'Frontend' },
  { name: 'Vite', category: 'Frontend' },
  { name: 'FastAPI', category: 'Backend' },
  { name: 'SQLAlchemy 2.0', category: 'Backend' },
  { name: 'MariaDB', category: 'Backend' },
  { name: 'Groq (Llama 3.3)', category: 'AI/ML' },
  { name: 'XGBoost', category: 'AI/ML' },
  { name: 'scikit-learn', category: 'AI/ML' },
  { name: 'Open-Meteo API', category: 'Data' },
];

const demoLocation: Location = {
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

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const [demoWeather, setDemoWeather] = React.useState<any>(null);
  const [demoLoading, setDemoLoading] = React.useState(false);

  React.useEffect(() => {
    // Fetch demo weather for Bangalore
    setDemoLoading(true);
    weatherApi.getCurrent(demoLocation.latitude, demoLocation.longitude, demoLocation.name)
      .then(setDemoWeather)
      .catch(console.error)
      .finally(() => setDemoLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const formatTemp = (c: number | null | undefined) => {
    if (c === null || c === undefined) return '—';
    return `${Math.round(c)}°C`;
  };

  return (
    <div className="min-h-screen bg-brand-50 relative font-sans overflow-x-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '0s'}}></div>
        <div className="absolute top-40 -left-40 w-72 h-72 bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute -bottom-40 left-1/2 w-96 h-96 bg-brand-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{animationDelay: '4s'}}></div>
        {/* Grid pattern overlay */}
        <div className="landing-grid-pattern absolute inset-0 opacity-5" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation Header */}
        <header className="bg-white/70 backdrop-blur-xl border-b border-white/40 sticky top-0 z-40 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
                  <span className="text-white text-2xl material-symbols-outlined">routine</span>
                </div>
                <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-900 to-brand-600 tracking-tight">WeatherGPT</span>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/login" className="btn-ghost text-sm font-semibold hidden sm:block">Sign In</Link>
                <Link to="/register" className="btn-primary text-sm shadow-brand-500/30">Get Started</Link>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-grow">
          <section className="relative py-20 sm:py-32 lg:py-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-100 text-brand-700 text-sm font-medium mb-8 animate-fade-in">
                  <span className="material-symbols-outlined text-lg">verified</span>
                  <span>Powered by Groq • Data from Open-Meteo (ECMWF) • Local XGBoost ML</span>
                </div>
                
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-brand-900 tracking-tight mb-8 leading-tight animate-slide-up">
                  AI-Powered <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-brand-500 to-brand-400">Weather Intelligence</span>
                </h1>
                
                <p className="text-xl sm:text-2xl text-brand-600 mb-12 max-w-2xl mx-auto leading-relaxed animate-slide-up delay-100">
                  Chat naturally with an AI that understands weather. Get hyper-local forecasts, ML-powered predictions, historical trends, and real-time alerts — all in one beautiful interface.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-200">
                  <Link to="/register" className="btn-primary text-lg px-10 py-4 w-full sm:w-auto shadow-brand-500/30 group">
                    <span className="flex items-center gap-2">
                      Get Started Free
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </span>
                  </Link>
                  <Link to="/login" className="btn-secondary text-lg px-10 py-4 w-full sm:w-auto group">
                    <span className="flex items-center gap-2">
                      Sign In
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">login</span>
                    </span>
                  </Link>
                </div>

                {/* Demo Weather Card */}
                {demoWeather && (
                  <div className="mt-16 animate-fade-in delay-300">
                    <div className="glass-panel p-6 max-w-2xl mx-auto shadow-glass-hover">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-brand-600">
                          <span className="material-symbols-outlined">location_on</span>
                          <span className="font-semibold">Live Demo — Bangalore, IN</span>
                        </div>
                        {demoLoading && <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />}
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-3xl font-bold text-brand-900">{formatTemp(demoWeather.observation?.temperature)}</div>
                          <div className="text-sm text-brand-500 capitalize">{demoWeather.observation?.weather_description}</div>
                        </div>
                        <div className="border-l border-brand-100">
                          <div className="text-3xl font-bold text-brand-900">{demoWeather.observation?.humidity}%</div>
                          <div className="text-sm text-brand-500">Humidity</div>
                        </div>
                        <div className="border-l border-brand-100">
                          <div className="text-3xl font-bold text-brand-900">{demoWeather.observation?.wind_speed} km/h</div>
                          <div className="text-sm text-brand-500">Wind</div>
                        </div>
                        <div className="border-l border-brand-100">
                          <div className="text-3xl font-bold text-brand-900">{demoWeather.observation?.pressure} hPa</div>
                          <div className="text-sm text-brand-500">Pressure</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-20 sm:py-28 bg-white/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-brand-900 tracking-tight mb-6">
                  Everything You Need <br/><span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-brand-400">in One Platform</span>
                </h2>
                <p className="text-lg text-brand-600 max-w-2xl mx-auto">
                  From casual questions to deep historical analysis — WeatherGPT combines the best weather data with cutting-edge AI.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((feature, index) => (
                  <Link
                    key={feature.title}
                    to="/register"
                    className="glass-panel p-6 group hover:shadow-glass-hover transition-all duration-300 border border-transparent hover:border-brand-100"
                    style={{animationDelay: `${index * 100}ms`}}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-5 group-hover:scale-105 transition-transform duration-300">
                      <span className="text-white text-2xl material-symbols-outlined">{feature.icon}</span>
                    </div>
                    <h3 className="text-xl font-bold text-brand-900 mb-3">{feature.title}</h3>
                    <p className="text-brand-600 leading-relaxed">{feature.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-20 sm:py-28 bg-brand-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-brand-900 tracking-tight mb-6">
                  How It Works
                </h2>
                <p className="text-lg text-brand-600 max-w-2xl mx-auto">
                  Simple flow from question to intelligent answer.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                {/* Connecting lines */}
                <div className="hidden md:block absolute top-20 left-1/2 -translate-x-1/2 w-full h-0 border-t-2 border-dashed border-brand-200" style={{width: '66%'}} />
                
                {[
                  { step: '01', title: 'Ask Naturally', description: 'Type or speak your weather question in plain language. No complex parameters needed.', icon: 'mic' },
                  { step: '02', title: 'AI Understands', description: 'Groq LLM extracts intent, location, time, and parameters. Falls back to keyword matching if offline.', icon: 'psychology' },
                  { step: '03', title: 'Get Intelligence', description: 'Real-time data + ML predictions + historical context combined into a natural response with charts.', icon: 'auto_awesome' },
                ].map((item, index) => (
                  <div key={item.step} className="relative z-10 text-center group">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-6 group-hover:scale-110 transition-transform duration-300">
                      <span className="text-white text-3xl material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="text-2xl font-bold text-brand-400 mb-2">{item.step}</div>
                    <h3 className="text-xl font-bold text-brand-900 mb-2">{item.title}</h3>
                    <p className="text-brand-600">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Tech Stack */}
          <section className="py-20 sm:py-28 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-brand-900 tracking-tight mb-6">
                  Built With Modern Tech
                </h2>
                <p className="text-lg text-brand-600 max-w-2xl mx-auto">
                  Carefully chosen stack for performance, type safety, and developer experience.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                {techStack.map((tech) => (
                  <span
                    key={tech.name}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-105 ${
                      tech.category === 'Frontend' ? 'bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100' :
                      tech.category === 'Backend' ? 'bg-green-50 text-green-700 border border-green-100 hover:bg-green-100' :
                      tech.category === 'AI/ML' ? 'bg-purple-50 text-purple-700 border border-purple-100 hover:bg-purple-100' :
                      'bg-orange-50 text-orange-700 border border-orange-100 hover:bg-orange-100'
                    }`}
                  >
                    {tech.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* Dashboard Preview */}
          <section className="py-20 sm:py-28 bg-brand-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-4xl sm:text-5xl font-extrabold text-brand-900 tracking-tight mb-6">
                  Dashboard Preview
                </h2>
                <p className="text-lg text-brand-600 max-w-2xl mx-auto">
                  Clean, responsive interface with tabs for Current, Forecast, Historical, and Chat views.
                </p>
              </div>

              <div className="relative glass-panel rounded-3xl shadow-2xl overflow-hidden border border-brand-100">
                {/* Mock dashboard screenshot */}
                <div className="aspect-video bg-gradient-to-br from-brand-50 to-white relative overflow-hidden">
                  {/* Mock header */}
                  <div className="absolute top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur border-b border-brand-100 flex items-center px-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                      <span className="text-white material-symbols-outlined">routine</span>
                    </div>
                    <span className="ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-900 to-brand-600">WeatherGPT</span>
                    <div className="ml-auto flex items-center gap-4 text-sm text-brand-500">
                      <span>Current</span>
                      <span>Forecast</span>
                      <span>Historical</span>
                      <span>Chat</span>
                    </div>
                  </div>
                  
                  {/* Mock content */}
                  <div className="absolute inset-0 p-6 pt-20 flex items-center justify-center">
                    <div className="max-w-2xl mx-auto space-y-4">
                      <div className="glass-panel p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-brand-900">Bangalore, India</h3>
                          <span className="text-sm text-brand-500">Updated just now</span>
                        </div>
                        <div className="flex items-baseline justify-between">
                          <div>
                            <div className="text-6xl font-extrabold text-brand-900">28°C</div>
                            <div className="text-brand-500">Partly Cloudy</div>
                          </div>
                          <div className="text-right space-y-1 text-sm">
                            <div className="flex items-center gap-1 text-brand-600"><span className="material-symbols-outlined text-lg">water_drop</span> 65%</div>
                            <div className="flex items-center gap-1 text-brand-600"><span className="material-symbols-outlined text-lg">air</span> 12 km/h</div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="glass-panel p-4">
                          <div className="text-sm text-brand-500 mb-1">Hourly Forecast</div>
                          <div className="flex items-end justify-around h-24">
                            {[28, 27, 26, 25, 24, 25, 27, 29].map((t, i) => (
                              <div key={i} className="w-8 bg-gradient-to-t from-brand-500 to-brand-300 rounded-t transition-all hover:scale-y-110" style={{height: `${(t/30)*100}%`}} />
                            ))}
                          </div>
                        </div>
                        <div className="glass-panel p-4">
                          <div className="text-sm text-brand-500 mb-1">ML Predictions</div>
                          <div className="space-y-2">
                            {['1h', '3h', '6h', '12h', '24h'].map((h) => (
                              <div key={h} className="flex justify-between text-sm">
                                <span className="text-brand-600">{h}</span>
                                <span className="font-semibold text-brand-900">28°C</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 sm:py-28 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800" />
            <div className="cta-grid-pattern absolute inset-0 opacity-10" />
            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-6">
                Ready to Experience Weather Intelligence?
              </h2>
              <p className="text-xl text-brand-100 mb-10 max-w-2xl mx-auto">
                Join developers, researchers, and weather enthusiasts using WeatherGPT for accurate, AI-enhanced weather insights.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register" className="bg-white text-brand-700 hover:bg-brand-50 text-lg px-10 py-4 rounded-xl font-semibold shadow-xl shadow-white/10 transition-all duration-300 hover:scale-105 group">
                  <span className="flex items-center gap-2">
                    Create Free Account
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </span>
                </Link>
                <Link to="/login" className="border-2 border-white/30 text-white hover:bg-white/10 text-lg px-10 py-4 rounded-xl font-semibold transition-all duration-300">
                  Sign In
                </Link>
              </div>
              <p className="mt-8 text-brand-200 text-sm">
                No credit card required • Free forever for personal use • API access available
              </p>
            </div>
          </section>

          {/* Footer */}
          <footer className="bg-brand-900 text-white py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                <div className="md:col-span-2">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
                      <span className="text-white text-2xl material-symbols-outlined">routine</span>
                    </div>
                    <span className="text-2xl font-bold">WeatherGPT</span>
                  </div>
                  <p className="text-brand-300 max-w-md">
                    AI-Powered Conversational Weather Intelligence Platform. Built with FastAPI, React, Groq, and XGBoost.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Resources</h4>
                  <ul className="space-y-2 text-brand-300">
                    <li><Link to="/docs" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">API Documentation</Link></li>
                    <li><a href="https://open-meteo.com" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">Open-Meteo API</a></li>
                    <li><a href="https://console.groq.com" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">Groq Console</a></li>
                    <li><a href="https://xgboost.readthedocs.io" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">XGBoost Docs</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-4">Legal</h4>
                  <ul className="space-y-2 text-brand-300">
                    <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                    <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                    <li><Link to="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
                  </ul>
                </div>
              </div>
              <div className="pt-8 border-t border-brand-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-brand-400 text-sm">
                  © {new Date().getFullYear()} WeatherGPT. All rights reserved.
                </p>
                <div className="flex items-center gap-6 text-brand-400">
                  <a href="https://github.com" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined text-2xl">code</span>
                  </a>
                  <a href="https://twitter.com" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined text-2xl">alternate_email</span>
                  </a>
                  <a href="https://discord.com" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                    <span className="material-symbols-outlined text-2xl">chat_bubble</span>
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}