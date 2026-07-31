// styles/wallet_styles/transfer_result_modal.styles.ts
import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const TransferResultModalStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalCard: {
      width: SCREEN_WIDTH * 0.9,
      maxHeight: "85%",
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: theme.text,
    },
    closeButton: {
      padding: 4,
    },
    iconContainer: {
      alignItems: "center",
      marginTop: 20,
      marginBottom: 12,
    },
    message: {
      fontSize: 15,
      color: theme.text,
      textAlign: "center",
      paddingHorizontal: 20,
      marginBottom: 16,
      lineHeight: 22,
    },
    detailsContainer: {
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
      gap: 8,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      width: 60,
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
      flex: 1,
    },

    // Redesigned Tag Section
    tagSection: {
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    tagSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 12,
    },
    tagSectionTitle: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.textSecondary,
    },
    selectedTagWrapper: {
      minHeight: 48,
    },
    selectedTagDisplay: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
    },
    selectedTagInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    tagIconContainer: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: "center",
      alignItems: "center",
    },
    selectedTagName: {
      fontSize: 15,
      fontWeight: "500",
      color: theme.text,
    },
    selectedTagActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    tagActionButton: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 6,
    },
    tagActionText: {
      fontSize: 13,
      color: theme.primary,
      fontWeight: "500",
    },
    addTagPrompt: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.border,
      borderStyle: "dashed",
    },
    addTagPromptText: {
      fontSize: 14,
      color: theme.textSecondary,
    },

    // Tag Options
    tagOptionsWrapper: {
      backgroundColor: theme.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tagOptionsTitle: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.textSecondary,
      marginBottom: 12,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    tagOptionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tagOptionCard: {
      width: "48%",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: 10,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.border,
      position: "relative",
    },
    tagOptionCardSelected: {
      borderColor: theme.success,
      borderWidth: 1.5,
    },
    tagOptionIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 10,
    },
    tagOptionName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
    tagOptionNameSelected: {
      color: theme.success,
    },
    tagOptionCheck: {
      position: "absolute",
      top: 8,
      right: 8,
    },
    tagOptionsCancel: {
      marginTop: 12,
      paddingVertical: 8,
      alignItems: "center",
    },
    tagOptionsCancelText: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: "500",
    },

    // Actions
    actions: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 13,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 6,
    },
    downloadButton: {},
    emailButton: {},
    actionButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },

    doneButton: {
      marginHorizontal: 20,
      marginBottom: 20,
      backgroundColor: theme.primary,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
    },
    doneButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.surface,
    },

    // Error Footer
    footer: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
    },
    cancelButton: {
      borderWidth: 1,
      borderColor: theme.border,
    },
    retryButton: {
      backgroundColor: theme.primary,
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    retryButtonText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.surface,
    },
  });
