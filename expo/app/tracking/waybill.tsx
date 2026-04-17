import React, { useState, useCallback } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Text, TextInput, Button, Card, Chip, ActivityIndicator, Avatar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import {
  ChevronLeft,
  Hash,
  MapPin,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  Navigation,
  AlertCircle,
  Share2,
  User,
  Phone,
} from "lucide-react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { lookupByWaybill, getTrackingEvents, TrackingEvent } from "@/lib/waybill";
import { supabase } from "@/lib/supabase";

export default function WaybillTrackingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ waybill?: string }>();
  const [query, setQuery] = useState<string>(params.waybill ?? "");
  const [searchWaybill, setSearchWaybill] = useState<string>(params.waybill ?? "");

  const { data: job, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["waybill", searchWaybill],
    queryFn: async () => (searchWaybill ? lookupByWaybill(searchWaybill) : null),
    enabled: !!searchWaybill,
    refetchInterval: searchWaybill ? 30000 : false,
  });

  const { data: events } = useQuery<TrackingEvent[]>({
    queryKey: ["tracking-events", job?.id],
    queryFn: async () => (job?.id ? getTrackingEvents(job.id) : []),
    enabled: !!job?.id,
    refetchInterval: 30000,
  });

  const { data: latestLocation } = useQuery({
    queryKey: ["waybill-location", job?.id],
    queryFn: async () => {
      if (!job?.id) return null;
      const { data } = await supabase
        .from("locations")
        .select("latitude, longitude, recorded_at")
        .eq("job_id", job.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!job?.id && (job?.status === "in_transit" || job?.status === "dispatched"),
    refetchInterval: 30000,
  });

  const onSearch = useCallback(() => {
    const trimmed = query.trim().toUpperCase();
    setSearchWaybill(trimmed);
  }, [query]);

  const pickup = job?.pickup_location;
  const dropoff = job?.dropoff_location;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Track Waybill</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.searchCard}>
            <Card.Content>
              <View style={styles.searchRow}>
                <View style={styles.searchIcon}>
                  <Hash size={20} color={Colors.primary} />
                </View>
                <TextInput
                  value={query}
                  onChangeText={(t) => setQuery(t.toUpperCase())}
                  placeholder="e.g. FCZ-ABC123"
                  mode="outlined"
                  style={styles.searchInput}
                  outlineColor={Colors.border}
                  activeOutlineColor={Colors.primary}
                  autoCapitalize="characters"
                  onSubmitEditing={onSearch}
                  testID="waybill-input"
                />
              </View>
              <Button
                mode="contained"
                onPress={onSearch}
                style={styles.searchButton}
                disabled={!query.trim() || isFetching}
                loading={isFetching}
                testID="waybill-search"
              >
                Track Parcel
              </Button>
              <Text style={styles.hint}>
                Enter the waybill number from your shipment confirmation SMS.
              </Text>
            </Card.Content>
          </Card>

          {isLoading && searchWaybill ? (
            <View style={styles.centered}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null}

          {searchWaybill && !isLoading && !job ? (
            <Card style={styles.notFoundCard}>
              <Card.Content style={styles.notFoundContent}>
                <AlertCircle size={32} color={Colors.error} />
                <Text style={styles.notFoundTitle}>Waybill not found</Text>
                <Text style={styles.notFoundText}>
                  Check the number and try again. Waybill numbers look like FCZ-XXXXXX.
                </Text>
              </Card.Content>
            </Card>
          ) : null}

          {job ? (
            <>
              <Card style={styles.summaryCard}>
                <Card.Content>
                  <View style={styles.summaryHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.waybillLabel}>Waybill</Text>
                      <Text style={styles.waybillNumber}>{job.waybill_number ?? job.id.slice(0, 8)}</Text>
                    </View>
                    <Chip
                      style={[styles.statusChip, { backgroundColor: getStatusColor(job.status) + "20" }]}
                      textStyle={{ color: getStatusColor(job.status), fontSize: 11, fontWeight: "700" }}
                    >
                      {job.status?.replace("_", " ").toUpperCase()}
                    </Chip>
                  </View>

                  <View style={styles.route}>
                    <View style={styles.routeItem}>
                      <View style={[styles.routeDot, { backgroundColor: Colors.success }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeLabel}>From</Text>
                        <Text style={styles.routeAddress} numberOfLines={2}>
                          {pickup?.address || "—"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routeItem}>
                      <View style={[styles.routeDot, { backgroundColor: Colors.error }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.routeLabel}>To</Text>
                        <Text style={styles.routeAddress} numberOfLines={2}>
                          {dropoff?.address || "—"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Package size={16} color={Colors.primary} />
                      <Text style={styles.metaText}>{job.goods_type || "Goods"}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Truck size={16} color={Colors.secondary} />
                      <Text style={styles.metaText}>{job.weight_kg} kg</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              {pickup && dropoff ? (
                <Card style={styles.mapCard}>
                  <MapView
                    style={styles.map}
                    initialRegion={{
                      latitude: ((pickup.latitude ?? 0) + (dropoff.latitude ?? 0)) / 2,
                      longitude: ((pickup.longitude ?? 0) + (dropoff.longitude ?? 0)) / 2,
                      latitudeDelta: Math.abs((pickup.latitude ?? 0) - (dropoff.latitude ?? 0)) + 1,
                      longitudeDelta: Math.abs((pickup.longitude ?? 0) - (dropoff.longitude ?? 0)) + 1,
                    }}
                  >
                    <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
                      <View style={[styles.marker, { backgroundColor: Colors.success }]}>
                        <MapPin size={14} color="#fff" />
                      </View>
                    </Marker>
                    <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}>
                      <View style={[styles.marker, { backgroundColor: Colors.error }]}>
                        <MapPin size={14} color="#fff" />
                      </View>
                    </Marker>
                    {latestLocation ? (
                      <Marker
                        coordinate={{
                          latitude: latestLocation.latitude,
                          longitude: latestLocation.longitude,
                        }}
                      >
                        <View style={styles.driverMarker}>
                          <Truck size={16} color="#fff" />
                        </View>
                      </Marker>
                    ) : null}
                    {latestLocation ? (
                      <Polyline
                        coordinates={[
                          { latitude: pickup.latitude, longitude: pickup.longitude },
                          { latitude: latestLocation.latitude, longitude: latestLocation.longitude },
                          { latitude: dropoff.latitude, longitude: dropoff.longitude },
                        ]}
                        strokeColor={Colors.primary}
                        strokeWidth={2}
                      />
                    ) : null}
                  </MapView>
                </Card>
              ) : null}

              {job.driver ? (
                <Card style={styles.partyCard}>
                  <Card.Content>
                    <Text style={styles.sectionTitle}>Driver</Text>
                    <View style={styles.partyRow}>
                      <Avatar.Text
                        size={40}
                        label={(job.driver.full_name || "D").charAt(0).toUpperCase()}
                        style={{ backgroundColor: Colors.primary }}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.partyName}>{job.driver.full_name || "Assigned Driver"}</Text>
                        <Text style={styles.partyMeta}>★ {job.driver.rating ?? "—"}</Text>
                      </View>
                      {job.driver.phone ? (
                        <View style={styles.phoneChip}>
                          <Phone size={14} color={Colors.primary} />
                          <Text style={styles.phoneText}>{job.driver.phone}</Text>
                        </View>
                      ) : null}
                    </View>
                  </Card.Content>
                </Card>
              ) : null}

              <Card style={styles.partyCard}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>Sender & Receiver</Text>
                  <View style={styles.partyRow}>
                    <User size={18} color={Colors.success} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.partyLabel}>Sender</Text>
                      <Text style={styles.partyName}>{job.sender_name || "—"}</Text>
                      <Text style={styles.partyMeta}>{job.sender_phone || ""}</Text>
                    </View>
                  </View>
                  <View style={[styles.partyRow, { marginTop: 12 }]}>
                    <User size={18} color={Colors.error} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.partyLabel}>Receiver</Text>
                      <Text style={styles.partyName}>{job.receiver_name || "—"}</Text>
                      <Text style={styles.partyMeta}>{job.receiver_phone || ""}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>

              <Card style={styles.timelineCard}>
                <Card.Content>
                  <Text style={styles.sectionTitle}>Tracking Timeline</Text>
                  {events && events.length > 0 ? (
                    events.map((e, idx) => (
                      <View key={e.id} style={styles.timelineRow}>
                        <View style={styles.timelineDotWrap}>
                          <View style={[styles.timelineDot, { backgroundColor: eventColor(e.event_type) }]}>
                            {e.event_type === "delivered" ? (
                              <CheckCircle2 size={12} color="#fff" />
                            ) : (
                              <Navigation size={10} color="#fff" />
                            )}
                          </View>
                          {idx < events.length - 1 ? <View style={styles.timelineLine} /> : null}
                        </View>
                        <View style={styles.timelineContent}>
                          <Text style={styles.timelineTitle}>{formatEvent(e.event_type)}</Text>
                          <Text style={styles.timelineDesc}>{e.description}</Text>
                          <View style={styles.timelineMeta}>
                            <Clock size={11} color={Colors.textMuted} />
                            <Text style={styles.timelineTime}>
                              {new Date(e.created_at).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>No tracking events yet.</Text>
                  )}
                </Card.Content>
              </Card>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStatusColor(status?: string) {
  switch (status) {
    case "open": return Colors.info;
    case "quoted": return Colors.warning;
    case "accepted": return Colors.accent;
    case "dispatched": return Colors.primary;
    case "in_transit": return Colors.secondary;
    case "delivered": return Colors.success;
    case "cancelled": return Colors.error;
    default: return Colors.textMuted;
  }
}

function eventColor(type: string) {
  switch (type) {
    case "delivered": return Colors.success;
    case "cancelled": return Colors.error;
    case "dispatched":
    case "in_transit": return Colors.secondary;
    case "accepted":
    case "deposit_paid": return Colors.accent;
    default: return Colors.primary;
  }
}

function formatEvent(type: string) {
  return type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: Colors.text },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  searchCard: { borderRadius: 16, marginBottom: 16, backgroundColor: Colors.surface },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  searchIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center", alignItems: "center",
  },
  searchInput: { flex: 1, backgroundColor: Colors.background, fontSize: 14 },
  searchButton: { borderRadius: 10, backgroundColor: Colors.primary },
  hint: { fontSize: 11, color: Colors.textSecondary, marginTop: 10, textAlign: "center" },
  centered: { paddingVertical: 32, alignItems: "center" },
  notFoundCard: { borderRadius: 16, backgroundColor: Colors.surface },
  notFoundContent: { alignItems: "center", paddingVertical: 20 },
  notFoundTitle: { fontSize: 16, fontWeight: "700", color: Colors.text, marginTop: 12 },
  notFoundText: { fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: "center", paddingHorizontal: 20 },
  summaryCard: { borderRadius: 16, marginBottom: 16, backgroundColor: Colors.surface },
  summaryHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  waybillLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  waybillNumber: { fontSize: 20, fontWeight: "800", color: Colors.text, marginTop: 2 },
  statusChip: { borderRadius: 6 },
  route: { marginBottom: 16 },
  routeItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  routeDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  routeLine: { width: 2, height: 22, backgroundColor: Colors.border, marginLeft: 4, marginVertical: 2 },
  routeLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  routeAddress: { fontSize: 13, color: Colors.text, marginTop: 2, lineHeight: 18 },
  metaRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  metaItem: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: Colors.background, borderRadius: 8,
  },
  metaText: { fontSize: 12, color: Colors.text, fontWeight: "600" },
  mapCard: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  map: { height: 220, width: "100%" },
  marker: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  driverMarker: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff", backgroundColor: Colors.primary },
  partyCard: { borderRadius: 16, marginBottom: 16, backgroundColor: Colors.surface },
  partyRow: { flexDirection: "row", alignItems: "center" },
  partyLabel: { fontSize: 11, color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.4 },
  partyName: { fontSize: 14, fontWeight: "600", color: Colors.text, marginTop: 2 },
  partyMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  phoneChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: Colors.primary + "10", borderRadius: 8 },
  phoneText: { fontSize: 11, color: Colors.primary, fontWeight: "600" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  timelineCard: { borderRadius: 16, backgroundColor: Colors.surface },
  timelineRow: { flexDirection: "row", gap: 12 },
  timelineDotWrap: { alignItems: "center", width: 24 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  timelineLine: { flex: 1, width: 2, backgroundColor: Colors.border, marginTop: 2, minHeight: 24 },
  timelineContent: { flex: 1, paddingBottom: 16 },
  timelineTitle: { fontSize: 14, fontWeight: "700", color: Colors.text },
  timelineDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, lineHeight: 18 },
  timelineMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  timelineTime: { fontSize: 11, color: Colors.textMuted },
  emptyText: { color: Colors.textSecondary, fontSize: 13, textAlign: "center", paddingVertical: 12 },
});
