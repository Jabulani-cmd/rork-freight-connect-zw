import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Tables = {
  profiles: {
    id: string;
    phone: string;
    role: 'cargo_owner' | 'driver' | null;
    full_name: string | null;
    avatar_url: string | null;
    rating: number;
    review_count: number;
    push_token: string | null;
    created_at: string;
    updated_at: string;
  };
  vehicles: {
    id: string;
    driver_id: string;
    type: 'motorcycle' | 'van' | 'small_truck' | 'heavy_truck' | 'fleet';
    weight_capacity_kg: number;
    license_plate: string;
    insurance_photo_url: string | null;
    vehicle_photo_url: string | null;
    is_verified: boolean;
    created_at: string;
  };
  jobs: {
    id: string;
    cargo_owner_id: string;
    pickup_location: { latitude: number; longitude: number; address: string };
    dropoff_location: { latitude: number; longitude: number; address: string };
    weight_kg: number;
    goods_type: string;
    preferred_vehicle_type: string | null;
    status: 'open' | 'quoted' | 'accepted' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled';
    driver_id: string | null;
    agreed_price: number | null;
    deposit_amount: number | null;
    deposit_paid: boolean;
    dispatch_photo_url: string | null;
    dispatched_at: string | null;
    waybill_number: string | null;
    sender_name: string | null;
    sender_phone: string | null;
    receiver_name: string | null;
    receiver_phone: string | null;
    created_at: string;
    updated_at: string;
  };
  tracking_events: {
    id: string;
    job_id: string;
    event_type: 'posted' | 'quoted' | 'accepted' | 'deposit_paid' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled' | 'note';
    description: string;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
  };
  quotes: {
    id: string;
    job_id: string;
    driver_id: string;
    price: number;
    deposit_percentage: number;
    message: string | null;
    status: 'pending' | 'accepted' | 'rejected' | 'countered';
    is_counter: boolean;
    countered_by: string | null;
    created_at: string;
  };
  locations: {
    id: string;
    driver_id: string;
    job_id: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    recorded_at: string;
  };
  messages: {
    id: string;
    job_id: string;
    sender_id: string;
    content: string;
    type: 'text' | 'quote' | 'system';
    metadata: Record<string, unknown> | null;
    created_at: string;
  };
  reviews: {
    id: string;
    job_id: string;
    reviewer_id: string;
    reviewee_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
  };
  subscriptions: {
    id: string;
    driver_id: string;
    tier: 'basic' | 'standard' | 'premium' | 'enterprise';
    amount_usd: number;
    expires_at: string;
    is_active: boolean;
    created_at: string;
  };
};
