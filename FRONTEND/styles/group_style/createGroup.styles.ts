import { StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

export const GroupCreationStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      //backgroundColor: theme.surface,
      // borderRadius: 20,
      padding: 20,
      gap: 16,
    },
    sectionHeader: {
      alignItems: "center",
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      marginBottom: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
    },
    inputgroup: {
      gap: 6,
    },
    label: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.text,
    },
    input: {
      borderWidth: 1,
      borderColor: "#d1d5db",
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: theme.text,
      backgroundColor: "#fff",
    },
    textArea: {
      height: 100,
      textAlignVertical: "top",
    },
    dropdownButton: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#d1d5db",
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    dropdownButtonText: {
      fontSize: 15,
      color: theme.text,
    },
    placeholderText: {
      color: theme.textSecondary,
    },
    arrow: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: "#fff",
      borderRadius: 16,
      width: "80%",
      maxHeight: "50%",
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "700",
      marginBottom: 16,
      textAlign: "center",
      color: theme.text,
    },
    optionItem: {
      paddingVertical: 14,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
      borderRadius: 10,
    },
    selectedOption: {
      backgroundColor: `${theme.primary}15`,
    },
    optionText: {
      fontSize: 16,
      color: theme.text,
    },
    selectedOptionText: {
      color: theme.primary,
      fontWeight: "600",
    },
    buttonContainer: {
      flexDirection: "row",
      gap: 12,
      marginTop: 8,
    },
    createButtonGradient: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    createButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "700",
    },
    cancelButton: {
      flex: 1,
      backgroundColor: "#fff",
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "#d1d5db",
      alignItems: "center",
      justifyContent: "center",
    },
    cancelButtonText: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: "600",
    },
  });