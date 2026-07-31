import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export const WalletActionsStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      gap: 10,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 5,
    },
    sectionTitle: {
      padding: 3,
    },
    titleText: {
      color: theme.textSecondary,
      fontSize: 17,
      fontWeight: "bold",
    },
    body: {
      flexDirection: "row",
      justifyContent: "space-evenly",   // evens out spacing between the three buttons
      alignItems: "center",
      padding: 4,
      borderRadius: 16,
      gap: 10,
    },
    gradientButton: {
      // Outer wrapper – defines size & shadow, no background
      borderRadius: 24,
      overflow: "hidden",               // crucial: clips the gradient to the border radius
      minWidth: "27%",
      //aspectRatio: 0.5,                   // keeps buttons square-ish; adjust to your liking
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 4,
    },
    gradient: {
      // The actual gradient – fills the wrapper completely
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 12,
      gap: 6,
    },
    iconText: {
      color: theme.surface,            // white text for contrast
      fontSize: 11,
      fontWeight: "bold",
      textAlign: "center",
    },
  });