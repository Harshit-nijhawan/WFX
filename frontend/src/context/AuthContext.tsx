import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface AuthUser {
  userId: string;
  email: string;
}

export interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  apiUrl: string;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on load
    const storedToken = localStorage.getItem('wfx_token');
    const storedUser = localStorage.getItem('wfx_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        // Attach the backend error code so callers can show specific messages
        const err = new Error(data.error || 'Login failed.') as any;
        err.code = data.code || null;
        throw err;
      }

      localStorage.setItem('wfx_token', data.token);
      localStorage.setItem('wfx_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        const err = new Error(data.error || 'Registration failed.') as any;
        err.code = data.code || null;
        throw err;
      }

      localStorage.setItem('wfx_token', data.token);
      localStorage.setItem('wfx_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('wfx_token');
    localStorage.removeItem('wfx_user');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{
      token,
      user,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
      apiUrl: API_URL
    }}>
      {children}
    </AuthContext.Provider>
  );
};
