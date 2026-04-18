// app/(auth)/verify.tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'cargo_owner' | 'driver' | null>(null);
  const [vehicleData, setVehicleData] = useState<any>(null);

  // Load onboarding data
  useEffect(() => {
    const loadData = async () => {
      const savedRole = await AsyncStorage.getItem('onboardingRole');
      if (savedRole === 'cargo_owner' || savedRole === 'driver') setRole(savedRole);
      if (savedRole === 'driver') {
        const vehicleJson = await AsyncStorage.getItem('driverVehicle');
        if (vehicleJson) setVehicleData(JSON.parse(vehicleJson));
      }
    };
    loadData();
  }, []);

  const verifyAndComplete = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }
    if (!role) {
      Alert.alert('Error', 'Please go back and select your role');
      router.replace('/onboarding/role');
      return;
    }
    setLoading(true);
    try {
      // Verify OTP
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: phone!,
        token: otp,
        type: 'sms',
      });
      if (verifyError) throw verifyError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('User ID missing');

      // Trial dates
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 7);

      // Insert profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        phone_number: phone,
        role: role,
        trial_start_date: new Date().toISOString(),
        trial_end_date: trialEnd.toISOString(),
        subscription_status: 'trial',
      });
      if (profileError) throw profileError;

      // Insert role-specific profile
      if (role === 'driver' && vehicleData) {
        const { error: driverError } = await supabase.from('driver_profiles').insert({
          id: userId,
          vehicle_type: vehicleData.vehicleType,
          vehicle_capacity_kg: vehicleData.capacityKg,
          // license_photo_url, insurance_photo_url can be added later
        });
        if (driverError) throw driverError;
      } else if (role === 'cargo_owner') {
        await supabase.from('cargo_owner_profiles').insert({ id: userId });
      }

      // Clear onboarding storage
      await AsyncStorage.multiRemove(['onboardingRole', 'driverVehicle', 'trialStarted']);

      Alert.alert('Success', 'Your 7-day free trial has started!');
      router.replace('/(tabs)/job'); // or appropriate start screen
    } catch (err: any) {
      Alert.alert('Verification failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify your phone</Text>
      <Text style={styles.subtitle}>We sent a code to {phone}</Text>
      <TextInput
        style={styles.input}
        placeholder="6-digit code"
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
      />
      <TouchableOpacity style={styles.button} onPress={verifyAndComplete} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Complete →'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', marginBottom: 30, color: '#666' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#2ecc71', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});