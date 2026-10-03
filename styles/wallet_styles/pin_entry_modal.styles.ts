import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const PinEntryModalStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
      // zIndex: 20,
    },
    modalCard: {
      width: SCREEN_WIDTH * 0.88,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      paddingBottom: 20,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    closeButton: {
      padding: 2,
    },
    subtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: "center",
      marginTop: 16,
      marginBottom: 20,
      paddingHorizontal: 20,
    },
    pinContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 16,
      marginBottom: 24,
    },
    pinDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: "transparent",
    },
    pinDotFilled: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    keypad: {
      paddingHorizontal: 24,
    },
    keypadRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    keypadButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
    },
    keypadButtonText: {
      fontSize: 28,
      fontWeight: "500",
      color: theme.text,
    },
    forgotButton: {
      alignSelf: "center",
      marginTop: 16,
      padding: 8,
    },
    forgotText: {
      fontSize: 14,
      color: theme.primary,
      fontWeight: "500",
    },
  });
