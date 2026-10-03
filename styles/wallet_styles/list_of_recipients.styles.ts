import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const ListOfRecipientsStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 10,
      //
      // gap: 10,
    },
    containerHeader: {
      color: theme.textSecondary,
      fontWeight: "bold",
      fontSize: 13,
      textAlign: "center",
    },
    containerBody: {
      flex: 1,
      // borderWidth: 1,
    },

    searchRecipientsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      overflow: "hidden",
      width: "100%",
      marginVertical: 5,
      borderWidth: 2,
      borderRadius: 16,
      borderColor: theme.border,
    },
    searchInputContainer: {
      flex: 1,
      borderRightWidth: 2,
      borderColor: theme.border,
    },
    searchInput: {
      fontSize: 15,
      fontWeight: "400",
      color: theme.textSecondary,
      textAlign: "left",
      padding: 8,
      backgroundColor: theme.surface,
      width: "100%",
      minHeight: 40,
    },
    searchInitiateContainer: {
      padding: 8,
      justifyContent: "center",
      alignItems: "center",
      minWidth: 44,
    },
    recipientTabsContainer: { flex: 1, gap: 5 },
    tabScrollContainer: {
      padding: 2,
      gap: 5,
      justifyContent: "space-between",
      alignItems: "center",
    },
    tabButtonContainer: {
      padding: 8,
      borderWidth: 1,
      borderRadius: 16,
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderColor: theme.border,
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      justifyContent: "space-between",
      gap: 5,
      alignItems: "center",
    },
    tabButtonText: {
      fontSize: 13,
      fontWeight: "600",
      // marginRight: 8,
      color: theme.textSecondary,
    },
    tabRenderContainer: {
       maxHeight:SCREEN_HEIGHT*0.4,
      // flex:1,
      borderColor: theme.border,
      borderTopWidth: 1,
      padding: 5,
    },
    recipientDrawerActions: {
      borderTopWidth: 1,
      borderColor: theme.border,

      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 10,
      marginBottom: 5,
      //   gap: 7,
    },
    optionsIcons: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      minWidth: "25%",
      borderWidth: 1,
      borderColor: theme.border,
      padding: 10,
      gap: 3,
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    optionsIconsText: {
      fontWeight: "bold",
      color: theme.text,
      fontSize: 12,
    },
  });
