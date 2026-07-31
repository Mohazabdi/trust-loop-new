// styles/wallet_styles/processing_modal.styles.ts
import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ProcessingModalStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalCard: {
      width: SCREEN_WIDTH * 0.85,
      backgroundColor: theme.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 32,
      paddingHorizontal: 24,
      alignItems: "center",
    },
    animationContainer: {
      width: 120,
      height: 120,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 24,
    },
    outerRing: {
      width: 110,
      height: 110,
      borderRadius: 55,
      borderWidth: 2,
      borderStyle: "dashed",
      position: "absolute",
    },
    middleRing: {
      width: 85,
      height: 85,
      borderRadius: 42.5,
      borderWidth: 2,
      borderStyle: "solid",
      position: "absolute",
    },
    innerIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
      position: "absolute",
    },
    lockOverlay: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.primary,
      justifyContent: "center",
      alignItems: "center",
      position: "absolute",
      bottom: 5,
      right: 5,
      borderWidth: 2,
      borderColor: theme.surface,
    },
    orbitingDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      position: "absolute",
    },
    dot1: {
      top: 0,
    },
    dot2: {
      right: 0,
    },
    dot3: {
      bottom: 0,
    },
    messageContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
    },
    message: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
    },
    animatedDots: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.text,
      width: 24,
    },
    progressContainer: {
      width: "100%",
      marginBottom: 24,
    },
    progressTrack: {
      width: "100%",
      height: 3,
      backgroundColor: theme.border,
      borderRadius: 1.5,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 1.5,
    },
    stepsContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
      marginBottom: 20,
    },
    step: {
      alignItems: "center",
      flex: 1,
    },
    stepIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
    },
    stepCompleted: {
      backgroundColor: theme.success,
    },
    stepActive: {
      backgroundColor: theme.surface,
      borderWidth: 2,
      borderColor: theme.primary,
    },
    stepActiveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.primary,
    },
    stepPending: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    stepPendingDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    stepText: {
      fontSize: 11,
      fontWeight: "500",
    },
    stepCompletedText: {
      color: theme.success,
    },
    stepActiveText: {
      color: theme.primary,
    },
    stepPendingText: {
      color: theme.textSecondary,
    },
    stepDivider: {
      width: 20,
      height: 1,
      backgroundColor: theme.border,
      marginHorizontal: 4,
    },
    securityBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 20,
    },
    securityText: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "500",
    },
  });
