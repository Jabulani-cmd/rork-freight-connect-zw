import { useEffect, useRef } from 'react';

// Mock implementation – no actual push notifications
export function usePushNotifications() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // In Expo Go, push notifications are not supported.
    // This mock does nothing.
    return () => {
      // Cleanup (nothing to clean)
    };
  }, []);

  return {
    expoPushToken: null,
    notification: null,
  };
}
