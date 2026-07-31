import { useGlobalStorage } from "@/store/useGlobalStorage";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface TruncatedTextProps {
  text: string;
  maxLines?: number;
  showMore?: boolean; // If false, it just truncates forever
  style?: object;
}

export const TruncatedText = ({
  text,
  maxLines = 3,
  showMore = false,
  style,
}: TruncatedTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { theme } = useGlobalStorage();
  return (
    <View style={styles.container}>
      <Text
        numberOfLines={isExpanded ? undefined : maxLines}
        ellipsizeMode="tail"
        style={[styles.baseText, style]}
      >
        {text}
      </Text>

      {showMore && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleBtn, { color: theme.text }]}>
            {isExpanded ? "Show Less" : "Show More"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
  },
  baseText: {
    fontSize: 14,
    color: "#333",
  },
  toggleBtn: {
    marginTop: 4,
    color: "#559fe9",
    fontWeight: "bold",
  },
});
