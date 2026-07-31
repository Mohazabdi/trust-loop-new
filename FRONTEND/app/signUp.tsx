import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LoginPageStyles } from "@/styles/auth_styles/login_page.styles";
import { useRouter } from "expo-router";
import { AlertCircle, Check, ChevronLeft } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { supabase } from "../lib/mysupabase/supabase";
interface SignUpFormValues {
  firstName: string;
  lastName: string;
  phoneCode: string;
  phoneNo: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedPrivacyPolicy: boolean;
}

interface SignUpFormErrors {
  firstName?: string;
  lastName?: string;
  phoneCode?: string;
  phoneNo?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  privacyPolicy?: string;
}

interface SignUpValidationResult {
  isValid: boolean;
  errors: SignUpFormErrors;
  finalPhone?: string;
  email?: string;
}

export default function LogInPage() {
  const { theme } = useGlobalStorage();
  const router = useRouter();
  const styles = useMemo(() => LoginPageStyles(theme), [theme]);
  const { width: SCREEN_WIDTH } = Dimensions.get("window");
  // Add this state at the top of your component
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState("");
  const calculatePasswordStrength = (pwd: string): number => {
    if (!pwd) return 0;

    let score = 0;

    // Length checks
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;

    // Character variety checks
    if (/[a-z]/.test(pwd)) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[@$!%*?&#^()\-_=+[\]{};:'",.<>\/\\|`~]/.test(pwd)) score += 1;

    // Max possible score is 6, normalize to 0-100
    return Math.min((score / 6) * 100, 100);
  };

  const getPasswordFeedback = (
    pwd: string,
  ): { score: number; feedback: string } => {
    const score = calculatePasswordStrength(pwd);

    let feedback = "";
    if (!pwd) feedback = "";
    else if (score <= 33) feedback = "Weak";
    else if (score <= 50) feedback = "Fair";
    else if (score <= 75) feedback = "Good";
    else if (score <= 83) feedback = "Strong";
    else feedback = "Very strong";

    return { score, feedback };
  };
  // Color mapping based on strength
  const getStrengthColor = (strength: number): string => {
    if (strength === 0) return "#e0e0e0";
    if (strength <= 33) return "#c62828"; // Weak - red
    if (strength <= 50) return "#ef6c00"; // Fair - orange
    if (strength <= 75) return "#f9a825"; // Good - amber
    return "#2e7d32"; // Strong - green
  };
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneCode, setPhoneCode] = useState("+254");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);
  const [errors, setErrors] = useState<SignUpFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  function validateSignUpForm(
    values: SignUpFormValues,
  ): SignUpValidationResult {
    const errors: SignUpFormErrors = {};
    let finalPhone: string | undefined;
    let email: string | undefined;

    // ── First Name ───────────────────────────────────────────────
    const firstName = values.firstName.trim();
    if (!firstName) {
      errors.firstName = "First name is required.";
    } else if (firstName.length < 3) {
      errors.firstName = "First name must be at least 3 characters.";
    }

    // ── Last Name ────────────────────────────────────────────────
    const lastName = values.lastName.trim();
    if (!lastName) {
      errors.lastName = "Last name is required.";
    } else if (lastName.length < 3) {
      errors.lastName = "Last name must be at least 3 character.";
    }

    // ── Phone Code ───────────────────────────────────────────────
    let phoneCode = values.phoneCode.trim();
    if (!phoneCode) {
      errors.phoneCode = "Phone code is required.";
    } else {
      // Standard calling code format: optional '+' followed by 1-4 digits
      const codeRegex = /^\+?\d{1,4}$/;
      if (!codeRegex.test(phoneCode)) {
        errors.phoneCode = "Invalid phone code (e.g. +254 or 254).";
      }
      // Normalize: ensure leading '+'
      if (!phoneCode.startsWith("+")) {
        phoneCode = "+" + phoneCode;
      }
    }

    // ── Phone Number ─────────────────────────────────────────────
    const rawPhoneNo = values.phoneNo.replace(/\s/g, ""); // remove any spaces
    if (!rawPhoneNo) {
      errors.phoneNo = "Phone number is required.";
    } else {
      // Accept Kenyan mobile formats:
      //   - 9 digits starting with 7 or 1 (e.g. 712345678)
      //   - 10 digits starting with 07 or 01 (e.g. 0712345678)
      //   - with or without leading 0
      const kenyanMobileRegex = /^(0?[71]\d{8})$/;
      if (!kenyanMobileRegex.test(rawPhoneNo)) {
        errors.phoneNo = "Enter a valid phone number (07… or 01…).";
      } else if (!errors.phoneCode) {
        // Normalize: strip leading zero and prepend the country code
        let digits = rawPhoneNo;
        if (digits.startsWith("0")) {
          digits = digits.substring(1);
        }
        finalPhone = `${phoneCode}${digits}`;
      }
    }

    // ── Email (optional) ─────────────────────────────────────────
    const emailTrimmed = values.email.trim();
    if (emailTrimmed) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrimmed)) {
        errors.email = "Invalid email address.";
      } else {
        email = emailTrimmed;
      }
    }

    // ── Password ─────────────────────────────────────────────────
    const password = values.password;
    if (!password) {
      errors.password = "Password is required.";
    } else {
      const strengthScore = calculatePasswordStrength(password);

      // Accept passwords that score "Fair" or better (> 33%)
      if (strengthScore <= 33) {
        const missingRequirements: string[] = [];

        if (password.length < 8) {
          missingRequirements.push("at least 8 characters");
        }
        if (!/[a-z]/.test(password)) {
          missingRequirements.push("a lowercase letter");
        }
        if (!/[A-Z]/.test(password)) {
          missingRequirements.push("an uppercase letter");
        }
        if (!/\d/.test(password)) {
          missingRequirements.push("a number");
        }
        if (!/[@$!%*?&#^()\-_=+[\]{};:'",.<>\/\\|`~]/.test(password)) {
          missingRequirements.push("a special character");
        }

        if (password.length < 8) {
          errors.password =
            "Password is too weak. Make it at least 8 characters.";
        } else {
          errors.password = `Password needs ${missingRequirements.join(", ")}.`;
        }
      }
    }

    // ── Confirm Password ─────────────────────────────────────────
    if (!values.confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (values.confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    // ── Privacy Policy ───────────────────────────────────────────
    if (!values.acceptedPrivacyPolicy) {
      errors.privacyPolicy = "You must accept the privacy policy.";
    }

    const isValid = Object.keys(errors).length === 0;

    return { isValid, errors, finalPhone, email };
  }

  const handleCreateAccount = async () => {
    const result = validateSignUpForm({
      firstName,
      lastName,
      phoneCode,
      phoneNo,
      email,
      password,
      confirmPassword,
      acceptedPrivacyPolicy,
    });

    setErrors(result.errors);
    if (!result.isValid) return;

    setIsSubmitting(true);
    try {
      // Determine primary identity: prefer email if provided, else phone
      const hasEmail = !!result.email;
      const hasPhone = !!result.finalPhone;

      if (!hasEmail && !hasPhone) {
        // Shouldn’t happen because validation requires at least phone
        toast.error("A phone number or email is required.");
        return;
      }

      // Common metadata for the trigger
      const metadata = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        // Always pass phone if available, so the trigger can use it later
        ...(hasPhone && { phone: result.finalPhone }),
      };

      let signUpResult;

      if (hasEmail) {
        // Sign up with email + password
        signUpResult = await supabase.auth.signUp({
          email: result.email!,
          password,
          options: {
            data: metadata,
            // If you want to redirect to a specific page after email confirmation:
            // emailRedirectTo: "yourapp://welcome",
          },
        });
      } else {
        // Sign up with phone + password (requires phone provider enabled)
        signUpResult = await supabase.auth.signUp({
          phone: result.finalPhone!,
          password,
          options: {
            data: metadata,
          },
        });
      }

      if (signUpResult.error) {
        setErrors((prev) => ({ ...prev, backend: signUpResult.error.message }));
        console.log();
        toast.error(signUpResult.error.message, {
          icon: <AlertCircle size={20} color="red" />,
        });
        return;
      }

      // Success – show appropriate message
      const user = signUpResult.data.user;
      // After successful signUpResult, replace the toast + router.push part
      if (user) {
        if (hasEmail) {
          // Email signup → go to check email screen
          router.push({
            pathname: "/checkEmail",
            params: { email: result.email! },
          });
        } else {
          // Phone signup → OTP already sent, go directly to verification
          router.push({
            pathname: "/loginOTP",
            params: { identifier: result.finalPhone!, mode: "verify" },
          });
        }
      }
    } catch (e) {
      toast.error("Something went wrong. Please try again.");
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
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
            marginLeft: 20,
            marginTop: 10,
          }}
        >
          <ChevronLeft size={23} color={"#212520"} />
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={styles.mainContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          <View style={styles.appLogoContainer}>
            <Text style={styles.logoText}>T</Text>
            <Text style={styles.platformNameText}>TrustLoop</Text>
          </View>
          <View style={styles.greetingsContainer}>
            <Text style={styles.greetingsText}>Join TrustLoop</Text>
            <Text
              style={{
                fontSize: 12,
              }}
            >
              just a heads up, fields with * are mandatory !
            </Text>
          </View>

          <View style={styles.formContainer}>
            <View
              style={{
                flexDirection: "row",
                gap: 10,
              }}
            >
              <View
                style={{
                  gap: 5,
                }}
              >
                <Text style={styles.fieldLabel}>First Name *</Text>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  keyboardType="default"
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  style={{
                    color: "#000000",
                    padding: 15,
                    fontSize: 13,
                    fontWeight: "bold",
                    borderRadius: 20,
                    // borderWidth: 1,
                    borderColor: errors.firstName ? "#c62828" : "#212520",
                    backgroundColor: "#fff",
                    width: SCREEN_WIDTH * 0.45,
                  }}
                  placeholder="Jina la kwanza"
                  placeholderTextColor={"#918d8d"}
                />
                {errors.firstName && (
                  <Text
                    style={{
                      color: "#c62828",
                      fontSize: 11,
                      fontWeight: "bold",
                      paddingLeft: 4,
                    }}
                  >
                    {errors.firstName}
                  </Text>
                )}
              </View>
              <View
                style={{
                  gap: 5,
                }}
              >
                <Text style={styles.fieldLabel}>Last Name *</Text>
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  keyboardType="default"
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  style={{
                    color: "#000000",
                    padding: 15,
                    fontSize: 13,
                    fontWeight: "bold",
                    borderRadius: 20,
                    // borderWidth: 1,
                    borderColor: errors.lastName ? "#c62828" : "#212520",
                    backgroundColor: "#fff",
                    width: SCREEN_WIDTH * 0.45,
                  }}
                  placeholder="Jina la mwisho"
                  placeholderTextColor={"#918d8d"}
                />
                {errors.lastName && (
                  <Text
                    style={{
                      color: "#c62828",
                      fontSize: 11,
                      fontWeight: "bold",
                      paddingLeft: 4,
                    }}
                  >
                    {errors.lastName}
                  </Text>
                )}
              </View>
            </View>
            <View
              style={{
                gap: 5,
              }}
            >
              <Text style={styles.fieldLabel}>Phone Number *</Text>
              <View
                style={{
                  flexDirection: "row",
                  gap: 5,
                }}
              >
                <TextInput
                  value={phoneCode}
                  onChangeText={setPhoneCode}
                  keyboardType="default"
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  style={{
                    color: "#000000",
                    padding: 15,
                    fontSize: 13,
                    fontWeight: "bold",
                    borderTopLeftRadius: 20,
                    borderBottomLeftRadius: 20,
                    borderColor: errors.phoneCode ? "#c62828" : "#212520",
                    // borderWidth: 1,
                    backgroundColor: "#fff",
                    width: SCREEN_WIDTH * 0.2,
                  }}
                  placeholder="+254"
                  placeholderTextColor={"#918d8d"}
                />
                <TextInput
                  value={phoneNo}
                  onChangeText={setPhoneNo}
                  keyboardType="phone-pad"
                  autoComplete="off"
                  textContentType="none"
                  importantForAutofill="no"
                  style={{
                    color: "#000000",
                    padding: 15,
                    fontSize: 13,
                    fontWeight: "bold",
                    borderTopRightRadius: 20,
                    borderBottomRightRadius: 20,
                    borderColor: errors.phoneNo ? "#c62828" : "#212520",
                    // borderWidth: 1,
                    backgroundColor: "#fff",
                    width: SCREEN_WIDTH * 0.6,
                  }}
                  placeholder="07xxx"
                  placeholderTextColor={"#918d8d"}
                />
              </View>
              {errors.phoneCode && (
                <Text
                  style={{
                    color: "#c62828",
                    fontSize: 11,
                    fontWeight: "bold",
                    paddingLeft: 4,
                  }}
                >
                  {errors.phoneCode}
                </Text>
              )}
              {errors.phoneNo && (
                <Text
                  style={{
                    color: "#c62828",
                    fontSize: 11,
                    fontWeight: "bold",
                    paddingLeft: 4,
                  }}
                >
                  {errors.phoneNo}
                </Text>
              )}
            </View>
            <View
              style={{
                gap: 5,
              }}
            >
              <Text style={styles.fieldLabel}>Email (optional)</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoComplete="off"
                textContentType="none"
                importantForAutofill="no"
                style={{
                  color: "#000000",
                  padding: 15,
                  fontSize: 13,
                  fontWeight: "bold",
                  borderRadius: 20,
                  // borderWidth: 1,
                  borderColor: errors.email ? "#c62828" : "#212520",
                  backgroundColor: "#fff",
                  width: SCREEN_WIDTH * 0.7,
                }}
                placeholder="example@gmail.com"
                placeholderTextColor={"#918d8d"}
              />
              {errors.email && (
                <Text
                  style={{
                    color: "#c62828",
                    fontSize: 11,
                    fontWeight: "bold",
                    paddingLeft: 4,
                  }}
                >
                  {errors.email}
                </Text>
              )}
            </View>
            <View>
              {/* ─── Password Strength Meter ─── */}
              {password.length > 0 && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {/* Progress bar track */}
                  <View
                    style={{
                      width: "100%",
                      height: 6,
                      backgroundColor: "#e0e0e0",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    {/* Progress bar fill (animated width via state) */}
                    <View
                      style={{
                        width: `${passwordStrength}%`,
                        height: "100%",
                        backgroundColor: getStrengthColor(passwordStrength),
                        borderRadius: 3,
                      }}
                    />
                  </View>

                  {/* Strength label */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: getStrengthColor(passwordStrength),
                      }}
                    >
                      {passwordFeedback}
                    </Text>

                    {/* Password tips when weak */}
                    {passwordStrength <= 50 && (
                      <Text
                        style={{
                          fontSize: 10,
                          color: "#8b8888",
                          fontStyle: "italic",
                        }}
                      >
                        {password.length < 8
                          ? "At least 8 characters"
                          : "Add uppercase, numbers & symbols"}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                }}
              >
                <View style={{ gap: 5 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={styles.fieldLabel}>Password *</Text>
                    <TouchableOpacity
                      onPressIn={() => setIsPasswordVisible(!isPasswordVisible)}
                      onPressOut={() =>
                        setIsPasswordVisible(!isPasswordVisible)
                      }
                    >
                      <Text
                        style={{
                          color: "#8b8888",
                          fontSize: 13,
                          fontWeight: "bold",
                          fontStyle: "italic",
                          textDecorationLine: "underline",
                        }}
                      >
                        {isPasswordVisible ? "Hide" : "Show"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      const { score, feedback } = getPasswordFeedback(text);
                      setPasswordStrength(score);
                      setPasswordFeedback(feedback);
                    }}
                    secureTextEntry={!isPasswordVisible}
                    keyboardType="default"
                    style={{
                      color: "#000000",
                      padding: 15,
                      fontSize: 13,
                      fontWeight: "bold",
                      borderRadius: 20,
                      // borderWidth: 1,
                      backgroundColor: "#fff",
                      borderColor: errors.password ? "#c62828" : "#212520",
                      width: SCREEN_WIDTH * 0.45,
                    }}
                    // placeholder="example@gmail.com"
                    // placeholderTextColor={"#918d8d"}
                  />
                </View>
                <View style={{ gap: 5 }}>
                  <Text style={styles.fieldLabel}>Confirm Password *</Text>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!isPasswordVisible}
                    keyboardType="default"
                    style={{
                      color: "#000000",
                      padding: 15,
                      fontSize: 13,
                      fontWeight: "bold",
                      borderRadius: 20,
                      // borderWidth: 1,
                      borderColor: errors.confirmPassword
                        ? "#c62828"
                        : "#212520",
                      backgroundColor: "#fff",
                      width: SCREEN_WIDTH * 0.45,
                    }}
                    // placeholder="example@gmail.com"
                    // placeholderTextColor={"#918d8d"}
                  />
                </View>
              </View>
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
              {errors.confirmPassword && (
                <Text
                  style={{
                    color: "#c62828",
                    fontSize: 11,
                    fontWeight: "bold",
                    paddingLeft: 4,
                  }}
                >
                  {errors.confirmPassword}
                </Text>
              )}
            </View>
          </View>
          <View
            style={{
              width: "75%",
              paddingHorizontal: 3,

              // borderWidth: 1,
            }}
          >
            <TouchableOpacity
              onPress={() => setAcceptedPrivacyPolicy(!acceptedPrivacyPolicy)}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                // alignItems: "center",
                gap: 14,
                paddingVertical: 5,
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  borderWidth: 2,
                  borderColor: "#17690c",
                  backgroundColor: acceptedPrivacyPolicy ? "#17690c" : "#fff",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {acceptedPrivacyPolicy && (
                  <Check size={18} color="#fff" strokeWidth={3} />
                )}
              </View>

              {/* The Label Text */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: "#1a1a1a",
                  }}
                >
                  I have read and accepted the privacy policy
                </Text>
              </View>
            </TouchableOpacity>
            {errors.privacyPolicy && (
              <Text
                style={{
                  color: "#c62828",
                  fontSize: 11,
                  fontWeight: "bold",
                  paddingLeft: 4,
                }}
              >
                {errors.privacyPolicy}
              </Text>
            )}
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreateAccount}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Log in</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.loginPreliminariesContainer}>
            <View style={styles.createAccountContainer}>
              <Text style={styles.newToTrustLoopText}>Have an Account? </Text>
              <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => router.push(`/login`)}
              >
                <Text style={styles.createAccountText}>Log in instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
