/**
 * Authentication Context for Green Mobility Pass
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {apiClient} from '../api/client';
import {UserInfo} from '../api/types';
import tripDetection from '../native/TripDetection';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  userId: number | null;
  login: (username: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setIsLoggedIn: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({children}: AuthProviderProps): JSX.Element {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      await apiClient.loadTokens();
      if (apiClient.isAuthenticated()) {
        const currentUserId = apiClient.getUserId();
        if (currentUserId) {
          const userProfile = await apiClient.getUserProfile(currentUserId);
          // Convert UserProfile to UserInfo format
          const userInfo: UserInfo = {
            id: userProfile.id,
            email: userProfile.email,
            username: userProfile.username,
            is_active: true,
            team_id: userProfile.team_id,
          };
          setUser(userInfo);
          setUserId(currentUserId);
          setIsAuthenticated(true);
          
          // Start trip detection if already authenticated (permissions requested at app startup)
          startTripDetection();
        }
      }
    } catch (error) {
      console.log('Not authenticated or token expired');
      setIsAuthenticated(false);
      setUser(null);
      setUserId(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Start trip detection after login (permissions already requested at app startup)
  const startTripDetection = async () => {
    try {
      const permissions = await tripDetection.checkPermissions();
      
      if (permissions.allGranted) {
        await tripDetection.startDetection();
        console.log('✅ Trip detection started');
      } else {
        // Try to start anyway - some features might work with partial permissions
        console.warn('⚠️ Not all permissions granted, attempting to start detection anyway');
        console.log('   Location:', permissions.location ? '✅' : '❌');
        console.log('   Activity:', permissions.activityRecognition ? '✅' : '❌');
        console.log('   Notifications:', permissions.notifications ? '✅' : '❌');
        await tripDetection.startDetection();
      }
    } catch (error) {
      console.error('❌ Failed to start trip detection:', error);
    }
  };

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      await apiClient.login(username, password);
      const currentUserId = apiClient.getUserId();
      if (currentUserId) {
        const userProfile = await apiClient.getUserProfile(currentUserId);
        const userInfo: UserInfo = {
          id: userProfile.id,
          email: userProfile.email,
          username: userProfile.username,
          is_active: true,
          team_id: userProfile.team_id,
        };
        setUser(userInfo);
        setUserId(currentUserId);
        setIsAuthenticated(true);
        
        // Start trip detection after successful login (permissions requested at app startup)
        startTripDetection();
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      setIsLoading(true);
      try {
        await apiClient.register({username, email, password});
        const currentUserId = apiClient.getUserId();
        if (currentUserId) {
          const userProfile = await apiClient.getUserProfile(currentUserId);
          const userInfo: UserInfo = {
            id: userProfile.id,
            email: userProfile.email,
            username: userProfile.username,
            is_active: true,
            team_id: userProfile.team_id,
          };
          setUser(userInfo);
          setUserId(currentUserId);
          setIsAuthenticated(true);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    // Stop trip detection when logging out
    try {
      await tripDetection.stopDetection();
      console.log('Trip detection stopped on logout');
    } catch (error) {
      console.error('Failed to stop trip detection:', error);
    }
    
    await apiClient.logout();
    setUser(null);
    setUserId(null);
    setIsAuthenticated(false);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUserId = apiClient.getUserId();
      if (currentUserId) {
        const userProfile = await apiClient.getUserProfile(currentUserId);
        const userInfo: UserInfo = {
          id: userProfile.id,
          email: userProfile.email,
          username: userProfile.username,
          is_active: true,
          team_id: userProfile.team_id,
        };
        setUser(userInfo);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, []);

  const setIsLoggedIn = useCallback(async (value: boolean) => {
    if (value) {
      try {
        const currentUserId = apiClient.getUserId();
        if (currentUserId) {
          const userProfile = await apiClient.getUserProfile(currentUserId);
          const userInfo: UserInfo = {
            id: userProfile.id,
            email: userProfile.email,
            username: userProfile.username,
            is_active: true,
            team_id: userProfile.team_id,
          };
          setUser(userInfo);
          setUserId(currentUserId);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to get user info:', error);
      }
    } else {
      setUser(null);
      setUserId(null);
      setIsAuthenticated(false);
    }
  }, []);

  const contextValue: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    userId,
    login,
    register,
    logout,
    refreshUser,
    setIsLoggedIn,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
