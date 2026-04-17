import { useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { router } from 'expo-router';

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log('Failed to set notification handler:', e);
  }
}

export function usePushNotifications() {
  const { user, profile } = useStore();

  const registerForPushNotifications = useCallback(async () => {
    if (Platform.OS === 'web') {
      console.log('Push notifications are not supported on web');
      return null;
    }

    if (isExpoGo) {
      console.log('Push notifications are not supported in Expo Go on SDK 53+. Use a development build.');
      return null;
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    try {
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#1E3A5F',
          });
        } catch (channelError) {
          console.log('Failed to set Android notification channel:', channelError);
        }
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Push notification permission denied');
        return null;
      }

      let token;
      try {
        token = await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        });
      } catch (tokenError) {
        console.log('Push tokens are not available in Expo Go on SDK 53+. Use a development build to test push notifications.');
        return null;
      }

      if (user?.id && token?.data) {
        await supabase.from('profiles').update({
          push_token: token.data,
          updated_at: new Date().toISOString(),
        }).eq('id', user.id);
      }

      return token?.data ?? null;
    } catch (error) {
      console.log('Push notifications unavailable:', error);
      return null;
    }
  }, [user?.id]);

  const sendLocalNotification = useCallback(async (title: string, body: string, data?: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
      },
      trigger: null,
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    if (Platform.OS === 'web') return;
    if (isExpoGo) return;

    registerForPushNotifications();

    let notificationReceived: Notifications.EventSubscription | null = null;
    let notificationResponse: Notifications.EventSubscription | null = null;

    try {
      notificationReceived = Notifications.addNotificationReceivedListener((notification) => {
        console.log('Notification received:', notification);
      });

      notificationResponse = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as { jobId?: string; chatId?: string };

        if (data.jobId) {
          router.push(`/job/${data.jobId}`);
        } else if (data.chatId) {
          router.push(`/chat/${data.chatId}`);
        }
      });
    } catch (e) {
      console.log('Failed to attach notification listeners:', e);
    }

    return () => {
      notificationReceived?.remove();
      notificationResponse?.remove();
    };
  }, [user?.id, registerForPushNotifications]);

  return {
    registerForPushNotifications,
    sendLocalNotification,
  };
}

export async function sendQuoteNotification(driverId: string, jobId: string, price: number) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', driverId)
      .single();

    if (profile?.push_token) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: profile.push_token,
          title: 'New Quote Received',
          body: `A driver quoted $${price} on your job`,
          data: { jobId, type: 'quote' },
        }),
      });
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}
