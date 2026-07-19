import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi, User } from '../api/auth';

interface AuthContextType {
  user: User | null;
  role: 'admin' | 'faculty' | 'student' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: Record<string, string>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<'admin' | 'faculty' | 'student' | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await authApi.checkSession();
        if (data.authenticated && data.user) {
          setUser(data.user);
          setRole(data.user.role);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (credentials: Record<string, string>) => {
    const res = await authApi.login(credentials);
    if (res.success) {
      // Re-check session to get full user details
      const data = await authApi.checkSession();
      if (data.authenticated && data.user) {
        setUser(data.user);
        setRole(data.user.role);
        setIsAuthenticated(true);
      }
    } else {
      throw new Error(res.error || "Login failed");
    }
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
    setRole(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, role, isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
