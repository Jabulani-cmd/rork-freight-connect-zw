import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import { Text, Card, Button, Avatar, Switch, Divider, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore, UserRole } from "@/lib/store";
import { Colors } from "@/constants/colors";
import { 
  User, 
  Settings, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut,
  ChevronRight,
  Star,
  Truck,
  Package,
  RefreshCw,
  Users
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import Logo from "@/components/Logo";
import ScreenBackground from "@/components/ScreenBackground";
import { useQuery } from "@tanstack/react-query";

const menuItems = [
  { icon: User, label: "Edit Profile", route: "/profile/edit" },
  { icon: Bell, label: "Notifications", route: "/profile/notifications" },
  { icon: Shield, label: "Privacy & Security", route: "/profile/security" },
  { icon: HelpCircle, label: "Help & Support", route: "/profile/support" },
  { icon: Settings, label: "Settings", route: "/profile/settings" },
];

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, vehicle, clearAuth, setProfile } = useStore();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationSharing, setLocationSharing] = useState(true);
  const [error, setError] = useState("");
  const [switching, setSwitching] = useState(false);

  const { data: reviews } = useQuery({
    queryKey: ["reviews", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error: reviewError } = await supabase
        .from("reviews")
        .select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, avatar_url)")
        .eq("reviewee_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (reviewError) {
        console.log("Reviews fetch error:", reviewError);
        return [];
      }
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const handleSwitchRole = async () => {
    if (!profile) return;
    const newRole: UserRole = profile.role === "driver" ? "cargo_owner" : "driver";
    setSwitching(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (updateError) {
        console.log("Role update error (using local only):", updateError);
      }
      setProfile({ ...profile, role: newRole });
      console.log("Switched role to:", newRole);
    } catch (err: any) {
      console.log("Switch role error:", err);
      setProfile({ ...profile, role: newRole });
    } finally {
      setSwitching(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearAuth();
      router.replace("/(auth)/login");
    } catch (err: any) {
      setError(err.message || "Failed to logout");
    }
  };

  const isDriver = profile?.role === "driver";
  const subscriptionPlan = isDriver ? "Standard" : "Free";

  return (
    <ScreenBackground variant="soft">
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text 
              size={80} 
              label={(profile?.fullName || profile?.phone || "U").charAt(0).toUpperCase()}
              style={{ backgroundColor: Colors.primary }}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.fullName || "User"}</Text>
              <Text style={styles.profilePhone}>{profile?.phone || profile?.id?.slice(0, 12)}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>
                  {isDriver ? "🚛 Driver" : "📦 Cargo Owner"}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.statsCard}>
          <Card.Content style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || "5.0"}</Text>
              <View style={styles.statLabelContainer}>
                <Star size={12} color={Colors.warning} fill={Colors.warning} />
                <Text style={styles.statLabel}>Rating</Text>
              </View>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{profile?.reviewCount || 0}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <Divider style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{isDriver ? "12" : "8"}</Text>
              <Text style={styles.statLabel}>{isDriver ? "Jobs" : "Shipments"}</Text>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.roleCard}>
          <Card.Content>
            <View style={styles.roleHeader}>
              <RefreshCw size={20} color={Colors.primary} />
              <Text style={styles.roleCardTitle}>Switch Role</Text>
            </View>
            <Text style={styles.roleCardSubtitle}>
              You are currently a {isDriver ? "Driver" : "Cargo Owner"}. Switch to explore the other side.
            </Text>
            <View style={styles.roleOptions}>
              <TouchableOpacity
                style={[styles.roleOption, !isDriver && styles.roleOptionActive]}
                onPress={() => !isDriver ? null : handleSwitchRole()}
                testID="role-cargo-owner"
              >
                <Package size={22} color={!isDriver ? "#fff" : Colors.textSecondary} />
                <Text style={[styles.roleOptionText, !isDriver && styles.roleOptionTextActive]}>
                  Cargo Owner
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleOption, isDriver && styles.roleOptionActive]}
                onPress={() => isDriver ? null : handleSwitchRole()}
                testID="role-driver"
              >
                <Truck size={22} color={isDriver ? "#fff" : Colors.textSecondary} />
                <Text style={[styles.roleOptionText, isDriver && styles.roleOptionTextActive]}>
                  Driver
                </Text>
              </TouchableOpacity>
            </View>
            {switching && (
              <Text style={styles.switchingText}>Switching...</Text>
            )}
          </Card.Content>
        </Card>

        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/agent")} testID="open-agent">
          <Card style={styles.agentCard}>
            <Card.Content style={styles.agentContent}>
              <View style={styles.agentIcon}>
                <Users size={22} color="#fff" />
              </View>
              <View style={styles.agentTextWrap}>
                <Text style={styles.agentTitle}>Become an Agent</Text>
                <Text style={styles.agentSub}>Earn 15–20% commission on every referral</Text>
              </View>
              <ChevronRight size={20} color={Colors.textMuted} />
            </Card.Content>
          </Card>
        </TouchableOpacity>

        <Card style={styles.subscriptionCard}>
          <Card.Content>
            <View style={styles.subscriptionRow}>
              <View style={styles.subscriptionLeft}>
                <Text style={styles.subscriptionLabel}>Subscription Plan</Text>
                <Text style={styles.subscriptionValue}>{subscriptionPlan}</Text>
              </View>
              <Button mode="outlined" onPress={() => {}} compact textColor={Colors.primary}>
                Upgrade
              </Button>
            </View>
          </Card.Content>
        </Card>

        {reviews && reviews.length > 0 && (
          <Card style={styles.reviewsCard}>
            <Card.Content>
              <Text style={styles.reviewsTitle}>Recent Reviews</Text>
              {reviews.map((review: any) => (
                <View key={review.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Avatar.Text
                      size={32}
                      label={(review.reviewer?.full_name || "U").charAt(0).toUpperCase()}
                      style={{ backgroundColor: Colors.primary }}
                    />
                    <View style={styles.reviewInfo}>
                      <Text style={styles.reviewerName}>
                        {review.reviewer?.full_name || "Anonymous"}
                      </Text>
                      <View style={styles.reviewStars}>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star
                            key={n}
                            size={12}
                            color={Colors.warning}
                            fill={n <= review.rating ? Colors.warning : "transparent"}
                          />
                        ))}
                      </View>
                    </View>
                  </View>
                  {review.comment && (
                    <Text style={styles.reviewComment}>{review.comment}</Text>
                  )}
                </View>
              ))}
            </Card.Content>
          </Card>
        )}

        {isDriver && vehicle && (
          <Card style={styles.vehicleCard}>
            <Card.Content>
              <View style={styles.vehicleHeader}>
                <Truck size={24} color={Colors.primary} />
                <Text style={styles.vehicleTitle}>Vehicle Details</Text>
              </View>
              <View style={styles.vehicleDetails}>
                <View style={styles.vehicleDetail}>
                  <Text style={styles.vehicleDetailLabel}>Type</Text>
                  <Text style={styles.vehicleDetailValue}>
                    {vehicle.type.replace("_", " ").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.vehicleDetail}>
                  <Text style={styles.vehicleDetailLabel}>License Plate</Text>
                  <Text style={styles.vehicleDetailValue}>{vehicle.licensePlate}</Text>
                </View>
                <View style={styles.vehicleDetail}>
                  <Text style={styles.vehicleDetailLabel}>Capacity</Text>
                  <Text style={styles.vehicleDetailValue}>{vehicle.weightCapacityKg} kg</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.preferencesCard}>
          <Card.Content>
            <Text style={styles.preferencesTitle}>Preferences</Text>
            
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <Bell size={20} color={Colors.primary} />
                <Text style={styles.preferenceLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={pushNotifications}
                onValueChange={setPushNotifications}
                color={Colors.primary}
              />
            </View>

            <Divider style={styles.preferenceDivider} />

            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <Shield size={20} color={Colors.primary} />
                <Text style={styles.preferenceLabel}>Location Sharing</Text>
              </View>
              <Switch
                value={locationSharing}
                onValueChange={setLocationSharing}
                color={Colors.primary}
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.menuCard}>
          <Card.Content style={styles.menuContent}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity 
                  key={item.label}
                  style={styles.menuItem}
                  onPress={() => router.push(item.route as never)}
                >
                  <View style={styles.menuItemLeft}>
                    <Icon size={20} color={Colors.textSecondary} />
                    <Text style={styles.menuItemLabel}>{item.label}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              );
            })}
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={Colors.error}
          icon={() => <LogOut size={20} color={Colors.error} />}
        >
          Log Out
        </Button>

        <View style={styles.footerBrand}>
          <Logo size={48} />
          <Text style={styles.version}>Freight Connect ZW v1.0.0</Text>
        </View>
      </ScrollView>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={3000}
        style={styles.errorSnackbar}
      >
        {error}
      </Snackbar>
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  profileCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    marginBottom: 16,
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  profilePhone: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "500",
  },
  statsCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    marginBottom: 16,
  },
  statsContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary,
  },
  statLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: "60%",
    alignSelf: "center",
  },
  vehicleCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    marginBottom: 16,
  },
  vehicleHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  vehicleDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  vehicleDetail: {
    alignItems: "center",
  },
  vehicleDetailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  vehicleDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  preferencesCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    marginBottom: 16,
  },
  preferencesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  preferenceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  preferenceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  preferenceLabel: {
    fontSize: 15,
    color: Colors.text,
  },
  preferenceDivider: {
    marginVertical: 12,
  },
  menuCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    marginBottom: 16,
  },
  menuContent: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuItemLabel: {
    fontSize: 15,
    color: Colors.text,
  },
  logoutButton: {
    borderColor: Colors.error,
    borderRadius: 12,
    marginBottom: 16,
  },
  footerBrand: {
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  version: {
    textAlign: "center",
    fontSize: 12,
    color: Colors.textMuted,
  },
  errorSnackbar: {
    backgroundColor: Colors.error,
  },
  roleCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    marginBottom: 16,
  },
  roleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  roleCardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  roleOptions: {
    flexDirection: "row",
    gap: 10,
  },
  roleOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  roleOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  roleOptionTextActive: {
    color: "#fff",
  },
  switchingText: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subscriptionCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    marginBottom: 16,
  },
  subscriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subscriptionLeft: {
    flex: 1,
  },
  subscriptionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  subscriptionValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 2,
  },
  reviewsCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    marginBottom: 16,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  reviewItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 8,
    marginLeft: 42,
  },
  agentCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    marginBottom: 16,
  },
  agentContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  agentIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  agentTextWrap: { flex: 1 },
  agentTitle: { color: "#fff", fontSize: 15, fontWeight: "700" },
  agentSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
});
