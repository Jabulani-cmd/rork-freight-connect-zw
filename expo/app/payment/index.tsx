import React, { useMemo, useState } from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView, Animated, Platform } from "react-native";
import { Text, Card, Button, TextInput, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import {
  ChevronLeft,
  Shield,
  Lock,
  CreditCard,
  Smartphone,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Wallet,
  ArrowRight,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { createEscrow, confirmPayment, EscrowMethod, EscrowRecord } from "@/lib/escrow";
import * as Haptics from "expo-haptics";

type Method = { id: EscrowMethod; label: string; icon: typeof Smartphone; color: string; tagline: string };

const paymentMethods: Method[] = [
  { id: "ecocash", label: "EcoCash", icon: Smartphone, color: "#00A859", tagline: "Mobile money • Instant" },
  { id: "paynow", label: "Paynow", icon: Wallet, color: "#2563EB", tagline: "Secure wallet payment" },
  { id: "card", label: "Card", icon: CreditCard, color: "#7C3AED", tagline: "Visa / MasterCard" },
];

export default function PaymentScreen() {
  const router = useRouter();
  const { jobId, amount, depositPercentage, payeeId } = useLocalSearchParams<{
    jobId?: string;
    amount?: string;
    depositPercentage?: string;
    payeeId?: string;
  }>();
  const { profile, user } = useStore();

  const [selectedMethod, setSelectedMethod] = useState<EscrowMethod | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone?.replace("+263", "0") || "");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [escrow, setEscrow] = useState<EscrowRecord | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"method" | "details" | "processing" | "success">("method");

  const total = parseFloat((amount as string) || "0") || 250;
  const pct = parseInt((depositPercentage as string) || "50", 10) || 50;
  const depositAmount = useMemo(() => Math.round(((total * pct) / 100) * 100) / 100, [total, pct]);
  const remaining = Math.round((total - depositAmount) * 100) / 100;

  const progressAnim = React.useRef(new Animated.Value(0)).current;

  const handlePayment = async () => {
    if (!selectedMethod) {
      setError("Please select a payment method");
      return;
    }
    if ((selectedMethod === "ecocash" || selectedMethod === "paynow") && phoneNumber.length < 9) {
      setError("Enter a valid phone number");
      return;
    }
    if (selectedMethod === "card" && (cardNumber.length < 12 || cardCvv.length < 3)) {
      setError("Enter valid card details");
      return;
    }
    if (!user?.id || !jobId) {
      setError("Missing job or user context");
      return;
    }

    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch {}

    setLoading(true);
    setStep("processing");
    progressAnim.setValue(0);
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2400,
      useNativeDriver: false,
    }).start();

    try {
      const created = await createEscrow({
        jobId: jobId as string,
        payerId: user.id,
        payeeId: (payeeId as string) || null,
        totalJobValue: total,
        depositPercentage: pct,
        method: selectedMethod,
      });
      await new Promise((r) => setTimeout(r, 2200));
      const held = await confirmPayment(created.id);
      setEscrow(held || created);
      setStep("success");
      try {
        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {}
    } catch (e: any) {
      console.log("payment error", e);
      setError(e?.message || "Payment failed");
      setStep("details");
    } finally {
      setLoading(false);
    }
  };

  if (step === "success" && escrow) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#0F2A47", "#1E3A5F", "#059669"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <ScrollView contentContainerStyle={styles.successContainer}>
          <View style={styles.successIcon}>
            <ShieldCheck size={64} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Deposit Secured in Escrow</Text>
          <Text style={styles.successSubtitle}>
            ${escrow.amount.toFixed(2)} is safely held by Freight Connect
          </Text>

          <View style={styles.receiptCard}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Transaction Ref</Text>
              <Text style={styles.receiptValue}>{escrow.txnRef}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Method</Text>
              <Text style={styles.receiptValue}>{escrow.method.toUpperCase()}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Deposit</Text>
              <Text style={styles.receiptValue}>${escrow.amount.toFixed(2)}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Due on delivery</Text>
              <Text style={styles.receiptValue}>${remaining.toFixed(2)}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Status</Text>
              <View style={styles.statusPill}>
                <Shield size={12} color={Colors.success} />
                <Text style={styles.statusPillText}>HELD IN ESCROW</Text>
              </View>
            </View>
          </View>

          <View style={styles.flowCard}>
            <Text style={styles.flowTitle}>What happens next?</Text>
            <FlowStep n={1} title="Held in Escrow" active note="Funds are locked. Driver cannot access yet." done />
            <FlowStep n={2} title="Driver Confirms Dispatch" note="Funds released to driver's EcoCash." />
            <FlowStep n={3} title="Live Tracking" note="Watch the shipment move in real time." />
            <FlowStep n={4} title="Delivery & Rating" note="Rate each other, off-platform balance settled." />
          </View>

          <Button
            mode="contained"
            onPress={() => router.replace(`/job/${jobId}`)}
            style={styles.primaryButton}
            buttonColor="#fff"
            textColor={Colors.primary}
            icon={() => <ArrowRight size={18} color={Colors.primary} />}
            testID="back-to-job"
          >
            Back to Job
          </Button>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === "processing") {
    const width = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={["#0F2A47", "#1E3A5F"]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.processingContainer}>
          <View style={styles.processingIcon}>
            <Lock size={48} color="#fff" />
          </View>
          <Text style={styles.processingTitle}>Securing your deposit</Text>
          <Text style={styles.processingSub}>Contacting {selectedMethod?.toUpperCase()}...</Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width }]} />
          </View>
          <Text style={styles.processingHint}>Bank-grade escrow • 256-bit secured</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={["#EAF2FB", "#FFF3EA"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} testID="back">
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Secure Deposit</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[Colors.primary, "#2C5282"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.amountCard}
        >
          <View style={styles.amountTop}>
            <Text style={styles.amountLabel}>Escrow Deposit</Text>
            <View style={styles.escrowBadge}>
              <Shield size={12} color="#fff" />
              <Text style={styles.escrowBadgeText}>PROTECTED</Text>
            </View>
          </View>
          <Text style={styles.amountValue}>${depositAmount.toFixed(2)}</Text>
          <View style={styles.amountMetaRow}>
            <View style={styles.amountMeta}>
              <Text style={styles.amountMetaLabel}>Job total</Text>
              <Text style={styles.amountMetaValue}>${total.toFixed(2)}</Text>
            </View>
            <View style={styles.amountMetaDivider} />
            <View style={styles.amountMeta}>
              <Text style={styles.amountMetaLabel}>On delivery</Text>
              <Text style={styles.amountMetaValue}>${remaining.toFixed(2)}</Text>
            </View>
            <View style={styles.amountMetaDivider} />
            <View style={styles.amountMeta}>
              <Text style={styles.amountMetaLabel}>Deposit %</Text>
              <Text style={styles.amountMetaValue}>{pct}%</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={styles.sectionTitle}>Choose how to pay</Text>

        <View style={styles.methodsContainer}>
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                activeOpacity={0.85}
                style={[
                  styles.methodCard,
                  isSelected && { borderColor: method.color, shadowColor: method.color, shadowOpacity: 0.25 },
                ]}
                onPress={() => {
                  setSelectedMethod(method.id);
                  setStep("details");
                }}
                testID={`method-${method.id}`}
              >
                <View style={[styles.methodIcon, { backgroundColor: method.color + "15" }]}>
                  <Icon size={22} color={method.color} />
                </View>
                <View style={styles.methodTextWrap}>
                  <Text style={styles.methodLabel}>{method.label}</Text>
                  <Text style={styles.methodTagline}>{method.tagline}</Text>
                </View>
                <View
                  style={[
                    styles.methodRadio,
                    isSelected && { backgroundColor: method.color, borderColor: method.color },
                  ]}
                >
                  {isSelected && <CheckCircle size={14} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {selectedMethod && (
          <Card style={styles.formCard}>
            <Card.Content>
              <Text style={styles.formTitle}>Payment Details</Text>

              {(selectedMethod === "paynow" || selectedMethod === "ecocash") && (
                <>
                  <TextInput
                    label="Phone Number"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    mode="outlined"
                    style={styles.input}
                    keyboardType="phone-pad"
                    left={<TextInput.Affix text="+263 " />}
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                    testID="phone-input"
                  />
                  <Text style={styles.helperText}>
                    You'll receive a prompt on your phone to approve.
                  </Text>
                </>
              )}

              {selectedMethod === "card" && (
                <>
                  <TextInput
                    label="Card Number"
                    mode="outlined"
                    style={styles.input}
                    keyboardType="number-pad"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    outlineColor={Colors.border}
                    activeOutlineColor={Colors.primary}
                  />
                  <View style={styles.cardRow}>
                    <TextInput
                      label="Expiry"
                      mode="outlined"
                      style={[styles.input, styles.cardSmallInput]}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChangeText={setCardExpiry}
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                    />
                    <TextInput
                      label="CVV"
                      mode="outlined"
                      style={[styles.input, styles.cardSmallInput]}
                      keyboardType="number-pad"
                      placeholder="123"
                      value={cardCvv}
                      onChangeText={setCardCvv}
                      secureTextEntry
                      outlineColor={Colors.border}
                      activeOutlineColor={Colors.primary}
                    />
                  </View>
                </>
              )}
            </Card.Content>
          </Card>
        )}

        <View style={styles.infoContainer}>
          <AlertCircle size={16} color={Colors.info} />
          <Text style={styles.infoText}>
            Your deposit is locked in escrow and only released when the driver confirms
            dispatch. Cancel before dispatch for an automatic full refund.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handlePayment}
          loading={loading}
          disabled={loading || !selectedMethod}
          style={styles.payButton}
          contentStyle={styles.payButtonContent}
          labelStyle={styles.payButtonLabel}
          icon={() => <Lock size={16} color="#fff" />}
          testID="pay-button"
        >
          {loading ? "Processing..." : `Pay $${depositAmount.toFixed(2)} securely`}
        </Button>
      </View>

      <Snackbar
        visible={!!error}
        onDismiss={() => setError("")}
        duration={3000}
        style={styles.errorSnackbar}
      >
        {error}
      </Snackbar>
    </SafeAreaView>
  );
}

