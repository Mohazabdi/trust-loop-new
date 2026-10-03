// components/myWallet/transfer/confirmTransferModal.tsx
import {
    ACC_TYPE_UICONFIG_MAP,
    RECIPIENT_TYPE_UICONFIG_MAP,
} from "@/lib/configurations/financeMaps.config";
import { Recipient } from "@/lib/types/recipients";
import { WalletAccount } from "@/lib/types/wallets";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { ConfirmTransferModalStyles } from "@/styles/wallet_styles/confirm_transfer_modal.styles";
import { Calendar, CheckCircle, X } from "lucide-react-native";
import { useMemo } from "react";
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { TextInput } from "react-native-gesture-handler";

interface TransferModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  setIsPinModalOpen: (value: boolean) => void;
  amount: string;
  description?: string;
  handleDescription: (d: string) => void;
  handleAmount: (a: string) => void;
  selectedAccount: WalletAccount | undefined;
  selectedRecipient?: Recipient | undefined;
  //transactionData?: TransactionInput;
}

export default function ConfirmTransferModal({
  //transactionData,
  isOpen,
  setIsOpen,
  amount,
  selectedAccount,
  selectedRecipient,
  description,
  handleDescription,
  handleAmount,
  setIsPinModalOpen,
}: TransferModalProps) {
  const { theme, setIsRecipientSheetOpen, setIsAccountSheetOpen } =
    useGlobalStorage();
  const styles = useMemo(() => ConfirmTransferModalStyles(theme), [theme]);

  const Account =
    ACC_TYPE_UICONFIG_MAP[selectedAccount?.account_type ?? "personal"];
  const Recipient =
    RECIPIENT_TYPE_UICONFIG_MAP[selectedRecipient?.recipient_type ?? "user"];
  const handleConfirm = () => {
    setIsOpen(false);
    setIsPinModalOpen(true);
  };
  const formattedDate = new Date()
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    .replace(/ /g, "-");
  if (!isOpen) {
    return null;
  } else {
    Keyboard.dismiss();
    return (
      <>
        {/* <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsOpen(false)}
        > */}
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          // style={{ backgroundColor: "#913232" }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{
              flex: 1,
              justifyContent: "center",
              backgroundColor: "transparent",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
            }}
          >
            <View style={styles.container}>
              <View style={styles.modalCard}>
                {/* Header */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Confirm Send</Text>
                  <TouchableOpacity
                    onPress={() => setIsOpen(false)}
                    style={styles.closeButton}
                  >
                    <X size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Amount  */}
                <Text style={styles.amountLabel}>Amount</Text>
                <View style={styles.amountSection}>
                  <TextInput
                    // ref={amountRef}
                    inputMode="decimal"
                    value={amount?.toString() ?? ""}
                    onChangeText={handleAmount}
                    placeholder="Amount"
                    placeholderTextColor={theme.textSecondary}
                    style={styles.amountValue}
                  />
                  <Text style={styles.amountValue}> KES</Text>
                </View>

                {/* Fee & Total */}
                <View style={styles.detailsRow}>
                  <Text style={styles.detailLabel}>Fee</Text>
                  <Text style={styles.detailValue}>0.00 KES</Text>
                </View>
                <View style={[styles.detailsRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalValue}>{amount} KES</Text>
                </View>

                {/* Source Account */}
                <TouchableOpacity
                  onPress={() => setIsAccountSheetOpen(true)}
                  style={styles.infoRow}
                >
                  <Account.icon size={16} color={theme.textSecondary} />
                  <Text style={styles.infoLabel}>From</Text>
                  <Text style={styles.infoValue}>{Account.label}</Text>
                  <Text style={styles.infoSubtext}>
                    {selectedAccount?.account_name}
                  </Text>
                </TouchableOpacity>

                {/* Recipient */}
                <TouchableOpacity
                  onPress={() => setIsRecipientSheetOpen(true)}
                  style={styles.infoRow}
                >
                  <Recipient.icon size={16} color={theme.textSecondary} />
                  <Text style={styles.infoLabel}>To</Text>
                  <Text style={styles.infoValue}>
                    {selectedRecipient?.recipient_name}
                  </Text>
                  <Text style={styles.infoSubtext}>
                    {selectedRecipient?.account_number}
                  </Text>
                </TouchableOpacity>

                {/* Date */}
                <View style={styles.dateRow}>
                  <TextInput
                    inputMode="text"
                    value={description}
                    onChangeText={handleDescription}
                    autoCapitalize="sentences"
                    multiline={true}
                    placeholder="What is this for?"
                    placeholderTextColor={theme.textSecondary}
                    style={styles.descriptionText}
                  />
                  <Calendar size={14} color={theme.textSecondary} />
                  <Text style={styles.dateText}>{formattedDate}</Text>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                  <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={() => setIsOpen(false)}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.confirmButton]}
                    onPress={handleConfirm}
                  >
                    <CheckCircle size={20} color={theme.surface} />
                    <Text style={styles.confirmButtonText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
        {/* </Modal> */}
      </>
    );
  }
}
