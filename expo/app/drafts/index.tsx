import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Platform } from "react-native";
import { Text, Card, Button, Chip, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Cloud,
  CloudOff,
  RefreshCcw,
  FileText,
  MapPin,
  Weight,
  Package,
  Trash2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Colors } from "@/constants/colors";
import { loadDrafts, removeDraft, syncDrafts, clearSynced, JobDraft } from "@/lib/drafts";

export default function DraftsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [toast, setToast] = useState("");
  const [isOnline, setIsOnline] = useState<boolean>(true);

  const { data: drafts = [], refetch } = useQuery({
    queryKey: ["drafts"],
    queryFn: () => loadDrafts(),
  });

  useEffect(() => {
    if (Platform.OS === "web" && typeof navigator !== "undefined") {
      setIsOnline(navigator.onLine);
      const on = () => setIsOnline(true);
      const off = () => setIsOnline(false);
      window.addEventListener("online", on);
      window.addEventListener("offline", off);
      return () => {
        window.removeEventListener("online", on);
        window.removeEventListener("offline", off);
      };
    }
    return undefined;
  }, []);

  const syncMutation = useMutation({
    mutationFn: async () => {
      const result = await syncDrafts();
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setToast(`Synced ${result.synced}, ${result.failed} failed`);
    },
    onError: (e: any) => setToast(e?.message || "Sync failed"),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await removeDraft(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      await clearSynced();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drafts"] });
    },
  });

  const pending = drafts.filter((d) => d.syncStatus === "pending" || d.syncStatus === "failed");
  const synced = drafts.filter((d) => d.syncStatus === "synced");

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#EAF2FB", "#FFF3EA"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back">
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Offline Drafts</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Card style={styles.statusCard}>
            <Card.Content style={styles.statusContent}>
              <View style={[styles.statusIcon, { backgroundColor: isOnline ? Colors.success + "20" : Colors.warning + "20" }]}>
                {isOnline ? <Cloud size={22} color={Colors.success} /> : <CloudOff size={22} color={Colors.warning} />}
              </View>
              <View style={styles.statusTextWrap}>
                <Text style={styles.statusTitle}>
                  {isOnline ? "Online" : "Offline"}
                </Text>
                <Text style={styles.statusSub}>
                  {pending.length > 0
                    ? `${pending.length} job${pending.length === 1 ? "" : "s"} waiting to sync`
                    : "All jobs synced to cloud"}
                </Text>
              </View>
              {pending.length > 0 && isOnline && (
                <Button
                  mode="contained"
                  onPress={() => syncMutation.mutate()}
                  loading={syncMutation.isPending}
                  disabled={syncMutation.isPending}
                  compact
                  icon={() => <RefreshCcw size={14} color="#fff" />}
                  style={styles.syncBtn}
                  testID="sync-btn"
                >
                  Sync now
                </Button>
              )}
            </Card.Content>
          </Card>

          <Text style={styles.sectionTitle}>
            Pending ({pending.length})
          </Text>

          {pending.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <FileText size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No pending drafts</Text>
                <Text style={styles.emptyNote}>
                  Draft jobs created offline will appear here until the device comes back online.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            pending.map((d) => (
              <DraftItem
                key={d.id}
                draft={d}
                onDelete={() => removeMutation.mutate(d.id)}
              />
            ))
          )}

          {synced.length > 0 && (
            <>
              <View style={styles.syncedHeader}>
                <Text style={styles.sectionTitle}>Synced ({synced.length})</Text>
                <TouchableOpacity onPress={() => clearMutation.mutate()}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              </View>
              {synced.map((d) => (
                <DraftItem key={d.id} draft={d} onDelete={() => removeMutation.mutate(d.id)} />
              ))}
            </>
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      <Snackbar visible={!!toast} onDismiss={() => setToast("")} duration={2500}>
        {toast}
      </Snackbar>
    </View>
  );
}

function DraftItem({ draft, onDelete }: { draft: JobDraft; onDelete: () => void }) {
  const statusConfig: Record<JobDraft["syncStatus"], { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: "Pending", color: Colors.warning, icon: <CloudOff size={12} color={Colors.warning} /> },
    syncing: { label: "Syncing", color: Colors.info, icon: <RefreshCcw size={12} color={Colors.info} /> },
    synced: { label: "Synced", color: Colors.success, icon: <CheckCircle2 size={12} color={Colors.success} /> },
    failed: { label: "Failed", color: Colors.error, icon: <AlertTriangle size={12} color={Colors.error} /> },
  };
  const cfg = statusConfig[draft.syncStatus];
  return (
    <Card style={styles.draftCard}>
      <Card.Content>
        <View style={styles.draftHeader}>
          <Chip
            compact
            style={[styles.statusPill, { backgroundColor: cfg.color + "15" }]}
            textStyle={{ color: cfg.color, fontSize: 11, fontWeight: "700" }}
            icon={() => cfg.icon as any}
          >
            {cfg.label}
          </Chip>
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} testID={`delete-${draft.id}`}>
            <Trash2 size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.routeBox}>
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {draft.pickupLocation?.address || "Pickup unset"}
            </Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
            <Text style={styles.routeText} numberOfLines={1}>
              {draft.dropoffLocation?.address || "Dropoff unset"}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Weight size={12} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{draft.weightKg} kg</Text>
          </View>
          <View style={styles.metaItem}>
            <Package size={12} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{draft.goodsType || "—"}</Text>
          </View>
          <View style={styles.metaItem}>
            <MapPin size={12} color={Colors.textSecondary} />
            <Text style={styles.metaText}>
              {new Date(draft.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {draft.lastError && draft.syncStatus === "failed" && (
          <Text style={styles.errorNote}>⚠ {draft.lastError}</Text>
        )}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scroll: { padding: 16, paddingBottom: 40 },

  statusCard: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16 },
  statusContent: { flexDirection: "row", alignItems: "center", gap: 12 },
  statusIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center" },
  statusTextWrap: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  statusSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  syncBtn: { borderRadius: 20 },

  sectionTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 10, marginTop: 8 },

  emptyCard: { backgroundColor: "rgba(255,255,255,0.9)", borderRadius: 14 },
  emptyContent: { alignItems: "center", paddingVertical: 18 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginTop: 8 },
  emptyNote: { fontSize: 12, color: Colors.textSecondary, textAlign: "center", marginTop: 4, paddingHorizontal: 20 },

  draftCard: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 14, marginBottom: 10 },
  draftHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  statusPill: { alignSelf: "flex-start", height: 26 },
  deleteBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },

  routeBox: { marginBottom: 10 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 1.5, height: 14, backgroundColor: Colors.border, marginLeft: 3.5, marginVertical: 2 },
  routeText: { flex: 1, fontSize: 13, color: Colors.text },

  metaRow: { flexDirection: "row", gap: 14, paddingTop: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: Colors.textSecondary },
  errorNote: { fontSize: 11, color: Colors.error, marginTop: 8 },

  syncedHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  clearText: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
});
