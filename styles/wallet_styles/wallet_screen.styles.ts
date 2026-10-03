import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const MywalletScreenStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      minHeight: SCREEN_HEIGHT,
      minWidth: SCREEN_WIDTH,
      padding: 10,
    },
    scrollArea: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    greetings: {
      minWidth: SCREEN_WIDTH * 0.9,
      justifyContent: "center",
      alignItems: "center",
      // paddingLeft: 40,
      // paddingTop: 10,
      // paddingBottom: 10,
    },
    walletName: {
      minWidth: SCREEN_WIDTH * 0.9,
      paddingTop: 30,
      paddingLeft: 30,
    },
    greetingsText: {
      color: theme.textSecondary,
      fontWeight: "bold",
      fontSize: 15,
    },
    walletNameText: {
      color: theme.foreground,
      fontWeight: "medium",
      fontSize: 20,
    },
  });
