import React, { useState, useMemo } from "react";
import { 
  StyleSheet, 
  View, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  ScrollView
} from "react-native";
import { Text, Card, Chip, Button, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "@/lib/store";
import { Colors, VehicleColors } from "@/constants/colors";
import { 
  MapPin, 
  Package, 
  DollarSign, 
  Clock, 
  ChevronRight,
  Filter,
  Truck,
  Plus,
  Weight
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import MapView, { Marker } from "react-native-maps";
import ScreenBackground from "@/components/ScreenBackground";

const { width } = Dimensions.get("window");

const jobStatuses = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "Active", value: "active" },
  { label: "Completed", value: "completed" },
];

const weightRanges = [
  { label: "All", min: 0, max: Infinity },
  { label: "0-100kg", min: 0, max: 100 },
  { label: "100-500kg", min: 100, max: 500 },
  { label: "500-1000kg", min: 500, max: 1000 },
  { label: "1-5 tons", min: 1000, max: 5000 },
  { label: "5+ tons", min: 5000, max: Infinity },
];

const mockJobs = [
  {
    id: "1",
    pickup: { address: "Harare CBD, Zimbabwe", latitude: -17.8252, longitude: 31.0335 },
    dropoff: { address: "Bulawayo CBD, Zimbabwe", latitude: -20.1325, longitude: 28.6265 },
    weight_kg: 500,
    goods_type: "Electronics",
    preferred_vehicle_type: "van",
    status: "open",
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    pickup: { address: "Mutare, Zimbabwe", latitude: -18.9758, longitude: 32.6503 },
    dropoff: { address: "Gweru, Zimbabwe", latitude: -19.4500, longitude: 29.8000 },
    weight_kg: 2000,
    goods_type: "Furniture",
    preferred_vehicle_type: "small_truck",
    status: "open",
    created_at: new Date().toISOString(),
  },
  {
    id: "3",
    pickup: { address: "Victoria Falls", latitude: -17.9239, longitude: 25.8560 },
    dropoff: { address: "Harare CBD", latitude: -17.8252, longitude: 31.0335 },
    weight_kg: 50,
    goods_type: "Documents",
    preferred_vehicle_type: "motorcycle",
    status: "open",
    created_at: new Date().toISOString(),
  },
];

