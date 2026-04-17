import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Text, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import { Package, Truck, ChevronRight } from "lucide-react-native";
import Logo from "@/components/Logo";
import ScreenBackground from "@/components/ScreenBackground";

type UserRole = "cargo_owner" | "driver";

export default function RoleSelectionScreen() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, setProfile } = useStore();

  const handleContinue = async () => {
    if (!selectedRole || !user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({ role: selectedRole })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile({
        id: data.id,
        phone: data.phone,
        role: data.role,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        rating: data.rating,
        reviewCount: data.review_count,
      });

      if (selectedRole === "driver") {
        router.replace("/onboarding/vehicle");
      } else {
        router.replace("/(tabs)");
      }
    } catch (error) {
      console.error("Role update error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="soft">
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Logo size={200} style={styles.logo} />
        <Text style={styles.title}>How will you use Freight Connect?</Text>
        <Text style={styles.subtitle}>Select your role to continue</Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedRole === "cargo_owner" && styles.selectedCard,
            ]}
            onPress={() => setSelectedRole("cargo_owner")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: Colors.secondary + "20" },
              ]}
            >
              <Package size={32} color={Colors.secondary} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>I need to send cargo</Text>
              <Text style={styles.optionDescription}>
                Post jobs and find drivers to transport your goods
              </Text>
            </View>
            <ChevronRight
              size={20}
              color={
                selectedRole === "cargo_owner"
                  ? Colors.primary
                  : Colors.textMuted
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedRole === "driver" && styles.selectedCard,
            ]}
            onPress={() => setSelectedRole("driver")}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: Colors.accent + "20" },
              ]}
            >
              <Truck size={32} color={Colors.accent} />
            </View>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>I own a vehicle</Text>
              <Text style={styles.optionDescription}>
                Find jobs and earn money by transporting cargo
              </Text>
            </View>
            <ChevronRight
              size={20}
              color={
                selectedRole === "driver"
                  ? Colors.primary
                  : Colors.textMuted
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          buttonColor={Colors.primary}
          textColor="#FFFFFF"
          mode="contained"
          onPress={handleContinue}
          loading={loading}
          disabled={!selectedRole || loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Continue
        </Button>
      </View>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  logo: {
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 48,
  },
  optionsContainer: {
    gap: 16,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTextContainer: {
    flex: 1,
    marginLeft: 16,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  footer: {
    padding: 24,
    paddingTop: 0,
  },
  button: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