function FlowStep({ n, title, note, active, done }: { n: number; title: string; note: string; active?: boolean; done?: boolean }) {
  return (
    <View style={styles.flowRow}>
      <View style={[styles.flowDot, done && styles.flowDotDone, active && styles.flowDotActive]}>
        {done ? <CheckCircle size={14} color="#fff" /> : <Text style={styles.flowDotText}>{n}</Text>}
      </View>
      <View style={styles.flowTextWrap}>
        <Text style={[styles.flowStepTitle, (active || done) && { color: Colors.text }]}>{title}</Text>
        <Text style={styles.flowStepNote}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 20, fontWeight: "700", color: Colors.text },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },

  amountCard: {
    borderRadius: 20,
    padding: 22,
    marginBottom: 24,
    shadowColor: "#1E3A5F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
  amountTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  amountLabel: { fontSize: 13, color: "rgba(255,255,255,0.75)", fontWeight: "500" },
  escrowBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  escrowBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  amountValue: { color: "#fff", fontSize: 44, fontWeight: "800", marginTop: 6, letterSpacing: -1 },
  amountMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingVertical: 10,
  },
  amountMeta: { flex: 1, alignItems: "center" },
  amountMetaLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  amountMetaValue: { color: "#fff", fontSize: 14, fontWeight: "700", marginTop: 2 },
  amountMetaDivider: { width: 1, height: 24, backgroundColor: "rgba(255,255,255,0.2)" },

  sectionTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 12 },

  methodsContainer: { gap: 10, marginBottom: 20 },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  methodIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  methodTextWrap: { flex: 1, marginLeft: 12 },
  methodLabel: { fontSize: 15, fontWeight: "700", color: Colors.text },
  methodTagline: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  methodRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  formCard: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16 },
  formTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  input: { backgroundColor: "#fff", marginBottom: 10 },
  helperText: { fontSize: 12, color: Colors.textSecondary },
  cardRow: { flexDirection: "row", gap: 10 },
  cardSmallInput: { flex: 1 },

  infoContainer: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: Colors.info + "10",
    padding: 14,
    borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 12.5, color: Colors.textSecondary, lineHeight: 18 },

  footer: { padding: 16, paddingBottom: 24, backgroundColor: "transparent" },
  payButton: { borderRadius: 14, backgroundColor: Colors.primary },
  payButtonContent: { paddingVertical: 10 },
  payButtonLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },

  successContainer: { flexGrow: 1, padding: 24, paddingTop: 40, alignItems: "center" },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: "#fff", textAlign: "center" },
  successSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 6, marginBottom: 24 },
  receiptCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  receiptRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 },
  receiptLabel: { fontSize: 13, color: Colors.textSecondary },
  receiptValue: { fontSize: 13, fontWeight: "700", color: Colors.text },
  receiptDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.success + "15",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: { fontSize: 11, fontWeight: "700", color: Colors.success },

  flowCard: { width: "100%", backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 16, padding: 18, marginBottom: 20 },
  flowTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginBottom: 12 },
  flowRow: { flexDirection: "row", gap: 12, paddingVertical: 8 },
  flowDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  flowDotActive: { backgroundColor: Colors.primary },
  flowDotDone: { backgroundColor: Colors.success },
  flowDotText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  flowTextWrap: { flex: 1 },
  flowStepTitle: { fontSize: 14, fontWeight: "600", color: Colors.textMuted },
  flowStepNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  primaryButton: { borderRadius: 14, width: "100%", marginTop: 4 },

  processingContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  processingIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  processingTitle: { color: "#fff", fontSize: 22, fontWeight: "800" },
  processingSub: { color: "rgba(255,255,255,0.8)", marginTop: 6, fontSize: 14 },
  progressTrack: {
    width: "80%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 24,
  },
  progressFill: { height: "100%", backgroundColor: "#FF6B35", borderRadius: 3 },
  processingHint: { color: "rgba(255,255,255,0.6)", marginTop: 16, fontSize: 12 },

  errorSnackbar: { backgroundColor: Colors.error },
});
