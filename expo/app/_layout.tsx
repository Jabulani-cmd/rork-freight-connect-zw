import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { usePushNotifications } from "@/hooks/usePushNotifications";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: Colors.primary,
    secondary: Colors.secondary,
    background: Colors.background,
    surface: Colors.surface,
    error: Colors.error,
  },
};

function useProtectedRoute() {
  const segments = useSegments();
  const router = useRouter();
  const { session, profile, isLoading, setSession, setUser, setLoading, setProfile } = useStore();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (profile) {
            setProfile({
              id: profile.id,
              phone: profile.phone,
              role: profile.role,
              fullName: profile.full_name,
              avatarUrl: profile.avatar_url,
              rating: profile.rating,
              reviewCount: profile.review_count,
            });
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
        SplashScreen.hideAsync();
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboarding = segments[0] === "onboarding";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/role-select");
    } else if (session && profile && !profile.role && !inOnboarding) {
      router.replace("/onboarding/role");
    } else if (session && profile?.role === 'driver' && !profile.hasVehicle && !inOnboarding) {
      router.replace("/onboarding/vehicle");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, profile, isLoading, segments]);
}

function RootLayoutNav() {
  useProtectedRoute();
  usePushNotifications();

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="job" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="tracking" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="payment" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="agent" options={{ headerShown: false }} />
      <Stack.Screen name="drafts" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
            <StatusBar style="auto" />
          </GestureHandlerRootView>
        </QueryClientProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
