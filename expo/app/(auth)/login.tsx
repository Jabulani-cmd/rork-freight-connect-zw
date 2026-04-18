// app/(auth)/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
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
      // Navigate to verify screen, passing the formatted phone
      router.push({ pathname: '/(auth)/verify', params: { phone: formatted } });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter your phone number</Text>
      <TextInput
        style={styles.input}
        placeholder="0777123456"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />
      <TouchableOpacity style={styles.button} onPress={sendOTP} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push('/onboarding/role')}>
        <Text style={styles.signupText}>New user? Start here</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#2ecc71', padding: 14, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  signupText: { textAlign: 'center', marginTop: 20, color: '#3498db' },
});