import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { Text, Card, Button, Chip, Avatar, Divider, Portal, Dialog, ActivityIndicator } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore } from "@/lib/store";
import { Colors, VehicleColors } from "@/constants/colors";
import { 
  MapPin, 
  Package, 
  Truck, 
  Weight,
  ChevronLeft,
  MessageSquare,
  DollarSign,
  Clock,
  Star,
  Navigation,
  CheckCircle,
  X,
  Camera,
  Phone
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import MapView, { Marker } from "react-native-maps";
import RatingModal from "@/components/RatingModal";
import CounterOfferModal from "@/components/CounterOfferModal";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import * as ImagePicker from "expo-image-picker";

const mockJob = {
  id: "1",
  pickup: { address: "Harare CBD, Zimbabwe", latitude: -17.8252, longitude: 31.0335 },
  dropoff: { address: "Bulawayo CBD, Zimbabwe", latitude: -20.1325, longitude: 28.6265 },
  weight_kg: 500,
  goods_type: "Electronics",
  preferred_vehicle_type: "van",
  status: "open",
  description: "Fragile electronics, handle with care",
  created_at: new Date().toISOString(),
  cargo_owner_id: "user-1",
  driver_id: null,
  agreed_price: null,
  deposit_paid: false,
};

export default function JobDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { profile, user, vehicle } = useStore();
  const queryClient = useQueryClient();
  const { startTracking, confirmDispatch, stopTracking } = useLocationTracking();
  const isDriver = profile?.role === "driver";
  
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteDeposit, setQuoteDeposit] = useState("50");
  const [quoteMessage, setQuoteMessage] = useState("");
  const [dispatchPhoto, setDispatchPhoto] = useState<string | null>(null);
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"rating" | "price" | "recent">("rating");

  const { data: job, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          quotes(*, driver:profiles(id, full_name, rating, phone)),
          cargo_owner:profiles(id, full_name, rating, phone)
        `)
        .eq("id", id)
        .single();

      if (error) {
        console.error("Job fetch error:", error);
        return mockJob;
      }
      return data || mockJob;
    },
    enabled: !!id,
  });

  const sendQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !id) throw new Error("Missing required data");
      
      const { error } = await supabase.from("quotes").insert({
        job_id: id,
        driver_id: user.id,
        price: parseFloat(quotePrice),
        deposit_percentage: parseInt(quoteDeposit),
        message: quoteMessage,
        status: "pending",
      });
      if (error) throw error;

      await supabase.from("messages").insert({
        job_id: id,
        sender_id: user.id,
        content: `I quoted $${quotePrice} with ${quoteDeposit}% deposit required.`,
        type: "system",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      setShowQuoteDialog(false);
      setQuotePrice("");
      setQuoteMessage("");
    },
  });

  const acceptQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase.from("quotes").update({
        status: "accepted",
        updated_at: new Date().toISOString(),
      }).eq("id", quoteId);

      if (error) throw error;

      await supabase.from("jobs").update({
        status: "accepted",
        agreed_price: selectedQuote?.price,
        deposit_amount: (selectedQuote?.price * selectedQuote?.deposit_percentage) / 100,
        driver_id: selectedQuote?.driver_id,
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      await supabase.from("messages").insert({
        job_id: id,
        sender_id: user?.id,
        content: `I accepted your quote of $${selectedQuote?.price}. Please proceed to dispatch when ready.`,
        type: "system",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      setSelectedQuote(null);
      router.push({
        pathname: "/payment",
        params: {
          jobId: id as string,
          amount: String(selectedQuote?.price ?? 0),
          depositPercentage: String(selectedQuote?.deposit_percentage ?? 50),
          payeeId: selectedQuote?.driver_id ?? "",
        },
      });
    },
  });

  const rejectQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await supabase.from("quotes").update({
        status: "rejected",
        updated_at: new Date().toISOString(),
      }).eq("id", quoteId);

      if (error) throw error;

      await supabase.from("messages").insert({
        job_id: id,
        sender_id: user?.id,
        content: `I've decided not to proceed with your quote. Thank you for your interest.`,
        type: "system",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      setSelectedQuote(null);
    },
  });

  const confirmDispatchMutation = useMutation({
    mutationFn: async () => {
      await confirmDispatch(id as string, dispatchPhoto || undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    },
  });

  const startTrackingMutation = useMutation({
    mutationFn: async () => {
      await startTracking(id as string);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      router.push({ pathname: "/tracking", params: { jobId: id } });
    },
  });

  const markDeliveredMutation = useMutation({
    mutationFn: async () => {
      await stopTracking(id as string);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      setShowRatingModal(true);
    },
  });

  const takeDispatchPhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setDispatchPhoto(result.assets[0].uri);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return Colors.info;
      case "quoted": return Colors.warning;
      case "accepted": return Colors.accent;
      case "dispatched": return Colors.primary;
      case "in_transit": return Colors.secondary;
      case "delivered": return Colors.success;
      case "cancelled": return Colors.error;
      default: return Colors.textMuted;
    }
  };

  const handleAcceptQuote = (quote: any) => {
    setSelectedQuote(quote);
    Alert.alert(
      "Accept Quote",
      `Accept $${quote.price} with ${quote.deposit_percentage}% deposit ($${(quote.price * quote.deposit_percentage / 100).toFixed(2)})?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: () => acceptQuoteMutation.mutate(quote.id) },
      ]
    );
  };

  const handleRejectQuote = (quote: any) => {
    Alert.alert(
      "Reject Quote",
      "Are you sure you want to reject this quote?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reject", style: "destructive", onPress: () => rejectQuoteMutation.mutate(quote.id) },
      ]
    );
  };

  const handleCounterOffer = (quote: any) => {
    setSelectedQuote(quote);
    setShowCounterModal(true);
  };

  if (isLoading || !job) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  const canQuote = isDriver && job.status === "open" && vehicle && job.weight_kg <= (vehicle?.weightCapacityKg || 0);
  const isAssignedDriver = job.driver_id === user?.id;
  const isJobOwner = job.cargo_owner_id === user?.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Job Details</Text>
        <Chip 
          style={[styles.statusChip, { backgroundColor: getStatusColor(job.status) + "20" }]}
          textStyle={{ color: getStatusColor(job.status), fontSize: 12 }}
        >
          {job.status?.replace("_", " ").toUpperCase()}
        </Chip>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Card style={styles.mapCard}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: ((job.pickup?.latitude || -17.8252) + (job.dropoff?.latitude || -20.1325)) / 2,
              longitude: ((job.pickup?.longitude || 31.0335) + (job.dropoff?.longitude || 28.6265)) / 2,
              latitudeDelta: 4,
              longitudeDelta: 4,
            }}
          >
            <Marker coordinate={{ 
              latitude: job.pickup?.latitude || -17.8252, 
              longitude: job.pickup?.longitude || 31.0335 
            }}>
              <View style={[styles.marker, { backgroundColor: Colors.success }]}>
                <MapPin size={16} color="#fff" />
              </View>
            </Marker>
            <Marker coordinate={{ 
              latitude: job.dropoff?.latitude || -20.1325, 
              longitude: job.dropoff?.longitude || 28.6265 
            }}>
              <View style={[styles.marker, { backgroundColor: Colors.error }]}>
                <MapPin size={16} color="#fff" />
              </View>
            </Marker>
          </MapView>
        </Card>

        <Card style={styles.detailsCard}>
          <Card.Content>
            <View style={styles.routeContainer}>
              <View style={styles.routePoint}>
                <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                <View>
                  <Text style={styles.routeLabel}>Pickup</Text>
                  <Text style={styles.routeText}>{job.pickup?.address}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.dot, { backgroundColor: Colors.error }]} />
                <View>
                  <Text style={styles.routeLabel}>Dropoff</Text>
                  <Text style={styles.routeText}>{job.dropoff?.address}</Text>
                </View>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Weight size={20} color={Colors.primary} />
                <Text style={styles.detailLabel}>Weight</Text>
                <Text style={styles.detailValue}>{job.weight_kg} kg</Text>
              </View>
              <View style={styles.detailItem}>
                <Package size={20} color={Colors.secondary} />
                <Text style={styles.detailLabel}>Goods</Text>
                <Text style={styles.detailValue}>{job.goods_type}</Text>
              </View>
              <View style={styles.detailItem}>
                <Truck size={20} color={Colors.accent} />
                <Text style={styles.detailLabel}>Vehicle</Text>
                <Text style={styles.detailValue}>
                  {job.preferred_vehicle_type?.replace("_", " ") || "Any"}
                </Text>
              </View>
            </View>

            {job.description && (
              <>
                <Divider style={styles.divider} />
                <Text style={styles.descriptionLabel}>Description</Text>
                <Text style={styles.descriptionText}>{job.description}</Text>
              </>
            )}
          </Card.Content>
        </Card>

        {canQuote && (
          <Button
            mode="contained"
            onPress={() => setShowQuoteDialog(true)}
            style={styles.actionButton}
            icon={() => <DollarSign size={20} color="#fff" />}
          >
            Send Quote
          </Button>
        )}

        {isDriver && job.status === "open" && vehicle && job.weight_kg > vehicle.weightCapacityKg && (
          <Card style={styles.warningCard}>
            <Card.Content style={styles.warningContent}>
              <X size={20} color={Colors.error} />
              <Text style={styles.warningText}>
                This job exceeds your vehicle capacity ({vehicle.weightCapacityKg}kg)
              </Text>
            </Card.Content>
          </Card>
        )}

        {isAssignedDriver && job.status === "accepted" && (
          <Card style={styles.dispatchCard}>
            <Card.Content>
              <Text style={styles.dispatchTitle}>Ready to Dispatch?</Text>
              <Text style={styles.dispatchSubtitle}>
                Take a photo of the cargo and confirm dispatch to start tracking
              </Text>
              
              <TouchableOpacity style={styles.photoButton} onPress={takeDispatchPhoto}>
                {dispatchPhoto ? (
                  <View style={styles.photoPreview}>
                    <CheckCircle size={32} color={Colors.success} />
                    <Text style={styles.photoText}>Photo captured</Text>
                  </View>
                ) : (
                  <>
                    <Camera size={32} color={Colors.primary} />
                    <Text style={styles.photoText}>Take Dispatch Photo</Text>
                  </>
                )}
              </TouchableOpacity>

              <Button
                mode="contained"
                onPress={() => confirmDispatchMutation.mutate()}
                loading={confirmDispatchMutation.isPending}
                disabled={confirmDispatchMutation.isPending}
                style={styles.dispatchButton}
              >
                Confirm Dispatch
              </Button>
            </Card.Content>
          </Card>
        )}

        {isAssignedDriver && job.status === "dispatched" && (
          <Button
            mode="contained"
            onPress={() => startTrackingMutation.mutate()}
            loading={startTrackingMutation.isPending}
            disabled={startTrackingMutation.isPending}
            style={[styles.actionButton, { backgroundColor: Colors.secondary }]}
            icon={() => <Navigation size={20} color="#fff" />}
          >
            Start Journey & Share Location
          </Button>
        )}

        {isAssignedDriver && job.status === "in_transit" && (
          <Button
            mode="contained"
            onPress={() => markDeliveredMutation.mutate()}
            loading={markDeliveredMutation.isPending}
            disabled={markDeliveredMutation.isPending}
            style={[styles.actionButton, { backgroundColor: Colors.success }]}
            icon={() => <CheckCircle size={20} color="#fff" />}
          >
            Mark as Delivered
          </Button>
        )}

        {isJobOwner && job.quotes && job.quotes.length > 0 && job.status === "open" && (
          <>
            <View style={styles.quotesHeader}>
              <Text style={styles.sectionTitle}>Quotes Received ({job.quotes.length})</Text>
            </View>
            <Card style={styles.filtersCard}>
              <Card.Content style={styles.filtersContent}>
                <View style={styles.filtersRow}>
                  <Text style={styles.filtersLabel}>Min rating</Text>
                  <View style={styles.ratingChips}>
                    {[0, 3, 4, 4.5].map((r) => (
                      <TouchableOpacity
                        key={r}
                        onPress={() => setMinRatingFilter(r)}
                        style={[
                          styles.ratingChip,
                          minRatingFilter === r && styles.ratingChipActive,
                        ]}
                        testID={`rating-filter-${r}`}
                      >
                        {r > 0 && <Star size={10} color={minRatingFilter === r ? "#fff" : Colors.warning} fill={minRatingFilter === r ? "#fff" : Colors.warning} />}
                        <Text
                          style={[
                            styles.ratingChipText,
                            minRatingFilter === r && styles.ratingChipTextActive,
                          ]}
                        >
                          {r === 0 ? "Any" : `${r}+`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <View style={[styles.filtersRow, { marginTop: 10 }]}>
                  <Text style={styles.filtersLabel}>Sort</Text>
                  <View style={styles.ratingChips}>
                    {([
                      { id: "rating", label: "Top rated" },
                      { id: "price", label: "Lowest $" },
                      { id: "recent", label: "Recent" },
                    ] as const).map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setSortBy(s.id)}
                        style={[
                          styles.ratingChip,
                          sortBy === s.id && styles.ratingChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.ratingChipText,
                            sortBy === s.id && styles.ratingChipTextActive,
                          ]}
                        >
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </Card.Content>
            </Card>
            {(() => {
              const filtered = [...job.quotes]
                .filter((q: any) => (Number(q.driver?.rating) || 0) >= minRatingFilter)
                .sort((a: any, b: any) => {
                  if (sortBy === "rating") return (Number(b.driver?.rating) || 0) - (Number(a.driver?.rating) || 0);
                  if (sortBy === "price") return (Number(a.price) || 0) - (Number(b.price) || 0);
                  return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                });
              if (filtered.length === 0) {
                return (
                  <Card style={styles.emptyQuotesCard}>
                    <Card.Content style={styles.emptyQuotesContent}>
                      <Star size={24} color={Colors.textMuted} />
                      <Text style={styles.emptyQuotesTitle}>No quotes match this rating</Text>
                      <Text style={styles.emptyQuotesNote}>Lower the minimum rating to see more drivers.</Text>
                    </Card.Content>
                  </Card>
                );
              }
              return filtered.map((quote: any) => (
              <Card key={quote.id} style={styles.quoteCard}>
                <Card.Content>
                  <View style={styles.quoteHeader}>
                    <Avatar.Text 
                      size={40} 
                      label={(quote.driver?.full_name || "D").charAt(0).toUpperCase()}
                      style={{ backgroundColor: Colors.primary }}
                    />
                    <View style={styles.quoteDriverInfo}>
                      <Text style={styles.quoteDriverName}>
                        {quote.driver?.full_name || "Driver"}
                      </Text>
                      <View style={styles.ratingContainer}>
                        <Star size={14} color={Colors.warning} fill={Colors.warning} />
                        <Text style={styles.ratingText}>
                          {quote.driver?.rating || "4.5"}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.quotePriceContainer}>
                      <Text style={styles.quotePrice}>${quote.price}</Text>
                      <Text style={styles.quoteDeposit}>
                        {quote.deposit_percentage}% deposit
                      </Text>
                    </View>
                  </View>
                  
                  {quote.message && (
                    <Text style={styles.quoteMessage}>"{quote.message}"</Text>
                  )}

                  <View style={styles.quoteActions}>
                    <Button
                      mode="outlined"
                      onPress={() => router.push(`/chat/${id}?driverId=${quote.driver_id}`)}
                      style={styles.quoteActionButton}
                      textColor={Colors.primary}
                      icon={() => <MessageSquare size={16} color={Colors.primary} />}
                    >
                      Chat
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => handleCounterOffer(quote)}
                      style={styles.quoteActionButton}
                      textColor={Colors.warning}
                    >
                      Counter
                    </Button>
                  </View>
                  <View style={styles.quoteActions}>
                    <Button
                      mode="outlined"
                      onPress={() => handleRejectQuote(quote)}
                      style={styles.quoteActionButton}
                      textColor={Colors.error}
                    >
                      Reject
                    </Button>
                    <Button
                      mode="contained"
                      onPress={() => handleAcceptQuote(quote)}
                      style={styles.quoteActionButton}
                    >
                      Accept
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ));
            })()}
          </>
        )}

        {job.status !== "open" && job.driver && (
          <Card style={styles.driverCard}>
            <Card.Content>
              <Text style={styles.driverCardTitle}>
                {isJobOwner ? "Assigned Driver" : "Cargo Owner"}
              </Text>
              <View style={styles.driverInfoRow}>
                <Avatar.Text 
                  size={48}
                  label={(job.driver?.full_name || job.cargo_owner?.full_name || "U").charAt(0).toUpperCase()}
                  style={{ backgroundColor: Colors.primary }}
                />
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>
                    {job.driver?.full_name || job.cargo_owner?.full_name || "Unknown"}
                  </Text>
                  <View style={styles.driverMeta}>
                    <Star size={14} color={Colors.warning} fill={Colors.warning} />
                    <Text style={styles.driverRating}>
                      {job.driver?.rating || job.cargo_owner?.rating || "4.5"}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity 
                  style={styles.callButton}
                  onPress={() => {}}
                >
                  <Phone size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={showQuoteDialog} onDismiss={() => setShowQuoteDialog(false)}>
          <Dialog.Title>Send Quote</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Your Price (USD)"
              value={quotePrice}
              onChangeText={setQuotePrice}
              keyboardType="numeric"
              style={styles.dialogInput}
              mode="outlined"
              left={<TextInput.Affix text="$" />}
            />
            <TextInput
              label="Deposit Percentage Required"
              value={quoteDeposit}
              onChangeText={setQuoteDeposit}
              keyboardType="numeric"
              style={styles.dialogInput}
              mode="outlined"
              right={<TextInput.Affix text="%" />}
            />
            <TextInput
              label="Message (Optional)"
              value={quoteMessage}
              onChangeText={setQuoteMessage}
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
              mode="outlined"
              placeholder="Add any details about your service..."
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowQuoteDialog(false)}>Cancel</Button>
            <Button 
              onPress={() => sendQuoteMutation.mutate()}
              loading={sendQuoteMutation.isPending}
              disabled={!quotePrice || sendQuoteMutation.isPending}
            >
              Send
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {selectedQuote && (
        <CounterOfferModal
          visible={showCounterModal}
          onClose={() => setShowCounterModal(false)}
          jobId={id as string}
          driverId={selectedQuote.driver_id}
          currentPrice={selectedQuote.price}
          currentDeposit={selectedQuote.deposit_percentage}
        />
      )}

      <RatingModal
        visible={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          router.replace("/(tabs)/jobs");
        }}
        jobId={id as string}
        revieweeId={isDriver ? job.cargo_owner_id : job.driver_id}
        revieweeName={isDriver ? (job.cargo_owner?.full_name || "Cargo Owner") : (job.driver?.full_name || "Driver")}
        revieweeRole={isDriver ? "cargo_owner" : "driver"}
      />
    </SafeAreaView>
  );
}

import { TextInput } from "react-native-paper";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text,
  },
  statusChip: {
    borderRadius: 6,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  mapCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  map: {
    height: 200,
  },
  marker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  detailsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
  },
  routeContainer: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 32,
    backgroundColor: Colors.border,
    marginLeft: 5,
    marginVertical: 4,
  },
  routeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  routeText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: "500",
    marginTop: 2,
  },
  divider: {
    marginVertical: 16,
  },
  detailsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  detailItem: {
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 2,
  },
  descriptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  actionButton: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginBottom: 16,
  },
  warningCard: {
    backgroundColor: Colors.error + "10",
    marginBottom: 16,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  warningText: {
    fontSize: 14,
    color: Colors.error,
    flex: 1,
  },
  dispatchCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 16,
  },
  dispatchTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  dispatchSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  photoButton: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  photoPreview: {
    alignItems: "center",
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  dispatchButton: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  quoteCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  quoteDriverInfo: {
    marginLeft: 12,
    flex: 1,
  },
  quoteDriverName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  quotePriceContainer: {
    alignItems: "flex-end",
  },
  quotePrice: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary,
  },
  quoteDeposit: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  quoteMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: "italic",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  quoteActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  quoteActionButton: {
    flex: 1,
    borderRadius: 8,
  },
  driverCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginTop: 8,
  },
  driverCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  driverInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  driverDetails: {
    marginLeft: 12,
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  driverMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  driverRating: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  callButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + "10",
    justifyContent: "center",
    alignItems: "center",
  },
  dialogInput: {
    marginBottom: 12,
    backgroundColor: Colors.surface,
  },
  quotesHeader: { marginBottom: 8 },
  filtersCard: { backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 12 },
  filtersContent: { paddingVertical: 10 },
  filtersRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  filtersLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600", width: 72 },
  ratingChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, flex: 1 },
  ratingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  ratingChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ratingChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: "600" },
  ratingChipTextActive: { color: "#fff" },
  emptyQuotesCard: { backgroundColor: Colors.surface, borderRadius: 12, marginBottom: 12 },
  emptyQuotesContent: { alignItems: "center", paddingVertical: 18 },
  emptyQuotesTitle: { fontSize: 14, fontWeight: "700", color: Colors.text, marginTop: 6 },
  emptyQuotesNote: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },
});
