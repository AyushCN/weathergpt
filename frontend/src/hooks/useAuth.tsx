'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User, UserPreferences, UserLocation, ChatSession, SearchHistory, TokenResponse } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updatePreferences: (preferences: UserPreferences) => Promise<void>;
  // Locations
  locations: UserLocation[];
  fetchLocations: () => Promise<void>;
  addLocation: (location: Omit<UserLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLocation: (id: number, data: Partial<UserLocation>) => Promise<void>;
  deleteLocation: (id: number) => Promise<void>;
  defaultLocation: UserLocation | null;
  // Chat Sessions
  chatSessions: ChatSession[];
  fetchChatSessions: () => Promise<void>;
  // Search History
  searchHistory: SearchHistory[];
  fetchSearchHistory: () => Promise<void>;
  clearSearchHistory: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<UserLocation[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);

  const fetchUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        setUser(null);
        return;
      }
      const userData = await authApi.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const locs = await authApi.getLocations();
      setLocations(locs);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  }, []);

  const fetchChatSessions = useCallback(async () => {
    try {
      const sessions = await authApi.getChatSessions();
      setChatSessions(sessions);
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
    }
  }, []);

  const fetchSearchHistory = useCallback(async () => {
    try {
      const history = await authApi.getSearchHistory();
      setSearchHistory(history);
    } catch (error) {
      console.error('Failed to fetch search history:', error);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetchUser();
        await Promise.all([fetchLocations(), fetchChatSessions(), fetchSearchHistory()]);
      }
      setIsLoading(false);
    };
    initAuth();
  }, [fetchUser, fetchLocations, fetchChatSessions, fetchSearchHistory]);

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    await fetchUser();
    await Promise.all([fetchLocations(), fetchChatSessions(), fetchSearchHistory()]);
  };

  const register = async (name: string, email: string, password: string) => {
    await authApi.register({ name, email, password });
    await login(email, password);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
      setLocations([]);
      setChatSessions([]);
      setSearchHistory([]);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    const updated = await authApi.updateMe(data);
    setUser(updated);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authApi.changePassword(currentPassword, newPassword);
  };

  const updatePreferences = async (preferences: UserPreferences) => {
    const updated = await authApi.updatePreferences(preferences);
    if (user) {
      setUser({ ...user, preferences: updated });
    }
  };

  const addLocation = async (location: Omit<UserLocation, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    const newLoc = await authApi.createLocation(location);
    setLocations(prev => [...prev, newLoc]);
  };

  const updateLocation = async (id: number, data: Partial<UserLocation>) => {
    const updated = await authApi.updateLocation(id, data);
    setLocations(prev => prev.map(l => l.id === id ? updated : l));
  };

  const deleteLocation = async (id: number) => {
    await authApi.deleteLocation(id);
    setLocations(prev => prev.filter(l => l.id !== id));
  };

  const clearSearchHistory = async () => {
    await authApi.clearSearchHistory();
    setSearchHistory([]);
  };

  const defaultLocation = locations.find(l => l.is_default) || null;

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      updatePreferences,
      locations,
      fetchLocations,
      addLocation,
      updateLocation,
      deleteLocation,
      defaultLocation,
      chatSessions,
      fetchChatSessions,
      searchHistory,
      fetchSearchHistory,
      clearSearchHistory,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}