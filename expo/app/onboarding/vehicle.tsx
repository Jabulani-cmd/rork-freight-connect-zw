import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VEHICLE_TYPES = ['motorcycle', 'van', 'truck', 'heavy_truck'];

export default function VehicleScreen() {
  const [vehicleType, setVehicleType] = useState('');
  const [capacity, setCapacity] = useState('');
  const [licensePlate, setLicensePlate] = useState('');

  const handleSubmit = async () => {
    if (!vehicleType || !capacity || !licensePlate) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    await AsyncStorage.setItem('driverVehicle', JSON.stringify({
      vehicleType,
      capacityKg: parseInt(capacity),
      licensePlate,
    }));
    router.push('/onboarding/subscription');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Register Your Vehicle</Text>
      {VEHICLE_TYPES.map(type => (
        <TouchableOpacity
          key={type}
          style={[styles.typeButton, vehicleType === type && styles.typeButtonActive]}
          onPress={() => setVehicleType(type)}
        >
          <Text style={styles.typeText}>{type.toUpperCase()}</Text>
        </TouchableOpacity>
      ))}
      <TextInput
        style={styles.input}
        placeholder="Capacity (kg)"
        keyboardType="numeric"
        value={capacity}
        onChangeText={setCapacity}
      />
      <TextInput
        style={styles.input}
        placeholder="License plate"
        value={licensePlate}
        onChangeText={setLicensePlate}
      />
      <TouchableOpacity style={styles.nextButton} onPress={handleSubmit}>
        <Text style={styles.nextText}>Continue →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  typeButton: { padding: 12, backgroundColor: '#f0f0f0', borderRadius: 8, marginBottom: 12, alignItems: 'center' },
  typeButtonActive: { backgroundColor: '#2ecc71' },
  typeText: { fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16 },
  nextButton: { backgroundColor: '#3498db', padding: 14, borderRadius: 8, alignItems: 'center' },
  nextText: { color: '#fff', fontWeight: '600' },
});
