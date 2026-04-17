import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity } from "react-native";
import { Text, Card, Button, SegmentedButtons } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Truck,
  CheckCircle
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";
import ScreenBackground from "@/components/ScreenBackground";

const timeRanges = [
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

const mockTransactions = [
  {
    id: "1",
    type: "earning",
    amount: 150.00,
    description: "Job #1234 - Harare to Bulawayo",
    date: "2024-01-15",
    status: "completed",
  },
  {
    id: "2",
    type: "earning",
    amount: 75.50,
    description: "Job #1235 - Local delivery",
    date: "2024-01-14",
    status: "completed",
  },
  {
    id: "3",
    type: "withdrawal",
    amount: -200.00,
    description: "Withdrawal to EcoCash",
    date: "2024-01-13",
    status: "completed",
  },
  {
    id: "4",
    type: "earning",
    amount: 220.00,
    description: "Job #1236 - Cross-border",
    date: "2024-01-12",
    status: "pending",
  },
];

export default function EarningsScreen() {
  const { profile } = useStore();
  const [timeRange, setTimeRange] = useState("week");

  const { data: earnings } = useQuery({
    queryKey: ["earnings", profile?.id, timeRange],
    queryFn: async () => {
      if (!profile?.id) return null;
      
      const { data, error } = await supabase
        .from("jobs")
        .select("agreed_price, status, created_at")
        .eq("driver_id", profile.id)
        .eq("status", "delivered");

      if (error) return null;

      const total = data?.reduce((sum, job) => sum + (job.agreed_price || 0), 0) || 0;
      const completedJobs = data?.length || 0;

      return {
        totalEarnings: total,
        completedJobs,
        pendingPayout: 220,
        thisMonth: total * 0.8,
      };
    },
    enabled: !!profile?.id,
  });

  const stats = earnings || {
    totalEarnings: 445.50,
    completedJobs: 12,
    pendingPayout: 220,
    thisMonth: 356.40,
  };

  return (
    <ScreenBackground variant="soft">
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
        <TouchableOpacity style={styles.exportButton}>
          <Download size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>${stats.totalEarnings.toFixed(2)}</Text>
            <View style={styles.balanceActions}>
              <Button 
                mode="contained" 
                onPress={() => {}}
                style={styles.withdrawButton}
                textColor="#fff"
              >
                Withdraw
              </Button>
            </View>
          </Card.Content>
        </Card>

        <SegmentedButtons
          value={timeRange}
          onValueChange={setTimeRange}
          buttons={timeRanges.map(r => ({ value: r.value, label: r.label }))}
          style={styles.timeRangeSelector}
        />

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: Colors.success + "20" }]}>
                <DollarSign size={20} color={Colors.success} />
              </View>
              <Text style={styles.statValue}>${stats.thisMonth.toFixed(2)}</Text>
              <Text style={styles.statLabel}>This {timeRange}</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: Colors.primary + "20" }]}>
                <Truck size={20} color={Colors.primary} />
              </View>
              <Text style={styles.statValue}>{stats.completedJobs}</Text>
              <Text style={styles.statLabel}>Jobs Done</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <View style={[styles.statIcon, { backgroundColor: Colors.warning + "20" }]}>
                <TrendingUp size={20} color={Colors.warning} />
              </View>
              <Text style={styles.statValue}>${stats.pendingPayout.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </Card.Content>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        
        {mockTransactions.map((transaction) => (
          <Card key={transaction.id} style={styles.transactionCard}>
            <Card.Content style={styles.transactionContent}>
              <View style={styles.transactionLeft}>
                <View style={[
                  styles.transactionIcon,
                  { backgroundColor: transaction.type === "earning" ? Colors.success + "20" : Colors.error + "20" }
                ]}>
                  {transaction.type === "earning" ? (
                    <TrendingUp size={20} color={Colors.success} />
                  ) : (
                    <TrendingDown size={20} color={Colors.error} />
                  )}
                </View>
                <View style={styles.transactionTextWrap}>
                  <Text style={styles.transactionDescription} numberOfLines={1} ellipsizeMode="tail">{transaction.description}</Text>
                  <Text style={styles.transactionDate} numberOfLines={1}>{transaction.date}</Text>
                </View>
              </View>
              <View style={styles.transactionRight}>
                <Text style={[
                  styles.transactionAmount,
                  { color: transaction.type === "earning" ? Colors.success : Colors.error }
                ]} numberOfLines={1}>
                  {transaction.type === "earning" ? "+" : "-"}${Math.abs(transaction.amount).toFixed(2)}
                </Text>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: transaction.status === "completed" ? Colors.success + "1A" : Colors.warning + "1A" }
                ]}>
                  {transaction.status === "completed" && (
                    <CheckCircle size={10} color={Colors.success} />
                  )}
                  <Text style={[
                    styles.statusPillText,
                    { color: transaction.status === "completed" ? Colors.success : Colors.warning }
                  ]}>
                    {transaction.status === "completed" ? "Done" : "Pending"}
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  balanceActions: {
    flexDirection: "row",
    gap: 12,
  },
  withdrawButton: {
    flex: 1,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
  },
  timeRangeSelector: {
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
  },
  statContent: {
    alignItems: "center",
    paddingVertical: 16,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    gap: 12,
  },
  transactionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  transactionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.text,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  transactionRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
});
