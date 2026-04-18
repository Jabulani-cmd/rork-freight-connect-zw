import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="role" />
      <Stack.Screen name="vehicle" />
      <Stack.Screen name="subscription" />
    </Stack>
  );
}