import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useGlobalStorage } from "@/store/useGlobalStorage";

import { RecentActivityStyles } from "@/styles/wallet_styles/recent_activity.styles";
import { router } from "expo-router";
import {
    ArrowDownCircle,
    ArrowUpCircle,
    BanknoteArrowUp,
    CircleCheckBig,
    CircleFadingPlus,
    Clock,
    Filter,
    SquareArrowOutUpRight,
    XCircle,
} from "lucide-react-native";
import { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { toast } from "sonner-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { TransactionHistory } from "@/lib/types/transaction_history";
import { TruncatedText } from "@/utils/TruncateText";
import { formatDate } from "@/utils/custom_functions";
import { SCREEN_HEIGHT } from "@gorhom/bottom-sheet";
interface TransactionHistoryProps {
  entity_id?: string;
  hold_balances:number[];
  available_balances:number[];
  current_balances:number[];
  wallet_number:string;
  wallet_name:string;
 currency_symbol:string;
 currency_code:string;
 currency_name:string;
  
}
export default function RecentActivity({ 
  entity_id,
  hold_balances,
   available_balances,
   current_balances,
   wallet_number,
   wallet_name,
   currency_symbol,
   currency_code,
   currency_name
  }: TransactionHistoryProps) {
  const { theme, isPrivacyOn } = useGlobalStorage();
  const {
    data: transactionHistory,
    isLoading: historyLoading,
    error: historyError,
    refetch:refetchTransactionHistory
  } = useTransactionHistory(entity_id);
    const totalHoldBalance = hold_balances.reduce((sum, current) => sum + current, 0);
    const totalCurrentBalance = current_balances.reduce((sum, current) => sum + current, 0);
    const totalAvalilableBalance = available_balances.reduce((sum, current) => sum + current, 0);
  //console.log("Transaction History Data",transactionHistory);
const generateTableRows = (data:TransactionHistory[]|[]) => {
  return data
    .map((item) => {
      const formattedItemDate = new Date(item.date_of_transaction).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      const isCredit = item.entry_type === "credit";
      const amountPrefix = isCredit ? "+" : "-";
      const amountColor = isCredit ? "#15803d" : "#b91c1c"; // Green for credit, Red for debit

      return `
        <tr>
          <td>
            <div style="font-weight: 600; color: #0f172a;">${item.trans_category}</div>
            <div class="sub-text">Ref: ${item.trans_ref}</div>
          </td>
          <td class="sub-text" style="vertical-align: middle;">${item.account_involved}</td>
          <td class="sub-text" style="vertical-align: middle;">${formattedItemDate}</td>
          <td style="vertical-align: middle; text-align: center;">
            <span class="status-pill">${item.entry_status}</span>
          </td>
          <td style="text-align: right; font-weight: 700; color: ${amountColor}; vertical-align: middle;">
            ${amountPrefix}${item.entry_amount.toLocaleString()} ${currency_code}
          </td>
        </tr>
      `;
    })
    .join("");
};
   const handleStatementDownload =async()=>{

const htmlStatement = `
  <html>
  <head>
    <meta charset="utf-8">
    <title>TrustLoop Account Statement</title>
    <style>
      body {
        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
        color: #333333;
        margin: 0;
        padding: 40px 30px;
        background-color: #ffffff;
      }
      .statement-container {
        max-width: 750px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 2px solid #f1f5f9;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .brand-name {
        font-size: 28px;
        font-weight: 800;
        color: #0f172a;
        margin: 0;
        letter-spacing: -0.5px;
      }
      .statement-title {
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 1.5px;
        color: #64748b;
        margin: 4px 0 0 0;
        font-weight: 600;
      }
      .meta-details {
        text-align: right;
        font-size: 13px;
        color: #64748b;
        line-height: 1.5;
      }
      .statement-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
      }
      .statement-table th {
        background-color: #f8fafc;
        color: #64748b;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 700;
        padding: 12px 16px;
        border-bottom: 1px solid #e2e8f0;
      }
      .statement-table td {
        padding: 16px;
        border-bottom: 1px solid #f1f5f9;
        font-size: 14px;
      }
      .sub-text {
        font-size: 12px;
        color: #64748b;
        margin-top: 3px;
      }
      .status-pill {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        background-color: #f1f5f9;
        color: #475569;
      }
.balance-dashboard {
  display: flex;
  gap: 20px;
  margin-bottom: 35px;
  width: 100%;
}
.balance-card {
  flex: 1;
  background: #ffffff;
  border: 1px solid #adacac;
  border-radius: 16px;
  padding: 20px;
}


.wallet-info-card {
  background: #ffffff;
  border-color: #adacac;
  color: #000000;
}

.card-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 700;
  color: #121b27;
  margin-top: 0;
  margin-bottom: 12px;
}

.wallet-info-card .card-title {
  color: #0e0e0e;
}

.wallet-name {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
}

.wallet-meta {
  font-size: 13px;
  color: #1c1e22;
  font-family: 'Courier New', Courier, monospace;
}
.balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.balance-row:not(:last-child) {
  border-bottom: 1px dashed #e2e8f0;
}

.balance-label {
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.balance-value {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
}

.balance-row.primary-balance .balance-label {
  color: #0f172a;
  font-weight: 700;
}

.balance-row.primary-balance .balance-value {
  color: #15803d;
  font-size: 18px;
}

.hold-amount {
  color: #b45309;
}

      .footer {
        text-align: center;
        margin-top: 60px;
        padding-top: 20px;
        border-top: 1px solid #f1f5f9;
        font-size: 12px;
        color: #94a3b8;
      }
    </style>
  </head>
  <body>
    <div class="statement-container">
      
      <!-- EXECUTIVE HEADER -->
      <div class="header">
        <div>
          <h1 class="brand-name">TrustLoop</h1>
          <p class="statement-title">Account Statement</p>
        </div>
        <div class="meta-details">
          <div><strong>Generated on:</strong> ${new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}</div>
          <div><strong>Records:</strong> ${transactionHistory?.length} entries</div>
        </div>
      </div>
<div class="balance-dashboard">
  <div class="balance-card wallet-info-card">
    <p class="card-title">Wallet Details</p>
    <div class="wallet-name">${wallet_name}</div>
    <div class="wallet-meta">${wallet_number}</div>
    <div style="font-size: 12px; color: #94a3b8; margin-top: 15px;">
      Currency: ${currency_name} (${currency_code})
    </div>
  </div>
  <div class="balance-card">
    <p class="card-title">Balance Breakdown</p>
    <div class="balance-row primary-balance">
      <span class="balance-label">Available Balance</span>
      <span class="balance-value"> ${totalAvalilableBalance}.00 ${currency_code}</span>
    </div>
    <div class="balance-row">
      <span class="balance-label">Current Balance</span>
      <span class="balance-value">${totalCurrentBalance}.00 ${currency_code}</span>
    </div>
    <div class="balance-row">
      <span class="balance-label">Held Balance</span>
      <span class="balance-value hold-amount">${totalHoldBalance}.00 ${currency_code}</span>
    </div>
  </div>

</div>


      <!-- TRANSACTION TABLE -->
      <table class="statement-table">
        <thead>
          <tr>
            <th style="text-align: left; width: 30%;">Description</th>
            <th style="text-align: left; width: 20%;">Account</th>
            <th style="text-align: left; width: 25%;">Date & Time</th>
            <th style="text-align: center; width: 10%;">Status</th>
            <th style="text-align: right; width: 15%;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${generateTableRows(transactionHistory??[])}
        </tbody>
      </table>

      <!-- FOOTER -->
      <div class="footer">
        <p>This is an automatically generated document. No signature required.</p>
        <p style="font-size: 11px; margin-top: 5px;">&copy; ${new Date().getFullYear()} TrustLoop. All rights reserved.</p>
      </div>

    </div>
  </body>
  </html>
`;

  try{
    const{uri}=await Print.printToFileAsync({
      html:htmlStatement

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
  const hasNoActivity =(!transactionHistory||transactionHistory.length===0);
 if (hasNoActivity) {
  return (
    <View style={{ gap: 14 }}>
      <TouchableOpacity
        onPress={async () => {
          const { data: refetchData, error: refetchError } = await refetchTransactionHistory();
          if (refetchData) toast.success('Your Recent Activity is up to date');
          if (refetchError) toast.error('Something went wrong, could not refetch your Recent Activity');
        }}
        style={{
          borderWidth: 2,
          borderColor: theme.border,
          borderStyle: 'dashed',
          justifyContent: 'center',
          alignItems: 'center',
          height: SCREEN_HEIGHT * 0.3,
          width: '100%',
          borderRadius: 18,
          padding: 10,
        }}
      >
        <CircleFadingPlus size={40} color={theme.textSecondary} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.textSecondary, textAlign: 'center' }}>
          You have No Recent Activities to show
        </Text>
      </TouchableOpacity>
    </View>
  );
}
 
  const styles = useMemo(() => RecentActivityStyles(theme), [theme]);
  return (
    <View style={[styles.container,{marginBottom:20}]}>
      {/* header */}
      <View style={styles.header}>
        <View style={styles.sectionTitle}>
          <Text style={styles.titleText}>Recent Activity</Text>
        </View>
        <View style={styles.sectionActions}>
          <TouchableOpacity style={styles.filterAction}>
            <Filter size={17} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.showAllAction} onPress={handleStatementDownload}>
            <Text style={styles.showAllActionText}>Download</Text>
            <ArrowDownCircle size={18} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    <ScrollView
  nestedScrollEnabled={true}
  style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}
  contentContainerStyle={[styles.body]}
>
        {transactionHistory && (
          transactionHistory?.map((item) => {
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.activityContainer}
                onPress={() => {
                  console.log(
                    "The transId from the recent activity page",
                    item.trans_id,
                  );
                  router.push({
                    pathname: "/(tabs)/transactionReceipt",
                    params: { 
                      transaction_id: item.trans_id,
                      entity_id:entity_id
                    },
                  });
                }}
              >
                <View style={styles.activityIcon}>

                  {item.entry_type==='credit'?
                  
                  <ArrowDownCircle size={27} color={theme.primary} />
                  :
                  <ArrowUpCircle size={27} color={theme.error} />
                }
                </View>
                <View style={styles.activityTextContainer}>
                  <View style={styles.activityTitle}>
                    <Text style={styles.activityTitleText}>
                      {item.trans_category}
                    </Text>
                  </View>
                  {
                    item.transaction_description&&(
                      <View style={styles.activitySubTitle}>
                    <TruncatedText
                      text={item.transaction_description}
                      maxLines={2}
                      style={styles.activitySubTitleText}
                    />
                  </View>
                    )
                  }
                  
                </View>
                <View style={styles.activityStatusContainer}>
                  {item.entry_status === "posted" ? (
                    <CircleCheckBig size={13} color={theme.success} />
                  ) : item.entry_status === "pending" ? (
                    <Clock size={13} color={"#2ca9ad"} />
                  ) : (
                    <XCircle size={13} color={theme.error} />
                  )}
                </View>
                <View style={styles.activityMetaContainer}>
                  <View style={styles.activityAmount}>
                    <Text
                      style={[
                        styles.activityAmountText,
                        {
                          color:
                            item.entry_type === "credit"
                              ? theme.success
                              : theme.error,
                        },
                      ]}
                    >
                      {isPrivacyOn
                        ? item.entry_type === "credit"
                          ? `+${item.entry_amount}`
                          : `-${item.entry_amount}`
                        : "----"}
                    </Text>
                  </View>
                  <View style={styles.activityDateTime}>
                    <Text style={styles.activityDateTimeText}>{formatDate(item.date_of_transaction, "medium_date")}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) }
      </ScrollView>
      {/* {transactionHistory && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.footerOptionContainer}>
            <Text style={styles.footerOptionText}>
              View All Transaction History
            </Text>
            <SquareArrowOutUpRight size={25} color={theme.text} />
          </TouchableOpacity>
        </View>
      )} */}
    </View>
  );
}
