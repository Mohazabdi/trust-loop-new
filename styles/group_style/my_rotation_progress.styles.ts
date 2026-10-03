import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const MyRotationProgressStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      gap: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },

    // --- Next Contribution Card (rounded container) ---
    nextContributionContainer: {
      backgroundColor: theme.surface, // keep theme usage
      borderRadius: 16,
      padding: 16,
      gap: 16,
      // subtle shadow for elevation
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },

    sectionTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: "#6B7280", // gray-500
      letterSpacing: 0.5,
      marginBottom: 8,
    },

    upcomingDateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: "#F3F4F6", // light gray
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
    },
    upcomingDateText: {
      fontSize: 14,
      fontWeight: "500",
      color: "#1F2937", // gray-800
    },
    dateValue: {
      fontSize: 14,
      fontWeight: "600",
      color: "#3B82F6", // blue-500
      marginLeft: "auto",
    },

    progressStatsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: "#F9FAFB",
      padding: 12,
      borderRadius: 12,
    },
    statLabel: {
      fontSize: 12,
      color: "#6B7280",
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: "700",
      color: "#1F2937",
    },

    rotationDetailsCard: {
      backgroundColor: "#F9FAFB",
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    rotationDetailRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    detailLabel: {
      fontSize: 13,
      color: "#4B5563",
    },
    detailValue: {
      fontSize: 14,
      fontWeight: "600",
      color: "#1F2937",
    },
    progressBarContainer: {
      height: 6,
      backgroundColor: "#E5E7EB",
      borderRadius: 3,
      marginTop: 6,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      width: "40%", // dynamic based on data, but we'll handle in JSX
      backgroundColor: "#3B82F6",
      borderRadius: 3,
    },

    // --- Action Buttons Row ---
    progressActions: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
      marginVertical: 8,
    },
    actionButton: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
      gap: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    actionButtonText: {
      fontSize: 11,
      fontWeight: "500",
      color: theme.text, // use theme text color
    },

    // --- History Section ---
    historySection: {
      marginTop: 8,
      gap: 12,
    },
    historyTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: "#1F2937",
      marginBottom: 4,
    },
    historyList: {
      gap: 10,
    },
    historyItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 4,
      elevation: 1,
    },
    historyType: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
    },
    historyAmount: {
      fontSize: 15,
      fontWeight: "700",
      color: "#10B981", // green for contributed/distributed? use consistent
    },
    historyDate: {
      fontSize: 12,
      color: "#9CA3AF",
    },
    // you can add a badge for type
    typeBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 20,
      backgroundColor: "#E5E7EB",
    },
    typeText: {
      fontSize: 10,
      fontWeight: "500",
      color: "#4B5563",
    },
  });
