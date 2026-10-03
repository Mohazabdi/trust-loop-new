import { Dimensions, StyleSheet } from "react-native";
import { AppTheme } from "../theme/colors";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export const TransactionReceiptStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: {
      padding: 10,
    },
    actions: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
    },
    actionButton: {
      flexDirection: "row",
      padding: 10,
      borderRadius: 18,
      // width:"40%",
      gap: 10,
      backgroundColor: theme.surface,
      justifyContent: "center",
      alignItems: "center",
      minWidth: "40%",
    },
    header: {
      gap: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    transactionCode: {
      fontSize: 10,
    },
    transactionDateContainer: {
      flexDirection: "row",
      padding: 10,
    },
    transactionDateText: {
      fontSize: 10,
    },
    body: {
      gap: 10,
    },
    bodyTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 10,
      gap: 10,
    },
    transactionTypeText: {
      fontSize: 18,
      fontWeight: "bold",
    },
    transactionAmountText: {
      fontSize: 19,
      fontWeight: "semibold",
      color: theme.success,
    },
    transactionStatusContainer: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 5,
    },
    transactionStatusText: {
      fontSize: 10,
    },

    bodySection: {
      gap: 10,
      paddingHorizontal: 10,
    },
    bodySectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      borderBottomWidth: 1,
      borderColor: theme.border,
    },
    bodySectionContent: {
      gap: 10,
    },
    bodySectionSender: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 10,
      // borderBottomWidth: 1,
      // borderColor: theme.border,
    },
    bodySectionNameContainer: {
      padding: 10,
      gap: 10,
      flexDirection: "row",
      alignItems: "center",
    },
    bodySectionSenderNameTitle: {
      fontSize: 13,
      fontWeight: "bold",
      color: theme.textSecondary,
    },
    bodySectionSenderName: {
      fontSize: 12,
      fontWeight: "bold",
    },
    senderTypeContainer: {
      flexDirection: "row",
      gap: 5,
      padding: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
    },

    bodySectionSenderType: {
      fontSize: 10,
      fontWeight: "bold",
    },
    // bodySectionPart: {},
    bodySectionSplitContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      gap: 10,
    },
    bodySectionAccount: {
      gap: 5,
      borderRightWidth: 2,
      borderColor: theme.border,
      paddingRight: 10,
      //   borderRightWidth: 1,
      //   alignItems: "center",
    },
    bodySectionAccountTitle: {
      fontSize: 13,
      fontWeight: "bold",
    },
    bodySectionAccName: {
      fontSize: 12,
    },
    bodySectionAccNoContainer: {
      flexDirection: "row",
      gap: 5,
      padding: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
    },
    bodySectionAccNo: {
      fontSize: 10,
      fontWeight: "bold",
    },
    bodySectionWallet: {
      gap: 5,
    },
    bodySectionWalletTitle: {
      fontSize: 13,
      fontWeight: "bold",
    },
    bodySectionWalletName: {
      fontSize: 12,
    },
    bodySectionWalletNoContainer: {
      flexDirection: "row",
      gap: 5,
      padding: 5,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      justifyContent: "center",
      alignItems: "center",
    },

    bodySectionWalletNo: {
      fontSize: 10,
      fontWeight: "bold",
      //   padding: 5,
    },
    bodySectionFinance: { gap: 10 },
    bodySectionAmountContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    bodySectionAmountTitle: {
      fontSize: 15,
      fontWeight: "bold",
    },
    bodySectionAmount: {
      fontSize: 17,
    },
    bodySectionFeeContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    bodySectionFeeTitle: {
      fontSize: 15,
      fontWeight: "bold",
    },
    bodySectionFee: {
      fontSize: 17,
    },
    bodySectionNetAmountContainer: {
      borderTopWidth: 1,
      borderColor: theme.border,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    bodySectionNetAmountTitle: {
      fontSize: 15,
      fontWeight: "bold",
    },
    bodySectionNetAmount: {
      fontSize: 17,
      fontWeight: "600",
    },
    bodySectionProvidor: {
      padding: 10,
      borderRadius: 17,
      borderStyle: "dotted",
      borderWidth: 3,
      borderColor: theme.border,
    },
    bodySectionProvidorContainer: {
      flexDirection: "row",
      gap: 10,
    },
    bodySectionProvidorTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.textSecondary,
    },
    bodySectionProvidorName: {
      fontSize: 12,
    },
    bodySectionProvidorRefContainer: {
      flexDirection: "row",
      gap: 10,
    },
    bodySectionProvidorRefTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.textSecondary,
    },
    bodySectionProvidorRef: {
      fontSize: 12,
    },
    bodySectionProvidorAccContainer: {
      flexDirection: "row",
      gap: 10,
    },
    bodySectionProvidorAccTitle: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.textSecondary,
    },
    bodySectionProvidorAcc: {
      fontSize: 12,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 10,
    },
  });
