import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
import { Text, Button, Chip, Snackbar } from "react-native-paper";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { Check, Star, Zap, Crown, Building2 } from "lucide-react-native";
import ScreenBackground from "@/components/ScreenBackground";

const subscriptionTiers = [
  {
    id: "basic",
    name: "Basic",
    price: 10,
    period: "month",
    icon: Star,
    color: "#6B7280",
    features: [
      "Up to 10 job applications per month",
      "Basic profile visibility",
      "Email support",
      "Standard matching algorithm",
    ],
    recommended: false,
  },
  {
    id: "standard",
    name: "Standard",
    price: 25,
    period: "month",
    icon: Zap,
    color: "#3B82F6",
    features: [
      "Unlimited job applications",
      "Enhanced profile visibility",
      "Priority support",
      "Advanced matching algorithm",
      "Real-time notifications",
    ],
    recommended: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: 50,
    period: "month",
    icon: Crown,
    color: "#F59E0B",
    features: [
      "Everything in Standard",
      "Top listing in search results",
      "Verified badge",
      "Analytics dashboard",
      "Dedicated account manager",
    ],
    recommended: false,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 120,
    period: "month",
    icon: Building2,
    color: "#8B5CF6",
    features: [
      "Everything in Premium",
      "Multiple vehicle management",
      "Fleet tracking",
      "API access",
      "Custom integrations",
      "24/7 phone support",
    ],
    recommended: false,
  },
];

export default function SubscriptionScreen() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubscribe = async () => {
    if (!selectedTier) {
      setError("Please select a subscription tier");
      return;
    }

    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      router.replace("/(tabs)");
    } catch (err: any) {
      setError(err.message || "Subscription failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.replace("/(tabs)");
  };

  return (
    <ScreenBackground variant="soft">
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Select a subscription tier to unlock driver features
          </Text>
        </View>

        <View style={styles.tiersContainer}>
          {subscriptionTiers.map((tier) => {
            const Icon = tier.icon;
            const isSelected = selectedTier === tier.id;
            return (
              <TouchableOpacity
                key={tier.id}
                style={[
                  styles.tierCard,
                  isSelected && { borderColor: tier.color, borderWidth: 2 },
                  tier.recommended && styles.recommendedCard,
                ]}
                onPress={() => setSelectedTier(tier.id)}
              >
                {tier.recommended && (
                  <View style={[styles.recommendedBadge, { backgroundColor: tier.color }]}>
                    <Text style={styles.recommendedText}>Recommended</Text>
                  </View>
                )}

                <View style={styles.tierHeader}>
                  <View
                    style={[
                      styles.tierIcon,
                      { backgroundColor: tier.color + "20" },
                    ]}
                  >
                    <Icon size={24} color={tier.color} />
                  </View>
                  <View style={styles.tierTitleContainer}>
                    <Text style={styles.tierName}>{tier.name}</Text>
                    <View style={styles.priceContainer}>
                      <Text style={styles.price}>${tier.price}</Text>
                      <Text style={styles.period}>/{tier.period}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.featuresContainer}>
                  {tier.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Check size={16} color={Colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>

                {isSelected && (
                  <View style={[styles.selectedIndicator, { backgroundColor: tier.color }]}>
                    <Text style={styles.selectedText}>Selected</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Continue with free trial (7 days)</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSubscribe}
          loading={loading}
          disabled={loading || !selectedTier}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {loading ? "Processing..." : "Subscribe Now"}
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
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  tiersContainer: {
    gap: 16,
  },
  tierCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  recommendedCard: {
    borderColor: Colors.primary,
  },
  recommendedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    borderBottomRightRadius: 12,
  },
  recommendedText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tierTitleContainer: {
    marginLeft: 12,
  },
  tierName: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  price: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.primary,
  },
  period: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  featuresContainer: {
    padding: 16,
    paddingTop: 0,
    gap: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  selectedIndicator: {
    paddingVertical: 8,
    alignItems: "center",
  },
  selectedText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  skipButton: {
    alignSelf: "center",
    marginTop: 24,
    padding: 8,
  },
  skipText: {
    fontSize: 14,
    color: Colors.primary,
    textDecorationLine: "underline",
  },
  footer: {
    padding: 24,
    paddingTop: 0,
    backgroundColor: "transparent",
  },
  button: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  errorSnackbar: {
    backgroundColor: Colors.error,
  },
});
