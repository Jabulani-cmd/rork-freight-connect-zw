import { useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useStore, useLocationStore } from '@/lib/store';
import { addTrackingEvent, notifyParties } from '@/lib/waybill';

const LOCATION_TASK_NAME = 'background-location-task';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: { data: any; error: any }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    const location = locations[0];
    
    if (location) {
      const jobId = global.activeTrackingJobId;
      const driverId = global.activeTrackingDriverId;
      
      if (jobId && driverId) {
        await supabase.from('locations').insert({
          driver_id: driverId,
          job_id: jobId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
        });
      }
    }
  }
});

declare global {
  var activeTrackingJobId: string | null;
  var activeTrackingDriverId: string | null;
}

export function useLocationTracking() {
  const { user, profile, vehicle } = useStore();
  const { isTracking, setIsTracking, setCurrentLocation, trackedJobId, setTrackedJobId } = useLocationStore();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const requestPermissions = async () => {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus !== 'granted') {
      throw new Error('Foreground location permission denied');
    }

    if (Platform.OS !== 'web') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
      if (backgroundStatus !== 'granted') {
        console.warn('Background location permission denied');
      }
    }

    return true;
  };

  const startTracking = useCallback(async (jobId: string) => {
    if (!user?.id) return;

    try {
      await requestPermissions();

      global.activeTrackingJobId = jobId;
      global.activeTrackingDriverId = user.id;
      setTrackedJobId(jobId);
      setIsTracking(true);

      await supabase.from('jobs').update({
        status: 'in_transit',
        updated_at: new Date().toISOString(),
      }).eq('id', jobId);

      const { data: jobRow } = await supabase
        .from('jobs')
        .select('waybill_number, sender_phone, receiver_phone')
        .eq('id', jobId)
        .maybeSingle();
      await addTrackingEvent({
        jobId,
        type: 'in_transit',
        description: 'Driver is en-route. Live location sharing started.',
      });
      await notifyParties({
        jobId,
        waybill: jobRow?.waybill_number ?? null,
        senderPhone: jobRow?.sender_phone,
        receiverPhone: jobRow?.receiver_phone,
        message: `Your parcel ${jobRow?.waybill_number ?? ''} is on the way. Track live in the app.`,
      });

      if (Platform.OS !== 'web') {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
        if (!hasStarted) {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 30000,
            distanceInterval: 50,
            foregroundService: {
              notificationTitle: 'Freight Connect ZW',
              notificationBody: 'Sharing your location with the cargo owner',
              notificationColor: '#1E3A5F',
            },
          });
        }
      }

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 30000,
          distanceInterval: 50,
        },
        async (location) => {
          const locData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          };
          setCurrentLocation(locData);

          await supabase.from('locations').insert({
            driver_id: user.id,
            job_id: jobId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          });
        }
      );

      console.log('Location tracking started for job:', jobId);
    } catch (error) {
      console.error('Failed to start location tracking:', error);
      setIsTracking(false);
      throw error;
    }
  }, [user?.id, setIsTracking, setCurrentLocation, setTrackedJobId]);

  const stopTracking = useCallback(async (jobId: string) => {
    try {
      if (Platform.OS !== 'web') {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
        }
      }

      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      await supabase.from('jobs').update({
        status: 'delivered',
        updated_at: new Date().toISOString(),
      }).eq('id', jobId);

      const { data: jobRow } = await supabase
        .from('jobs')
        .select('waybill_number, sender_phone, receiver_phone')
        .eq('id', jobId)
        .maybeSingle();
      await addTrackingEvent({
        jobId,
        type: 'delivered',
        description: 'Parcel marked as delivered.',
      });
      await notifyParties({
        jobId,
        waybill: jobRow?.waybill_number ?? null,
        senderPhone: jobRow?.sender_phone,
        receiverPhone: jobRow?.receiver_phone,
        message: `Parcel ${jobRow?.waybill_number ?? ''} has been delivered. Thank you for using Freight Connect ZW.`,
      });

      global.activeTrackingJobId = null;
      global.activeTrackingDriverId = null;
      setTrackedJobId(null);
      setIsTracking(false);
      setCurrentLocation(null);

      console.log('Location tracking stopped for job:', jobId);
    } catch (error) {
      console.error('Failed to stop location tracking:', error);
      throw error;
    }
  }, [setIsTracking, setCurrentLocation, setTrackedJobId]);

  const confirmDispatch = useCallback(async (jobId: string, photoUri?: string) => {
    if (!user?.id) return;

    try {
      await supabase.from('jobs').update({
        status: 'dispatched',
        driver_id: user.id,
        dispatch_photo_url: photoUri || null,
        dispatched_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', jobId);

      const { data: jobRow } = await supabase
        .from('jobs')
        .select('waybill_number, sender_phone, receiver_phone')
        .eq('id', jobId)
        .maybeSingle();
      await addTrackingEvent({
        jobId,
        type: 'dispatched',
        description: 'Driver picked up the parcel and dispatched it.',
      });
      await notifyParties({
        jobId,
        waybill: jobRow?.waybill_number ?? null,
        senderPhone: jobRow?.sender_phone,
        receiverPhone: jobRow?.receiver_phone,
        message: `Parcel ${jobRow?.waybill_number ?? ''} has been picked up by the driver.`,
      });

      console.log('Dispatch confirmed for job:', jobId);
    } catch (error) {
      console.error('Failed to confirm dispatch:', error);
      throw error;
    }
  }, [user?.id]);

  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  return {
    startTracking,
    stopTracking,
    confirmDispatch,
    isTracking,
    requestPermissions,
  };
}

export function useLocationSubscription(jobId: string | null) {
  const { setCurrentLocation } = useLocationStore();

  useEffect(() => {
    if (!jobId) return;

    const subscription = supabase
      .channel(`locations:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'locations',
          filter: `job_id=eq.${jobId}`,
        },
        (payload) => {
          const location = payload.new as any;
          setCurrentLocation({
            latitude: location.latitude,
            longitude: location.longitude,
          });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [jobId, setCurrentLocation]);
}
