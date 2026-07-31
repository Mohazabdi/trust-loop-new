import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const TrustLoopProvidorsStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      // display: "flex",
      // gap: 10,
    },
    containerHeader: {
      color: theme.textSecondary,
      fontWeight: "bold",
      fontSize: 13,
      textAlign: "center",
    },
    recipientCardContainer: {
      borderWidth: 1,
      padding: 10,
      borderRadius: 16,
      borderColor: theme.border,
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
      alignItems: "center",
    },
    recipientDpContainer: {
      backgroundColor: theme.background,
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    recipientDp: {
      width: "100%",
      height: "100%",
    },
    iconFallBack: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    recipientDetailsContainer: {
      flex: 1,
      gap: 5,
    },
    recipientNameText: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.text,
    },
    recipientAccountIdText: {
      fontSize: 11,
      fontWeight: "bold",
      color: theme.textSecondary,
    },
  });
