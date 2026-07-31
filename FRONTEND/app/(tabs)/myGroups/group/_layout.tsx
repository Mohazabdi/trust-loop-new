import { Stack } from "expo-router";

export default function GroupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="MyRotations" />
      <Stack.Screen name="groupMembers" />
      <Stack.Screen name="groupWallet" />
      <Stack.Screen name="createRotation" />
      <Stack.Screen name="depositFunds" />
      <Stack.Screen name="rotation" />
    </Stack>
  );
}
