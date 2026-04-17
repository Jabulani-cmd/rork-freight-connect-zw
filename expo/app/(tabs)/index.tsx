import React from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { Text, Card, Button, Avatar, Badge } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import { 
  Plus, 
  Package, 
  Truck, 
  Clock, 
  MapPin, 
  Star, 
  ChevronRight,
  TrendingUp,
  Wallet,
  Hash,
  Search
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import ScreenBackground from "@/components/ScreenBackground";

export default function HomeScreen() {
  const router = useRouter();
  const { profile } = useStore();
  const isDriver = profile?.role === "driver";

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ["dashboard-stats", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      if (isDriver) {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("*", { count: "exact" })
          .eq("driver_id", profile.id)
          .in("status", ["dispatched", "in_transit", "delivered"]);
        
        const { data: activeJobs } = await supabase
          .from("jobs")
          .select("*", { count: "exact" })
          .eq("driver_id", profile.id)
          .in("status", ["dispatched", "in_transit"]);

        return {
          totalJobs: jobs?.length || 0,
          activeJobs: activeJobs?.length || 0,
          rating: profile.rating,
        };
      } else {
        const { data: jobs } = await supabase
          .from("jobs")
          .select("*", { count: "exact" })
          .eq("cargo_owner_id", profile.id);

        const { data: activeJobs } = await supabase
          .from("jobs")
          .select("*", { count: "exact" })
          .eq("cargo_owner_id", profile.id)
          .in("status", ["open", "quoted", "accepted", "dispatched", "in_transit"]);

        return {
          totalJobs: jobs?.length || 0,
          activeJobs: activeJobs?.length || 0,
          rating: profile.rating,
        };
      }
    },
    enabled: !!profile?.id,
  });

  const quickActions = isDriver ? [
    { icon: Truck, label: "Find Jobs", color: Colors.primary, onPress: () => router.push("/(tabs)/jobs") },
    { icon: Clock, label: "Active", color: Colors.accent, onPress: () => router.push("/(tabs)/jobs") },
    { icon: Wallet, label: "Earnings", color: Colors.secondary, onPress: () => router.push("/(tabs)/earnings") },
  ] : [
    { icon: Plus, label: "Post Job", color: Colors.primary, onPress: () => router.push("/job/post") },
    { icon: Package, label: "My Jobs", color: Colors.accent, onPress: () => router.push("/(tabs)/jobs") },
    { icon: MapPin, label: "Tracking", color: Colors.secondary, onPress: () => router.push("/(tabs)/tracking") },
  ];

  return (
    <ScreenBackground variant="soft">
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        <View style={styles.brandBar}>
          <Logo size={40} />
          <Text style={styles.brandText}>Freight Connect ZW</Text>
        </View>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.fullName || profile?.phone || "User"}</Text>
            <Text style={styles.subGreeting}>
              {isDriver ? "Ready to deliver today?" : "Ready to ship something?"}
            </Text>
          </View>
          <Avatar.Text 
            size={48} 
            label={(profile?.fullName || profile?.phone || "U").charAt(0).toUpperCase()}
            style={{ backgroundColor: Colors.primary }}
          />
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statValue}>{stats?.totalJobs || 0}</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statValue}>{stats?.activeJobs || 0}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </Card.Content>
          </Card>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || "5.0"}</Text>
              <View style={styles.ratingContainer}>
                <Star size={12} color={Colors.warning} fill={Colors.warning} />
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </Card.Content>
          </Card>
        </View>

        <TouchableOpacity
          style={styles.waybillBanner}
          onPress={() => router.push("/tracking/waybill")}
          testID="home-waybill-cta"
        >
          <View style={styles.waybillBannerIcon}>
            <Hash size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.waybillBannerTitle}>Track a parcel</Text>
            <Text style={styles.waybillBannerSub}>Enter a waybill number to see live status</Text>
          </View>
          <Search size={18} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.actionButton}
                onPress={action.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + "15" }]}>
                  <Icon size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {!isDriver && (
          <Card style={styles.promoCard}>
            <Card.Content style={styles.promoContent}>
              <View style={styles.promoTextContainer}>
                <Text style={styles.promoTitle}>Post Your First Job</Text>
                <Text style={styles.promoDescription}>
                  Get competitive quotes from verified drivers in minutes
                </Text>
                <Button 
                  mode="contained" 
                  onPress={() => router.push("/job/post")}
                  style={styles.promoButton}
                  textColor="#fff"
                >
                  Get Started
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card style={styles.activityCard}>
          <Card.Content style={styles.emptyState}>
            <TrendingUp size={48} color={Colors.textMuted} />
            <Text style={styles.emptyStateTitle}>No recent activity</Text>
            <Text style={styles.emptyStateDescription}>
              {isDriver 
                ? "Browse available jobs to get started" 
                : "Post a job to start shipping"}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  brandBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  brandText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  subGreeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: "center",
    paddingVertical: 16,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  quickActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  actionButton: {
    alignItems: "center",
    flex: 1,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: "500",
  },
  promoCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    marginBottom: 24,
  },
  promoContent: {
    padding: 8,
  },
  promoTextContainer: {
    alignItems: "flex-start",
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 8,
  },
  promoDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 16,
  },
  promoButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
  },
  activityCard: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 16,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    textAlign: "center",
  },
  waybillBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  waybillBannerIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  waybillBannerTitle: { fontSize: 15, fontWeight: "700", color: "#fff" },
  waybillBannerSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 },
});
