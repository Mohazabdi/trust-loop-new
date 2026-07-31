import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const GroupMemberSectionStyles = (theme: AppTheme) =>
  StyleSheet.create({
    groupMembersContainer: {
      padding: 10,
      // borderWidth: 1,
      gap: 10,
    },
    groupMember: {
      borderRadius: 16,
      padding: 10,
      gap: 10,
      flexDirection: "row",
      alignItems: "center",
      // justifyContent: "space-between",
      backgroundColor: theme.surface,
    },
    groupMemberAvatar: {
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 50,
      width: 50,
      height: 50,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
    },
    groupMemberDetails: {
      gap: 3,
      alignContent: "flex-start",
      // justifyContent: "space-between",
    },
    groupMemberName: {
      fontSize: 15,
      fontWeight: "bold",
      color: theme.text,
    },
    memberDateJoined: {
      fontSize: 11,
      color: theme.textSecondary,
    },
    memberType: {
      fontSize: 10,
      // width: "auto",
      maxWidth: "50%",
      padding: 5,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      alignItems: "center",
    },
    memberRightItems: {
      flex: 1,
      // borderWidth: 1,
      flexDirection: "column-reverse",
      justifyContent: "space-between",
      alignItems: "flex-end",
    },
  });
