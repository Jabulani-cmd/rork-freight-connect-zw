import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type ScreenBackgroundProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: "default" | "soft";
};

export default function ScreenBackground({
  children,
  style,
  variant = "default",
}: ScreenBackgroundProps) {
  const colors =
    variant === "soft"
      ? (["#EAF2FB", "#FFF3EA", "#FFE4D1"] as const)
      : (["#0F2A47", "#1E3A5F", "#FF6B35"] as const);

  return (
    <View style={[styles.root, style]} testID="screen-bg">
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
