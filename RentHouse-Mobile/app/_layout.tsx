import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useFonts } from 'expo-font';
import { ActivityIndicator, View } from 'react-native';

// Require TTF assets directly — avoids Metro choking on the package's ESM index.js
// (Metro doesn't transpile node_modules by default, so `export * from './useFonts'` fails)
const PlayfairDisplay_400Regular = require('@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf');
const PlayfairDisplay_500Medium   = require('@expo-google-fonts/playfair-display/500Medium/PlayfairDisplay_500Medium.ttf');
const PlayfairDisplay_600SemiBold = require('@expo-google-fonts/playfair-display/600SemiBold/PlayfairDisplay_600SemiBold.ttf');
const PlayfairDisplay_700Bold     = require('@expo-google-fonts/playfair-display/700Bold/PlayfairDisplay_700Bold.ttf');
const Inter_300Light   = require('@expo-google-fonts/inter/300Light/Inter_300Light.ttf');
const Inter_400Regular = require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf');
const Inter_500Medium  = require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf');
const Inter_600SemiBold = require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf');

const STRIPE_PUBLISHABLE_KEY =
  'pk_test_51RoNCB2Ylq8U0YVR6yVwbqvqm4Dy3QO8SPHEHSgoCPvHhbxYsufl6cDwR1buRjDZdobHLSNHf4HCee7f4aXNTvwp00qdh8ZSXK';

function RootLayoutNav() {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, isLoading, segments]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const houseId = response.notification.request.content.data?.houseId;
      if (houseId) {
        router.push(`/property/${houseId}`);
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        // Applied to every non-tab screen by default
        headerShown: true,
        headerBackTitleVisible: false,
        headerTintColor: '#2C3E50',
        headerStyle: { backgroundColor: '#ffffff' },
        headerTitleStyle: { color: '#2C3E50', fontWeight: 'bold' },
        title: 'Back',
      }}
    >
      {/* Auth screens manage their own UI */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Tab navigator — tab bar is the navigation, no native header needed */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Virtual tour has a self-contained dark header inside the component;
          a native header on top would create a double header */}
      <Stack.Screen name="virtual-tour/[id]" options={{ headerShown: false }} />

      {/* Detail screens — white header with back arrow, title centred */}
      <Stack.Screen name="property/[id]"          options={{ title: 'Back' }} />
      <Stack.Screen name="schedule/[houseId]"     options={{ title: 'Back' }} />
      <Stack.Screen name="rentals"                options={{ title: 'Back' }} />
      <Stack.Screen name="reviews"                options={{ title: 'Back' }} />
      <Stack.Screen name="chatbot"                options={{ title: 'Back' }} />
      <Stack.Screen name="about"                  options={{ title: 'Back' }} />
      <Stack.Screen name="offers"                 options={{ title: 'Back' }} />
      <Stack.Screen name="notifications"          options={{ title: 'Back' }} />
      <Stack.Screen name="owner/dashboard"         options={{ title: 'Back' }} />
      <Stack.Screen name="owner/my-properties"   options={{ title: 'Back' }} />
      <Stack.Screen name="owner/bookings"        options={{ title: 'Back' }} />
      <Stack.Screen name="owner/offers"          options={{ title: 'Back' }} />
      <Stack.Screen name="owner/edit-house/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="admin/post-listing"     options={{ title: 'Back' }} />
      <Stack.Screen name="admin/edit-house/[id]"  options={{ title: 'Back' }} />
      <Stack.Screen name="admin/feedbacks"        options={{ title: 'Back' }} />
      <Stack.Screen name="admin/ratings"          options={{ title: 'Back' }} />
      {/* Dark-themed screens with self-contained headers — suppress native white header */}
      <Stack.Screen name="admin/dashboard"        options={{ headerShown: false }} />
      <Stack.Screen name="admin/users"            options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#2C3E50" />
      </View>
    );
  }

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <AuthProvider>
        <RootLayoutNav />
        <StatusBar style="auto" />
      </AuthProvider>
    </StripeProvider>
  );
}
