import { Tabs } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSubscriptionCheck } from '../../hooks/useSubscriptionCheck';

export default function TabsLayout() {
  const { hasAccess, loading } = useSubscriptionCheck();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!hasAccess) {
    return <Redirect href="/subscription" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="tracking" />
      <Tabs.Screen name="drafts" />
      <Tabs.Screen name="agent" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
