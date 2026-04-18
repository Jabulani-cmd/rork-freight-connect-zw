import { Tabs } from 'expo-router';

export default function TabsLayout() {
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
