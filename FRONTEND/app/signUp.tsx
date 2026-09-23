import { useGlobalStorage } from "@/store/useGlobalStorage";
import { LoginPageStyles } from "@/styles/auth_styles/login_page.styles";
import { useRouter } from "expo-router";
import { AlertCircle, Check, ChevronLeft } from "lucide-react-native";
import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { supabase } from "../lib/mysupabase/supabase";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

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
  backend?: string;
}

interface SignUpValidationResult {
  isValid: boolean;
  errors: SignUpFormErrors;
  finalPhone?: string;
  email?: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const ERROR_COLOR = "#c62828";
const PLACEHOLDER_COLOR = "#918d8d";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_CODE_REGEX = /^\+?\d{1,4}$/;
const KENYAN_MOBILE_REGEX = /^(0?[71]\d{8})$/;
const SPECIAL_CHAR_REGEX = /[@$!%*?&#^()\-_=+[\]{};:'",.<>\/\\|`~]/;

/* ------------------------------------------------------------------ */
/*  Password helpers                                                  */
/* ------------------------------------------------------------------ */

interface PasswordRule {
  label: string;
  test: (pwd: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A number", test: (p) => /\d/.test(p) },
  { label: "A special character", test: (p) => SPECIAL_CHAR_REGEX.test(p) },
];

function calculatePasswordStrength(pwd: string): number {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score += 1;
  if (pwd.length >= 12) score += 1;
  if (/[a-z]/.test(pwd)) score += 1;
  if (/[A-Z]/.test(pwd)) score += 1;
  if (/\d/.test(pwd)) score += 1;
  if (SPECIAL_CHAR_REGEX.test(pwd)) score += 1;
  return Math.min((score / 6) * 100, 100);
}

function getPasswordFeedback(score: number): string {
  if (score === 0) return "";
  if (score <= 33) return "Weak";
  if (score <= 50) return "Fair";
  if (score <= 75) return "Good";
  if (score <= 83) return "Strong";
  return "Very strong";
}

function getStrengthColor(score: number): string {
  if (score === 0) return "#e0e0e0";
  if (score <= 33) return ERROR_COLOR;
  if (score <= 50) return "#ef6c00";
  if (score <= 75) return "#f9a825";
  return "#2e7d32";
}

/* ------------------------------------------------------------------ */
/*  Validation (backend contract unchanged)                           */
/* ------------------------------------------------------------------ */

function validateSignUpForm(
  values: SignUpFormValues,
): SignUpValidationResult {
  const errors: SignUpFormErrors = {};
  let finalPhone: string | undefined;
  let email: string | undefined;

  // First name
  const firstName = values.firstName.trim();
  if (!firstName) {
    errors.firstName = "First name is required.";
  } else if (firstName.length < 3) {
    errors.firstName = "First name must be at least 3 characters.";
  }

  // Last name
  const lastName = values.lastName.trim();
  if (!lastName) {
    errors.lastName = "Last name is required.";
  } else if (lastName.length < 3) {
    errors.lastName = "Last name must be at least 3 characters.";
  }

  // Phone code
  let phoneCode = values.phoneCode.trim();
  if (!phoneCode) {
    errors.phoneCode = "Phone code is required.";
  } else {
    if (!PHONE_CODE_REGEX.test(phoneCode)) {
      errors.phoneCode = "Invalid phone code (e.g. +254 or 254).";
    } else if (!phoneCode.startsWith("+")) {
      phoneCode = `+${phoneCode}`;
    }
  }

  // Phone number
  const rawPhoneNo = values.phoneNo.replace(/\s/g, "");
  if (!rawPhoneNo) {
    errors.phoneNo = "Phone number is required.";
  } else if (!KENYAN_MOBILE_REGEX.test(rawPhoneNo)) {
    errors.phoneNo = "Enter a valid phone number (07… or 01…).";
  } else if (!errors.phoneCode) {
    const digits = rawPhoneNo.startsWith("0")
      ? rawPhoneNo.substring(1)
      : rawPhoneNo;
    finalPhone = `${phoneCode}${digits}`;
  }

  // Email (optional)
  const emailTrimmed = values.email.trim();
  if (emailTrimmed) {
    if (!EMAIL_REGEX.test(emailTrimmed)) {
      errors.email = "Invalid email address.";
    } else {
      email = emailTrimmed;
    }
  }

  // Password — must satisfy every rule
  const password = values.password;
  if (!password) {
    errors.password = "Password is required.";
  } else {
    const failing = PASSWORD_RULES.filter((r) => !r.test(password));
    if (failing.length > 0) {
      const missing = failing.map((r) => r.label.toLowerCase());
      errors.password = `Password needs ${missing.join(", ")}.`;
    }
  }

  // Confirm password
  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.confirmPassword !== password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  // Privacy policy
  if (!values.acceptedPrivacyPolicy) {
    errors.privacyPolicy = "You must accept the privacy policy.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    finalPhone,
    email,
  };
}

/* ------------------------------------------------------------------ */
/*  Reusable pieces                                                   */
/* ------------------------------------------------------------------ */

interface FieldProps
  extends Omit<TextInputProps, "style" | "placeholderTextColor"> {
  label: string;
  error?: string;
  dimmed?: boolean;
  inputStyle?: TextInputProps["style"];
}

const Field = forwardRef<TextInput, FieldProps>(function Field(
  { label, error, dimmed, inputStyle, ...rest },
  ref,
) {
  return (
    <View style={{ flex: 1, gap: 5 }}>
      <Text style={local.label}>{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={PLACEHOLDER_COLOR}
        style={[
          local.input,
          error ? local.inputError : null,
          dimmed ? local.inputDimmed : null,
          inputStyle,
        ]}
        {...rest}
      />
      <ErrorText message={error} />
    </View>
  );
});

function ErrorText({
  message,
  centered = false,
}: {
  message?: string;
  centered?: boolean;
}) {
  if (!message) return null;
  return (
    <Text
      style={[
        local.errorText,
        centered ? local.errorTextCentered : local.errorTextLeft,
      ]}
    >
      {message}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function SignUpPage() {
  const { theme } = useGlobalStorage();
  const router = useRouter();
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const themeStyles = useMemo(() => LoginPageStyles(theme), [theme]);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneCode, setPhoneCode] = useState("+254");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedPrivacyPolicy, setAcceptedPrivacyPolicy] = useState(false);

  // UI state
  const [errors, setErrors] = useState<SignUpFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  // Focus refs
  const lastNameRef = useRef<TextInput>(null);
  const phoneNoRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Clear backend error whenever the user edits any field
  useEffect(() => {
    setErrors((prev) =>
      prev.backend ? { ...prev, backend: undefined } : prev,
    );
  }, [
    firstName,
    lastName,
    phoneCode,
    phoneNo,
    email,
    password,
    confirmPassword,
    acceptedPrivacyPolicy,
  ]);

  // Derived password strength
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(password),
    [password],
  );
  const passwordFeedback = useMemo(
    () => getPasswordFeedback(passwordStrength),
    [passwordStrength],
  );

  /* ---------------- Submit (backend contract unchanged) ------------ */

  const handleCreateAccount = useCallback(async () => {
    Keyboard.dismiss();

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

    const hasEmail = Boolean(result.email);
    const hasPhone = Boolean(result.finalPhone);

    if (!hasEmail && !hasPhone) {
      toast.error("A phone number or email is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const metadata = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        ...(hasPhone && { phone: result.finalPhone }),
      };

      const { data, error } = hasEmail
        ? await supabase.auth.signUp({
            email: result.email!,
            password,
            options: { data: metadata },
          })
        : await supabase.auth.signUp({
            phone: result.finalPhone!,
            password,
            options: { data: metadata },
          });

      if (error) {
        setErrors((prev) => ({ ...prev, backend: error.message }));
        toast.error(error.message, {
          icon: <AlertCircle size={20} color="red" />,
        });
        return;
      }

      const user = data.user;
      if (!user) return;

      if (hasEmail) {
        router.push({
          pathname: "/checkEmail",
          params: { email: result.email! },
        });
      } else {
        router.push({
          pathname: "/loginOTP",
          params: { identifier: result.finalPhone!, mode: "verify" },
        });
      }
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Something went wrong. Try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    firstName,
    lastName,
    phoneCode,
    phoneNo,
    email,
    password,
    confirmPassword,
    acceptedPrivacyPolicy,
    router,
  ]);

  /* ---------------- Render ----------------------------------------- */

  return (
    <SafeAreaView style={themeStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={local.backButton}
        >
          <ChevronLeft size={23} color="#212520" />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={themeStyles.mainContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
        >
          {/* Brand header */}
          <View style={themeStyles.appLogoContainer}>
            <Text style={themeStyles.logoText}>T</Text>
            <Text style={themeStyles.platformNameText}>TrustLoop</Text>
          </View>

          <View style={themeStyles.greetingsContainer}>
            <Text style={themeStyles.greetingsText}>Join TrustLoop</Text>
            <Text style={{ fontSize: 12 }}>
              Fill in the fields marked with *
            </Text>
          </View>

          <View style={themeStyles.formContainer}>
            {/* Name row */}
            <View style={local.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label="First Name *"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  editable={!isSubmitting}
                  dimmed={isSubmitting}
                  autoCapitalize="words"
                  autoComplete="given-name"
                  textContentType="givenName"
                  maxLength={60}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                  error={errors.firstName}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  ref={lastNameRef}
                  label="Last Name *"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  editable={!isSubmitting}
                  dimmed={isSubmitting}
                  autoCapitalize="words"
                  autoComplete="family-name"
                  textContentType="familyName"
                  maxLength={60}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => phoneNoRef.current?.focus()}
                  error={errors.lastName}
                />
              </View>
            </View>

            {/* Phone */}
            <View style={{ gap: 5 }}>
              <Text style={themeStyles.fieldLabel}>Phone Number *</Text>
              <View style={local.rowTight}>
                <TextInput
                  value={phoneCode}
                  onChangeText={setPhoneCode}
                  editable={!isSubmitting}
                  keyboardType="phone-pad"
                  autoComplete="tel-country-code"
                  textContentType="none"
                  maxLength={5}
                  placeholder="+254"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  style={[
                    local.input,
                    local.inputPhoneCode,
                    errors.phoneCode ? local.inputError : null,
                    isSubmitting ? local.inputDimmed : null,
                  ]}
                />
                <TextInput
                  ref={phoneNoRef}
                  value={phoneNo}
                  onChangeText={setPhoneNo}
                  editable={!isSubmitting}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  maxLength={15}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => emailRef.current?.focus()}
                  placeholder="07XXXXXXXX"
                  placeholderTextColor={PLACEHOLDER_COLOR}
                  style={[
                    local.input,
                    local.inputPhoneNo,
                    errors.phoneNo ? local.inputError : null,
                    isSubmitting ? local.inputDimmed : null,
                  ]}
                />
              </View>
              <ErrorText message={errors.phoneCode} />
              <ErrorText message={errors.phoneNo} />
            </View>

            {/* Email */}
            <View style={{ gap: 5 }}>
              <Text style={themeStyles.fieldLabel}>Email (optional)</Text>
              <TextInput
                ref={emailRef}
                value={email}
                onChangeText={setEmail}
                editable={!isSubmitting}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                maxLength={254}
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                placeholder="example@gmail.com"
                placeholderTextColor={PLACEHOLDER_COLOR}
                style={[
                  local.input,
                  { width: SCREEN_WIDTH * 0.75 },
                  errors.email ? local.inputError : null,
                  isSubmitting ? local.inputDimmed : null,
                ]}
              />
              <ErrorText message={errors.email} />
            </View>

            {/* Password strength + checklist */}
            {password.length > 0 && (
              <View style={local.strengthWrapper}>
                <View style={local.strengthTrack}>
                  <View
                    style={[
                      local.strengthFill,
                      {
                        width: `${passwordStrength}%`,
                        backgroundColor: getStrengthColor(passwordStrength),
                      },
                    ]}
                  />
                </View>
                <View style={local.strengthLabels}>
                  <Text
                    style={[
                      local.strengthText,
                      { color: getStrengthColor(passwordStrength) },
                    ]}
                  >
                    {passwordFeedback}
                  </Text>
                </View>
                <View style={local.rulesList}>
                  {PASSWORD_RULES.map((rule) => {
                    const passed = rule.test(password);
                    return (
                      <View key={rule.label} style={local.ruleRow}>
                        <View
                          style={[
                            local.ruleDot,
                            passed && local.ruleDotPassed,
                          ]}
                        >
                          {passed && (
                            <Check size={12} color="#fff" strokeWidth={3} />
                          )}
                        </View>
                        <Text
                          style={[
                            local.ruleText,
                            passed && local.ruleTextPassed,
                          ]}
                        >
                          {rule.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Password row */}
            <View style={local.row}>
              <View style={{ flex: 1, gap: 5 }}>
                <View style={local.passwordHeader}>
                  <Text style={themeStyles.fieldLabel}>Password *</Text>
                  <TouchableOpacity
                    onPress={() => setIsPasswordVisible((v) => !v)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isPasswordVisible ? "Hide password" : "Show password"
                    }
                  >
                    <Text style={local.toggleText}>
                      {isPasswordVisible ? "Hide" : "Show"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  editable={!isSubmitting}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  maxLength={128}
                  returnKeyType="next"
                  submitBehavior="submit"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                  style={[
                    local.input,
                    errors.password ? local.inputError : null,
                    isSubmitting ? local.inputDimmed : null,
                  ]}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  ref={confirmPasswordRef}
                  label="Confirm Password *"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  editable={!isSubmitting}
                  dimmed={isSubmitting}
                  secureTextEntry={!isPasswordVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  maxLength={128}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={handleCreateAccount}
                  error={errors.confirmPassword}
                />
              </View>
            </View>
            <ErrorText message={errors.password} />
          </View>

          {/* Privacy policy */}
          <View style={local.privacyWrapper}>
            <View style={local.privacyRow}>
              <Pressable
                onPress={() => setAcceptedPrivacyPolicy((v) => !v)}
                hitSlop={8}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedPrivacyPolicy }}
                style={[
                  local.checkbox,
                  acceptedPrivacyPolicy && local.checkboxChecked,
                ]}
              >
                {acceptedPrivacyPolicy && (
                  <Check size={18} color="#fff" strokeWidth={3} />
                )}
              </Pressable>
              <View style={{ flex: 1 }}>
                <Text style={local.privacyText}>
                  I have read and accepted the{" "}
                  <Text
                    onPress={() => router.push("/privacy")}
                    style={local.privacyLink}
                  >
                    privacy policy
                  </Text>
                  .
                </Text>
              </View>
            </View>
            <ErrorText message={errors.privacyPolicy} />
          </View>

          {/* Backend error */}
          <ErrorText message={errors.backend} centered />

          {/* Submit */}
          <View style={themeStyles.buttonContainer}>
            <TouchableOpacity
              style={[
                themeStyles.primaryButton,
                isSubmitting && { opacity: 0.7 },
              ]}
              onPress={handleCreateAccount}
              disabled={isSubmitting}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={themeStyles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={themeStyles.loginPreliminariesContainer}>
            <View style={themeStyles.createAccountContainer}>
              <Text style={themeStyles.newToTrustLoopText}>
                Have an account?{" "}
              </Text>
              <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => router.push("/login")}
              >
                <Text style={themeStyles.createAccountText}>
                  Log in instead
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Local styles                                                      */
/* ------------------------------------------------------------------ */

const local = StyleSheet.create({
  backButton: {
    padding: 15,
    borderRadius: 30,
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    shadowColor: "#212520",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    marginLeft: 20,
    marginTop: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowTight: {
    flexDirection: "row",
    gap: 5,
  },
  input: {
    color: "#000000",
    padding: 15,
    fontSize: 13,
    fontWeight: "600",
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  inputError: {
    borderColor: ERROR_COLOR,
  },
  inputDimmed: {
    opacity: 0.6,
  },
  inputPhoneCode: {
    width: 90,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  inputPhoneNo: {
    flex: 1,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  strengthWrapper: {
    marginTop: 8,
    gap: 6,
  },
  strengthTrack: {
    width: "100%",
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 3,
  },
  strengthLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: "700",
  },
  rulesList: {
    marginTop: 4,
    gap: 4,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ruleDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#c4c4c4",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  ruleDotPassed: {
    backgroundColor: "#2e7d32",
    borderColor: "#2e7d32",
  },
  ruleText: {
    fontSize: 11,
    color: "#8b8888",
  },
  ruleTextPassed: {
    color: "#2e7d32",
    fontWeight: "600",
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  toggleText: {
    color: "#8b8888",
    fontSize: 12,
    fontWeight: "700",
    textDecorationLine: "underline",
    fontStyle: "italic",
  },
  privacyWrapper: {
    width: "85%",
    paddingHorizontal: 3,
  },
  privacyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 5,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#17690c",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: "#17690c",
  },
  privacyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  privacyLink: {
    textDecorationLine: "underline",
    color: "#17690c",
  },
  errorText: {
    color: ERROR_COLOR,
    fontSize: 11,
    fontWeight: "bold",
  },
  errorTextLeft: {
    paddingLeft: 4,
  },
  errorTextCentered: {
    textAlign: "center",
  },
});