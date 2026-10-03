import { useEffect } from "react";
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
  rounded = 20,
  marginHorizontal = 20,
}: SkeletonCardProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, [pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.45, 0.85]),
  }));

  return (
    <Animated.View
      style={[
        {
          height,
          borderRadius: rounded,
          backgroundColor: "rgba(120,120,120,0.15)",
          marginHorizontal,
          marginBottom: 12,
        },
        animatedStyle,
      ]}
    />
  );
}