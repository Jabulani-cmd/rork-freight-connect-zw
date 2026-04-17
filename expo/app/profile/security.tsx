import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Text, Card, Switch, Divider, Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { Shield, Lock, MapPin, Eye, Trash2, Smartphone, ChevronRight } from "lucide-react-native";
import ScreenBackground from "@/components/ScreenBackground";

export default function SecurityScreen() {
  const [locationShare, setLocationShare] = useState<boolean>(true);
  const [twoFactor, setTwoFactor] = useState<boolean>(false);
  const [hideRating, setHideRating] = useState<boolean>(false);

  const onDelete = () => {
    Alert.alert(
      "Delete account",
      "This will permanently remove your data. Contact support to continue.",
      [{ text: "Cancel", style: "cancel" }, { text: "Contact support" }]
    );
  };

  return (
    <ScreenBackground variant="soft">
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.iconWrap}><MapPin size={18} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Share live location</Text>
                    <Text style={styles.desc}>Only active during dispatched jobs</Text>
                  </View>
                </View>
                <Switch value={locationShare} onValueChange={setLocationShare} color={Colors.primary} />
              </View>
              <Divider style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Lock size={18} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Two-factor authentication</Text>
                    <Text style={styles.desc}>Extra OTP on new device login</Text>
                  </View>
                </View>
                <Switch value={twoFactor} onValueChange={setTwoFactor} color={Colors.primary} />
              </View>
              <Divider style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Eye size={18} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>Hide my rating</Text>
                    <Text style={styles.desc}>Your score stays private until a deal is made</Text>
                  </View>
                </View>
                <Switch value={hideRating} onValueChange={setHideRating} color={Colors.primary} />
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Alert.alert("Active sessions", "You are only signed in on this device.")}
                testID="active-sessions"
              >
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Smartphone size={18} color={Colors.primary} /></View>
                  <Text style={styles.linkLabel}>Active sessions</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              <Divider style={styles.divider} />
              <TouchableOpacity
                style={styles.linkRow}
                onPress={() => Alert.alert("Data download", "We will email you a copy within 24h.")}
                testID="data-download"
              >
                <View style={styles.left}>
                  <View style={styles.iconWrap}><Shield size={18} color={Colors.primary} /></View>
                  <Text style={styles.linkLabel}>Download my data</Text>
                </View>
                <ChevronRight size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </Card.Content>
          </Card>

          <Button
            mode="outlined"
            onPress={onDelete}
            textColor={Colors.error}
            style={styles.deleteBtn}
            icon={() => <Trash2 size={18} color={Colors.error} />}
            testID="delete-account"
          >
            Delete my account
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
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  left: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary + "15",
    alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: 15, fontWeight: "600", color: Colors.text },
  desc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  divider: { marginVertical: 6 },
  linkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  linkLabel: { fontSize: 15, fontWeight: "600", color: Colors.text },
  deleteBtn: { borderColor: Colors.error, borderRadius: 10 },
});
