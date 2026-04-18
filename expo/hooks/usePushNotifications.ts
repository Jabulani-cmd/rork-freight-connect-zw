import { useEffect, useRef } from 'react';

export function usePushNotifications() {
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Mock implementation – does nothing.
    // Prevents crashes in Expo Go.
    return () => {};
  }, []);

  return {
    expoPushToken: null,
    notification: null,
  };
}
