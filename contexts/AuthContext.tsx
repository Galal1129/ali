import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';
import { AppSettings } from '@/types/database';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userName: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  settings: AppSettings | null;
  refreshSettings: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_KEY = '@money_transfer_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .maybeSingle();

      if (!error && data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  useEffect(() => {
    checkAuth();
    loadSettings();
  }, []);

  const checkAuth = async () => {
    try {
      const value = await AsyncStorage.getItem(AUTH_KEY);
      if (value === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (userName: string, pin: string): Promise<boolean> => {
    try {
      if (!settings) {
        await loadSettings();
      }

      const hashHex = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        pin
      );

      const { data, error } = await supabase
        .from('app_security')
        .select('id, pin_hash, is_active')
        .eq('user_name', userName)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      if (!data.is_active) {
        return false;
      }

      if (data.pin_hash === hashHex) {
        await supabase
          .from('app_security')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.id);

        await AsyncStorage.setItem(AUTH_KEY, 'true');
        setIsAuthenticated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error during login:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const refreshSettings = async () => {
    await loadSettings();
  };

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<boolean> => {
    try {
      const { data: currentSettings, error: fetchError } = await supabase
        .from('app_settings')
        .select('id')
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (currentSettings) {
        const { error: updateError } = await supabase
          .from('app_settings')
          .update(newSettings)
          .eq('id', currentSettings.id);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert(newSettings);

        if (insertError) {
          throw insertError;
        }
      }

      await loadSettings();
      return true;
    } catch (error) {
      console.error('Error updating settings:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        logout,
        settings,
        refreshSettings,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return default values during initialization
    return {
      isAuthenticated: false,
      isLoading: true,
      login: async (_userName: string, _pin: string) => false,
      logout: async () => {},
      settings: null,
      refreshSettings: async () => {},
      updateSettings: async () => false,
    };
  }
  return context;
}
