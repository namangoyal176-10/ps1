import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (credentials: any) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('raceproof_token'));
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (!localStorage.getItem('raceproof_token')) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await authApi.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
        localStorage.removeItem('raceproof_token');
        setToken(null);
      }
    } catch {
      setUser(null);
      localStorage.removeItem('raceproof_token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (credentials: any) => {
    const res = await authApi.login(credentials);
    if (res.success && res.data) {
      localStorage.setItem('raceproof_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    }
  };

  const register = async (payload: any) => {
    const res = await authApi.register(payload);
    if (res.success && res.data) {
      localStorage.setItem('raceproof_token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('raceproof_token');
      setToken(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, token, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
