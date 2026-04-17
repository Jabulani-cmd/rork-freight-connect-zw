import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';

export type UserRole = 'cargo_owner' | 'driver' | null;

export type VehicleType = 'motorcycle' | 'van' | 'small_truck' | 'heavy_truck' | 'fleet';

export interface Vehicle {
  id: string;
  type: VehicleType;
  weightCapacityKg: number;
  licensePlate: string;
  insurancePhotoUrl: string | null;
  vehiclePhotoUrl: string | null;
  isVerified: boolean;
}

export interface Profile {
  id: string;
  phone: string;
  role: UserRole;
  fullName: string | null;
  avatarUrl: string | null;
  rating: number;
  reviewCount: number;
}

interface AppState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  vehicle: Vehicle | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setVehicle: (vehicle: Vehicle | null) => void;
  setLoading: (loading: boolean) => void;
  clearAuth: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      profile: null,
      vehicle: null,
      isLoading: true,
      setSession: (session) => set({ session }),
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setVehicle: (vehicle) => set({ vehicle }),
      setLoading: (isLoading) => set({ isLoading }),
      clearAuth: () => set({ session: null, user: null, profile: null, vehicle: null }),
    }),
    {
      name: 'freight-connect-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        profile: state.profile,
        vehicle: state.vehicle,
      }),
    }
  )
);

interface LocationState {
  isTracking: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  trackedJobId: string | null;
  setIsTracking: (tracking: boolean) => void;
  setCurrentLocation: (location: { latitude: number; longitude: number } | null) => void;
  setTrackedJobId: (jobId: string | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  isTracking: false,
  currentLocation: null,
  trackedJobId: null,
  setIsTracking: (isTracking) => set({ isTracking }),
  setCurrentLocation: (currentLocation) => set({ currentLocation }),
  setTrackedJobId: (trackedJobId) => set({ trackedJobId }),
}));
