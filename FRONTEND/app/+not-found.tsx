import { router } from "expo-router";
import { AlertCircle } from "lucide-react-native";
//import { AlertCircle } from "lucide-native"; // Safe, generic visual icon
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotFoundScreen() {
  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 30,
          gap: 20,
        }}
      >
        <View style={{ marginBottom: 10 }}>
          <AlertCircle size={60} color="#3d3737" />
        </View>
        <View style={{ alignItems: "center", gap: 8, marginBottom: 15 }}>
          <Text style={{ fontSize: 24, fontWeight: "bold", color: "#1a1a1a" }}>
            Where are you?
          </Text>
          <Text
            style={{
              fontSize: 16,
              color: "#4a4a4a",
              textAlign: "center",
              lineHeight: 24,
            }}
          >
            mhhh .. Looks like you got lost, but dont worry you can always go
            back !
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleGoBack}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#212520",
            paddingVertical: 18,
            paddingHorizontal: 30,
            borderRadius: 12,
            width: "100%",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 18, fontWeight: "bold" }}>
            Go back
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
