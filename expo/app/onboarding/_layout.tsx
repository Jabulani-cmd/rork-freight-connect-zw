import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LandingScreen() {
  const selectRole = async (role: 'cargo_owner' | 'driver') => {
    await AsyncStorage.setItem('onboardingRole', role);
    if (role === 'driver') {
      router.push('/onboarding/vehicle');
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoText}>FC</Text>
        </View>
        <Text style={styles.appName}>Freight Connect ZW</Text>
        <Text style={styles.tagline}>Connect. Track. Trust.</Text>
      </View>

      {/* Role Selection Cards */}
      <Text style={styles.title}>I want to...</Text>

      <TouchableOpacity
        style={[styles.card, styles.cargoCard]}
        onPress={() => selectRole('cargo_owner')}
        activeOpacity={0.8}
      >
        <View style={styles.cardIconContainer}>
          <Text style={styles.cardIcon}>📦</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Send Goods</Text>
          <Text style={styles.cardDescription}>
            Post jobs, negotiate prices, track deliveries in real-time
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.driverCard]}
        onPress={() => selectRole('driver')}
        activeOpacity={0.8}
      >
        <View style={styles.cardIconContainer}>
          <Text style={styles.cardIcon}>🚚</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>Transport Goods</Text>
          <Text style={styles.cardDescription}>
            Get jobs, receive deposits, share live location
          </Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </TouchableOpacity>

      {/* Login Link for Existing Users */}
      <TouchableOpacity
        style={styles.loginLink}
        onPress={() => router.push('/(auth)/login')}
      >
        <Text style={styles.loginText}>
          Already have an account? <Text style={styles.loginHighlight}>Log in</Text>
        </Text>
      </TouchableOpacity>

      {/* Footer */}
      <Text style={styles.footer}>Secure platform • Deposit protection • GPS tracking</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F97316', // Orange
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E3A8A', // Dark blue
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: '#F97316', // Orange
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 20,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cargoCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#F97316', // Orange accent
  },
  driverCard: {
    borderLeftWidth: 6,
    borderLeftColor: '#1E3A8A', // Blue accent
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEF3C7', // Light orange background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  arrow: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginHighlight: {
    color: '#F97316',
    fontWeight: '600',
  },
  footer: {
    marginTop: 30,
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
  },
});
