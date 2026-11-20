import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface SkeletonCardProps {
  height?: number;
  rounded?: number;
  marginHorizontal?: number;
}

export function SkeletonCard({
  height = 92,
  rounded = 14,
  marginHorizontal = 20,
}: SkeletonCardProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.5, 1]),
  }));

  // height / rounded / marginHorizontal are props, so they stay dynamic
  return <Animated.View style={[styles.block, { height, borderRadius: rounded, marginHorizontal }, animatedStyle]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: "#E2E8F0", marginBottom: 12 },
});
