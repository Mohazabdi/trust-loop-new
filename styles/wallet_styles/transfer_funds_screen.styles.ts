import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const TransferFundsScreenStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      minHeight: SCREEN_HEIGHT,
      minWidth: SCREEN_WIDTH,
    },
    scrollArea: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      gap: 10,
    },
    sectionOptions: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 20,
      gap: 5,
    },
    sectionOptionsTitle: {
      color: theme.textSecondary,

      fontSize: 17,
      fontWeight: "bold",
    },
    emptyAccountContainer: {
      flex: 1,
      padding: 10,

      display: "flex",
      minWidth: "98%",
      justifyContent: "center",
      alignItems: "center",
    },
    emptyAccountCard: {
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "90%",
      borderRadius: 16,
      borderWidth: 3,
      borderColor: theme.border,
      borderStyle: "dashed",
      padding: 10,
    },

    emptyAccountSectionTitle: {
      color: theme.textSecondary,
      fontSize: 16,
      fontWeight: "semibold",
    },

    selectAction: {
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#212520",
      minWidth: "20%",
      padding: 10,
      borderRadius: 17,
    },
    selectActionText: {
      padding: 0,
      color: theme.surface,
      fontSize: 12,
      fontWeight: "bold",
    },
    amountInput: {
      backgroundColor: theme.surface,
      color: theme.text,
      padding: 12,
      fontSize: 20,
      fontWeight: "bold",
      letterSpacing: -1,
      marginBottom: 10,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
    },
    descriptionInput: {
      // fontSize: 18,
      // fontWeight: "400",
      // color: theme.textSecondary,
      // textAlign: "left",
      // paddingVertical: 12,
      // paddingHorizontal: 10,
      // backgroundColor: theme.surface,
      // borderRadius: 8,
      // width: "70%",
      // minHeight: 50,
      backgroundColor: theme.surface,
      color: theme.text,
      padding: 15,
      fontSize: 16,
      fontWeight: "400",
      //letterSpacing: -1,
      marginVertical: 10,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
    },
    footer: {
      paddingVertical: 15,
      backgroundColor: theme.background,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    initiateButton: {
      borderWidth: 2,
      borderColor: theme.success,
      backgroundColor: theme.surface,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: theme.text,
      fontSize: 16,
      fontWeight: "600",
    },
    // bottomSheetContainer: {

    // },
    // bottomSheetHeader: {

    // },
  });
