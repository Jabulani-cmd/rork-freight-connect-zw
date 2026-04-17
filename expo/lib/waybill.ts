import { supabase } from '@/lib/supabase';

export type TrackingEventType =
  | 'posted'
  | 'quoted'
  | 'accepted'
  | 'deposit_paid'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'cancelled'
  | 'note';

export interface TrackingEvent {
  id: string;
  job_id: string;
  event_type: TrackingEventType;
  description: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export async function addTrackingEvent(params: {
  jobId: string;
  type: TrackingEventType;
  description: string;
  latitude?: number;
  longitude?: number;
}): Promise<void> {
  try {
    const { error } = await supabase.from('tracking_events').insert({
      job_id: params.jobId,
      event_type: params.type,
      description: params.description,
      latitude: params.latitude ?? null,
      longitude: params.longitude ?? null,
    });
    if (error) console.log('[tracking_events] insert error:', error.message);
  } catch (e) {
    console.log('[tracking_events] exception:', e);
  }
}

export async function notifyParties(params: {
  jobId: string;
  waybill: string | null;
  senderPhone?: string | null;
  receiverPhone?: string | null;
  message: string;
}): Promise<void> {
  console.log('[notifyParties] SMS simulated', {
    jobId: params.jobId,
    waybill: params.waybill,
    to: [params.senderPhone, params.receiverPhone].filter(Boolean),
    message: params.message,
  });
  try {
    const { error } = await supabase.from('notifications_log').insert({
      job_id: params.jobId,
      waybill_number: params.waybill,
      sender_phone: params.senderPhone ?? null,
      receiver_phone: params.receiverPhone ?? null,
      message: params.message,
    });
    if (error) console.log('[notifications_log] insert:', error.message);
  } catch (e) {
    console.log('[notifications_log] exception:', e);
  }
}

export async function lookupByWaybill(waybill: string) {
  const trimmed = waybill.trim().toUpperCase();
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from('jobs')
    .select(`*, driver:profiles!jobs_driver_id_fkey(full_name, phone, rating, avatar_url)`) 
    .eq('waybill_number', trimmed)
    .maybeSingle();
  if (error) {
    console.log('[waybill lookup] error:', error.message);
    return null;
  }
  return data;
}

export async function getTrackingEvents(jobId: string): Promise<TrackingEvent[]> {
  const { data, error } = await supabase
    .from('tracking_events')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    console.log('[tracking_events] fetch error:', error.message);
    return [];
  }
  return (data as TrackingEvent[]) || [];
}
