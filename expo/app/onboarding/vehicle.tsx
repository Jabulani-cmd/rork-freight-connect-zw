import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import { Text, Button, TextInput, Chip, Snackbar } from "react-native-paper";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";
import { useStore } from "@/lib/store";
import { Colors, VehicleColors } from "@/constants/colors";
import { Camera, Bike, Van, Truck, Building2, ChevronRight } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import ScreenBackground from "@/components/ScreenBackground";

const vehicleTypes = [
  { id: "motorcycle", label: "Motorcycle", icon: Bike, capacity: "Up to 50kg" },
  { id: "van", label: "Van", icon: Van, capacity: "Up to 1,000kg" },
  { id: "small_truck", label: "Small Truck", icon: Truck, capacity: "Up to 5,000kg" },
  { id: "heavy_truck", label: "Heavy Truck", icon: Truck, capacity: "Up to 30,000kg" },
  { id: "fleet", label: "Fleet Owner", icon: Building2, capacity: "Multiple vehicles" },
];

export default function VehicleRegistrationScreen() {
  const [vehicleType, setVehicleType] = useState<string | null>(null);
  const [licensePlate, setLicensePlate] = useState("");
  const [weightCapacity, setWeightCapacity] = useState("");
  const [vehiclePhoto, setVehiclePhoto] = useState<string | null>(null);
  const [insurancePhoto, setInsurancePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const { user, setVehicle } = useStore();

  const pickImage = async (setImage: (uri: string) => void) => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!vehicleType || !licensePlate || !weightCapacity || !user) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .insert({
          driver_id: user.id,
          type: vehicleType,
          license_plate: licensePlate.toUpperCase(),
          weight_capacity_kg: parseInt(weightCapacity),
          vehicle_photo_url: vehiclePhoto,
          insurance_photo_url: insurancePhoto,
          is_verified: false,
        })
        .select()
        .single();

      if (error) throw error;

      setVehicle({
        id: data.id,
        type: data.type,
        weightCapacityKg: data.weight_capacity_kg,
        licensePlate: data.license_plate,
        insurancePhotoUrl: data.insurance_photo_url,
        vehiclePhotoUrl: data.vehicle_photo_url,
        isVerified: data.is_verified,
      });

      router.replace("/onboarding/subscription");
    } catch (err: any) {
      setError(err.message || "Failed to register vehicle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenBackground variant="soft">
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Register Your Vehicle</Text>
        <Text style={styles.subtitle}>
          Complete your vehicle details to start accepting jobs
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Type</Text>
          <View style={styles.vehicleTypesContainer}>
            {vehicleTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = vehicleType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.vehicleTypeCard,
                    isSelected && styles.selectedVehicleType,
                  ]}
                  onPress={() => setVehicleType(type.id)}
                >
                  <Icon
                    size={24}
                    color={
                      isSelected ? Colors.primary : Colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.vehicleTypeLabel,
                      isSelected && styles.selectedVehicleTypeLabel,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text style={styles.vehicleCapacity}>{type.capacity}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vehicle Details</Text>
          <TextInput
            label="License Plate"
            value={licensePlate}
            onChangeText={setLicensePlate}
            mode="outlined"
            style={styles.input}
            autoCapitalize="characters"
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
          <TextInput
            label="Weight Capacity (kg)"
            value={weightCapacity}
            onChangeText={setWeightCapacity}
            mode="outlined"
            style={styles.input}
            keyboardType="numeric"
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          
          <TouchableOpacity
            style={styles.photoCard}
            onPress={() => pickImage(setVehiclePhoto)}
          >
            {vehiclePhoto ? (
              <Image source={{ uri: vehiclePhoto }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={32} color={Colors.primary} />
                <Text style={styles.photoText}>Take Vehicle Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoCard}
            onPress={() => pickImage(setInsurancePhoto)}
          >
            {insurancePhoto ? (
              <Image source={{ uri: insurancePhoto }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Camera size={32} color={Colors.secondary} />
                <Text style={styles.photoText}>Take Insurance Photo</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleContinue}
          loading={loading}
          disabled={loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Continue
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 12,
  },
  vehicleTypesContainer: {
    gap: 12,
  },
  vehicleTypeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  selectedVehicleType: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "08",
  },
  vehicleTypeLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  selectedVehicleTypeLabel: {
    color: Colors.primary,
  },
  vehicleCapacity: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  input: {
    backgroundColor: Colors.surface,
    marginBottom: 12,
  },
  photoCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: "dashed",
    marginBottom: 12,
    overflow: "hidden",
  },
  photoPlaceholder: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  photoText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  photo: {
    width: "100%",
    height: 150,
    resizeMode: "cover",
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
