import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="otp" options={{ headerShown: true, title: 'Reset Password', headerTintColor: '#2C3E50' }} />
      <Stack.Screen name="verify-otp" options={{ headerShown: true, title: 'Verify Email', headerTintColor: '#2C3E50' }} />
      <Stack.Screen name="oauth-success" />
    </Stack>
  );
}
