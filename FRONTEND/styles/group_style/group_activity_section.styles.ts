import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const GroupActivitySectionStyles = (theme: AppTheme) =>
  StyleSheet.create({
    groupActivityContainer: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 10,
      gap: 10,
    },
    activityContainer: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      padding: 5,
      width: "99.9%",
      justifyContent: "space-between",
      backgroundColor: theme.surface,
      overflow: "hidden",
      borderRadius: 12,
    },
    activityIcon: {
      display: "flex",
      justifyContent: "center",
      flexDirection: "column",
      alignItems: "center",
      width: "14%",
      padding: 10,
      borderRadius: 10,
      overflow: "hidden",
      backgroundColor: theme.background,
    },
    activityTextContainer: {
      display: "flex",
      flexDirection: "column",
      gap: 2,
      width: "40%",
      overflow: "hidden",
    },

    activityTitle: {
      // borderWidth: 1,
      // borderColor: theme.text,
    },
    activityTitleText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "bold",
    },
    activitySubTitle: {
      // borderWidth: 1,
      // borderColor: theme.text,
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
    },
    activitySubTitleText: {
      color: theme.textSecondary,
      fontWeight: "semibold",
      fontSize: 11,
    },
    activityStatusContainer: {
      width: "5%",
      padding: 2,
      // borderWidth: 1,
      // borderColor: theme.text,
    },
    activityMetaContainer: {
      display: "flex",
      flexDirection: "column",
      gap: 3,
      width: "15%",
      overflow: "hidden",
    },
    activityAmount: {
      // borderWidth: 1,
      // borderColor: theme.text,
    },
    activityAmountText: {
      fontSize: 13,
      fontWeight: "bold",
    },
    activityDateTimeText: {
      fontSize: 9,
      fontWeight: "light",
      color: theme.textSecondary,
    },

    activityDateTime: {
      // borderWidth: 1,
      // borderColor: theme.text,
    },
  });
