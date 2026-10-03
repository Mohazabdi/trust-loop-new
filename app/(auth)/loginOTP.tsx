import { supabase } from "@/lib/mysupabase/supabase";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LoginPageStyles } from "@/styles/auth_styles/login_page.styles";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, ChevronLeft } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
interface logInCredentials {
  email: string;
  password: string;
}

export default function LogInOTPPage() {
  const { theme } = useGlobalStorage();
  const router = useRouter();
  const styles = useMemo(() => LoginPageStyles(theme), [theme]);
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const params = useLocalSearchParams<{
    identifier?: string;
    mode?: "signin" | "verify";
  }>();
  //const [userNameInput, setUserNameInput] = useState("");
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));

  const [mode, setMode] = useState<"signin" | "verify">(
    params.mode || "signin",
  );
  const [userNameInput, setUserNameInput] = useState(params.identifier || "");
  // const [otpSent, setOtpSent] = useState(
  //   // If we arrived with an identifier and mode, immediately show OTP boxes
  //   !!params.identifier,
  // );
  const [otpSent, setOtpSent] = useState(
    params.mode === "verify", // only verify mode starts with OTP boxes visible
  );
  const [identifierType, setIdentifierType] = useState<
    "email" | "phone" | null
  >(
    params.identifier
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(params.identifier)
        ? "email"
        : "phone"
      : null,
  );
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const didAutoSend = useRef(false);
  useEffect(() => {
    if (params.identifier && mode === "signin" && !didAutoSend.current) {
      didAutoSend.current = true;
      handleRequestCode();
    }
  }, []);

  // Create an array of references to control the input focus mapping hooks
  const inputRefs = useRef<TextInput[]>([]);

  const handleChangeText = (text: string, index: number) => {
    const newOtp = [...otp];
    // Keep only the last character typed to prevent multi-character input bugs
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input area box if a number was typed
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // If user presses backspace/delete on an empty box, jump back to the previous input box
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };
  const handleRequestCode = async () => {
    const cleanInput = userNameInput.trim();
    if (!cleanInput) {
      setErrorMessage("Please enter your email or phone number.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9+\s\-()]+$/;

    setIsSending(true);
    setErrorMessage("");

    let type: "email" | "phone";
    let value: string;

    if (emailRegex.test(cleanInput)) {
      type = "email";
      value = cleanInput;
      const { error } = await supabase.auth.signInWithOtp({ email: value });
      if (!error) {
        router.push({ pathname: "/checkEmail", params: { email: value } });
        return; // Exit early – no OTP boxes shown
      }
      setErrorMessage(error.message);
      setIsSending(false);
      return;
    } else if (phoneRegex.test(cleanInput)) {
      type = "phone";
      // Normalize phone number
      let digits = cleanInput.replace(/\D/g, "");
      if (digits.startsWith("0")) digits = "254" + digits.substring(1);
      value = `+${digits}`;
      const { error } = await supabase.auth.signInWithOtp({
        phone: value,
      });
      if (error) {
        setErrorMessage(error.message);
        setIsSending(false);
        return;
      }
    } else {
      setErrorMessage("Please enter a valid email or phone number.");
      setIsSending(false);
      return;
    }

    setIsSending(false);
    setIdentifierType(type);
    setOtpSent(true);
    setOtp(new Array(6).fill(""));
  };
  const handleVerify = async () => {
    const fullCode = otp.join("");
    if (fullCode.length < 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    if (!identifierType || !userNameInput.trim()) return;

    setIsVerifying(true);
    setErrorMessage("");

    const cleanInput = userNameInput.trim();
    let error: { message: string } | null = null;

    if (identifierType === "email") {
      const result = await supabase.auth.verifyOtp({
        email: cleanInput,
        token: fullCode,
        type: "email",
      });
      error = result.error;
    } else {
      // Phone – normalize again (same logic)
      let digits = cleanInput.replace(/\D/g, "");
      if (digits.startsWith("0")) digits = "254" + digits.substring(1);
      const phone = `+${digits}`;
      const result = await supabase.auth.verifyOtp({
        phone,
        token: fullCode,
        type: "sms",
      });
      error = result.error;
    }

    setIsVerifying(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }
    console.log("OTP verified successfully");
    router.replace("/(tabs)");
  };
  const [alwaysUseOtp, setAlwaysUseOtp] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          padding: 20,
          borderRadius: 30,
          width: 50,
          justifyContent: "center",
          alignItems: "center",
          height: 50,
          backgroundColor: "#fff",
          shadowColor: "#212520",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 5,
          margin: 20,
        }}
      >
        <ChevronLeft size={23} color={"#212520"} />
      </TouchableOpacity>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.mainContent}
      >
        <View style={styles.appLogoContainer}>
          <Text style={styles.logoText}>T</Text>
          <Text style={styles.platformNameText}>TrustLoop</Text>
        </View>
        <View style={styles.greetingsContainer}>
          <Text style={styles.greetingsText}>
            {mode === "verify" ? "Verify your phone" : "Using OTP"}
          </Text>
          {mode === "verify" && userNameInput ? (
            <Text style={{ fontSize: 12, color: "#4a4a4a", marginTop: 4 }}>
              Enter the code sent to {userNameInput}
            </Text>
          ) : null}
        </View>
        <View style={styles.formContainer}>
          <Text style={styles.fieldLabel}>Email /Phone no*</Text>
          <TextInput
            value={userNameInput}
            onChangeText={setUserNameInput}
            editable={mode !== "verify"}
            keyboardType="email-address"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            // style={styles.fieldInput}
            style={[
              styles.fieldInput,
              // optional: grey background when disabled
              mode === "verify" && { backgroundColor: "#f0f0f0" },
            ]}
            placeholder="example@gmail.com"
            placeholderTextColor={"#918d8d"}
          />
        </View>
        {!otpSent ? (
          // ---- Request Code screen ----
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRequestCode}
              disabled={isSending}
            >
              {isSending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Request Code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // ---- Enter OTP screen ----
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                width: "80%",
                paddingHorizontal: 5,
                marginTop: 10,
              }}
            >
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(el) => {
                    if (el) inputRefs.current[index] = el;
                  }}
                  value={digit}
                  onChangeText={(text) => handleChangeText(text, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="number-pad"
                  maxLength={2}
                  selectTextOnFocus={true}
                  style={{
                    width: 38,
                    height: 41,
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: digit ? "#17690c" : "#212520",
                    textAlign: "center",
                    fontSize: 14,
                    fontWeight: "bold",
                    color: "#000",
                  }}
                />
              ))}
            </View>

            {errorMessage ? (
              <Text style={{ color: "#c62828", fontSize: 12, marginTop: 8 }}>
                {errorMessage}
              </Text>
            ) : null}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleVerify}
                disabled={isVerifying}
              >
                {isVerifying ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify Code</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Allow resend code */}
            <TouchableOpacity
              onPress={handleRequestCode}
              disabled={isSending}
              style={{ marginTop: 10 }}
            >
              <Text
                style={{ color: "#17690c", textDecorationLine: "underline" }}
              >
                {isSending ? "Resending..." : "Resend code"}
              </Text>
            </TouchableOpacity>

            {/* Allow changing identifier only in signin mode */}
            {mode !== "verify" && (
              <TouchableOpacity
                onPress={() => {
                  setOtpSent(false);
                  setErrorMessage("");
                  setOtp(new Array(6).fill(""));
                }}
                style={{ marginTop: 8 }}
              >
                <Text
                  style={{ color: "#17690c", textDecorationLine: "underline" }}
                >
                  Change email / phone
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
        <View
          style={{
            width: "75%",
            paddingHorizontal: 3,

            // borderWidth: 1,
          }}
        >
          <TouchableOpacity
            onPress={() => setAlwaysUseOtp(!alwaysUseOtp)}
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              // alignItems: "center",
              gap: 14,
              paddingVertical: 12,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                borderWidth: 2,
                borderColor: "#17690c",
                backgroundColor: alwaysUseOtp ? "#17690c" : "#fff",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {alwaysUseOtp && <Check size={18} color="#fff" strokeWidth={3} />}
            </View>

            {/* The Label Text */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "600",
                  color: "#1a1a1a",
                }}
              >
                Always use OTP to log in
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.loginPreliminariesContainer}>
          <TouchableOpacity
            style={{ paddingVertical: 8 }}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.forgotPasswordText}>
              Login using password instead?
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
