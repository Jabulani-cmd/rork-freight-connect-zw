import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert, Linking } from "react-native";
import { Text, Card, Divider, Switch, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { Globe, Moon, Database, FileText, ExternalLink, LogOut, ChevronRight, Info, Trash } from "lucide-react-native";
import ScreenBackground from "@/components/ScreenBackground";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

const LANGS = ["English", "Shona", "Ndebele"] as const;
type Lang = (typeof LANGS)[number];

export default function SettingsScreen() {
  const router = useRouter();
  const { clearAuth } = useStore();
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [dataSaver, setDataSaver] = useState<boolean>(false);
  const [lang, setLang] = useState<Lang>("English");

  const clearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter((k) => k.startsWith("cache:"));
      if (toRemove.length > 0) {
        await AsyncStorage.multiRemove(toRemove);
      }
      Alert.alert("Cache cleared", `${toRemove.length} items removed`);
    } catch (e) {
      Alert.alert("Cache", "Nothing to clear");
    }
  };

  const pickLanguage = () => {
    Alert.alert(
      "Language",
      undefined,
      LANGS.map((l) => ({
        text: l,
        onPress: () => setLang(l),
      })).concat([{ text: "Cancel", onPress: () => {}, style: "cancel" as const } as never])
    );
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert("Link", url));
  };

  const onLogout = async () => {
    try {
      await supabase.auth.signOut();
      clearAuth();
      router.replace("/(auth)/login");
    } catch (e) {
      clearAuth();
      router.replace("/(auth)/login");
    }
  };

  return (
    <ScreenBackground variant="soft">
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <TouchableOpacity style={styles.row} onPress={pickLanguage} testID="pick-language">
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Globe size={18} color={Colors.primary} /></View>
                  <Text style={styles.label}>Language</Text>
                </View>
                <View style={styles.rightRow}>
                  <Text style={styles.valueText}>{lang}</Text>
                  <ChevronRight size={18} color={Colors.textMuted} />
                </View>
              </TouchableOpacity>
              <Divider style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Moon size={18} color={Colors.primary} /></View>
                  <Text style={styles.label}>Dark mode</Text>
                </View>
                <Switch value={darkMode} onValueChange={setDarkMode} color={Colors.primary} />
              </View>
              <Divider style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Database size={18} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Data saver</Text>
                    <Text style={styles.desc}>Reduce map and image quality on mobile data</Text>
                  </View>
                </View>
                <Switch value={dataSaver} onValueChange={setDataSaver} color={Colors.primary} />
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <TouchableOpacity style={styles.row} onPress={clearCache} testID="clear-cache">
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Trash size={18} color={Colors.primary} /></View>
                  <Text style={styles.label}>Clear cache</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              <Divider style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => openLink("https://freightconnect.co.zw/terms")}
                testID="terms"
              >
                <View style={styles.left}>
                  <View style={styles.iconWrap}><FileText size={18} color={Colors.primary} /></View>
                  <Text style={styles.label}>Terms of Service</Text>
                </View>
                <ExternalLink size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              <Divider style={styles.divider} />
              <TouchableOpacity
                style={styles.row}
                onPress={() => openLink("https://freightconnect.co.zw/privacy")}
                testID="privacy"
              >
                <View style={styles.left}>
                  <View style={styles.iconWrap}><FileText size={18} color={Colors.primary} /></View>
                  <Text style={styles.label}>Privacy Policy</Text>
                </View>
                <ExternalLink size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              <Divider style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Info size={18} color={Colors.primary} /></View>
                  <Text style={styles.label}>App version</Text>
                </View>
                <Text style={styles.valueText}>1.0.0</Text>
              </View>
            </Card.Content>
          </Card>

          <Button
            mode="outlined"
            onPress={onLogout}
            textColor={Colors.error}
            style={styles.logoutBtn}
            icon={() => <LogOut size={18} color={Colors.error} />}
            testID="logout"
          >
            Log out
          </Button>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, gap: 14 },
  card: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  rightRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: 15, fontWeight: "600", color: Colors.text },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  valueText: { fontSize: 13, color: Colors.textSecondary },
  divider: { marginVertical: 4 },
  logoutBtn: { borderColor: Colors.error, borderRadius: 10 },
});
