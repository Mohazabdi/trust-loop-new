import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const GroupMyTimeLineSectionStyles = (theme: AppTheme) =>
  StyleSheet.create({
    userTimeLineContainer: {
      borderRadius: 27,
      // borderWidth: 2,
      // borderColor: theme.textSecondary,
      backgroundColor: theme.surface,
      gap: 10,
      padding: 20,
    },
    userTimeLine: {
      padding: 5,
      justifyContent: "space-between",
    },
    timeLineHeader: {
      flexDirection: "row",
      gap: 10,
      // borderWidth: 1,
      paddingTop: 10,
      borderBottomWidth: 1,
      borderColor: theme.border,
      justifyContent: "space-between",
      alignItems: "center",
    },
    timeLineHeadingContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    timeLineHeadingText: {
      fontSize: 16,
      fontWeight: "bold",
    },
    timeLineQueueOptionContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 5,
    },
    timeLineQueuePrioritize: {
      flexDirection: "row",
      gap: 5,
      padding: 5,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
    },
    timeLinePrioritizeText: {
      fontSize: 10,
      color: theme.textSecondary,
    },
    timeLineQueueSnooze: {
      flexDirection: "row",
      gap: 5,
      padding: 5,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
    },
    timeLineSnoozeText: {
      fontSize: 10,
      color: theme.textSecondary,
    },
    timelinePlanName: {
      fontSize: 11,
      fontWeight: "bold",
      // textAlign:"center"
      color: theme.textSecondary,
      marginLeft: 10,
    },
    timelinePlanDescriptionContainer: {
      flexDirection: "row",
      padding: 10,
      gap: 5,
      alignItems: "center",
    },
    timelinePlanDescription: {
      fontSize: 12,
      fontWeight: "semibold",
      // textAlign:"center"
      marginLeft: 10,
    },
    timelineFooter: {
      flexDirection: "row",
      gap: 10,
      // padding: 10,
      justifyContent: "space-around",
      alignItems: "center",
    },
    timelineFooterDateContents: {
      // flexDirection: "row",
      justifyContent: "space-between",
      // alignItems: "center",
      gap: 10,
      padding: 10,
    },
    timelineFooterActionContents: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 5,
      minWidth: "40%",
      padding: 10,
      borderRadius: 23,
      // borderWidth: 1,
      // borderColor: theme.border,
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
      backgroundColor: "#0c880c",
      borderRadius: 3,
    },
    timelineFooterDueDateText: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    timelineFooterActionText: {
      fontSize: 13,
      fontWeight: "bold",
      textAlign: "center",
      color: theme.surface,
    },
  });
