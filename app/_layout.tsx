import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { I18nManager } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { PinProvider, usePin } from '@/contexts/PinContext';

I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const { pinRequired, pinVerified, checkingPin } = usePin();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || checkingPin) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inPinEntry = segments[0] === 'pin-entry';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      if (pinRequired && !pinVerified) {
        router.replace('/pin-entry');
      } else {
        router.replace('/(tabs)');
      }
    } else if (isAuthenticated && pinRequired && !pinVerified && !inPinEntry) {
      router.replace('/pin-entry');
    }
  }, [isAuthenticated, isLoading, segments, pinRequired, pinVerified, checkingPin]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
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

  return (
    <AuthProvider>
      <PinProvider>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </PinProvider>
    </AuthProvider>
  );
}
