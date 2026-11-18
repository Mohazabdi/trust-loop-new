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
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

interface ConfirmTransferModalProps {
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
  setIsPinModalOpen: (value: boolean) => void;
  amount: string;
  selectedAccount: WalletAccount | undefined;
  
  // Optional props for Transfer Mode
  handleAmount?: (a: string) => void;
  handleDescription?: (d: string) => void;
  description?: string;
  selectedRecipient?: Recipient | undefined;
  setIsRecipientSheetOpen?: (val: boolean) => void;
  setIsAccountSheetOpen?: (val: boolean) => void;
}

export default function ConfirmTransferModal({
  isOpen,
  setIsOpen,
  amount,
  selectedAccount,
  setIsPinModalOpen,
  handleAmount,
  handleDescription,
  description,
  selectedRecipient,
  setIsRecipientSheetOpen,
  setIsAccountSheetOpen,
}: ConfirmTransferModalProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => ConfirmTransferModalStyles(theme), [theme]);

  const Account = ACC_TYPE_UICONFIG_MAP[selectedAccount?.account_type ?? "personal"];
  const Recipient = RECIPIENT_TYPE_UICONFIG_MAP[selectedRecipient?.recipient_type ?? "user"];
  
  // If handleAmount exists, we are in "Transfer" mode. Otherwise, "Deposit" mode.
  const isTransferMode = !!handleAmount;

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

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={() => setIsOpen(false)}
    >
      <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {isTransferMode ? "Confirm Send" : "Confirm Deposit"}
                </Text>
                <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.closeButton}>
                  <X size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Amount Section */}
              <Text style={styles.amountLabel}>
                {isTransferMode ? "Amount" : "You are depositing"}
              </Text>
              <View style={styles.amountSection}>
                {isTransferMode ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TextInput
                      inputMode="decimal"
                      value={amount?.toString() ?? ""}
                      onChangeText={handleAmount}
                      placeholder="0.00"
                      placeholderTextColor={theme.textSecondary}
                      style={styles.amountValueInput}
                    />
                    <Text style={styles.amountValue}> KES</Text>
                  </View>
                ) : (
                  <Text style={styles.amountValue}>
                    KES {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </Text>
                )}
              </View>

              {/* Fee & Total */}
              <View style={styles.detailsRow}>
                <Text style={styles.detailLabel}>Fee</Text>
                <Text style={styles.detailValue}>KES 0.00</Text>
              </View>
              <View style={[styles.detailsRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>
                  {isTransferMode ? "Total to send" : "Total to be received"}
                </Text>
                <Text style={styles.totalValue}>
                  KES {Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </Text>
              </View>

              {/* Source Account (Only for Transfers) */}
              {isTransferMode && (
                <TouchableOpacity
                  onPress={() => setIsAccountSheetOpen?.(true)}
                  style={styles.infoRow}
                >
                  <View style={styles.iconWrap}>
                    <Account.icon size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.infoLabel}>From</Text>
                    <Text style={styles.infoValue}>{Account.label}</Text>
                    <Text style={styles.infoSubtext}>{selectedAccount?.account_name}</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Destination / Recipient */}
              <TouchableOpacity
                onPress={() => isTransferMode && setIsRecipientSheetOpen?.(true)}
                disabled={!isTransferMode}
                style={styles.infoRow}
              >
                <View style={styles.iconWrap}>
                  {isTransferMode ? (
                    <Recipient.icon size={20} color={theme.primary} />
                  ) : (
                    <Account.icon size={20} color={theme.primary} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>
                    {isTransferMode ? "To" : "To Account"}
                  </Text>
                  <Text style={styles.infoValue}>
                    {isTransferMode 
                      ? selectedRecipient?.recipient_name 
                      : selectedAccount?.account_name}
                  </Text>
                  <Text style={styles.infoSubtext}>
                    {isTransferMode 
                      ? selectedRecipient?.account_number 
                      : selectedAccount?.account_number}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Description (Only for Transfers) */}
              {isTransferMode && (
                <View style={styles.dateRow}>
                  <TextInput
                    inputMode="text"
                    value={description}
                    onChangeText={handleDescription}
                    autoCapitalize="sentences"
                    multiline
                    placeholder="What is this for?"
                    placeholderTextColor={theme.textSecondary}
                    style={styles.descriptionText}
                  />
                  <Calendar size={14} color={theme.textSecondary} />
                  <Text style={styles.dateText}>{formattedDate}</Text>
                </View>
              )}

              {/* Footer Actions */}
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
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}