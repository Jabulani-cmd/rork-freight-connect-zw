import React, { useState } from "react";
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from "react-native";
import { Text, Button, TextInput, Chip, Snackbar } from "react-native-paper";
import Slider from "@react-native-community/slider";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "@/lib/store";
import { Colors, VehicleColors } from "@/constants/colors";
import { 
  MapPin, 
  Package, 
  Truck, 
  Weight,
  ChevronLeft,
  Bike,
  Building2,
  User,
  Hash
} from "lucide-react-native";
import { supabase } from "@/lib/supabase";
import LocationPicker from "@/components/LocationPicker";
import { addDraft, loadDrafts } from "@/lib/drafts";
import { addTrackingEvent, notifyParties } from "@/lib/waybill";
import { CloudOff, FileText } from "lucide-react-native";

const vehicleTypes = [
  { id: "motorcycle", label: "Motorcycle", icon: Bike, maxWeight: 50 },
  { id: "van", label: "Van", icon: Truck, maxWeight: 1000 },
  { id: "small_truck", label: "Small Truck", icon: Truck, maxWeight: 5000 },
  { id: "heavy_truck", label: "Heavy Truck", icon: Truck, maxWeight: 30000 },
  { id: "fleet", label: "Fleet", icon: Building2, maxWeight: 100000 },
];

const goodsTypes = [
  "Electronics",
  "Furniture",
  "Food & Beverages",
  "Construction Materials",
  "Clothing & Textiles",
  "Machinery",
  "Documents",
  "Other",
];

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

function generateWaybill(): string {
  const ts = Date.now().toString(36).toUpperCase().slice(-6);
  const rnd = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `FCZ-${ts}${rnd}`;
}

