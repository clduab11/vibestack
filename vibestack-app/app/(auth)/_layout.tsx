import { Redirect, Stack } from 'expo-router'
import { useUserStore } from '../../stores/userStore'

export default function AuthLayout() {
  const { isAuthenticated } = useUserStore()

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="onboarding" />
    </Stack>
  )
}