export default function JobsScreen() {
  const router = useRouter();
  const { profile, vehicle } = useStore();
  const isDriver = profile?.role === "driver";
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [statusFilter, setStatusFilter] = useState("all");
  const [weightFilter, setWeightFilter] = useState(weightRanges[0]);
  const [showFilters, setShowFilters] = useState(false);

  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ["jobs", profile?.id, statusFilter, weightFilter, isDriver],
    queryFn: async () => {
      if (!profile?.id) return [];

      let query = supabase.from("jobs").select("*");

      if (isDriver) {
        query = query.eq("status", "open");
        
        if (vehicle?.weightCapacityKg) {
          query = query.lte("weight_kg", vehicle.weightCapacityKg);
        }

        if (weightFilter.min > 0) {
          query = query.gte("weight_kg", weightFilter.min);
        }
        if (weightFilter.max !== Infinity) {
          query = query.lte("weight_kg", weightFilter.max);
        }
      } else {
        query = query.eq("cargo_owner_id", profile.id);
        if (statusFilter !== "all") {
          if (statusFilter === "active") {
            query = query.in("status", ["quoted", "accepted", "dispatched", "in_transit"]);
          } else if (statusFilter === "completed") {
            query = query.eq("status", "delivered");
          } else {
            query = query.eq("status", statusFilter);
          }
        }
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      
      if (error) {
        console.error("Jobs query error:", error);
        return mockJobs;
      }
      
      return data?.length ? data : mockJobs;
    },
    enabled: !!profile?.id,
  });

  const filteredJobs = useMemo(() => {
    if (!jobs) return [];
    
    if (isDriver && vehicle?.weightCapacityKg) {
      return jobs.filter((job: any) => job.weight_kg <= vehicle.weightCapacityKg);
    }
    
    return jobs;
  }, [jobs, isDriver, vehicle?.weightCapacityKg]);

  const getStatusColor = (status: string) => {
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
  };

  const getVehicleColor = (type: string) => {
    return VehicleColors[type as keyof typeof VehicleColors] || Colors.textMuted;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const jobDate = new Date(date);
    const diffHours = Math.floor((now.getTime() - jobDate.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  const renderJobCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => router.push(`/job/${item.id}`)}
      activeOpacity={0.8}
    >
      <Card style={styles.jobCard}>
        <Card.Content>
          <View style={styles.jobHeader}>
            <Chip 
              style={[styles.statusChip, { backgroundColor: getStatusColor(item.status) + "20" }]}
              textStyle={{ color: getStatusColor(item.status), fontSize: 12 }}
            >
              {item.status.replace("_", " ").toUpperCase()}
            </Chip>
            <Text style={styles.timeAgo}>{getTimeAgo(item.created_at)}</Text>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: Colors.success }]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.pickup?.address || "Pickup location"}
              </Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routePoint}>
              <View style={[styles.dot, { backgroundColor: Colors.error }]} />
              <Text style={styles.routeText} numberOfLines={1}>
                {item.dropoff?.address || "Dropoff location"}
              </Text>
            </View>
          </View>

          <View style={styles.jobDetails}>
            <View style={styles.detailItem}>
              <Weight size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{item.weight_kg} kg</Text>
            </View>
            <View style={styles.detailItem}>
              <Package size={16} color={Colors.textSecondary} />
              <Text style={styles.detailText}>{item.goods_type}</Text>
            </View>
            {item.preferred_vehicle_type && (
              <View style={styles.detailItem}>
                <Truck size={16} color={getVehicleColor(item.preferred_vehicle_type)} />
                <Text style={[styles.detailText, { color: getVehicleColor(item.preferred_vehicle_type) }]}>
                  {item.preferred_vehicle_type.replace("_", " ")}
                </Text>
              </View>
            )}
            <ChevronRight size={20} color={Colors.textMuted} />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <ScreenBackground variant="soft">
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground variant="soft">
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isDriver ? "Available Jobs" : "My Shipments"}</Text>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "list" && styles.activeToggle]}
            onPress={() => setViewMode("list")}
          >
            <Text style={[styles.toggleText, viewMode === "list" && styles.activeToggleText]}>
              List
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, viewMode === "map" && styles.activeToggle]}
            onPress={() => setViewMode("map")}
          >
            <Text style={[styles.toggleText, viewMode === "map" && styles.activeToggleText]}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {isDriver && vehicle && (
        <View style={styles.capacityBanner}>
          <Truck size={20} color={Colors.primary} />
          <Text style={styles.capacityText}>
            Your capacity: <Text style={styles.capacityValue}>{vehicle.weightCapacityKg} kg</Text>
          </Text>
          <Text style={styles.filteredCount}>
            {filteredJobs.length} suitable jobs
          </Text>
        </View>
      )}

      {isDriver && (
        <View style={styles.filterSection}>
          <TouchableOpacity 
            style={styles.filterToggle}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} color={Colors.primary} />
            <Text style={styles.filterToggleText}>Filter by Weight</Text>
            <Text style={styles.currentFilter}>{weightFilter.label}</Text>
          </TouchableOpacity>
          
          {showFilters && (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weightFilters}
            >
              {weightRanges.map((range) => (
                <TouchableOpacity
                  key={range.label}
                  style={[
                    styles.weightFilterChip,
                    weightFilter.label === range.label && styles.activeWeightFilter
                  ]}
                  onPress={() => {
                    setWeightFilter(range);
                    setShowFilters(false);
                  }}
                >
                  <Text style={[
                    styles.weightFilterText,
                    weightFilter.label === range.label && styles.activeWeightFilterText
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {!isDriver && (
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {jobStatuses.map((status) => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.filterChip,
                  statusFilter === status.value && styles.activeFilterChip,
                ]}
                onPress={() => setStatusFilter(status.value)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === status.value && styles.activeFilterChipText,
                  ]}
                >
                  {status.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {viewMode === "list" ? (
        <FlatList
          data={filteredJobs}
          renderItem={renderJobCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Package size={64} color={Colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No jobs found</Text>
              <Text style={styles.emptyStateDescription}>
                {isDriver 
                  ? "No jobs match your vehicle capacity. Check back later for new opportunities." 
                  : "Post your first job to get started"}
              </Text>
              {!isDriver && (
                <Button 
                  mode="contained" 
                  onPress={() => router.push("/job/post")}
                  style={styles.postJobButton}
                >
                  Post a Job
                </Button>
              )}
            </View>
          }
        />
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: -19,
            longitude: 30,
            latitudeDelta: 8,
            longitudeDelta: 8,
          }}
        >
          {filteredJobs?.map((job: any) => (
            job.pickup && (
              <Marker
                key={job.id}
                coordinate={{
                  latitude: job.pickup.latitude,
                  longitude: job.pickup.longitude,
                }}
                title={job.goods_type}
                description={`${job.weight_kg} kg`}
                onPress={() => router.push(`/job/${job.id}`)}
              >
                <View style={[styles.mapMarker, { backgroundColor: getVehicleColor(job.preferred_vehicle_type) }]}>
                  <Package size={16} color="#fff" />
                </View>
              </Marker>
            )
          ))}
        </MapView>
      )}

      {!isDriver && (
        <View style={styles.fabContainer}>
          <Button
            mode="contained"
            onPress={() => router.push("/job/post")}
            style={styles.fab}
            icon={() => <Plus size={20} color="#fff" />}
          >
            Post Job
          </Button>
        </View>
      )}
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeToggle: {
    backgroundColor: Colors.primary,
  },
  toggleText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeToggleText: {
    color: "#fff",
    fontWeight: "600",
  },
  capacityBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "10",
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  capacityText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  capacityValue: {
    fontWeight: "600",
    color: Colors.primary,
  },
  filteredCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterSection: {
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  filterToggleText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  currentFilter: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
  },
  weightFilters: {
    paddingTop: 12,
    gap: 8,
  },
  weightFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeWeightFilter: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  weightFilterText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeWeightFilterText: {
    color: "#fff",
    fontWeight: "500",
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterChip: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  activeFilterChipText: {
    color: "#fff",
    fontWeight: "500",
  },
  listContent: {
    padding: 20,
    paddingTop: 8,
    gap: 12,
  },
  jobCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    marginBottom: 12,
  },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusChip: {
    borderRadius: 6,
  },
  timeAgo: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  routeContainer: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border,
    marginLeft: 4,
  },
  routeText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  jobDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  map: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: "hidden",
  },
  mapMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 16,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 24,
    textAlign: "center",
    paddingHorizontal: 40,
  },
  postJobButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },
  fab: {
    borderRadius: 12,
    paddingVertical: 8,
  },
});
