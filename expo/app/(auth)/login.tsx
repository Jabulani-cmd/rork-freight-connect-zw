// app/(auth)/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatPhone = (raw: string) => {
    let cleaned = raw.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '+263' + cleaned.slice(1);
    if (!cleaned.startsWith('+')) cleaned = '+263' + cleaned;
    return cleaned;
  };

  const sendOTP = async () => {
    if (!phone || phone.length < 9) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const formatted = formatPhone(phone);
      const { error } = await supabase.auth.signInWithOtp({ phone: formatted });
      if (error) throw error;
      setOtpSent(true);
      Alert.alert('Success', 'OTP sent');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyAndLogin = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const formatted = formatPhone(phone);
      const { data: authData, error: verifyError } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: otp,
        type: 'sms',
      });
      if (verifyError) throw verifyError;

      const userId = authData.user?.id;
      if (!userId) throw new Error('User ID not found');

      // Fetch profile to check subscription status and role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, subscription_status, trial_end_date, subscription_end_date')
        .eq('id', userId)
        .single();
      if (profileError) throw profileError;

      const now = new Date();
      let hasAccess = false;

      if (profile.subscription_status === 'trial') {
        const trialEnd = new Date(profile.trial_end_date);
        hasAccess = trialEnd > now;
      } else if (profile.subscription_status === 'active') {
        const subEnd = new Date(profile.subscription_end_date);
        hasAccess = subEnd > now;
      }

      if (!hasAccess) {
        Alert.alert(
          'Access Expired',
          'Your free trial has ended. Please subscribe to continue using Freight Connect.',
          [{ text: 'Subscribe', onPress: () => router.replace('/subscription') }]
        );
        return;
      }

      // Redirect to role-specific dashboard
      if (profile.role === 'driver') {
        router.replace('/(tabs)/job');
      } else {
        router.replace('/(tabs)/job');
      }
    } catch (err: any) {
      Alert.alert('Login failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <Text style={styles.subtitle}>Log in to continue</Text>

      {!otpSent ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Phone number (e.g., 0777123456)"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!loading}
          />
          <TouchableOpacity style={styles.button} onPress={sendOTP} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter 6-digit OTP"
            keyboardType="number-pad"
            maxLength={6}
            value={otp}
            onChangeText={setOtp}
          />
          <TouchableOpacity style={styles.button} onPress={verifyAndLogin} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Log In →'}</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={() => router.push('/onboarding/role')} style={styles.signupLink}>
        <Text style={styles.signupText}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 30 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: { backgroundColor: '#2ecc71', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  signupLink: { marginTop: 20, alignItems: 'center' },
  signupText: { color: '#3498db' },
});