import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthContextType, LoginCredentials, RegisterData, User } from '../types/auth';
import { authApi } from '../services/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'vastu_token';
const USER_KEY = 'vastu_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveAuthData = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  };

  const clearAuthData = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  // Validate and refresh profile on mount if token exists
  const refreshUser = useCallback(async (): Promise<User | null> => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (!currentToken) {
      clearAuthData();
      setIsLoading(false);
      return null;
    }

    try {
      const freshUser = await authApi.getMe();
      setUser(freshUser);
      localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
      return freshUser;
    } catch (err) {
      console.warn('Auth token verification failed:', err);
      clearAuthData();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthData]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      saveAuthData(response.accessToken, response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authApi.register(data);
      saveAuthData(response.accessToken, response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthData();
  };

  const seedAdmin = async () => {
    return await authApi.seedDefaults();
  };

  const roles = user?.roles || [];
  const isAdmin = roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
  const isCreator = roles.includes('CREATOR') || isAdmin;
  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isAdmin,
        isCreator,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
        seedAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
