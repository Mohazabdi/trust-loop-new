import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LoginPageStyles } from "@/styles/auth_styles/login_page.styles";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
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

export default function LogInPage() {
  const { theme } = useGlobalStorage();
  const router = useRouter();
  const styles = useMemo(() => LoginPageStyles(theme), [theme]);
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  const [userNameInput, setUserNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const [loginError, setLogInError] = useState("");
  const handleLogIn = (data: logInCredentials) => {
    if (!data.email) {
      setLogInError("specify the email adress ");
      return;
    }
    if (!data.password) {
      setLogInError("enter the password");
      return;
    }
  };
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
          <Text style={styles.greetingsText}>Forgot Password ?</Text>
          <Text style={styles.welcomeText}>Usijali , you can reset it</Text>
        </View>
        <View style={styles.greetingsContainer}>
          <Text style={styles.loginPromptText}>
            Just send us your phone no or email
          </Text>
        </View>
        <View style={styles.formContainer}>
          <Text style={styles.fieldLabel}>Email/Phone *</Text>
          <TextInput
            value={userNameInput}
            onChangeText={setUserNameInput}
            keyboardType="email-address"
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
            style={styles.fieldInput}
            placeholder="example@gmail.com"
            placeholderTextColor={"#918d8d"}
          />
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            //onPress={() => handleDrawerOpening("ACCOUNTS")}
          >
            <Text style={styles.primaryButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.loginPreliminariesContainer}>
          <TouchableOpacity
            style={{ paddingVertical: 8 }}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.forgotPasswordText}>Back to log in</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
