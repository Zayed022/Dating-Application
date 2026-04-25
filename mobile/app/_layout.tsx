import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import { hydrateAuth } from '../store/authStore';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
    },
    mutations: {
      retry: 0,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    hydrateAuth();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="profile/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="chat/[matchId]" />
            <Stack.Screen name="call/[matchId]" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="features/rent-buddy" />
            <Stack.Screen name="features/blind-date" />
            <Stack.Screen name="features/travel-mate" />
            <Stack.Screen name="features/premium" />
            <Stack.Screen name="features/notifications" />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0D0D' },
});
