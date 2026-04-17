import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export interface JobDraft {
  id: string;
  cargoOwnerId: string;
  pickupLocation: { latitude: number; longitude: number; address: string } | null;
  dropoffLocation: { latitude: number; longitude: number; address: string } | null;
  weightKg: number;
  goodsType: string;
  preferredVehicleType: string | null;
  description: string;
  createdAt: string;
  syncStatus: "pending" | "syncing" | "synced" | "failed";
  lastError?: string;
  syncedJobId?: string;
}

const KEY = "freight-connect:job-drafts";

export async function loadDrafts(): Promise<JobDraft[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as JobDraft[]) : [];
  } catch (e) {
    console.log("drafts load error", e);
    return [];
  }
}

export async function saveDrafts(drafts: JobDraft[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(drafts));
}

export async function addDraft(
  draft: Omit<JobDraft, "id" | "createdAt" | "syncStatus">
): Promise<JobDraft> {
  const list = await loadDrafts();
  const record: JobDraft = {
    ...draft,
    id: `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    syncStatus: "pending",
  };
  await saveDrafts([record, ...list]);
  console.log("[drafts] added", record.id);
  return record;
}

export async function removeDraft(id: string): Promise<void> {
  const list = await loadDrafts();
  await saveDrafts(list.filter((d) => d.id !== id));
}

export async function updateDraft(
  id: string,
  patch: Partial<JobDraft>
): Promise<void> {
  const list = await loadDrafts();
  const next = list.map((d) => (d.id === id ? { ...d, ...patch } : d));
  await saveDrafts(next);
}

export async function syncDrafts(): Promise<{
  synced: number;
  failed: number;
  remaining: number;
}> {
  const list = await loadDrafts();
  const pending = list.filter((d) => d.syncStatus === "pending" || d.syncStatus === "failed");
  let synced = 0;
  let failed = 0;
  for (const draft of pending) {
    if (!draft.pickupLocation || !draft.dropoffLocation || !draft.goodsType) {
      await updateDraft(draft.id, { syncStatus: "failed", lastError: "Missing fields" });
      failed++;
      continue;
    }
    try {
      await updateDraft(draft.id, { syncStatus: "syncing" });
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          cargo_owner_id: draft.cargoOwnerId,
          pickup_location: draft.pickupLocation,
          dropoff_location: draft.dropoffLocation,
          weight_kg: draft.weightKg,
          goods_type: draft.goodsType,
          preferred_vehicle_type: draft.preferredVehicleType,
          description: draft.description,
          status: "open",
        })
        .select()
        .single();
      if (error) throw error;
      await updateDraft(draft.id, { syncStatus: "synced", syncedJobId: data?.id });
      synced++;
      console.log("[drafts] synced", draft.id, "->", data?.id);
    } catch (e: any) {
      console.log("[drafts] sync failed", draft.id, e?.message);
      await updateDraft(draft.id, { syncStatus: "failed", lastError: e?.message || "Unknown" });
      failed++;
    }
  }
  const remaining = (await loadDrafts()).filter(
    (d) => d.syncStatus === "pending" || d.syncStatus === "failed"
  ).length;
  return { synced, failed, remaining };
}

export async function clearSynced(): Promise<void> {
  const list = await loadDrafts();
  await saveDrafts(list.filter((d) => d.syncStatus !== "synced"));
}
