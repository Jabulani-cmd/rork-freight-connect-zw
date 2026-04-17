import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { CheckCircle, Package, Bell, Hash, Copy, Share2 } from "lucide-react-native";
import { TouchableOpacity, Share, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";

export default function JobSuccessScreen() {
  const router = useRouter();
  const { jobId, waybill } = useLocalSearchParams<{ jobId: string; waybill?: string }>();

  const copyWaybill = async () => {
    if (!waybill) return;
    try {
      await Clipboard.setStringAsync(String(waybill));
    } catch (e) {
      console.log(e);
    }
  };

  const shareWaybill = async () => {
    if (!waybill) return;
    try {
      await Share.share({
        message: `Track your Freight Connect ZW shipment with waybill: ${waybill}`,
      });
    } catch (e) {
      console.log(e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle size={80} color={Colors.success} />
        </View>

        <Text style={styles.title}>Job Posted Successfully!</Text>
        <Text style={styles.subtitle}>
          Your job has been posted and is now visible to drivers. You'll receive notifications when drivers send quotes.
        </Text>

        {waybill ? (
          <View style={styles.waybillCard}>
            <View style={styles.waybillHeader}>
              <Hash size={18} color={Colors.primary} />
              <Text style={styles.waybillLabel}>Your waybill number</Text>
            </View>
            <Text style={styles.waybillNumber}>{String(waybill)}</Text>
            <View style={styles.waybillActions}>
              <TouchableOpacity style={styles.wayBtn} onPress={copyWaybill}>
                <Copy size={14} color={Colors.primary} />
                <Text style={styles.wayBtnText}>Copy</Text>
              </TouchableOpacity>
              {Platform.OS !== "web" && (
                <TouchableOpacity style={styles.wayBtn} onPress={shareWaybill}>
                  <Share2 size={14} color={Colors.primary} />
                  <Text style={styles.wayBtnText}>Share</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.waybillHint}>
              Share this number with the receiver so they can track the parcel anytime.
            </Text>
          </View>
        ) : null}

        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Bell size={24} color={Colors.primary} />
            <Text style={styles.infoText}>
              You'll be notified when drivers quote on your job
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Package size={24} color={Colors.secondary} />
            <Text style={styles.infoText}>
              Review quotes and negotiate prices in the chat
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={() => router.push(`/job/${jobId}`)}
          style={styles.primaryButton}
          contentStyle={styles.buttonContent}
        >
          View Job Details
        </Button>
        <Button
          mode="outlined"
          onPress={() => router.push("/(tabs)/jobs")}
          style={styles.secondaryButton}
          textColor={Colors.primary}
        >
          Go to My Jobs
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.success + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  infoContainer: {
    width: "100%",
    gap: 20,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  secondaryButton: {
    borderRadius: 12,
    borderColor: Colors.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  waybillCard: {
    width: "100%",
    backgroundColor: Colors.primary + "10",
    borderRadius: 14,
    padding: 18,
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  waybillHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  waybillLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  waybillNumber: { fontSize: 22, fontWeight: "800", color: Colors.primary, letterSpacing: 1, marginBottom: 12 },
  waybillActions: { flexDirection: "row", gap: 10, marginBottom: 10 },
  wayBtn: { flexDirection: "row", gap: 6, alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.primary + "40" },
  wayBtnText: { fontSize: 12, color: Colors.primary, fontWeight: "700" },
  waybillHint: { fontSize: 11, color: Colors.textSecondary, textAlign: "center", marginTop: 4 },
});
