import { supabase } from "@/lib/mysupabase/supabase";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LoginPageStyles } from "@/styles/auth_styles/login_page.styles";
import { useRouter } from "expo-router";
import { AlertCircle } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Text,
    TextInput,
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

export default function LogInPage() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => LoginPageStyles(theme), [theme]);
  const { height: SCREEN_HEIGHT } = Dimensions.get("window");
  const [userNameInput, setUserNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const validateForm = (): {
    isValid: boolean;
    type?: "email" | "phone";
    value?: string;
  } => {
    const localErrors: FormErrors = {};
    const cleanInput = userNameInput.trim();
    if (!cleanInput) {
      localErrors.userName = "Please enter your phone number or email.";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[0-9+\s\-()]+$/;
      if (emailRegex.test(cleanInput)) {
        setErrors((prev) => ({ ...prev, userName: undefined }));
      } else if (phoneRegex.test(cleanInput)) {
        let digits = cleanInput.replace(/\D/g, "");
        if (digits.startsWith("0")) {
          digits = "254" + digits.substring(1);
        }
        const formattedPhone = `+${digits}`;
        if (formattedPhone.length < 12) {
          localErrors.userName = "Phone number is too short.";
        }
      } else {
        localErrors.userName = "Looks like its an invalid phone no or email.";
      }
    }
    if (!passwordInput) {
      localErrors.password = "Please enter your password.";
    } else if (passwordInput.length < 3) {
      localErrors.password = "Passwords must be at least 3 characters long.";
    }
    setErrors(localErrors);
    if (Object.keys(localErrors).length > 0) {
      return { isValid: false };
    }
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanInput);
    if (isEmail) {
      return { isValid: true, type: "email", value: cleanInput };
    } else {
      let digits = cleanInput.replace(/\D/g, "");
      if (digits.startsWith("0")) digits = "254" + digits.substring(1);
      return { isValid: true, type: "phone", value: `+${digits}` };
    }
  };

  const handleLoginSubmit = async () => {
    setErrors((prev) => ({ ...prev, backend: undefined }));
    const { isValid, type, value } = validateForm();
    if (!isValid) return;
    setIsSubmitting(true);
    try {
      let result;
      if (type === "email") {
        result = await supabase.auth.signInWithPassword({
          email: value!,
          password: passwordInput,
        });
      } else {
        result = await supabase.auth.signInWithPassword({
          phone: value!,
          password: passwordInput,
        });
      }
      if (result.error) {
        let dbError = result.error.message;
        setErrors((prev) => ({ ...prev, backend: dbError }));
        toast(`${dbError}`, {
          position: "top-center",
          icon: <AlertCircle size={20} color={theme.error} />,
        });
      } else {
        console.log(`session successfully established:${result.data.user}`);
      }
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        backend: `something went wrong ,details:${e}`,
      }));
      toast(`${e}`, {
        position: "top-center",
        icon: <AlertCircle size={20} color={theme.error} />,
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View
        // behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.mainContent, { flex: 1 }]}
      >
        {/* <View
          style={{
            paddingTop: 20,
          }}
        /> */}
        <View style={styles.appLogoContainer}>
          <Text style={styles.logoText}>T</Text>
          <Text style={styles.platformNameText}>TrustLoop</Text>
        </View>
        <View style={styles.greetingsContainer}>
          <Text style={styles.greetingsText}>Hujambo !</Text>
          <Text style={styles.welcomeText}>Karibu TrustLoop</Text>
        </View>
        <View style={styles.greetingsContainer}>
          <Text style={styles.loginPromptText}>Log in to your continue</Text>
        </View>
        <View style={styles.formContainer}>
          <Text style={styles.fieldLabel}>Email/Phone Number *</Text>
          <TextInput
            value={userNameInput}
            onChangeText={(text) => {
              setUserNameInput(text);
              if (errors.userName)
                setErrors((prev) => ({ ...prev, userName: undefined }));
            }}
            keyboardType="email-address"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            style={[
              styles.fieldInput,
              { borderColor: errors.userName ? "#c62828" : "#212520" },
            ]}
            placeholder="phone or email"
            placeholderTextColor={"#918d8d"}
          />
          {errors.userName && (
            <Text
              style={{
                color: "#c62828",
                fontSize: 11,
                fontWeight: "bold",
                paddingLeft: 4,
              }}
            >
              {errors.userName}
            </Text>
          )}
          <Text style={styles.fieldLabel}>Password *</Text>
          <TextInput
            value={passwordInput}
            onChangeText={setPasswordInput}
            secureTextEntry
            keyboardType="default"
            //style={styles.fieldInput}
            style={[
              styles.fieldInput,
              { borderColor: errors.password ? "#c62828" : "#212520" },
            ]}
            // placeholder="example@gmail.com"
            // placeholderTextColor={"#918d8d"}
          />
          {errors.password && (
            <Text
              style={{
                color: "#c62828",
                fontSize: 11,
                fontWeight: "bold",
                paddingLeft: 4,
              }}
            >
              {errors.password}
            </Text>
          )}
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleLoginSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Log in</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.loginPreliminariesContainer}>
          <TouchableOpacity
            style={{ paddingVertical: 8 }}
            onPress={() => router.push("/resetPassword")}
          >
            <Text style={styles.forgotPasswordText}>Forgot password ?</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 8 }}>
            <Text
              style={styles.createAccountText}
              onPress={() => {
                // If the user has typed something, pre‑fill the OTP page
                if (userNameInput.trim()) {
                  router.push({
                    pathname: "/loginOTP",
                    params: {
                      identifier: userNameInput.trim(),
                      mode: "signin",
                    },
                  });
                } else {
                  router.push("/loginOTP");
                }
              }}
            >
              Log in using OTP instead
            </Text>
          </TouchableOpacity>
          <View style={styles.createAccountContainer}>
            <Text style={styles.newToTrustLoopText}>New to TrustLoop? </Text>
            <TouchableOpacity
              style={{ padding: 4 }}
              onPress={() => router.push("/signUp")}
            >
              <Text style={styles.createAccountText}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
