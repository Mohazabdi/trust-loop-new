import CustomWalletHeader from "@/components/myWallet/customHeader";
import SelectedAccount from "@/components/myWallet/selectedAccount";
import { useMemberData } from "@/hooks/useMemberData";
import { useProviders } from "@/hooks/useProviders";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { TransactionInput } from "@/lib/types/transaction";
import PinEntryModal from "@/components/myWallet/PinEntryModal";
import ConfirmTransferModal from "@/components/myWallet/transfer/confirmTransferModal";
import { useFinalizeTransaction } from "@/hooks/useFinalizeTransaction";
import { useProcessTransaction } from "@/hooks/useProcessTransaction";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { DepositFundsScreenStyles } from "@/styles/wallet_styles/deposit_funds_screen.styles";
import { processKenyanPhone } from "@/utils/custom_functions";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import { Banknote, BellIcon, ChevronDown, ChevronLeft, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import BottomSheet from "@gorhom/bottom-sheet";
import { useRef } from "react";
import CustomBottomSheet from "@/components/CustomBottomSheet";
import ListOfAccounts from "@/components/myWallet/listOfAccounts";
import { WalletAccount } from "@/lib/types/wallets";

export default function DepositFunds() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  
  // Data Hooks
  const { data: member } = useMemberData();
  const { data: wallet } = useUserWallet(member?.id);
  const { data: accounts } = useWalletAccounts(wallet?.wallet_id);
  const { data: providers = [] } = useProviders({ provider_types: new Set(["mobile_money"]) });
  
  // Mutations
  const mutation = useProcessTransaction();
  const finalize = useFinalizeTransaction();
  const idempotencyKey = useMemo(() => Crypto.randomUUID(), []);

  // Local State (No global store needed for this screen!)
  const [selectedAccount, setSelectedAccount] = useState<WalletAccount | undefined>();
  const [amount, setAmount] = useState("");
  const [mpesaPhoneInput, setMpesaPhoneInput] = useState("");
  const [errors, setErrors] = useState<{ account?: string; amount?: string; phone?: string }>({});
  
  // Modal State
  const [confirmDeposit, setConfirmDeposit] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionInput>();

  // Bottom Sheet Ref
  const bottomAccountsSheetRef = useRef<BottomSheet>(null);

  // Auto-select first account on load
  useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts]);

  const { isValid: isPhoneValid, formatted: formattedPhone } = useMemo(
    () => processKenyanPhone(mpesaPhoneInput),
    [mpesaPhoneInput]
  );

  const handleAmountChange = (text: string) => {
    const cleanNumber = text.replace(/[^0-9.]/g, "");
    const parts = cleanNumber.split(".");
    if (parts.length <= 2) setAmount(cleanNumber);
  };

  const handleInitiateDeposit = () => {
    Keyboard.dismiss();
    const newErrors: typeof errors = {};

    if (!selectedAccount) newErrors.account = "Please select a destination account";
    if (!amount) newErrors.amount = "Specify the amount you want to deposit";
    if (!mpesaPhoneInput) newErrors.phone = "Enter M-Pesa phone number to initiate STK push";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) return;

    // Prepare data for confirm modal
    const mobileMoneyProvider = providers[0];
    setTransactionData({
      currency: selectedAccount!.currency_code,
      idempotency_key: idempotencyKey,
      destination_acc: selectedAccount!.account_id,
      initiator_id: member?.id || "",
      providor_id: mobileMoneyProvider.id || "",
      source_acc: mobileMoneyProvider.provider_acc_id || "",
      source_wallet_id: wallet?.wallet_id || "",
      trans_amount: parseFloat(amount) || 0,
      trans_category_id: "Mpesa Deposit",
      trans_type: "deposit",
      trans_description: `Deposited from M-Pesa via phone ${mpesaPhoneInput}`,
    });
    setConfirmDeposit(true);
  };

  const handleDeposit = async (pin: string) => {
    if (!transactionData) return;
    setIsPinModalOpen(false);

    try {
      const result = await mutation.mutateAsync({ ...transactionData, pin });
      
      try {
        await finalize.mutateAsync({
          idempotency_id: result.data?.idempotency_id ?? "",
          transaction_id: result.data?.transaction_id ?? "",
          transaction_status: "completed",
        });
      } catch {
        toast.warning("Transaction processed but confirmation pending.");
      }

      toast.success("Money Deposited from M-Pesa successfully!");
      router.push({
        pathname: "/(tabs)/wallet/receipt",
        params: { transaction_id: result.data?.transaction_id },
      });
    } catch (error: any) {
      toast.error(error.message || "Deposit failed. Please try again.");
    }
  };

  const styles = useMemo(() => DepositFundsScreenStyles(theme), [theme]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <CustomWalletHeader
        subTitle="Deposit Money"
        leftAction={{ icon: ChevronLeft, action: () => router.back() }}
        rightAction={{ icon: BellIcon, action: () => setIsNotificationOpen(true) }}
      />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
          
          {/* 1. Account Selection */}
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.label}>Destination Account *</Text>
            {selectedAccount ? (
              <SelectedAccount account={selectedAccount} openBottomSheet={() => bottomAccountsSheetRef.current?.snapToIndex(0)} />
            ) : (
              <TouchableOpacity style={styles.emptyAccountCard} onPress={() => bottomAccountsSheetRef.current?.snapToIndex(0)}>
                <Text style={styles.emptyText}>Select an Account</Text>
                <ChevronDown color={theme.textSecondary} size={20} />
              </TouchableOpacity>
            )}
            {errors.account && <Text style={styles.errorText}>{errors.account}</Text>}
          </View>

          {/* 2. Hero Amount Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.label}>Amount *</Text>
            <View style={styles.amountWrapper}>
              <Text style={styles.currencySymbol}>KES</Text>
              <TextInput
                inputMode="decimal"
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                style={styles.heroAmountInput}
              />
            </View>
            {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
          </View>

          {/* 3. M-Pesa Phone Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={styles.label}>M-Pesa Phone Number *</Text>
            <TextInput
              value={mpesaPhoneInput}
              onChangeText={setMpesaPhoneInput}
              keyboardType="phone-pad"
              style={[styles.input, mpesaPhoneInput.length > 0 && { borderColor: isPhoneValid ? theme.success : theme.error }]}
              placeholder="+254 7XX XXX XXX"
              placeholderTextColor={theme.textSecondary}
            />
            {isPhoneValid && <Text style={styles.successText}>STK push will be sent to: {formattedPhone}</Text>}
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>
        </ScrollView>

        {/* 4. Footer Action */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleInitiateDeposit}>
            <Text style={styles.primaryButtonText}>Initiate Deposit</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <ConfirmTransferModal
        isOpen={confirmDeposit}
        setIsOpen={setConfirmDeposit}
        setIsPinModalOpen={setIsPinModalOpen}
        amount={amount}
        selectedAccount={selectedAccount}
      />
      <PinEntryModal
        isOpen={isPinModalOpen}
        setIsOpen={setIsPinModalOpen}
        amount={parseFloat(amount)}
        onSubmit={handleDeposit} // <--- Passes PIN to our handler!
      />

      <CustomBottomSheet ref={bottomAccountsSheetRef} title="Select Destination Account" snapPoints={["70%"]}>
        <ListOfAccounts closeBottomSheet={() => bottomAccountsSheetRef.current?.close()} />
      </CustomBottomSheet>
    </SafeAreaView>
  );
}