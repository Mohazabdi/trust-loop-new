import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ConfirmTransferModalStyles = (theme: AppTheme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)", // Semi-transparent backdrop
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    },
    modalCard: {
      width: "100%",
      backgroundColor: theme.background, // Use background or surface depending on your theme
      borderRadius: 24,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.text,
    },
    closeButton: {
      padding: 4,
      backgroundColor: theme.surface,
      borderRadius: 12,
    },
    amountLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: "600",
      marginBottom: 8,
      textAlign: "center",
    },
    amountSection: {
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    amountValue: {
      fontSize: 36,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -1,
    },
    amountValueInput: {
      fontSize: 36,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -1,
      textAlign: "center",
      padding: 0,
      minWidth: 100,
    },
    detailsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: "500",
    },
    detailValue: {
      fontSize: 14,
      color: theme.text,
      fontWeight: "600",
    },
    totalRow: {
      borderBottomWidth: 0,
      marginBottom: 24,
    },
    totalLabel: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "700",
    },
    totalValue: {
      fontSize: 16,
      color: theme.success,
      fontWeight: "800",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: 16,
      marginBottom: 24,
      gap: 12,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.background,
      alignItems: "center",
      justifyContent: "center",
    },
    infoLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      fontWeight: "600",
    },
    infoValue: {
      fontSize: 15,
      color: theme.text,
      fontWeight: "700",
      marginTop: 2,
    },
    infoSubtext: {
      fontSize: 13,
      color: theme.textSecondary,
      marginTop: 2,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      marginBottom: 24,
      gap: 6,
    },
    dateText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    descriptionText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "400",
      color: theme.textSecondary,
      textAlign: "left",
      paddingVertical: 12,
      paddingHorizontal: 10,
      backgroundColor: theme.surface,
      borderRadius: 12,
      minHeight: 50,
    },
    footer: {
      flexDirection: "row",
      gap: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    cancelButton: {
      backgroundColor: theme.surface,
    },
    cancelButtonText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "600",
    },
    confirmButton: {
      backgroundColor: theme.primary,
    },
    confirmButtonText: {
      color: theme.surface,
      fontSize: 15,
      fontWeight: "700",
    },
  });