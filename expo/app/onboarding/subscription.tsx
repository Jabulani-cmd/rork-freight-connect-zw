import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SubscriptionScreen() {
  const handleStartTrial = async () => {
    // Mark that user has seen trial offer
    await AsyncStorage.setItem('trialStarted', 'true');
    // Navigate to auth (login/register)
    router.push('/(auth)/login');
  };

  const handleChoosePlan = (plan: string) => {
    Alert.alert('Coming Soon', `You selected ${plan}. Payment will be required after 7-day trial.`);
    // In production, redirect to payment screen
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎁 7 Days Free Trial</Text>
      <Text style={styles.subtitle}>Then choose a plan that fits you</Text>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Light Plan</Text>
        <Text style={styles.planPrice}>$5 / month</Text>
        <Text style={styles.planDesc}>5 jobs per month, deposit up to $200</Text>
        <TouchableOpacity style={styles.planButton} onPress={() => handleChoosePlan('Light')}>
          <Text style={styles.planButtonText}>Select</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Regular Plan</Text>
        <Text style={styles.planPrice}>$12 / month</Text>
        <Text style={styles.planDesc}>20 jobs per month, deposit up to $500</Text>
        <TouchableOpacity style={styles.planButton} onPress={() => handleChoosePlan('Regular')}>
          <Text style={styles.planButtonText}>Select</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.planCard}>
        <Text style={styles.planName}>Business Plan</Text>
        <Text style={styles.planPrice}>$25 / month</Text>
        <Text style={styles.planDesc}>Unlimited jobs, unlimited deposit</Text>
        <TouchableOpacity style={styles.planButton} onPress={() => handleChoosePlan('Business')}>
          <Text style={styles.planButtonText}>Select</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.trialButton} onPress={handleStartTrial}>
        <Text style={styles.trialButtonText}>Start 7‑Day Free Trial →</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginTop: 20, color: '#2ecc71' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 30, color: '#666' },
  planCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  planName: { fontSize: 18, fontWeight: '600' },
  planPrice: { fontSize: 22, fontWeight: 'bold', color: '#3498db', marginVertical: 4 },
  planDesc: { fontSize: 12, color: '#666', marginBottom: 12 },
  planButton: { backgroundColor: '#2ecc71', padding: 10, borderRadius: 8, alignItems: 'center' },
  planButtonText: { color: '#fff', fontWeight: '600' },
  trialButton: { marginTop: 20, backgroundColor: '#f39c12', padding: 16, borderRadius: 12, alignItems: 'center' },
  trialButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});