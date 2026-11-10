'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
}

interface Session {
  id: string;
  expiresAt: string;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
}

interface AuthContextType {
  user: User | null;
  sessions: Session[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, turnstileToken: string) => Promise<void>;
  register: (name: string, email: string, password: string, turnstileToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  claimGuest: (guestId: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/get-session', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json() as { user?: User; session?: unknown };
        if (data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (email: string, password: string, turnstileToken: string) => {
    const res = await fetch('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json() as { message?: string; user?: User };
    if (!res.ok) throw new Error(json.message || 'Error al iniciar sesión');
    if (json.user) setUser(json.user);
  };

  const register = async (name: string, email: string, password: string, turnstileToken: string) => {
    const res = await fetch('/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json() as { message?: string; user?: User };
    if (!res.ok) throw new Error(json.message || 'Error al registrarse');
    if (json.user) setUser(json.user);
  };

  const logout = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  const claimGuest = async (guestId: string) => {
    const res = await fetch('/api/me/claim-guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ guestId }),
    });
    const json = await res.json() as { error?: string };
    if (!res.ok) throw new Error(json.error || 'Error al reclamar datos');
    await refreshSession();
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json() as { message?: string };
    if (!res.ok) throw new Error(json.message || 'Error al cambiar contraseña');
  };

  const requestPasswordReset = async (email: string) => {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    const json = await res.json() as { message?: string };
    if (!res.ok) throw new Error(json.message || 'Error al solicitar reset');
  };

  const resetPassword = async (token: string, password: string) => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ token, password }),
    });
    const json = await res.json() as { message?: string };
    if (!res.ok) throw new Error(json.message || 'Error al restablecer contraseña');
  };

  const value: AuthContextType = {
    user,
    sessions: [],
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    refreshSession,
    claimGuest,
    changePassword,
    requestPasswordReset,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}