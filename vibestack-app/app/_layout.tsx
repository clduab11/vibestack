import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { useUserStore } from '../stores/userStore'
import { auth } from '../services/supabase'

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync()

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
})

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false)
  const { setUser, setLoading } = useUserStore()

  useEffect(() => {
    async function prepare() {
      try {
        // Check if user is logged in
        const { data: { session } } = await auth.getSession()
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          })
        }
      } catch (e) {
        console.warn(e)
      } finally {
        setLoading(false)
        setIsReady(true)
        await SplashScreen.hideAsync()
      }
    }

    prepare()
  }, [])

  if (!isReady) {
    return null
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="auto" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FFFFFF' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen 
              name="(auth)" 
              options={{ 
                headerShown: false,
                animation: 'fade' 
              }} 
            />
            <Stack.Screen 
              name="(tabs)" 
              options={{ 
                headerShown: false 
              }} 
            />
            <Stack.Screen 
              name="modals" 
              options={{ 
                presentation: 'modal',
                animation: 'slide_from_bottom'
              }} 
            />
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}