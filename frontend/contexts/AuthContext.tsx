'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '@/types';
import { apiClient, primeCsrfToken } from '@/lib/apiClient';

interface RegisterPayload {
  fullName: string;
  email: string;
  mobileNumber?: string;
  password?: string;
  targetExam?: string;
}

interface AuthContextType {
  user: User | null;
  csrfToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await apiClient('/api/auth/me', {
        method: 'GET',
        cache: 'no-store',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
          if (data.csrfToken) {
            setCsrfToken(data.csrfToken);
          }
          return;
        }
      }
      setUser(null);
      setCsrfToken(null);
    } catch {
      setUser(null);
      setCsrfToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    primeCsrfToken();
    refreshUser();
  }, [refreshUser]);

  const login = async (
    email: string,
    password?: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const res = await apiClient('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data?.error || 'Invalid credentials.',
        };
      }

      setUser(data.user);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error occurred while connecting to authentication service.',
      };
    }
  };

  const register = async (
    payload: RegisterPayload
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    try {
      const res = await apiClient('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data?.error || 'Registration failed.',
        };
      }

      setUser(data.user);
      if (data.csrfToken) {
        setCsrfToken(data.csrfToken);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error occurred during registration.',
      };
    }
  };

  const logout = async () => {
    try {
      await apiClient('/api/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Proceed with client cleanup
    } finally {
      setUser(null);
      setCsrfToken(null);
      // Clean legacy localStorage keys if any remain
      if (typeof window !== 'undefined') {
        localStorage.removeItem('10q_auth_user_fresh_v1');
        localStorage.removeItem('10q_user');
        localStorage.removeItem('10q_token');
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        csrfToken,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN',
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
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
