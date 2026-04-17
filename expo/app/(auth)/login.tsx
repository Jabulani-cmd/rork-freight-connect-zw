import React, { useState } from "react";
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text, Snackbar } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { Colors } from "@/constants/colors";
import { Package, Truck, ArrowLeft } from "lucide-react-native";
import Logo from "@/components/Logo";
import ScreenBackground from "@/components/ScreenBackground";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role?: string }>();
  const isDriver = role === "driver";
  const roleLabel = isDriver ? "Driver" : role === "cargo_owner" ? "Cargo Owner" : null;

  const formatPhoneNumber = (input: string) => {
    let cleaned = input.replace(/\D/g, "");
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  };

  const handleSendOTP = async () => {
    if (phone.length < 9) {
      setError("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formattedPhone = `+263${formatPhoneNumber(phone)}`;
      const isDemoNumber = formattedPhone === "+263712345678";

      console.log("[Login] Sending OTP to", formattedPhone, "demo:", isDemoNumber);

      if (!isDemoNumber) {
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        if (error) throw error;
      }

      router.push({
        pathname: "/(auth)/verify",
        params: { phone: formattedPhone, demo: isDemoNumber ? "1" : "0", role: role ?? "" },
      });
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            testID="back-to-role"
          >
            <ArrowLeft size={18} color="#FFFFFF" />
            <Text style={styles.backText}>Change role</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Logo size={120} style={styles.logoImage} />
            <Text style={styles.tagline}>Connect. Transport. Deliver.</Text>
          </View>

          {roleLabel && (
            <View style={styles.rolePill}>
              {isDriver ? (
                <Truck size={16} color={Colors.primary} />
              ) : (
                <Package size={16} color={Colors.primary} />
              )}
              <Text style={styles.rolePillText}>Logging in as {roleLabel}</Text>
            </View>
          )}

          <View style={styles.formContainer}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Enter your phone number to get started
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.countryCode}>+263</Text>
              <TextInput
                style={styles.input}
                placeholder="77 123 4567"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                maxLength={12}
                editable={!loading}
                testID="phone-input"
              />
            </View>

            <TouchableOpacity
              onPress={handleSendOTP}
              disabled={loading || phone.length < 9}
              activeOpacity={0.85}
              testID="send-otp-button"
              style={styles.buttonWrapper}
            >
              <LinearGradient
                colors={
                  loading || phone.length < 9
                    ? ["#9CA3AF", "#6B7280"]
                    : ["#1E3A5F", "#2E8B57"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.hint}>
              We'll send you a verification code via SMS
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoImage: {
    marginBottom: 16,
  },
  tagline: {
    fontSize: 14,
    color: "#FFFFFF",
    marginTop: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
  },
  buttonWrapper: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
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
    marginTop: 16,
  },
  errorSnackbar: {
    backgroundColor: Colors.error,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    marginBottom: 12,
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  rolePillText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
});
