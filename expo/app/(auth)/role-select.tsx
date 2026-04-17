import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "react-native-paper";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/colors";
import { Package, Truck, ChevronRight, ArrowRight } from "lucide-react-native";
import Logo from "@/components/Logo";
import ScreenBackground from "@/components/ScreenBackground";

type UserRole = "cargo_owner" | "driver";

export default function AuthLandingScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const router = useRouter();

  const handleContinue = () => {
    if (!selectedRole) return;
    console.log("[AuthLanding] Continue with role:", selectedRole);
    router.push({
      pathname: "/(auth)/login",
      params: { role: selectedRole },
    });
  };

  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <View style={styles.container}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Logo size={140} />
            <Text style={styles.brand}>Freight Connect ZW</Text>
            <Text style={styles.tagline}>Connect. Transport. Deliver.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Choose Your Role</Text>
            <Text style={styles.subtitle}>
              Select how you'd like to use the app to continue
            </Text>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedRole === "cargo_owner" && styles.selectedCard,
              ]}
              onPress={() => setSelectedRole("cargo_owner")}
              activeOpacity={0.85}
              testID="role-cargo-owner"
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.secondary + "20" }]}>
                <Package size={28} color={Colors.secondary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Cargo Owner</Text>
                <Text style={styles.optionDescription}>
                  Post jobs and find drivers
                </Text>
              </View>
              <ChevronRight
                size={20}
                color={selectedRole === "cargo_owner" ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                selectedRole === "driver" && styles.selectedCard,
              ]}
              onPress={() => setSelectedRole("driver")}
              activeOpacity={0.85}
              testID="role-driver"
            >
              <View style={[styles.iconContainer, { backgroundColor: Colors.accent + "20" }]}>
                <Truck size={28} color={Colors.accent} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionTitle}>Driver</Text>
                <Text style={styles.optionDescription}>
                  Find jobs and earn money
                </Text>
              </View>
              <ChevronRight
                size={20}
                color={selectedRole === "driver" ? Colors.primary : Colors.textMuted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleContinue}
              disabled={!selectedRole}
              activeOpacity={0.85}
              style={styles.buttonWrapper}
              testID="continue-to-login"
            >
              <LinearGradient
                colors={!selectedRole ? ["#9CA3AF", "#6B7280"] : ["#1E3A5F", "#2E8B57"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Continue to Login</Text>
                <ArrowRight size={18} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>
              You can switch roles anytime from your profile
            </Text>
          </View>
        </ScrollView>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  brand: {
    marginTop: 12,
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  tagline: {
    marginTop: 6,
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "0D",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  buttonWrapper: {
    marginTop: 16,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  button: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 14,
  },
});
