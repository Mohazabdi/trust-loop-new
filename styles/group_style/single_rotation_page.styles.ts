import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const SingleRotationPageStyles = (theme: AppTheme) =>
  StyleSheet.create({
    groupContentContainer: {
      //minHeight: SCREEN_HEIGHT,
      padding: 10,
      //   flex: 1,
      borderTopLeftRadius: 30,
      borderTopRightRadius: 30,
      backgroundColor: theme.background,
    },

    myPlansContainer: {
      padding: 10,
      // borderWidth: 1,
      //backgroundColor: theme.surface,
      borderRadius: 21,
      width: SCREEN_WIDTH * 0.9,
    },
    containerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // padding: 10,
      // gap: 10,
    },
    planTypeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // padding: 10,
      gap: 10,
      // borderWidth: 1,
    },
    planTypeText: {
      fontSize: 15,
      fontWeight: "bold",
    },
    planStatusContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      // padding: 10,
      gap: 10,
      // borderWidth: 1,
    },
    planName: {
      fontSize: 16,
      fontWeight: "bold",
    },
    containerBody: {
      gap: 10,
      // padding: 10,
      // borderWidth: 1,
    },
    planDetailsContainer: {
      flexDirection: "row",
      padding: 5,
    },
    planProgressContainerLeft: {
      justifyContent: "center",
      alignItems: "center",
      padding: 10,
      height: 135,
      width: 135,
      // backgroundColor: theme.success,
      borderRadius: 140,
    },
    planProgressContainerRight: {
      padding: 10,
      justifyContent: "center",
      alignItems: "flex-start",
      maxWidth: "60%",
      // borderWidth: 1,
      gap: 10,
    },
    planDescriptionText: {
      fontSize: 11,
    },
    planDateContainer: {
      flexDirection: "row",
      gap: 10,
    },
    planStartDate: {
      fontSize: 12,
      fontWeight: "bold",
    },
    planMembersContainer: {
      flexDirection: "row",
      gap: 10,
    },
    planMemberCount: {
      fontSize: 12,
      fontWeight: "bold",
    },
    containerFooter: {},
    nextEventText: {
      fontSize: 12,
      fontWeight: "bold",
    },
    bodySection: {
      padding: 10,
      gap: 10,
      // borderTopWidth: 1,
      // borderColor: theme.text,
    },
    rotationActionsGroup: {
      flexDirection: "row",
      gap: 10,
      // borderBottomWidth: 1,
      paddingTop: 5,
      justifyContent: "space-between",
      alignItems: "center",
      // borderColor: theme.border,
    },
    rotationAction: {
      flexDirection: "row",
      paddingHorizontal: 5,
      minWidth: SCREEN_WIDTH * 0.4,
      padding: 13,
      gap: 5,
      borderRadius: 23,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
    },
    buttonLabel: {
      fontSize: 11,
      fontWeight: "bold",
      color: theme.surface,
    },
    scheduleContainer: {
      gap: 10,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    progressBarContainer: {
      height: 6,
      backgroundColor: "#ffffff",
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
    scheduleTitle: {
      fontSize: 18,
      fontWeight: "bold",
    },
    scheduleSubTitle: {
      fontSize: 13,
      color: theme.textSecondary,
    },
    cycleContainer: {
      gap: 10,
    },
    cycleHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 10,
      // borderTopWidth: 2,
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    cycleTitle: {
      fontSize: 14,
      fontWeight: "bold",
    },
    cycleDatecontainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      justifyContent: "space-between",
    },
    cycleDate: {
      fontSize: 9,
      fontWeight: "bold",
    },
    cycleStatuscontainer: {
      flexDirection: "row",
      gap: 5,
      justifyContent: "space-between",
      alignItems: "center",
    },
    cycleStatus: {
      fontSize: 10,
    },
    cycleEventsList: {
      gap: 5,
      // backgroundColor: theme.surface,
      overflow: "hidden",
    },
    cycleEventContainer: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderRadius: 17,
      padding: 5,
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    eventMember: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      padding: 5,
      gap: 5,
    },
    eventMemberAvator: {
      height: 30,
      width: 30,
      borderRadius: 30,
      borderWidth: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    memberName: {
      fontSize: 12,
      fontWeight: "bold",
    },
    eventAction: {
      flexDirection: "row",
      alignSelf: "center",
      gap: 5,
      padding: 5,
    },
    actionName: {
      fontSize: 10,
    },
    actionAmount: {
      fontSize: 12,
      fontWeight: "bold",
    },
    eventActionStatus: {
      flexDirection: "row",
      alignItems: "center",
      padding: 5,
      gap: 5,
    },
    actionStatus: {
      fontSize: 10,
    },

    pendingMemberContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: 17,
      padding: 12,
      borderBottomWidth: 2,
      borderColor: theme.border,
    },
    pendingMemberInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    pendingInviteStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    inviteStatusText: {
      fontSize: 12,
      textTransform: "capitalize",
      color: theme.textSecondary,
    },
  });
