import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, User, setAuthToken, getAuthToken, removeAuthToken } from '../utils/api';
import { subscribeToPushNotifications } from '../utils/pushNotifications';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  // Helper function to normalize user object
  const normalizeUser = (userData: any): User => {
    return {
      ...userData,
      id: userData.id || userData._id,
      _id: userData._id || userData.id
    };
  };

  const checkAuth = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        console.log('❌ No token found in localStorage');
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('🔍 Checking authentication with token...');
      const { data } = await authAPI.getCurrentUser();
      console.log('✅ User authenticated (raw):', data.user);
      
      const normalizedUser = normalizeUser(data.user);
      console.log('✅ User normalized:', normalizedUser);
      console.log('✅ User ID:', normalizedUser.id);
      console.log('✅ User _ID:', normalizedUser._id);
      
      setUser(normalizedUser);
    } catch (error: any) {
      console.log('❌ Auth check failed:', error.response?.status);
      if (error.response?.status === 401) {
        removeAuthToken();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('🔐 AuthContext: Logging in user:', email);
      const { data } = await authAPI.login({ email, password });
      console.log('✅ AuthContext: Login API response:', data);
      console.log('🔑 Token in response:', data.token ? 'Yes' : 'NO - MISSING!');
      
      // Save token from response
      if (data.token) {
        setAuthToken(data.token);
        console.log('✅ Token saved to localStorage');
        
        // Verify it was saved
        const savedToken = getAuthToken();
        console.log('✅ Token verification:', savedToken ? 'Saved successfully' : 'FAILED TO SAVE');
      } else {
        console.error('❌❌❌ NO TOKEN IN RESPONSE!');
        throw new Error('No authentication token received from server');
      }
      
      const normalizedUser = normalizeUser(data.user);
      setUser(normalizedUser);
      console.log('✅ User set in state:', normalizedUser);
      
      try {
        await subscribeToPushNotifications();
        console.log('✅ Push notifications subscribed');
      } catch (pushError) {
        console.warn('⚠️ Push notification subscription failed (non-critical):', pushError);
      }
    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error);
      throw error;
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      console.log('📝 AuthContext: Registering user:', email);
      const { data } = await authAPI.register({ username, email, password });
      console.log('✅ AuthContext: Registration successful (raw):', data);
      console.log('🔑 Token in response:', data.token ? 'Yes' : 'NO - MISSING!');
      
      // Save token from response
      if (data.token) {
        setAuthToken(data.token);
        console.log('✅ Token saved to localStorage');
      } else {
        console.error('❌❌❌ NO TOKEN IN RESPONSE!');
        throw new Error('No authentication token received from server');
      }
      
      // Normalize user object
      const normalizedUser = normalizeUser(data.user);
      console.log('✅ AuthContext: Normalized user:', normalizedUser);
      
      setUser(normalizedUser);
      
      // Subscribe to push notifications after registration
      try {
        await subscribeToPushNotifications();
      } catch (pushError) {
        console.warn('⚠️ Push notification subscription failed (non-critical):', pushError);
      }
    } catch (error) {
      console.error('❌ AuthContext: Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('👋 Logging out...');
      await authAPI.logout(); // This removes token from localStorage
      setUser(null);
      console.log('✅ Logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear user and token even if API call fails
      removeAuthToken();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
