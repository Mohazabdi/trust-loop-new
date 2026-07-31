import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const GroupTakeActionSectionStyles = (theme: AppTheme) =>
  StyleSheet.create({
    userTimeLineContainer: {
      borderRadius: 20,
      // borderWidth: 2,
      // borderColor: theme.textSecondary,
      minWidth: SCREEN_WIDTH * 0.7,
      backgroundColor: theme.surface,
      padding: 10,
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
      fontSize: 15,
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
      // borderWidth: 1,
      // borderColor: theme.border,
      // borderRadius: 10,
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
      fontSize: 10,
      fontWeight: "bold",
      // textAlign:"center"
      marginLeft: 10,
    },
    timelineFooter: {
      flexDirection: "row",
      gap: 10,
      // padding: 10,
      justifyContent: "space-between",
      alignItems: "center",
    },
    timelineFooterDateContents: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 5,
      padding: 5,
    },
    timelineFooterActionContents: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 5,
      padding: 5,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
    },
    timelineFooterDueDateText: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    timelineFooterActionText: {
      fontSize: 10,
      fontWeight: "bold",
      textAlign: "center",
      color: theme.text,
    },
  });
