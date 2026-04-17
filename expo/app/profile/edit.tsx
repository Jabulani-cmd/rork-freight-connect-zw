import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Text, TextInput, Button, Avatar, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import { Camera, Save } from "lucide-react-native";
import ScreenBackground from "@/components/ScreenBackground";

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, setProfile } = useStore();
  const [fullName, setFullName] = useState<string>(profile?.fullName ?? "");
  const [phone, setPhone] = useState<string>(profile?.phone ?? "");
  const [saving, setSaving] = useState<boolean>(false);
  const [snack, setSnack] = useState<string>("");

  const onSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
      if (error) console.log("update profile error", error);
      setProfile({ ...profile, fullName, phone });
      setSnack("Profile updated");
      setTimeout(() => router.back(), 600);
    } catch (e: any) {
      setSnack(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenBackground variant="soft">
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.avatarWrap}>
            <Avatar.Text
              size={96}
              label={(fullName || phone || "U").charAt(0).toUpperCase()}
              style={{ backgroundColor: Colors.primary }}
            />
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => Alert.alert("Upload avatar", "Avatar upload coming soon")}
              testID="edit-avatar"
            >
              <Camera size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <TextInput
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            mode="outlined"
            style={styles.input}
            testID="edit-name"
          />
          <TextInput
            label="Phone Number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            mode="outlined"
            style={styles.input}
            testID="edit-phone"
          />

          <Button
            mode="contained"
            onPress={onSave}
            loading={saving}
            disabled={saving}
            style={styles.saveBtn}
            icon={() => <Save size={18} color="#fff" />}
            testID="save-profile"
          >
            Save Changes
          </Button>
        </ScrollView>
        <Snackbar visible={!!snack} onDismiss={() => setSnack("")} duration={2000}>
          {snack}
        </Snackbar>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, gap: 14 },
  avatarWrap: { alignItems: "center", marginVertical: 16 },
  cameraBtn: {
    position: "absolute",
    bottom: 0,
    right: "38%",
    backgroundColor: Colors.primary,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  input: { backgroundColor: "#fff" },
  saveBtn: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 4 },
});
