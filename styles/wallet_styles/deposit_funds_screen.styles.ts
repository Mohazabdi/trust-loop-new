import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const DepositFundsScreenStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    label: { color: theme.textSecondary, fontSize: 14, fontWeight: "600", marginBottom: 8 },
    
    // Account Card
    emptyAccountCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.border,
      borderStyle: "dashed",
    },
    emptyText: { color: theme.textSecondary, fontSize: 16, fontWeight: "600" },

    // Hero Amount
    amountWrapper: {
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 2,
      borderBottomColor: theme.border,
      paddingBottom: 10,
    },
    currencySymbol: { fontSize: 24, fontWeight: "700", color: theme.textSecondary, marginRight: 10, marginTop: 8 },
    heroAmountInput: {
      flex: 1,
      fontSize: 48,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -1.5,
      padding: 0,
    },

    // Standard Input
    input: {
      backgroundColor: theme.surface,
      color: theme.text,
      padding: 16,
      fontSize: 18,
      fontWeight: "600",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },

    // Feedback Text
    errorText: { color: theme.error, fontSize: 13, fontWeight: "600", marginTop: 8 },
    successText: { color: theme.success, fontSize: 13, fontWeight: "600", marginTop: 8 },

    // Footer
    footer: {
      padding: 20,
      paddingBottom: 34, // SafeArea padding
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    primaryButton: {
      backgroundColor: theme.primary, // Solid Color
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  });