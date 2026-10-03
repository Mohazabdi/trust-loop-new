import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "Hang on, fetching your profile...",
}: LoadingScreenProps) {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: "#ebebeb",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 30,
      }}
    >
      {/* Animated indicator */}
      <ActivityIndicator size="large" color="#17690c" />

      {/* Message */}
      <Text
        style={{
          marginTop: 24,
          fontSize: 15,
          fontWeight: "600",
          color: "#3d3737",
          textAlign: "center",
        }}
      >
        {message}
      </Text>
    </SafeAreaView>
  );
}
