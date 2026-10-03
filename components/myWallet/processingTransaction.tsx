// components/myWallet/transfer/ProcessingModal.tsx
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { ProcessingModalStyles } from "@/styles/wallet_styles/processing_modal.styles";
import { ArrowRight, Lock, Shield } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, Text, View } from "react-native";

interface ProcessingModalProps {
  isOpen: boolean;
  message?: string;
}

export default function ProcessingModal({
  isOpen,
  message = "Processing your transfer",
}: ProcessingModalProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => ProcessingModalStyles(theme), [theme]);
  const [dots, setDots] = useState("");

  // Animation values
  const rotateValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const progressValue = useRef(new Animated.Value(0)).current;

  // Animated dots using setInterval instead of Animated
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isOpen) {
      let count = 0;
      interval = setInterval(() => {
        count = (count + 1) % 4;
        setDots(".".repeat(count));
      }, 500);
    } else {
      setDots("");
    }
    return () => clearInterval(interval);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // Continuous rotation for outer ring
      Animated.loop(
        Animated.timing(rotateValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();

      // Pulse animation for inner elements
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.2,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();

      // Progress bar animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(progressValue, {
            toValue: 1,
            duration: 3000,
            easing: Easing.linear,
            useNativeDriver: false,
          }),
          Animated.timing(progressValue, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
      ).start();
    } else {
      // Reset animations when closed
      rotateValue.setValue(0);
      pulseValue.setValue(1);
      progressValue.setValue(0);
    }
  }, [isOpen]);

  const spin = rotateValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal visible={isOpen} transparent animationType="fade">
      <View style={styles.container}>
        <View style={styles.modalCard}>
          {/* Animated Security Rings */}
          <View style={styles.animationContainer}>
            {/* Outer rotating ring */}
            <Animated.View
              style={[
                styles.outerRing,
                {
                  transform: [{ rotate: spin }],
                  borderColor: theme.primary,
                },
              ]}
            />

            {/* Middle pulsing ring */}
            <Animated.View
              style={[
                styles.middleRing,
                {
                  transform: [{ scale: pulseValue }],
                  borderColor: theme.primary + "40",
                },
              ]}
            />

            {/* Inner secure icon */}
            <View style={styles.innerIcon}>
              <Shield size={32} color={theme.primary} strokeWidth={1.5} />
            </View>

            {/* Small lock overlay */}
            <View style={styles.lockOverlay}>
              <Lock size={12} color={theme.surface} />
            </View>

            {/* Orbiting dots */}
            <Animated.View
              style={[
                styles.orbitingDot,
                styles.dot1,
                {
                  transform: [{ rotate: spin }],
                  backgroundColor: theme.primary,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.orbitingDot,
                styles.dot2,
                {
                  transform: [{ rotate: spin }],
                  backgroundColor: theme.success,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.orbitingDot,
                styles.dot3,
                {
                  transform: [{ rotate: spin }],
                  backgroundColor: theme.primary,
                },
              ]}
            />
          </View>

          {/* Processing Message with animated dots */}
          <View style={styles.messageContainer}>
            <Text style={styles.message}>{message}</Text>
            <Text style={styles.animatedDots}>{dots}</Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressWidth,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
          </View>

          {/* Security Steps */}
          <View style={styles.stepsContainer}>
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.stepCompleted]}>
                <ArrowRight size={10} color={theme.surface} />
              </View>
              <Text style={[styles.stepText, styles.stepCompletedText]}>
                Verifying
              </Text>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.stepActive]}>
                <View style={styles.stepActiveDot} />
              </View>
              <Text style={[styles.stepText, styles.stepActiveText]}>
                Processing
              </Text>
            </View>
            <View style={styles.stepDivider} />
            <View style={styles.step}>
              <View style={[styles.stepIcon, styles.stepPending]}>
                <View style={styles.stepPendingDot} />
              </View>
              <Text style={[styles.stepText, styles.stepPendingText]}>
                Completing
              </Text>
            </View>
          </View>

          {/* Security Badge */}
          <View style={styles.securityBadge}>
            <Lock size={10} color={theme.success} />
            <Text style={styles.securityText}>256-bit SSL Secured</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
