import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signUp" />
      <Stack.Screen name="loginOTP" />
      <Stack.Screen name="resetPassword" />
      <Stack.Screen name="checkEmail" />
    </Stack>
  );
}