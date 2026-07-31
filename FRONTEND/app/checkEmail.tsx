import { supabase } from "@/lib/mysupabase/supabase";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LoginPageStyles } from "@/styles/auth_styles/login_page.styles";
import { useLocalSearchParams, useRouter } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Linking,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
interface FormErrors {
  userName?: string;
  password?: string;
  backend?: string;
}

export default function CheckEmail() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => LoginPageStyles(theme), [theme]);
  //const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || "your email";

  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleResendEmail = async () => {
    if (!email || email === "your email") return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Confirmation email resent!");
    }
  };

  const handleOpenMailApp = () => {
    Linking.openURL("mailto:"); // Opens default mail client
  };

  const handleCheckConfirmation = async () => {
    setChecking(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setChecking(false);
    if (user?.email_confirmed_at) {
      router.replace("/(tabs)");
    } else {
      toast.error("Email not yet confirmed. Please check your inbox.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View
        // behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.mainContent, { flex: 1 }]}
      >
        <View style={styles.appLogoContainer}>
          <MailCheck size={40} color={"#fff"} />
        </View>
        <View style={styles.greetingsContainer}>
          <Text style={styles.greetingsText}>We sent you an Email !</Text>
          <Text style={styles.welcomeText}>
            {`Check your email ${email} to activate your account`}
          </Text>
        </View>
        <View style={styles.greetingsContainer}>
          <Text
            style={styles.loginPromptText}
          >{`Hujambo! Tumekutumia barua pepe kwa ${email}`}</Text>
        </View>
        <View style={{ marginTop: 30, gap: 12, width: "80%" }}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCheckConfirmation}
            disabled={checking}
          >
            {checking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                I've Verified My Email
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleOpenMailApp}
          >
            <Text style={styles.primaryButtonText}>Open Email App</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleResendEmail}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Resend Email</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()}>
            <Text
              style={{
                color: "#17690c",
                textDecorationLine: "underline",
                textAlign: "center",
              }}
            >
              Use a different email
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
