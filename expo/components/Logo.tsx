import React from "react";
import { Image, StyleSheet, View, ViewStyle } from "react-native";

export const LOGO_URL =
  "https://r2-pub.rork.com/generated-images/0965b707-65ed-478a-8f6c-280d4b2a2e79.png";

type LogoProps = {
  size?: number;
  style?: ViewStyle;
  testID?: string;
};

export default function Logo({ size = 110, style, testID }: LogoProps) {
  return (
    <View
      style={[
        styles.wrapper,
        { width: size, height: size },
        style,
      ]}
      testID={testID ?? "app-logo"}
    >
      <Image
        source={{ uri: LOGO_URL }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
});
