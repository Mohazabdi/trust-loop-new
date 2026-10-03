// styles/wallet_styles/confirm_transfer_modal.styles.ts
import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const ConfirmTransferModalStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      width: SCREEN_WIDTH,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalCard: {
      width: SCREEN_WIDTH * 0.88,
      backgroundColor: theme.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
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
    overlay: {
      flex: 1,
      backgroundColor: theme.background, // Dim the background
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    closeButton: {
      padding: 2,
    },
    amountSection: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      paddingTop: 16,
      paddingBottom: 12,
    },
    amountLabel: {
      fontSize: 13,
      textAlign: "center",
      color: theme.textSecondary,
      marginBottom: 4,
    },
    amountValue: {
      fontSize: 32,
      fontWeight: "600",
      color: theme.text,
    },
    detailsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingVertical: 6,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      marginTop: 6,
      paddingTop: 10,
      marginBottom: 8,
    },
    totalLabel: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    totalValue: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.text,
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      marginTop: 12,
      gap: 8,
    },
    infoLabel: {
      fontSize: 13,
      color: theme.textSecondary,
      marginRight: 4,
    },
    infoValue: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
    infoSubtext: {
      fontSize: 12,
      color: theme.textSecondary,
      paddingLeft: 44,
      marginTop: 2,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingHorizontal: 20,
      marginTop: 16,
      marginBottom: 8,
      gap: 6,
    },
    dateText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    descriptionText: {
      fontSize: 12,
      fontWeight: "400",
      color: theme.textSecondary,
      textAlign: "left",
      paddingVertical: 12,
      paddingHorizontal: 10,
      backgroundColor: theme.surface,
      borderRadius: 8,
      width: "70%",
      minHeight: 50,
    },
    footer: {
      flexDirection: "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    button: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      borderRadius: 16,
      gap: 6,
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.border,
    },
    confirmButton: {
      backgroundColor: theme.success,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.text,
    },
    confirmButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: theme.surface,
    },
  });
