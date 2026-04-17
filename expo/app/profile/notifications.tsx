import React, { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Text, Card, Switch, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { Bell, MessageSquare, Truck, DollarSign, Star, Package } from "lucide-react-native";
import ScreenBackground from "@/components/ScreenBackground";

interface Setting {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}

const SETTINGS: Setting[] = [
  { key: "newJobs", label: "New Jobs", description: "Get notified when a new job matches your vehicle", icon: Package },
  { key: "quotes", label: "Quote Updates", description: "Incoming quotes and counter-offers", icon: DollarSign },
  { key: "messages", label: "Messages", description: "Chat messages from the other party", icon: MessageSquare },
  { key: "tracking", label: "Tracking Events", description: "Dispatch, pickup and delivery updates", icon: Truck },
  { key: "ratings", label: "Rating Reminders", description: "Reminders to rate after a job", icon: Star },
  { key: "system", label: "System Alerts", description: "Important platform & account updates", icon: Bell },
];

export default function NotificationsSettingsScreen() {
  const [values, setValues] = useState<Record<string, boolean>>({
    newJobs: true,
    quotes: true,
    messages: true,
    tracking: true,
    ratings: true,
    system: true,
  });

  return (
    <ScreenBackground variant="soft">
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              {SETTINGS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <View key={s.key}>
                    <View style={styles.row}>
                      <View style={styles.left}>
                        <View style={styles.iconWrap}>
                          <Icon size={18} color={Colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.label}>{s.label}</Text>
                          <Text style={styles.desc}>{s.description}</Text>
                        </View>
                      </View>
                      <Switch
                        value={values[s.key]}
                        onValueChange={(v) => setValues((prev) => ({ ...prev, [s.key]: v }))}
                        color={Colors.primary}
                      />
                    </View>
                    {i < SETTINGS.length - 1 && <Divider style={{ marginVertical: 6 }} />}
                  </View>
                );
              })}
            </Card.Content>
          </Card>
          <Text style={styles.footNote}>
            You can change these anytime. Critical alerts (payments, disputes) are always delivered.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, gap: 12 },
  card: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 15, fontWeight: "600", color: Colors.text },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  footNote: { fontSize: 12, color: Colors.textMuted, textAlign: "center", paddingHorizontal: 12 },
});
