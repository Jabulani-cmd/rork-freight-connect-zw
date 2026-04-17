import { Tabs } from "expo-router";
import { useStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import { Home, Package, Truck, MapPin, User, Wallet, ClipboardList } from "lucide-react-native";

export default function TabLayout() {
  const { profile } = useStore();
  const isDriver = profile?.role === "driver";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="jobs"
        options={{
          title: isDriver ? "Browse" : "My Jobs",
          tabBarIcon: ({ color, size }) => 
            isDriver ? <ClipboardList size={size} color={color} /> : <Package size={size} color={color} />,
        }}
      />

      {isDriver && (
        <Tabs.Screen
          name="earnings"
          options={{
            title: "Earnings",
            tabBarIcon: ({ color, size }) => <Wallet size={size} color={color} />,
          }}
        />
      )}

      {!isDriver && (
        <Tabs.Screen
          name="tracking"
          options={{
            title: "Tracking",
            tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} />,
          }}
        />
      )}

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
