import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const BalanceHeroSectionStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 10,
      borderWidth: 2,
      borderRadius: 16,
      borderColor: theme.border,
    },
    content: {
      display: "flex",
      flexDirection: "column",
      padding: 10,
      gap: 10,
    },
    widgetPanel: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      alignItems: "center",
    },
    header: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 5,
      minWidth: "95%",
    },
    headerLeft: {
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      width: "20%",
      padding: 0,
    },

    headerMid: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 0,
      width: "50%",
    },
    headerMidText: {
      textTransform: "capitalize",
      color: theme.text,
      fontWeight: "bold",
      fontSize: 13,
      textAlign: "center",
    },
    headerRight: {
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-end",
      width: "20%",
    },

    totalBalancePanel: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minWidth: "95%",
      minHeight: "40%",
    },
    totalBalanceText: {
      color: theme.text,
      fontWeight: "bold",
      fontSize: 45,
    },
    footer: {
      display: "flex",
      flexDirection: "row",
      gap: 5,
      minWidth: "95%",
    },
    footerCurrencyContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      minWidth: "20%",
      borderRightWidth: 2,
      borderColor: theme.border,
    },
    footerCurrencyText: {
      color: theme.text,
      fontWeight: "bold",
      fontSize: 12,
    },
    footerBalanceTypeContainer: {
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      minWidth: "70%",
    },
    footerBalanceTypeText: {
      color: theme.text,
      fontWeight: "semibold",
      fontSize: 12,
      textAlign: "left",
    },
    optionsPanel: {
      borderTopWidth: 1,
      borderColor: theme.border,
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 15,
    },
    optionsIcons: {
      backgroundColor: theme.surface,
      borderRadius: 15,
      minWidth: "25%",
      borderWidth: 1,
      borderColor: theme.border,
      padding: 7,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
  });
