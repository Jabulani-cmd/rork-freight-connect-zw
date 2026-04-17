import React, { useEffect, useState } from "react";
import { StyleSheet, View, TouchableOpacity, Dimensions, ActivityIndicator } from "react-native";
import { Text, Card, Button, Chip, Avatar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore, useLocationStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import { MapPin, Phone, MessageSquare, Navigation, Clock, Truck, AlertCircle, Hash, Search } from "lucide-react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLocationSubscription } from "@/hooks/useLocationTracking";
import ScreenBackground from "@/components/ScreenBackground";

const { width, height } = Dimensions.get("window");

const mockTrackingData = {
  job: {
    id: "1",
    status: "in_transit",
    driver: {
      id: "driver-1",
      name: "John Mutasa",
      phone: "+263 77 123 4567",
      rating: 4.8,
      avatar: null,
      vehicle: {
        type: "Small Truck",
        plate: "ABC 1234",
      },
    },
    pickup: { lat: -17.8252, lng: 31.0335, address: "Harare CBD" },
    dropoff: { lat: -20.1325, lng: 28.6265, address: "Bulawayo CBD" },
  },
  currentLocation: { lat: -18.9, lng: 29.8 },
  eta: "2h 15m",
  lastUpdate: "2 min ago",
};

export default function TrackingScreen() {
  const router = useRouter();
  const { profile } = useStore();
  const { currentLocation } = useLocationStore();
  const [mapReady, setMapReady] = useState(false);
  const [signalLost, setSignalLost] = useState(false);

  const { data: activeJobs, isLoading } = useQuery({
    queryKey: ["active-tracking-jobs", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          driver:profiles(id, full_name, phone, rating, avatar_url),
          vehicle:vehicles(type, license_plate)
        `)
        .eq("cargo_owner_id", profile.id)
        .in("status", ["dispatched", "in_transit"]);

      if (error) {
        console.error("Tracking query error:", error);
        return [mockTrackingData.job];
      }
      
      return data?.length ? data : [];
    },
    enabled: !!profile?.id,
    refetchInterval: 30000,
  });

  const job = activeJobs?.[0];
  
  useLocationSubscription(job?.id);

  useEffect(() => {
    if (currentLocation) {
      setSignalLost(false);
    }
    const interval = setInterval(() => {
      setSignalLost(true);
    }, 120000);
    return () => clearInterval(interval);
  }, [currentLocation]);

  if (isLoading) {
    return (
      <ScreenBackground variant="soft">
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  if (!job) {
    return (
      <ScreenBackground variant="soft">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Tracking</Text>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <TouchableOpacity
            style={styles.waybillCta}
            onPress={() => router.push("/tracking/waybill")}
            testID="open-waybill-tracking"
          >
            <View style={styles.waybillIcon}>
              <Hash size={22} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.waybillCtaTitle}>Track by waybill number</Text>
              <Text style={styles.waybillCtaSub}>Enter a waybill to check any parcel’s status</Text>
            </View>
            <Search size={18} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyState}>
          <Navigation size={64} color={Colors.textMuted} />
          <Text style={styles.emptyStateTitle}>No Active Deliveries</Text>
          <Text style={styles.emptyStateDescription}>
            Your active shipments will appear here for real-time tracking
          </Text>
          <Button mode="contained" onPress={() => router.push("/(tabs)/jobs")} style={styles.browseButton}>
            View My Jobs
          </Button>
        </View>
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  const pickup = job.pickup_location || { lat: -17.8252, lng: 31.0335, address: "Pickup" };
  const dropoff = job.dropoff_location || { lat: -20.1325, lng: 28.6265, address: "Dropoff" };
  const driverLoc = currentLocation || { latitude: -18.9, longitude: 29.8 };

  return (
    <ScreenBackground variant="soft">
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Tracking</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            onPress={() => router.push("/tracking/waybill")}
            style={styles.headerWaybillBtn}
            testID="open-waybill-tracking-top"
          >
            <Hash size={14} color={Colors.primary} />
            <Text style={styles.headerWaybillText}>Waybill</Text>
          </TouchableOpacity>
          <Chip style={[styles.statusChip, { backgroundColor: getStatusColor(job.status) + "20" }]} textStyle={{ color: getStatusColor(job.status) }}>
            {job.status?.replace("_", " ").toUpperCase()}
          </Chip>
        </View>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: driverLoc.latitude,
            longitude: driverLoc.longitude,
            latitudeDelta: 4,
            longitudeDelta: 4,
          }}
          onMapReady={() => setMapReady(true)}
        >
          <Marker coordinate={{ latitude: pickup.lat || pickup.latitude, longitude: pickup.lng || pickup.longitude }}>
            <View style={[styles.marker, { backgroundColor: Colors.success }]}>
              <MapPin size={16} color="#fff" />
            </View>
          </Marker>
          
          <Marker coordinate={{ latitude: dropoff.lat || dropoff.latitude, longitude: dropoff.lng || dropoff.longitude }}>
            <View style={[styles.marker, { backgroundColor: Colors.error }]}>
              <MapPin size={16} color="#fff" />
            </View>
          </Marker>

          {job.status === "in_transit" && (
            <Marker coordinate={{ latitude: driverLoc.latitude, longitude: driverLoc.longitude }}>
              <View style={[styles.driverMarker, { backgroundColor: signalLost ? Colors.error : Colors.primary }]}>
                <Truck size={20} color="#fff" />
              </View>
            </Marker>
          )}

          <Polyline
            coordinates={[
              { latitude: driverLoc.latitude, longitude: driverLoc.longitude },
              { latitude: dropoff.lat || dropoff.latitude, longitude: dropoff.lng || dropoff.longitude },
            ]}
            strokeColor={Colors.primary}
            strokeWidth={3}
          />
        </MapView>

        <TouchableOpacity style={styles.recenterButton}>
          <Navigation size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.driverCard}>
        <Card.Content>
          <View style={styles.driverHeader}>
            <Avatar.Text size={48} label={(job.driver?.full_name || "D").charAt(0).toUpperCase()} style={{ backgroundColor: Colors.primary }} />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{job.driver?.full_name || "Driver"}</Text>
              <Text style={styles.vehicleInfo}>
                {job.vehicle?.type?.replace("_", " ") || "Vehicle"} • {job.vehicle?.license_plate || "ABC 1234"}
              </Text>
              <View style={styles.ratingContainer}>
                <Chip style={styles.ratingChip} textStyle={styles.ratingText}>
                  {job.driver?.rating || "4.8"} ★
                </Chip>
              </View>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Clock size={20} color={Colors.primary} />
              <Text style={styles.statLabel}>ETA</Text>
              <Text style={styles.statValue}>2h 15m</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <AlertCircle size={20} color={signalLost ? Colors.error : Colors.warning} />
              <Text style={styles.statLabel}>Last Update</Text>
              <Text style={styles.statValue}>{signalLost ? "> 2 min" : "Just now"}</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <Button mode="outlined" onPress={() => {}} style={styles.actionButton} icon={() => <Phone size={18} color={Colors.primary} />}>
              Call
            </Button>
            <Button mode="outlined" onPress={() => router.push(`/chat/${job.id}`)} style={styles.actionButton} icon={() => <MessageSquare size={18} color={Colors.primary} />}>
              Message
            </Button>
          </View>
        </Card.Content>
      </Card>
    </SafeAreaView>
    </ScreenBackground>
  );
}

function getStatusColor(status: string) {
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  centered: { justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  title: { fontSize: 24, fontWeight: "bold", color: Colors.text },
  statusChip: { borderRadius: 6 },
  mapContainer: { flex: 1, marginHorizontal: 20, borderRadius: 16, overflow: "hidden", position: "relative" },
  map: { width: "100%", height: "100%" },
  marker: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  driverMarker: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#fff" },
  recenterButton: { position: "absolute", right: 16, bottom: 16, backgroundColor: Colors.surface, width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  driverCard: { margin: 20, marginTop: 12, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.95)" },
  driverHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  driverInfo: { marginLeft: 12, flex: 1 },
  driverName: { fontSize: 18, fontWeight: "600", color: Colors.text },
  vehicleInfo: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  ratingContainer: { marginTop: 4 },
  ratingChip: { backgroundColor: Colors.warning + "20", alignSelf: "flex-start" },
  ratingText: { color: Colors.warning, fontSize: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  statValue: { fontSize: 16, fontWeight: "600", color: Colors.text, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  actionButtons: { flexDirection: "row", gap: 12, marginTop: 16 },
  actionButton: { flex: 1, borderColor: Colors.primary },
  emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 40 },
  emptyStateTitle: { fontSize: 20, fontWeight: "600", color: Colors.text, marginTop: 16 },
  emptyStateDescription: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginTop: 8, marginBottom: 24 },
  browseButton: { backgroundColor: Colors.primary, borderRadius: 8 },
  waybillCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  waybillIcon: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
  waybillCtaTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  waybillCtaSub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  headerWaybillBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, borderColor: Colors.primary + "40",
    backgroundColor: Colors.primary + "10",
  },
  headerWaybillText: { fontSize: 11, fontWeight: "700", color: Colors.primary },
});
