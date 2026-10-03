import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const GroupHeroSectionStyles = (theme: AppTheme) =>
  StyleSheet.create({
    groupInfoContainer: {
      justifyContent: "space-between",
      padding: 10,
      // backgroundColor: theme.surface,
      // borderWidth: 1,
      // borderRadius: 50,
      // borderBottomLeftRadius: 30,
      // borderBottomRightRadius: 30,
    },
    groupInfoUpper: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
      alignItems: "center",
    },
    // profileUpperLeft: {

    //   overflow: "hidden",
    //   backgroundColor: theme.background,
    //   justifyContent: "center",
    //   alignItems: "center",
    //   //   padding: 10,
    //   borderColor: theme.border,
    //   borderWidth: 2,
    // },
    groupDpContainer: {
      backgroundColor: theme.background,
      borderWidth: 2,
      borderColor: theme.border,
      borderRadius: 90,
      height: 90,
      width: 90,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
      shadowColor: theme.foreground,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 8,
      elevation: 5,
    },
    groupDp: {
      width: "100%",
      height: "100%",
    },
    iconFallBack: {
      width: "100%",
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
    },
    profileUpperRight: {
      flex: 1,
      gap: 5,
      padding: 5,
      alignItems: "flex-start",
      justifyContent: "center",
      //   borderColor: "#000000",
      //   borderWidth: 2,
    },
    groupNameText: {
      fontSize: 21,
      fontWeight: "bold",
      padding: 5,
    },
    groupInfoMid: {
      padding: 10,
      //   borderColor: "#000000",
      //   borderWidth: 2,
    },
    groupTypeContainer: {
      flexDirection: "row",
      borderWidth: 1,
      borderColor: theme.border,
      padding: 7,
      borderRadius: 20,
      gap: 10,
      maxWidth: "100%",
    },
    groupTypeText: {
      fontSize: 10,
      fontWeight: "bold",
    },
    groupDescriptionText: {
      fontSize: 10,
      color: theme.textSecondary,
      fontWeight: "bold",
    },

    groupInfoLower: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 10,
      borderTopWidth: 1,
      borderColor: theme.border,
    },
    groupCountContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
      padding: 7,
    },
    groupCountText: {
      fontSize: 10,
      fontWeight: "bold",
    },
    groupCreatedAtContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
    },
    groupCreatedAtText: {
      fontSize: 10,
    },
    groupCreatedByContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 10,
    },
    groupCreatedByText: {
      fontSize: 10,
    },
  });
