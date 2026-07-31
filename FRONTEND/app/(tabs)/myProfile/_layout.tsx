import { Colors } from "@/lib/constants/colors";
import { StackActions } from "@react-navigation/native";
import { Stack, Tabs } from "expo-router";
import { User } from "lucide-react-native";
import React from "react";

//import { Colors } from "@lib/constants/colors";

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        //tabBarActiveTintColor: Colors.primary.blue,
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Profile",
          //tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Stack>
  );
}
