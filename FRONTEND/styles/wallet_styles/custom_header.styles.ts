import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const CustomWalletHeaderStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      // flex: 1,
      backgroundColor: theme.background,
      display: "flex",
      flexDirection: "row",
      minHeight: SCREEN_HEIGHT * 0.1,
      width: SCREEN_WIDTH,
      padding: 10,
      gap: 10,
    },
    leftContent: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minWidth: "20%",
    },
    iconView: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      borderRadius: "100%",
      backgroundColor: theme.surface,
      padding: 10,
      shadowColor: theme.foreground,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
    },

    midContent: {
      justifyContent: "center",
      alignItems: "center",
      alignContent: "center",
      width: "55%",
      // flexWrap: "wrap",
      // borderWidth: 1,
      // borderColor: "#fefe",
    },
    appTitle: {
      color: theme.foreground,
      fontWeight: "bold",
      textAlign: "center",
      fontSize: 26,
      padding: 0,
      // borderWidth: 2,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    appSubTitle: {
      color: theme.foreground,
      fontWeight: "bold",
      textAlign: "center",
      fontSize: 18,
      padding: 0,
      // borderWidth: 2,
      includeFontPadding: false,
      textAlignVertical: "center",
    },
    rightContent: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "20%",
      // borderWidth: 1,
      // borderColor: "rgba(175, 38, 175, 0.93)",
    },
  });
