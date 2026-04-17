import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { Text, Card, Divider, TextInput, Button, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { HelpCircle, Mail, Phone, MessageCircle, ChevronDown, ChevronRight, BookOpen } from "lucide-react-native";
import ScreenBackground from "@/components/ScreenBackground";

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  { q: "How do deposits work?", a: "Deposits are held in escrow via Paynow and only released to the driver when they tap Confirm Dispatch." },
  { q: "When does live tracking start?", a: "Tracking starts after the driver confirms dispatch and stops automatically once delivery is confirmed." },
  { q: "How are disputes resolved?", a: "Admin reviews chat, GPS logs and dispatch photo before issuing a refund or release." },
  { q: "Can I change my role later?", a: "Yes. Open your profile and tap Switch Role. Driver features require a vehicle profile." },
  { q: "What payment methods are supported?", a: "EcoCash, Paynow card, and Apple/Google in-app purchase for subscriptions." },
];

export default function SupportScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [subject, setSubject] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [snack, setSnack] = useState<string>("");

  const onSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      setSnack("Please add a subject and message");
      return;
    }
    setSnack("Message sent. We will reply within 24h.");
    setSubject("");
    setMessage("");
  };

  const openEmail = () => {
    Linking.openURL("mailto:support@freightconnect.co.zw").catch(() =>
      Alert.alert("Email", "support@freightconnect.co.zw")
    );
  };
  const openCall = () => {
    Linking.openURL("tel:+263772000000").catch(() => Alert.alert("Call", "+263 77 200 0000"));
  };
  const openWhatsApp = () => {
    Linking.openURL("https://wa.me/263772000000").catch(() => {});
  };

  return (
    <ScreenBackground variant="soft">
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.quickRow}>
            <TouchableOpacity style={styles.quickBtn} onPress={openEmail} testID="support-email">
              <Mail size={20} color={Colors.primary} />
              <Text style={styles.quickText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={openCall} testID="support-call">
              <Phone size={20} color={Colors.primary} />
              <Text style={styles.quickText}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={openWhatsApp} testID="support-whatsapp">
              <MessageCircle size={20} color={Colors.primary} />
              <Text style={styles.quickText}>WhatsApp</Text>
            </TouchableOpacity>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Frequently asked</Text>
              </View>
              {FAQS.map((f, i) => {
                const open = openIndex === i;
                return (
                  <View key={f.q}>
                    <TouchableOpacity
                      style={styles.faqRow}
                      onPress={() => setOpenIndex(open ? null : i)}
                      testID={`faq-${i}`}
                    >
                      <Text style={styles.faqQ}>{f.q}</Text>
                      {open ? (
                        <ChevronDown size={18} color={Colors.textSecondary} />
                      ) : (
                        <ChevronRight size={18} color={Colors.textSecondary} />
                      )}
                    </TouchableOpacity>
                    {open && <Text style={styles.faqA}>{f.a}</Text>}
                    {i < FAQS.length - 1 && <Divider style={{ marginVertical: 6 }} />}
                  </View>
                );
              })}
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <HelpCircle size={18} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Contact support</Text>
              </View>
              <TextInput
                label="Subject"
                value={subject}
                onChangeText={setSubject}
                mode="outlined"
                style={styles.input}
                testID="support-subject"
              />
              <TextInput
                label="Message"
                value={message}
                onChangeText={setMessage}
                mode="outlined"
                multiline
                numberOfLines={5}
                style={[styles.input, { minHeight: 110 }]}
                testID="support-message"
              />
              <Button
                mode="contained"
                onPress={onSubmit}
                style={styles.submitBtn}
                testID="support-submit"
              >
                Send Message
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
        <Snackbar visible={!!snack} onDismiss={() => setSnack("")} duration={2500}>
          {snack}
        </Snackbar>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  content: { padding: 20, gap: 14 },
  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quickText: { fontSize: 12, fontWeight: "600", color: Colors.text },
  card: { backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 16 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: Colors.text },
  faqRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  faqQ: { fontSize: 14, fontWeight: "600", color: Colors.text, flex: 1, paddingRight: 8 },
  faqA: { fontSize: 13, color: Colors.textSecondary, paddingBottom: 10, lineHeight: 18 },
  input: { backgroundColor: "#fff", marginTop: 8 },
  submitBtn: { marginTop: 12, backgroundColor: Colors.primary, borderRadius: 10 },
});
