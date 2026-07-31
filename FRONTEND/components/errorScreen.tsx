import { AlertCircle } from "lucide-react-native";
import { Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ErrorScreenProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
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
      {/* Error icon */}
      <AlertCircle size={48} color="#c62828" />

      {/* Message */}
      <Text
        style={{
          marginTop: 16,
          fontSize: 15,
          fontWeight: "500",
          color: "#c62828",
          textAlign: "center",
          lineHeight: 22,
        }}
      >
        {message}
      </Text>

      {/* Optional retry button */}
      {onRetry && (
        <TouchableOpacity
          onPress={onRetry}
          activeOpacity={0.7}
          style={{
            marginTop: 24,
            backgroundColor: "#17690c",
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
            Try again
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
