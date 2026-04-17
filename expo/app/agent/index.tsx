import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Share,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Text, Card, Button, Snackbar, TextInput, Dialog, Portal, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  ChevronLeft,
  Copy,
  Share2,
  Users,
  TrendingUp,
  DollarSign,
  Gift,
  UserPlus,
  Truck,
  Package,
  Trophy,
  CheckCircle2,
} from "lucide-react-native";
import { useStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrCreateAgent,
  listReferrals,
  addReferral,
  markReferralPaying,
  computeCommission,
} from "@/lib/agent";
import * as Haptics from "expo-haptics";

const driverPlans = [
  { tier: "basic", label: "Basic", price: 10 },
  { tier: "standard", label: "Standard", price: 25 },
  { tier: "premium", label: "Premium", price: 50 },
  { tier: "enterprise", label: "Enterprise", price: 120 },
];
const cargoPlans = [
  { tier: "light", label: "Light", price: 5 },
  { tier: "regular", label: "Regular", price: 12 },
  { tier: "business", label: "Business", price: 25 },
];

export default function AgentScreen() {
  const router = useRouter();
  const { user, profile } = useStore();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"driver" | "cargo_owner">("driver");
  const [newTier, setNewTier] = useState<string>("basic");
  const [newAmount, setNewAmount] = useState<number>(10);
  const [cashCollected, setCashCollected] = useState(false);
  const [markPaying, setMarkPaying] = useState(true);

  const { data: agent } = useQuery({
    queryKey: ["agent", user?.id],
    queryFn: () => getOrCreateAgent(user?.id || "anon"),
    enabled: !!user?.id || true,
  });

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => listReferrals(),
  });

  const stats = useMemo(() => computeCommission(referrals), [referrals]);

  const copyCode = async () => {
    if (!agent?.referralCode) return;
    await Clipboard.setStringAsync(agent.referralCode);
    try {
      if (Platform.OS !== "web") await Haptics.selectionAsync();
    } catch {}
    setToast("Referral code copied");
  };

  const shareCode = async () => {
    if (!agent?.referralCode) return;
    try {
      await Share.share({
        message: `Join Freight Connect ZW and use my referral code ${agent.referralCode} when you sign up. 🚛📦`,
      });
    } catch (e) {
      console.log("share error", e);
    }
  };

  const plans = newRole === "driver" ? driverPlans : cargoPlans;

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!agent?.referralCode || !newName.trim()) throw new Error("Enter a name");
      const ref = await addReferral({
        agentCode: agent.referralCode,
        referredUserId: `u_${Date.now()}`,
        referredUserName: newName.trim(),
        referredRole: newRole,
        subscriptionTier: markPaying ? newTier : null,
        monthlyAmount: markPaying ? newAmount : 0,
        isPaying: markPaying,
        cashPaid: cashCollected,
      });
      if (markPaying) {
        await markReferralPaying(ref.id, newTier, newAmount, cashCollected);
      }
      return ref;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      setShowAdd(false);
      setNewName("");
      setCashCollected(false);
      setMarkPaying(true);
      setToast("Referral added");
    },
    onError: (e: any) => setToast(e?.message || "Failed"),
  });

  const progressTo100 = Math.min(stats.activePaying / 100, 1);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0F2A47", "#1E3A5F", "#FF6B35"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back">
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agent Program</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroIcon}>
                <Trophy size={22} color="#fff" />
              </View>
              <Text style={styles.heroTitle}>{profile?.fullName || "Marketing Agent"}</Text>
            </View>
            <Text style={styles.heroSub}>Your referral code</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText} testID="referral-code">
                {agent?.referralCode || "—"}
              </Text>
              <TouchableOpacity onPress={copyCode} style={styles.codeActionBtn}>
                <Copy size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={shareCode} style={[styles.codeActionBtn, styles.codeActionPrimary]}>
                <Share2 size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.earningsRow}>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>This month</Text>
                <Text style={styles.earningsValue}>
                  ${(stats.commissionThisMonth + stats.bonusThisMonth).toFixed(2)}
                </Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Lifetime</Text>
                <Text style={styles.earningsValue}>${stats.lifetimeCommission.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon={<Users size={18} color={Colors.primary} />}
              label="Recruited"
              value={String(stats.totalRecruited)}
              testId="stat-recruited"
            />
            <StatCard
              icon={<TrendingUp size={18} color={Colors.success} />}
              label="Paying now"
              value={String(stats.activePaying)}
              testId="stat-paying"
            />
            <StatCard
              icon={<Truck size={18} color={Colors.info} />}
              label="Drivers"
              value={String(stats.driversCount)}
            />
            <StatCard
              icon={<Package size={18} color={Colors.secondary} />}
              label="Cargo owners"
              value={String(stats.cargoOwnersCount)}
            />
          </View>

          <Card style={styles.bonusCard}>
            <Card.Content>
              <View style={styles.bonusHeader}>
                <Gift size={20} color={Colors.secondary} />
                <Text style={styles.bonusTitle}>Volume bonus</Text>
              </View>
              <Text style={styles.bonusSub}>
                Hit 50 paying users for $50 bonus, 100 for $120 bonus this month.
              </Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${progressTo100 * 100}%` }]} />
                <View style={[styles.barMilestone, { left: "50%" }]} />
              </View>
              <View style={styles.barLabels}>
                <Text style={styles.barLabel}>0</Text>
                <Text style={styles.barLabel}>50 (+$50)</Text>
                <Text style={styles.barLabel}>100 (+$120)</Text>
              </View>
              {stats.bonusThisMonth > 0 && (
                <View style={styles.bonusEarned}>
                  <CheckCircle2 size={16} color={Colors.success} />
                  <Text style={styles.bonusEarnedText}>
                    ${stats.bonusThisMonth} bonus earned this month
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          <Card style={styles.howCard}>
            <Card.Content>
              <Text style={styles.howTitle}>How you earn</Text>
              <HowRow emoji="🚛" title="20% driver subs" note="First 3 months of each driver sub." />
              <HowRow emoji="📦" title="15% cargo owner subs" note="First 3 months of each cargo owner sub." />
              <HowRow emoji="💵" title="Cash-paid handling" note="Collect cash offline, pay via EcoCash." />
            </Card.Content>
          </Card>

          <View style={styles.referralsHeader}>
            <Text style={styles.sectionTitle}>Your referrals</Text>
            <TouchableOpacity
              style={styles.addReferralBtn}
              onPress={() => setShowAdd(true)}
              testID="add-referral"
            >
              <UserPlus size={16} color="#fff" />
              <Text style={styles.addReferralText}>Add</Text>
            </TouchableOpacity>
          </View>

          {referrals.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Card.Content style={styles.emptyContent}>
                <Users size={40} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No referrals yet</Text>
                <Text style={styles.emptyNote}>
                  Share your code to start earning commissions.
                </Text>
              </Card.Content>
            </Card>
          ) : (
            referrals.map((r) => {
              const rate = r.referredRole === "driver" ? 0.2 : 0.15;
              const thisMonth = r.isPaying && r.paidMonths <= 3 ? r.monthlyAmount * rate : 0;
              return (
                <Card key={r.id} style={styles.refCard}>
                  <Card.Content>
                    <View style={styles.refRow}>
                      <View
                        style={[
                          styles.refAvatar,
                          { backgroundColor: r.referredRole === "driver" ? Colors.info + "20" : Colors.secondary + "20" },
                        ]}
                      >
                        {r.referredRole === "driver" ? (
                          <Truck size={18} color={Colors.info} />
                        ) : (
                          <Package size={18} color={Colors.secondary} />
                        )}
                      </View>
                      <View style={styles.refInfo}>
                        <Text style={styles.refName}>{r.referredUserName}</Text>
                        <View style={styles.refBadges}>
                          <Chip
                            compact
                            style={[
                              styles.refChip,
                              { backgroundColor: r.isPaying ? Colors.success + "15" : Colors.textMuted + "15" },
                            ]}
                            textStyle={{
                              color: r.isPaying ? Colors.success : Colors.textMuted,
                              fontSize: 11,
                            }}
                          >
                            {r.isPaying ? `Paying • ${r.subscriptionTier}` : "Inactive"}
                          </Chip>
                          {r.cashPaid && (
                            <Chip
                              compact
                              style={[styles.refChip, { backgroundColor: Colors.warning + "15" }]}
                              textStyle={{ color: Colors.warning, fontSize: 11 }}
                            >
                              Cash-paid
                            </Chip>
                          )}
                        </View>
                      </View>
                      <View style={styles.refEarn}>
                        <Text style={styles.refEarnValue}>${thisMonth.toFixed(2)}</Text>
                        <Text style={styles.refEarnLabel}>this month</Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              );
            })
          )}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      <Portal>
        <Dialog visible={showAdd} onDismiss={() => setShowAdd(false)}>
          <Dialog.Title>Add Referral</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Full name"
              value={newName}
              onChangeText={setNewName}
              mode="outlined"
              style={styles.input}
            />
            <Text style={styles.fieldLabel}>Role</Text>
            <View style={styles.roleRow}>
              <Chip
                selected={newRole === "driver"}
                onPress={() => {
                  setNewRole("driver");
                  setNewTier("basic");
                  setNewAmount(10);
                }}
                style={styles.roleChip}
              >
                Driver
              </Chip>
              <Chip
                selected={newRole === "cargo_owner"}
                onPress={() => {
                  setNewRole("cargo_owner");
                  setNewTier("light");
                  setNewAmount(5);
                }}
                style={styles.roleChip}
              >
                Cargo owner
              </Chip>
            </View>

            <Text style={styles.fieldLabel}>Subscription plan</Text>
            <View style={styles.planRow}>
              {plans.map((p) => (
                <Chip
                  key={p.tier}
                  selected={newTier === p.tier}
                  onPress={() => {
                    setNewTier(p.tier);
                    setNewAmount(p.price);
                  }}
                  style={styles.roleChip}
                >
                  {p.label} ${p.price}
                </Chip>
              ))}
            </View>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setMarkPaying(!markPaying)}
            >
              <View style={[styles.checkbox, markPaying && styles.checkboxOn]}>
                {markPaying && <CheckCircle2 size={14} color="#fff" />}
              </View>
              <Text style={styles.toggleText}>Mark as paying subscriber</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setCashCollected(!cashCollected)}
            >
              <View style={[styles.checkbox, cashCollected && styles.checkboxOn]}>
                {cashCollected && <CheckCircle2 size={14} color="#fff" />}
              </View>
              <Text style={styles.toggleText}>
                Cash collected offline (I'll pay via EcoCash)
              </Text>
            </TouchableOpacity>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAdd(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={() => addMutation.mutate()}
              loading={addMutation.isPending}
              disabled={!newName.trim() || addMutation.isPending}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar visible={!!toast} onDismiss={() => setToast("")} duration={2000}>
        {toast}
      </Snackbar>
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId?: string;
}) {
  return (
    <View style={styles.statCard} testID={testId}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function HowRow({ emoji, title, note }: { emoji: string; title: string; note: string }) {
  return (
    <View style={styles.howRow}>
      <Text style={styles.howEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.howRowTitle}>{title}</Text>
        <Text style={styles.howRowNote}>{note}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  scroll: { padding: 16, paddingBottom: 40 },

  heroCard: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  heroHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  heroIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  heroSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  codeText: {
    flex: 1,
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 2,
  },
  codeActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  codeActionPrimary: { backgroundColor: "#fff" },
  earningsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: 12,
    paddingVertical: 12,
  },
  earningsItem: { flex: 1, alignItems: "center" },
  earningsDivider: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.25)" },
  earningsLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  earningsValue: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 4 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderRadius: 14,
    padding: 14,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: Colors.text },
  statLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  bonusCard: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 16, marginBottom: 14 },
  bonusHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  bonusTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  bonusSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 4, marginBottom: 12 },
  barTrack: {
    height: 10,
    backgroundColor: Colors.border,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
  },
  barFill: { height: "100%", backgroundColor: Colors.secondary, borderRadius: 6 },
  barMilestone: { position: "absolute", top: 0, bottom: 0, width: 2, backgroundColor: "rgba(0,0,0,0.15)" },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  barLabel: { fontSize: 10, color: Colors.textSecondary },
  bonusEarned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: Colors.success + "15",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  bonusEarnedText: { color: Colors.success, fontWeight: "600", fontSize: 12 },

  howCard: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 16, marginBottom: 14 },
  howTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginBottom: 8 },
  howRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  howEmoji: { fontSize: 22 },
  howRowTitle: { fontSize: 14, fontWeight: "600", color: Colors.text },
  howRowNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  referralsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  addReferralBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addReferralText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  emptyCard: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 16 },
  emptyContent: { alignItems: "center", paddingVertical: 16 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: Colors.text, marginTop: 8 },
  emptyNote: { fontSize: 12, color: Colors.textSecondary, textAlign: "center", marginTop: 4 },

  refCard: { backgroundColor: "rgba(255,255,255,0.97)", borderRadius: 14, marginBottom: 8 },
  refRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  refAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  refInfo: { flex: 1 },
  refName: { fontSize: 14, fontWeight: "700", color: Colors.text },
  refBadges: { flexDirection: "row", gap: 6, marginTop: 4 },
  refChip: { height: 24 },
  refEarn: { alignItems: "flex-end" },
  refEarnValue: { fontSize: 15, fontWeight: "800", color: Colors.success },
  refEarnLabel: { fontSize: 10, color: Colors.textSecondary },

  input: { backgroundColor: "#fff", marginBottom: 10 },
  fieldLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 8, marginBottom: 6 },
  roleRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  roleChip: {},
  planRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 6 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  toggleText: { flex: 1, fontSize: 13, color: Colors.text },
});
