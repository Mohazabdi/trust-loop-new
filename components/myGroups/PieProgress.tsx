import { useGlobalStorage } from "@/store/useGlobalStorage";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  percentage: number; // 0 → 100
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  textStyle?: any;
  showPercentage?: boolean;
  animate?: boolean;
  animationDuration?: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size = 140,
  strokeWidth = 12,
  color = "#3B82F6",
  backgroundColor = "#E5E7EB",
  textStyle,
  showPercentage = true,
  animate = true,
  animationDuration = 1000,
}) => {
  const { theme } = useGlobalStorage();

  /**
   * Animated value
   */
  const animatedValue = useRef(new Animated.Value(0)).current;

  /**
   * Visible text state
   */
  const [displayPercentage, setDisplayPercentage] = useState(0);

  /**
   * Circle calculations
   */
  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);

  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  /**
   * Animated stroke offset
   */
  const animatedStrokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
    extrapolate: "clamp",
  });

  /**
   * Static fallback
   */
  const staticStrokeDashoffset =
    circumference - (percentage / 100) * circumference;

  /**
   * Animation effect
   */
  useEffect(() => {
    let listenerId: string | null = null;

    if (animate) {
      /**
       * Listen to animated value
       * for updating visible text
       */
      listenerId = animatedValue.addListener(({ value }) => {
        setDisplayPercentage(Math.round(value));
      });

      /**
       * Animate from current value
       * → target value
       */
      Animated.timing(animatedValue, {
        toValue: percentage,
        duration: animationDuration,
        useNativeDriver: false, // required for SVG props
      }).start();
    } else {
      animatedValue.setValue(percentage);
      setDisplayPercentage(Math.round(percentage));
    }

    return () => {
      if (listenerId) {
        animatedValue.removeListener(listenerId);
      }
    };
  }, [percentage, animate, animationDuration]);

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Svg width={size} height={size}>
        <G rotation="-90" originX={size / 2} originY={size / 2}>
          {/* Background Circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={backgroundColor}
            strokeWidth={strokeWidth}
            fill="transparent"
          />

          {/* Progress Circle */}
          {animate ? (
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={animatedStrokeDashoffset}
              strokeLinecap="round"
            />
          ) : (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={staticStrokeDashoffset}
              strokeLinecap="round"
            />
          )}
        </G>
      </Svg>

      {/* Center Content */}
      {showPercentage && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text
            style={[
              {
                fontSize: 20,
                fontWeight: "bold",
                color: theme.text,
              },
              textStyle,
            ]}
          >
            {displayPercentage}%
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: theme.textSecondary,
            }}
          >
            complete
          </Text>
        </View>
      )}
    </View>
  );
};

export default CircularProgress;