export default function PostJobScreen() {
  const router = useRouter();
  const { profile, user } = useStore();
  
  const [pickupLocation, setPickupLocation] = useState<LocationData | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<LocationData | null>(null);
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showDropoffPicker, setShowDropoffPicker] = useState(false);
  const [weight, setWeight] = useState(100);
  const [goodsType, setGoodsType] = useState("");
  const [preferredVehicle, setPreferredVehicle] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [draftCount, setDraftCount] = useState(0);

  React.useEffect(() => {
    loadDrafts().then((list) =>
      setDraftCount(list.filter((d) => d.syncStatus !== "synced").length)
    );
  }, []);

  const handlePostJob = async () => {
    console.log("[PostJob] pressed", {
      hasPickup: !!pickupLocation,
      hasDropoff: !!dropoffLocation,
      goodsType,
      hasUser: !!user,
    });
    if (!pickupLocation) {
      setError("Please select a pickup location");
      return;
    }
    if (!dropoffLocation) {
      setError("Please select a dropoff location");
      return;
    }
    if (!goodsType) {
      setError("Please select the type of goods");
      return;
    }

    if (!user) {
      setError("You must be logged in to post a job");
      return;
    }

    setLoading(true);
    const waybillNumber = generateWaybill();
    const basePayload = {
      cargo_owner_id: user.id,
      pickup_location: {
        address: pickupLocation.address,
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
      },
      dropoff_location: {
        address: dropoffLocation.address,
        latitude: dropoffLocation.latitude,
        longitude: dropoffLocation.longitude,
      },
      weight_kg: weight,
      goods_type: goodsType,
      preferred_vehicle_type: preferredVehicle,
      description,
      status: "open" as const,
    };
    const waybillPayload = {
      waybill_number: waybillNumber,
      sender_name: senderName || profile?.fullName || null,
      sender_phone: senderPhone || profile?.phone || null,
      receiver_name: receiverName || null,
      receiver_phone: receiverPhone || null,
    };
    try {
      let { data, error: jobError } = await supabase
        .from("jobs")
        .insert({ ...basePayload, ...waybillPayload })
        .select()
        .single();
      if (jobError && /column|schema/i.test(jobError.message || "")) {
        console.log("[PostJob] waybill columns missing, retrying base insert");
        const retry = await supabase.from("jobs").insert(basePayload).select().single();
        data = retry.data;
        jobError = retry.error;
      }
      if (jobError) throw jobError;

      await addTrackingEvent({
        jobId: data.id,
        type: "posted",
        description: `Shipment created from ${pickupLocation.address} to ${dropoffLocation.address}`,
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude,
      });
      await notifyParties({
        jobId: data.id,
        waybill: waybillNumber,
        senderPhone: senderPhone || profile?.phone,
        receiverPhone: receiverPhone,
        message: `Shipment ${waybillNumber} created. Track it in Freight Connect ZW.`,
      });

      router.push({
        pathname: "/job/success",
        params: { jobId: data.id, waybill: waybillNumber }
      });
    } catch (err: any) {
      console.log("Post failed, saving as offline draft", err?.message);
      try {
        await addDraft({
          cargoOwnerId: user.id,
          pickupLocation: {
            address: pickupLocation.address,
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
          },
          dropoffLocation: {
            address: dropoffLocation.address,
            latitude: dropoffLocation.latitude,
            longitude: dropoffLocation.longitude,
          },
          weightKg: weight,
          goodsType,
          preferredVehicleType: preferredVehicle,
          description,
        });
        setError("Saved offline. Will sync when online.");
        setTimeout(() => router.replace("/drafts"), 600);
      } catch (draftErr: any) {
        setError(draftErr?.message || "Failed to post job");
      }
    } finally {
      setLoading(false);
    }
  };

  const saveAsDraft = async () => {
    if (!user) return;
    if (!pickupLocation || !dropoffLocation || !goodsType) {
      setError("Fill pickup, dropoff and goods type to save a draft");
      return;
    }
    await addDraft({
      cargoOwnerId: user.id,
      pickupLocation,
      dropoffLocation,
      weightKg: weight,
      goodsType,
      preferredVehicleType: preferredVehicle,
      description,
    });
    router.replace("/drafts");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Post a Job</Text>
          <TouchableOpacity onPress={() => router.push("/drafts")} style={styles.draftsBtn} testID="open-drafts">
            <FileText size={18} color={Colors.primary} />
            {draftCount > 0 && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>{draftCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Locations</Text>
            
            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setShowPickupPicker(true)}
            >
              <View style={styles.locationIcon}>
                <MapPin size={20} color={Colors.success} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Pickup Location</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {pickupLocation?.address || "Tap to select pickup location"}
                </Text>
              </View>
              <ChevronLeft size={20} color={Colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>

            <View style={styles.routeLine} />

            <TouchableOpacity
              style={styles.locationButton}
              onPress={() => setShowDropoffPicker(true)}
            >
              <View style={[styles.locationIcon, { backgroundColor: Colors.error + "15" }]}>
                <MapPin size={20} color={Colors.error} />
              </View>
              <View style={styles.locationTextContainer}>
                <Text style={styles.locationLabel}>Dropoff Location</Text>
                <Text style={styles.locationValue} numberOfLines={1}>
                  {dropoffLocation?.address || "Tap to select dropoff location"}
                </Text>
              </View>
              <ChevronLeft size={20} color={Colors.textMuted} style={{ transform: [{ rotate: '180deg' }] }} />
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚖️ Cargo Details</Text>
            
            <View style={styles.weightContainer}>
              <View style={styles.weightHeader}>
                <Weight size={20} color={Colors.primary} />
                <Text style={styles.weightLabel}>Weight: {weight} kg</Text>
              </View>
              <Slider
                value={weight}
                onValueChange={setWeight}
                minimumValue={1}
                maximumValue={5000}
                step={10}
                minimumTrackTintColor={Colors.primary}
                maximumTrackTintColor={Colors.border}
                thumbTintColor={Colors.primary}
              />
              <View style={styles.weightRange}>
                <Text style={styles.weightRangeText}>1 kg</Text>
                <Text style={styles.weightRangeText}>5000 kg</Text>
              </View>
            </View>

            <Text style={styles.label}>Type of Goods</Text>
            <View style={styles.goodsTypeContainer}>
              {goodsTypes.map((type) => (
                <Chip
                  key={type}
                  selected={goodsType === type}
                  onPress={() => setGoodsType(type)}
                  style={[
                    styles.goodsChip,
                    goodsType === type && styles.selectedGoodsChip
                  ]}
                  textStyle={goodsType === type ? styles.selectedGoodsChipText : undefined}
                >
                  {type}
                </Chip>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🚛 Preferred Vehicle (Optional)</Text>
            <View style={styles.vehicleTypesContainer}>
              {vehicleTypes.map((vehicle) => {
                const Icon = vehicle.icon;
                const isSelected = preferredVehicle === vehicle.id;
                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={[
                      styles.vehicleCard,
                      isSelected && { 
                        borderColor: VehicleColors[vehicle.id as keyof typeof VehicleColors],
                        backgroundColor: VehicleColors[vehicle.id as keyof typeof VehicleColors] + "10"
                      }
                    ]}
                    onPress={() => setPreferredVehicle(vehicle.id)}
                  >
                    <Icon 
                      size={28} 
                      color={isSelected ? VehicleColors[vehicle.id as keyof typeof VehicleColors] : Colors.textSecondary} 
                    />
                    <Text style={[
                      styles.vehicleLabel,
                      isSelected && { color: VehicleColors[vehicle.id as keyof typeof VehicleColors] }
                    ]}>
                      {vehicle.label}
                    </Text>
                    <Text style={styles.vehicleMaxWeight}>Max {vehicle.maxWeight}kg</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Sender & Receiver</Text>
            <View style={styles.partyRow}>
              <TextInput
                label="Sender name"
                value={senderName}
                onChangeText={setSenderName}
                mode="outlined"
                style={styles.partyInput}
                outlineColor={Colors.border}
                activeOutlineColor={Colors.primary}
              />
              <TextInput
                label="Sender phone"
                value={senderPhone}
                onChangeText={setSenderPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.partyInput}
                outlineColor={Colors.border}
                activeOutlineColor={Colors.primary}
              />
            </View>
            <View style={styles.partyRow}>
              <TextInput
                label="Receiver name"
                value={receiverName}
                onChangeText={setReceiverName}
                mode="outlined"
                style={styles.partyInput}
                outlineColor={Colors.border}
                activeOutlineColor={Colors.primary}
              />
              <TextInput
                label="Receiver phone"
                value={receiverPhone}
                onChangeText={setReceiverPhone}
                mode="outlined"
                keyboardType="phone-pad"
                style={styles.partyInput}
                outlineColor={Colors.border}
                activeOutlineColor={Colors.primary}
              />
            </View>
            <View style={styles.waybillInfo}>
              <Hash size={16} color={Colors.primary} />
              <Text style={styles.waybillInfoText}>
                A waybill number will be generated for this shipment. Both sender and receiver will get SMS updates.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Additional Information</Text>
            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              style={styles.textArea}
              placeholder="Add any special instructions..."
              multiline
              numberOfLines={4}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.primary}
            />
          </View>

          <Button
            mode="contained"
            onPress={handlePostJob}
            loading={loading}
            disabled={loading}
            style={styles.postButton}
            testID="post-job-submit"
            contentStyle={styles.postButtonContent}
            labelStyle={styles.postButtonLabel}
            textColor="#FFFFFF"
          >
            {loading ? "Posting..." : "Post Job"}
          </Button>
          <Button
            mode="outlined"
            onPress={saveAsDraft}
            style={styles.draftSaveButton}
            icon={() => <CloudOff size={16} color={Colors.primary} />}
            textColor={Colors.primary}
          >
            Save offline draft
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationPicker
        visible={showPickupPicker}
        onClose={() => setShowPickupPicker(false)}
        onSelect={setPickupLocation}
        title="Select Pickup Location"
        initialLocation={pickupLocation || undefined}
      />

      <LocationPicker
        visible={showDropoffPicker}
        onClose={() => setShowDropoffPicker(false)}
        onSelect={setDropoffLocation}
        title="Select Dropoff Location"
        initialLocation={dropoffLocation || undefined}
      />

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 16,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 15,
    fontWeight: "500",
    color: Colors.text,
  },
  routeLine: {
    width: 2,
    height: 24,
    backgroundColor: Colors.border,
    marginLeft: 35,
    marginVertical: 4,
  },
  weightContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  weightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  weightLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  weightRange: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  weightRangeText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
    fontWeight: "500",
  },
  goodsTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  goodsChip: {
    backgroundColor: Colors.surface,
  },
  selectedGoodsChip: {
    backgroundColor: Colors.primary,
  },
  selectedGoodsChipText: {
    color: "#fff",
  },
  vehicleTypesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  vehicleCard: {
    width: (Dimensions.get("window").width - 52) / 2,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.border,
  },
  vehicleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 8,
  },
  vehicleMaxWeight: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  textArea: {
    backgroundColor: Colors.surface,
  },
  postButton: {
    borderRadius: 12,
    backgroundColor: Colors.primary,
    marginBottom: 20,
  },
  postButtonContent: {
    paddingVertical: 8,
  },
  postButtonLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  errorSnackbar: {
    backgroundColor: Colors.error,
  },
  draftsBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  draftBadge: {
    position: "absolute",
    top: 6,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
  },
  draftBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  draftSaveButton: { borderRadius: 12, marginBottom: 32, borderColor: Colors.primary },
  partyRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  partyInput: { flex: 1, backgroundColor: Colors.surface },
  waybillInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.primary + "10",
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  waybillInfoText: { flex: 1, fontSize: 12, color: Colors.text, lineHeight: 18 },
});
