import React, { useState, useEffect } from "react";
import { StyleSheet, View, TouchableOpacity, Dimensions, Alert } from "react-native";
import { Text, Card, Button, Chip, Avatar, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore, useLocationStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import { MapPin, Phone, MessageSquare, Navigation, Clock, Truck, AlertCircle, ChevronLeft, CheckCircle } from "lucide-react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useLocationTracking, useLocationSubscription } from "@/hooks/useLocationTracking";
import RatingModal from "@/components/RatingModal";

const { width, height } = Dimensions.get("window");

export default function FullTrackingScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const { profile, user } = useStore();
  const { currentLocation } = useLocationStore();
  const { stopTracking } = useLocationTracking();
  const queryClient = useQueryClient();
  const [mapReady, setMapReady] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [lastSignalTime, setLastSignalTime] = useState<Date>(new Date());
  const [signalLost, setSignalLost] = useState(false);

  useLocationSubscription(jobId as string);

  const { data: job, isLoading } = useQuery({
    queryKey: ["tracking-job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data, error } = await supabase
        .from("jobs")
        .select(`*, driver:profiles(id, full_name, phone, rating, avatar_url), cargo_owner:profiles(id, full_name, phone, rating, avatar_url), vehicle:vehicles(type, license_plate)`)
        .eq("id", jobId)
        .single();
      if (error) {
        console.error("Tracking job fetch error:", error);
        return null;
      }
      return data;
    },
    enabled: !!jobId,
    refetchInterval: 30000,
  });

  const { data: locationHistory } = useQuery({
    queryKey: ["location-history", jobId],
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .eq("job_id", jobId)
        .order("recorded_at", { ascending: true })
        .limit(100);
      if (error) {
        console.error("Location history error:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!jobId && job?.status === "in_transit",
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (currentLocation) {
      setLastSignalTime(new Date());
      setSignalLost(false);
    }
    const interval = setInterval(() => {
      const timeSinceLastSignal = new Date().getTime() - lastSignalTime.getTime();
      if (timeSinceLastSignal > 120000) {
        setSignalLost(true);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentLocation, lastSignalTime]);

  const markDeliveredMutation = useMutation({
    mutationFn: async () => {
      await stopTracking(jobId as string);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-job", jobId] });
      setShowRatingModal(true);
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: async () => {
      await supabase.from("jobs").update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      }).eq("id", jobId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracking-job", jobId] });
      router.replace("/(tabs)/jobs");
    },
  });

  const handleCancelJob = () => {
    Alert.alert(
      "Cancel Job",
      "Are you sure you want to cancel this job? Your deposit will be refunded.",
      [
        { text: "No", style: "cancel" },
        { text: "Yes, Cancel", style: "destructive", onPress: () => cancelJobMutation.mutate() },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <AlertCircle size={48} color={Colors.error} />
        <Text style={styles.errorText}>Job not found</Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </SafeAreaView>
    );
  }

  const isDriver = profile?.role === "driver";
  const isJobOwner = job.cargo_owner_id === user?.id;
  const isAssignedDriver = job.driver_id === user?.id;
  const otherParty = isDriver ? job.cargo_owner : job.driver;
  const pickup = job.pickup_location || { lat: -17.8252, lng: 31.0335, address: "Pickup" };
  const dropoff = job.dropoff_location || { lat: -20.1325, lng: 28.6265, address: "Dropoff" };

  const driverLocation = currentLocation || (locationHistory?.length > 0 ? {
    latitude: locationHistory[locationHistory.length - 1].latitude,
    longitude: locationHistory[locationHistory.length - 1].longitude,
  } : null);

  const routeCoordinates = locationHistory?.map((loc: any) => ({
    latitude: loc.latitude,
    longitude: loc.longitude,
  })) || [];

  if (driverLocation && routeCoordinates.length === 0) {
    routeCoordinates.push({
      latitude: driverLocation.latitude,
      longitude: driverLocation.longitude,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: driverLocation?.latitude || (pickup.lat + dropoff.lat) / 2,
            longitude: driverLocation?.longitude || (pickup.lng + dropoff.lng) / 2,
            latitudeDelta: 4,
            longitudeDelta: 4,
          }}
          onMapReady={() => setMapReady(true)}
        >
          <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}>
            <View style={[styles.marker, { backgroundColor: Colors.success }]}>
              <MapPin size={16} color="#fff" />
            </View>
          </Marker>
          
          <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }}>
            <View style={[styles.marker, { backgroundColor: Colors.error }]}>
              <MapPin size={16} color="#fff" />
            </View>
          </Marker>

          {driverLocation && job.status === "in_transit" && (
            <Marker coordinate={{ latitude: driverLocation.latitude, longitude: driverLocation.longitude }}>
              <View style={[styles.driverMarker, { backgroundColor: signalLost ? Colors.error : Colors.primary }]}>
                <Truck size={20} color="#fff" />
              </View>
            </Marker>
          )}

          {routeCoordinates.length > 1 && (
            <Polyline
              coordinates={routeCoordinates}
              strokeColor={Colors.primary}
              strokeWidth={3}
            />
          )}
        </MapView>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.recenterButton}>
          <Navigation size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.driverCard}>
        <Card.Content>
          <View style={styles.statusRow}>
            <Chip style={[styles.statusChip, { backgroundColor: getStatusColor(job.status) + "20" }]} textStyle={{ color: getStatusColor(job.status) }}>
              {job.status.replace("_", " ").toUpperCase()}
            </Chip>
            {signalLost && job.status === "in_transit" && (
              <Chip style={[styles.statusChip, { backgroundColor: Colors.error + "20" }]} textStyle={{ color: Colors.error }}>
                Signal Lost
              </Chip>
            )}
          </View>

          <View style={styles.driverHeader}>
            <Avatar.Text size={48} label={(otherParty?.full_name || "U").charAt(0).toUpperCase()} style={{ backgroundColor: Colors.primary }} />
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{otherParty?.full_name || "Unknown"}</Text>
              <Text style={styles.vehicleInfo}>
                {isDriver ? "Cargo Owner" : (job.vehicle?.type?.replace("_", " ") || "Driver")}
              </Text>
              {otherParty?.rating && (
                <Chip style={styles.ratingChip} textStyle={styles.ratingText}>
                  {otherParty.rating} ★
                </Chip>
              )}
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Clock size={20} color={Colors.primary} />
              <Text style={styles.statLabel}>Last Update</Text>
              <Text style={styles.statValue}>
                {signalLost ? "> 2 min ago" : "Just now"}
              </Text>
            </View>
            {locationHistory && locationHistory.length > 0 && (
              <View style={styles.statItem}>
                <Navigation size={20} color={Colors.secondary} />
                <Text style={styles.statLabel}>Positions</Text>
                <Text style={styles.statValue}>{locationHistory.length}</Text>
              </View>
            )}
          </View>

          <View style={styles.actionButtons}>
            <Button mode="outlined" onPress={() => {}} style={styles.actionButton} icon={() => <Phone size={18} color={Colors.primary} />}>
              Call
            </Button>
            <Button mode="outlined" onPress={() => router.push(`/chat/${jobId}`)} style={styles.actionButton} icon={() => <MessageSquare size={18} color={Colors.primary} />}>
              Message
            </Button>
          </View>

          {isAssignedDriver && job.status === "in_transit" && (
            <Button
              mode="contained"
              onPress={() => markDeliveredMutation.mutate()}
              loading={markDeliveredMutation.isPending}
              disabled={markDeliveredMutation.isPending}
              style={[styles.deliveredButton, { backgroundColor: Colors.success }]}
              icon={() => <CheckCircle size={18} color="#fff" />}
            >
              Mark as Delivered
            </Button>
          )}

          {isJobOwner && job.status !== "delivered" && job.status !== "cancelled" && (
            <Button
              mode="outlined"
              onPress={handleCancelJob}
              loading={cancelJobMutation.isPending}
              disabled={cancelJobMutation.isPending}
              style={[styles.cancelButton]}
              textColor={Colors.error}
            >
              Cancel Job & Request Refund
            </Button>
          )}
        </Card.Content>
      </Card>

      <RatingModal
        visible={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          router.replace("/(tabs)/jobs");
        }}
        jobId={jobId as string}
        revieweeId={isDriver ? job.cargo_owner_id : job.driver_id}
        revieweeName={otherParty?.full_name || (isDriver ? "Cargo Owner" : "Driver")}
        revieweeRole={isDriver ? "cargo_owner" : "driver"}
      />
    </SafeAreaView>
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
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: Colors.error, marginTop: 16, marginBottom: 24 },
  mapContainer: { flex: 1, position: "relative" },
  map: { width: "100%", height: "100%" },
  backButton: { position: "absolute", left: 16, top: 16, backgroundColor: Colors.surface, width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  marker: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#fff" },
  driverMarker: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#fff" },
  recenterButton: { position: "absolute", right: 16, bottom: 16, backgroundColor: Colors.surface, width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  driverCard: { margin: 20, marginTop: 12, borderRadius: 16, backgroundColor: Colors.surface, position: "absolute", bottom: 0, left: 0, right: 0 },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  statusChip: { borderRadius: 6 },
  driverHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  driverInfo: { marginLeft: 12, flex: 1 },
  driverName: { fontSize: 18, fontWeight: "600", color: Colors.text },
  vehicleInfo: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  ratingChip: { backgroundColor: Colors.warning + "20", alignSelf: "flex-start", marginTop: 4 },
  ratingText: { color: Colors.warning, fontSize: 12 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  statItem: { alignItems: "center" },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
  statValue: { fontSize: 16, fontWeight: "600", color: Colors.text, marginTop: 2 },
  actionButtons: { flexDirection: "row", gap: 12 },
  actionButton: { flex: 1, borderColor: Colors.primary },
  deliveredButton: { marginTop: 12, borderRadius: 8 },
  cancelButton: { marginTop: 12, borderColor: Colors.error, borderRadius: 8 },
});
