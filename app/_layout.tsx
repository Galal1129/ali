import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DataRefreshProvider } from '@/contexts/DataRefreshContext';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function useAutoUpdate() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        if (__DEV__ || Platform.OS === 'web' || !Updates.isEnabled) {
          return;
        }

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();

          Alert.alert(
            'تحديث جديد',
            'تم تحميل تحديث جديد للتطبيق. هل تريد إعادة تشغيل التطبيق الآن؟',
            [
              { text: 'لاحقًا', style: 'cancel' },
              {
                text: 'تحديث الآن',
                onPress: async () => {
                  await Updates.reloadAsync();
                },
              },
            ]
          );
        }
      } catch (error) {
        console.log('Update check failed:', error);
      }
    }

    checkForUpdates();
  }, []);
}

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="pin-entry" />
      <Stack.Screen name="pin-settings" />
      <Stack.Screen name="add-customer" />
      <Stack.Screen name="customer-details" />
      <Stack.Screen name="new-transaction" />
      <Stack.Screen name="transaction-details" />
      <Stack.Screen name="new-movement" />
      <Stack.Screen name="edit-movement" />
      <Stack.Screen name="movement-details" />
      <Stack.Screen name="receipt-preview" />
      <Stack.Screen name="debt-summary" />
      <Stack.Screen name="shop-settings" />
      <Stack.Screen name="exchange-rates" />
      <Stack.Screen name="calculator" />
      <Stack.Screen name="debts" />
      <Stack.Screen name="statistics" />
      <Stack.Screen name="ai-assistant" />
      <Stack.Screen name="backup" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  useAutoUpdate();

  return (
    <AuthProvider>
      <DataRefreshProvider>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </DataRefreshProvider>
    </AuthProvider>
  );
}
