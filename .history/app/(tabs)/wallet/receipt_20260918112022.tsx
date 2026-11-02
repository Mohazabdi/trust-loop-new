import { ErrorScreen } from "@/components/errorScreen";
import { LoadingScreen } from "@/components/loadingScreen";
import CustomWalletHeader from "@/components/myWallet/customHeader";
import { useMemberData } from "@/hooks/useMemberData";
import { useTransactionReceipt } from "@/hooks/useTransactionReceipt";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { TransactionReceiptStyles } from "@/styles/wallet_styles/transaction_receipt.styles";
import { formatDate } from "@/utils/custom_functions";
import { SCREEN_HEIGHT } from "@gorhom/bottom-sheet";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowDownCircle,
    BellIcon,
    Calendar,
    CheckCircle,
    ChevronDown,
    ChevronUp,
    CreditCard,
    Info,
    Share2,
    User,
    Users,
    Wallet2,
    XCircle,
} from "lucide-react-native";
import { ChevronLeft } from "lucide-react-native/icons";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { toast } from "sonner-native";

export default function TransactionReceipt() {
  const { theme, setIsNotificationOpen, toggleTheme } = useGlobalStorage();
  const { transaction_id,entity_id } = useLocalSearchParams<{
    transaction_id?: string;
    entity_id?:string;
  }>();
  // const {
  //   data: member,
  //   isLoading: memberLoading,
  //   error: memberError,
  // } = useMemberData();
  const {
    data: receiptData,
    isLoading,
    error,
  } = useTransactionReceipt(transaction_id, entity_id);
  //console.log('Receipt Data',receiptData);
  const isCredit = receiptData?.ledger_entry_type === "credit";

  const styles = useMemo(() => TransactionReceiptStyles(theme), [theme]);
  const [isRecipientCollapsed, setIsRecipientCollapsed] = useState(false);
  const [isSenderCollapsed, setIsSenderCollapsed] = useState(false);
  const rightAction = useCallback(() => {
    console.log("RightAction");
    setIsNotificationOpen(true);
  }, [setIsNotificationOpen]);
  const router = useRouter();
  const leftAction = () => {
    router.back();
  };
   
 
  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <LoadingScreen message="Loading transaction details..." />
      </SafeAreaView>
    );
  }

  if (error || !receiptData) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
        <ErrorScreen message={error?.message || "Transaction not found"} />
      </SafeAreaView>
    );
  }

 const handleReciptDownload =async()=>{
 const formattedDate = new Date(receiptData?.date_of_transaction).toLocaleString('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

const htmlReceipt = `
  <html>
  <head>
    <meta charset="utf-8">
    <title>TrustLoop Transaction Receipt</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #333333;
        margin: 0;
        padding: 30px;
        background-color: #ffffff;
      }
      .receipt-container {
        max-width: 600px;
        margin: 0 auto;
        border: 1px solid #e0e0e0;
        border-radius: 12px;
        padding: 24px;
        background: #ffffff;
      }
      .header {
        text-align: center;
        border-bottom: 2px dashed #e2e8f0;
        padding-bottom: 20px;
        margin-bottom: 24px;
      }
      .brand-name {
        font-size: 24px;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 4px 0;
        letter-spacing: -0.5px;
      }
      .receipt-title {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #64748b;
        margin: 0 0 16px 0;
        font-weight: 600;
      }
      .amount-display {
        font-size: 32px;
        font-weight: 700;
        color: #0f172a;
        margin: 12px 0 6px 0;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 12px;
        border-radius: 50px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        background-color: #dcfce7;
        color: #15803d;
      }
      .section-title {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 1px;
        margin: 20px 0 10px 0;
        border-bottom: 1px solid #f1f5f9;
        padding-bottom: 4px;
      }
      .kv-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 16px;
      }
      .kv-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        font-size: 14px;
      }
      .kv-label {
        color: #64748b;
        font-weight: 500;
      }
      .kv-value {
        color: #0f172a;
        font-weight: 600;
        text-align: right;
      }
      .footer {
        text-align: center;
        margin-top: 32px;
        padding-top: 16px;
        border-top: 1px solid #f1f5f9;
        font-size: 12px;
        color: #94a3b8;
      }
      .ref-text {
        font-family: 'Courier New', Courier, monospace;
        font-weight: 700;
        background: #f8fafc;
        padding: 2px 6px;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div class="receipt-container">
      
      <!-- HEADER AREA -->
      <div class="header">
        <h1 class="brand-name">TrustLoop</h1>
        <p class="receipt-title">Transaction Receipt</p>
        <div class="amount-display">
          +${receiptData.ledger_entry_amount?.toLocaleString()} KES
        </div>
        <span class="status-badge">${receiptData.entry_status}</span>
      </div>

      <!-- TRANSACTION SUMMARY -->
      <div class="kv-row" style="font-size: 15px; margin-bottom: 15px;">
        <span class="kv-label">Transaction Type</span>
        <span class="kv-value" style="color:${theme.primary};">${receiptData.transaction_category}</span>
      </div>
      <div class="kv-row" style="font-size: 15px; margin-bottom: 15px;">
        <span class="kv-label">Date & Time</span>
        <span class="kv-value">${formattedDate}</span>
      </div>

      <!-- TRANSFER DETAILS -->
      <div class="section-title">Transfer Details</div>
      
      <div class="kv-row">
        <span class="kv-label">Source</span>
        <span class="kv-value">${receiptData.providor_name} (${receiptData.source_name??receiptData.source_type})</span>
      </div>
      
      <div class="kv-row">
        <span class="kv-label">Recipient Name</span>
        <span class="kv-value">${receiptData.recipient_name}</span>
      </div>

      <div class="kv-row">
        <span class="kv-label">Recipient Account</span>
        <span class="kv-value">${receiptData.recipient_acc_no}</span>
      </div>

      <div class="kv-row">
        <span class="kv-label">Recipient Wallet</span>
        <span class="kv-value">${receiptData.recipient_wallet_no}</span>
      </div>

      <!-- REF NUMBERS -->
      <div class="section-title">References & Fees</div>

      <div class="kv-row">
        <span class="kv-label">Transaction Ref</span>
        <span class="kv-value ref-text">${receiptData.transaction_ref}</span>
      </div>

      <div class="kv-row">
        <span class="kv-label">Provider Ref</span>
        <span class="kv-value ref-text">${receiptData.providor_ref}</span>
      </div>

      <div class="kv-row">
        <span class="kv-label">Fee Charged</span>
        <span class="kv-value">${receiptData.applied_fee_amount === 0 ? "Free" : receiptData.applied_fee_amount + " KES"}</span>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <p>Thank you for using TrustLoop.</p>
        <p style="font-size: 10px; margin-top: 5px;">ID: ${receiptData.id}</p>
      </div>

    </div>
  </body>
  </html>
`;

  try{
    const{uri}=await Print.printToFileAsync({
      html:htmlReceipt
    })
    if(await Sharing.isAvailableAsync()){
      await Sharing.shareAsync(uri,{
        mimeType:"application/pdf",
        dialogTitle:"Download TrustLoop Transaction Receipt",
        UTI:"com.adobe.pdf"
      });}
      else{
        //Alert.alert("Error","Sharing Options are not available on this device");
      toast.info("Sharing Options are not available on this device")
      }
      }
      catch(error){
         toast.error(`Failed to generate receipt due to error ${error}`);

      }
    
  }
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <CustomWalletHeader
        subTitle="Transaction Receipt"
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{
          icon: BellIcon,
          action: rightAction,
        }}
      />
      <ScrollView>
        {receiptData ? (
          <>
            <View
              style={{
                minHeight: SCREEN_HEIGHT * 0.2,
                justifyContent: "center",
                alignItems: "center",
                gap: 10,
                paddingTop: 20,
              }}
            >
              {receiptData.ledger_entry_status === "pending" ? (
                <Info size={70} color={"#1d9ec5"} />
              ) : receiptData.ledger_entry_status === "failed" ? (
                <XCircle size={70} color={theme.error} />
              ) : (
                <CheckCircle size={70} color={theme.success} />
              )}
              <Text style={styles.transactionCode}>
                {receiptData.ledger_entry_status}
              </Text>
              <View style={styles.bodyTop}>
                <Text style={styles.transactionTypeText}>
                  {receiptData.transaction_category}
                </Text>
                <Text
                  style={{
                    fontSize: 19,
                    fontWeight: "semibold",
                    color: isCredit ? theme.success : theme.error,
                  }}
                >
                  {isCredit ? "+" : "-"}KES {receiptData.ledger_entry_amount}
                </Text>
              </View>
              <View style={styles.header}>
                <Text style={styles.transactionCode}>
                  {receiptData.transaction_ref}
                </Text>
                <View style={styles.transactionDateContainer}>
                  <Calendar size={16} color={theme.text} />
                  <Text style={styles.transactionDateText}>
                    {formatDate(receiptData.date_of_transaction, "medium_date")}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionButton}
                onPress={handleReciptDownload}
                >
                  <ArrowDownCircle size={20} color={theme.text} />
                  <Text
                    style={{
                      fontWeight: "bold",
                      fontSize: 11,
                    }}
                  >
                    Download
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Share2 size={20} color={theme.text} />
                  <Text
                    style={{
                      fontWeight: "bold",
                      fontSize: 11,
                    }}
                  >
                    Share
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.container}>
              <View style={styles.body}>
                <View style={styles.bodySection}>
                  <View style={styles.bodySectionHeader}>
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: theme.textSecondary,
                        fontSize: 17,
                      }}
                    >
                      Recipient
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setIsRecipientCollapsed(!isRecipientCollapsed)
                      }
                    >
                      {isRecipientCollapsed ? (
                        <ChevronDown size={22} color={theme.text} />
                      ) : (
                        <ChevronUp size={22} color={theme.text} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bodySectionContent}>
                    <View style={styles.bodySectionSender}>
                      <View style={styles.bodySectionNameContainer}>
                        <Text style={styles.bodySectionSenderNameTitle}>
                          Name:
                        </Text>
                        <Text style={styles.bodySectionSenderName}>
                          {receiptData.recipient_name}
                        </Text>
                      </View>
                      <View style={styles.senderTypeContainer}>
                        {receiptData.recipient_type === "group" ? (
                          <Users size={15} color={theme.text} />
                        ) : (
                          <User size={15} color={theme.text} />
                        )}
                        <Text style={styles.bodySectionSenderType}>
                          {receiptData.recipient_type === "group"
                            ? "Group"
                            : "User"}
                        </Text>
                      </View>
                    </View>
                    {isRecipientCollapsed && (
                      <View style={styles.bodySectionSplitContainer}>
                        <View style={styles.bodySectionWallet}>
                          <Text style={styles.bodySectionWalletTitle}>
                            Account
                          </Text>
                          <Text style={styles.bodySectionAccName}>
                            {receiptData.recipient_name}
                          </Text>
                          <View style={styles.bodySectionAccNoContainer}>
                            <CreditCard size={14} color={theme.text} />
                            <Text style={styles.bodySectionAccNo}>
                              {receiptData.recipient_acc_no}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.bodySectionWallet}>
                          <Text style={styles.bodySectionWalletTitle}>
                            Wallet
                          </Text>
                          <Text style={styles.bodySectionWalletName}>
                            {receiptData.recipient_wallet_name}
                          </Text>
                          <View style={styles.bodySectionWalletNoContainer}>
                            <Wallet2 size={14} color={theme.text} />
                            <Text style={styles.bodySectionWalletNo}>
                              {receiptData.recipient_wallet_no}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.bodySection}>
                  <View style={styles.bodySectionHeader}>
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: theme.textSecondary,
                        fontSize: 17,
                      }}
                    >
                      Source
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsSenderCollapsed(!isSenderCollapsed)}
                    >
                      {isSenderCollapsed ? (
                        <ChevronDown size={22} color={theme.text} />
                      ) : (
                        <ChevronUp size={22} color={theme.text} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bodySectionContent}>
                    <View style={styles.bodySectionSender}>
                      <View style={styles.bodySectionNameContainer}>
                        <Text style={styles.bodySectionSenderNameTitle}>
                          Name:
                        </Text>
                        <Text style={styles.bodySectionSenderName}>
                          {receiptData.source_name}
                        </Text>
                      </View>

                      <View style={styles.senderTypeContainer}>
                        {receiptData.source_type === "group" ? (
                          <Users size={15} color={theme.text} />
                        ) : (
                          <User size={15} color={theme.text} />
                        )}
                        <Text style={styles.bodySectionSenderType}>
                          {receiptData.source_type === "group"
                            ? "Group"
                            : "User"}
                        </Text>
                      </View>
                    </View>
                    {isSenderCollapsed && (
                      <View style={styles.bodySectionSplitContainer}>
                        <View style={styles.bodySectionWallet}>
                          <Text style={styles.bodySectionWalletTitle}>
                            Account
                          </Text>
                          <Text style={styles.bodySectionAccName}>
                            {receiptData.source_acc_name}
                          </Text>
                          <View style={styles.bodySectionAccNoContainer}>
                            <CreditCard size={14} color={theme.text} />
                            <Text style={styles.bodySectionAccNo}>
                              {receiptData.source_acc_no}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.bodySectionWallet}>
                          <Text style={styles.bodySectionWalletTitle}>
                            Wallet
                          </Text>
                          <Text style={styles.bodySectionWalletName}>
                            {receiptData.source_wallet_name}
                          </Text>
                          <View style={styles.bodySectionWalletNoContainer}>
                            <Wallet2 size={14} color={theme.text} />
                            <Text style={styles.bodySectionWalletNo}>
                              {receiptData.source_wallet_no}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.bodySection}>
                  <View style={styles.bodySectionHeader}>
                    <Text
                      style={{
                        fontWeight: "bold",
                        color: theme.textSecondary,
                        fontSize: 17,
                      }}
                    >
                      Financial Breakdown
                    </Text>
                  </View>
                  <View style={styles.bodySectionContent}>
                    <View style={styles.bodySectionFinance}>
                      <View style={styles.bodySectionAmountContainer}>
                        <Text style={styles.bodySectionAmountTitle}>
                          Amount:
                        </Text>
                        <Text style={styles.bodySectionAmount}>
                          {receiptData.ledger_entry_amount}
                        </Text>
                      </View>
                      <View style={styles.bodySectionFeeContainer}>
                        <Text style={styles.bodySectionFeeTitle}>Fee:</Text>
                        <Text style={styles.bodySectionFee}>
                          KES {receiptData.applied_fee_amount}
                        </Text>
                      </View>
                      <View style={styles.bodySectionNetAmountContainer}>
                        <Text style={styles.bodySectionNetAmountTitle}>
                          Net Amount:
                        </Text>
                        <Text style={styles.bodySectionNetAmount}>
                          KES{" "}
                          {receiptData.ledger_entry_amount +
                            receiptData.applied_fee_amount}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.bodySection}>
                  <View style={styles.bodySectionContent}>
                    <View style={styles.bodySectionProvidor}>
                      <View style={styles.bodySectionProvidorContainer}>
                        <Text style={styles.bodySectionProvidorTitle}>
                          Providor
                        </Text>
                        <Text style={styles.bodySectionProvidorName}>
                          {receiptData.providor_name}
                        </Text>
                      </View>
                      <View style={styles.bodySectionProvidorRefContainer}>
                        <Text style={styles.bodySectionProvidorRefTitle}>
                          Ref Code
                        </Text>
                        <Text style={styles.bodySectionProvidorRef}>
                          {receiptData.providor_ref}
                        </Text>
                      </View>
                      <View style={styles.bodySectionProvidorAccContainer}>
                        <Text style={styles.bodySectionProvidorAccTitle}>
                          Account
                        </Text>
                        <Text style={styles.bodySectionProvidorAcc}>
                          {receiptData.providor_acc_name}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
              <View style={styles.footer}>
                <Text style={{ fontSize: 10 }}>Transaction initiated by: </Text>
                <Text style={{ fontSize: 10 }}> Alvin Indiazi</Text>
              </View>
            </View>
          </>
        ) : (
          <View>
            <Text>
              Nothig to show here the item you looks for does not exist
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
