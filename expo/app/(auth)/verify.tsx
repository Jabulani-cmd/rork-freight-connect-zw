import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, View, TextInput, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Text, Button, Snackbar } from "react-native-paper";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import Logo from "@/components/Logo";
import ScreenBackground from "@/components/ScreenBackground";

export default function VerifyScreen() {
  const { phone, demo, role } = useLocalSearchParams<{ phone: string; demo?: string; role?: string }>();
  const preSelectedRole = role === "driver" || role === "cargo_owner" ? role : null;
  const isDemo = demo === "1" || phone === "+263712345678";
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(TextInput | null)[]>([]);
  const router = useRouter();
  const { setSession, setUser } = useStore();

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);

    if (text.length === 1 && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((digit) => digit.length === 1)) {
      handleVerify(newCode.join(""));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (fullCode: string) => {
    if (fullCode.length !== 6) return;

    setLoading(true);
    setError("");

    try {
      if (isDemo) {
        console.log("[Verify] Demo login flow");
        if (fullCode !== "123456") {
          throw new Error("Demo code is 123456");
        }
        const demoUserId = "demo-user-263712345678";
        const demoSession = {
          access_token: "demo-token",
          refresh_token: "demo-refresh",
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          token_type: "bearer",
          user: {
            id: demoUserId,
            phone: phone.replace("+", ""),
            app_metadata: {},
            user_metadata: {},
            aud: "authenticated",
            created_at: new Date().toISOString(),
          },
        } as any;
        setSession(demoSession);
        setUser(demoSession.user);
        if (preSelectedRole === "driver") {
          router.replace("/onboarding/vehicle");
        } else if (preSelectedRole === "cargo_owner") {
          router.replace("/(tabs)");
        } else {
          router.replace("/onboarding/role");
        }
        return;
      }

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token: fullCode,
        type: "sms",
      });

      if (error) throw error;

      setSession(data.session);
      setUser(data.user);

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user!.id)
        .single();

      if (!profile) {
        await supabase.from("profiles").insert({
          id: data.user!.id,
          phone: phone,
          role: preSelectedRole,
        });
        if (preSelectedRole === "driver") {
          router.replace("/onboarding/vehicle");
        } else if (preSelectedRole === "cargo_owner") {
          router.replace("/(tabs)");
        } else {
          router.replace("/onboarding/role");
        }
      } else if (!profile.role) {
        if (preSelectedRole) {
          await supabase.from("profiles").update({ role: preSelectedRole }).eq("id", data.user!.id);
          if (preSelectedRole === "driver") {
            router.replace("/onboarding/vehicle");
          } else {
            router.replace("/(tabs)");
          }
        } else {
          router.replace("/onboarding/role");
        }
      } else {
        router.replace("/(tabs)");
      }
    } catch (err: any) {
      setError(err.message || "Invalid code. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      if (isDemo) {
        setCountdown(60);
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setCountdown(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setResendLoading(false);
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
          <View style={styles.header}>
            <Logo size={160} style={styles.logo} />
            <Text style={styles.title}>Verify Your Number</Text>
            <Text style={styles.subtitle}>
              Enter the 6-digit code sent to {phone}
            </Text>
            {isDemo && (
              <Text style={styles.demoHint}>Demo number detected — use code 123456</Text>
            )}
          </View>

          <View style={styles.codeContainer}>
            {code.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.codeInput}
                keyboardType="number-pad"
                maxLength={1}
                value={digit}
                onChangeText={(text) => handleCodeChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                editable={!loading}
                selectTextOnFocus
              />
            ))}
          </View>

          <Button
            mode="contained"
            onPress={() => handleVerify(code.join(""))}
            loading={loading}
            disabled={loading || code.some((d) => !d)}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code?</Text>
            {countdown > 0 ? (
              <Text style={styles.countdown}>Resend in {countdown}s</Text>
            ) : (
              <Button
                mode="text"
                onPress={handleResend}
                loading={resendLoading}
                disabled={resendLoading}
                textColor={Colors.primary}
              >
                Resend Code
              </Button>
            )}
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
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 32,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 2,
    borderColor: Colors.border,
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    color: Colors.text,
  },
  button: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginBottom: 24,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  resendContainer: {
    alignItems: "center",
  },
  resendText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 8,
  },
  countdown: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  errorSnackbar: {
    backgroundColor: Colors.error,
  },
  demoHint: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: "700",
    color: "#FFD166",
    textAlign: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 8,
  },
});
