import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RoleScreen() {
  const selectRole = async (role: 'cargo_owner' | 'driver') => {
    await AsyncStorage.setItem('onboardingRole', role);
    if (role === 'driver') {
      router.push('/onboarding/vehicle');
    } else {
      // Cargo owners go directly to auth (login/register)
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>I want to...</Text>
      <TouchableOpacity style={styles.card} onPress={() => selectRole('cargo_owner')}>
        <Text style={styles.emoji}>📦</Text>
        <Text style={styles.cardTitle}>Send Goods</Text>
        <Text style={styles.cardDesc}>Post jobs, negotiate, track deliveries</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.card} onPress={() => selectRole('driver')}>
        <Text style={styles.emoji}>🚚</Text>
        <Text style={styles.cardTitle}>Transport Goods</Text>
        <Text style={styles.cardDesc}>Get jobs, receive deposits, share location</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 30 },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  emoji: { fontSize: 40, marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 12, color: '#666', textAlign: 'center' },
});