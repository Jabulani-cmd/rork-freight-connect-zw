import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../lib/supabase';

const PLANS = {
  light: { name: 'Light Plan', price: 5, jobs: 5, deposit: 200 },
  regular: { name: 'Regular Plan', price: 12, jobs: 20, deposit: 500 },
  business: { name: 'Business Plan', price: 25, jobs: 'Unlimited', deposit: 'Unlimited' },
};

export default function SubscriptionScreen() {
  const simulatePayment = async (planKey: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_status: 'active',
        subscription_plan: planKey,
        subscription_end_date: endDate.toISOString(),
      })
      .eq('id', user.id);
    if (error) {
      Alert.alert('Error', 'Could not activate subscription.');
    } else {
      Alert.alert('Success', 'Subscription activated!');
      router.replace('/(tabs)/job');
    }
  };

  const handleSelectPlan = (planKey: keyof typeof PLANS) => {
    Alert.alert(
      'Confirm',
      `Subscribe to ${PLANS[planKey].name} for $${PLANS[planKey].price}/month?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Subscribe', onPress: () => simulatePayment(planKey) }
      ]
    );
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/onboarding/role');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Plan</Text>
      <Text style={styles.subtitle}>Continue using Freight Connect</Text>
      {Object.entries(PLANS).map(([key, plan]) => (
        <View key={key} style={styles.planCard}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>${plan.price}<Text style={styles.perMonth}>/month</Text></Text>
          <Text style={styles.planFeature}>📦 {plan.jobs} jobs per month</Text>
          <Text style={styles.planFeature}>💰 Deposit up to ${plan.deposit}</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => handleSelectPlan(key as keyof typeof PLANS)}>
            <Text style={styles.selectButtonText}>Select</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 30 },
  planCard: { backgroundColor: '#f9f9f9', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  planName: { fontSize: 18, fontWeight: '600' },
  planPrice: { fontSize: 24, fontWeight: 'bold', color: '#2ecc71' },
  perMonth: { fontSize: 14, fontWeight: 'normal', color: '#666' },
  planFeature: { fontSize: 14, color: '#555', marginBottom: 4 },
  selectButton: { backgroundColor: '#3498db', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  selectButtonText: { color: '#fff', fontWeight: '600' },
  logoutButton: { marginTop: 20, alignItems: 'center' },
  logoutText: { color: 'red' },
});
