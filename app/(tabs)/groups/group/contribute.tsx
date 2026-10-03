import CustomWalletHeader from "@/components/myWallet/customHeader";
import PinEntryModal from "@/components/myWallet/PinEntryModal";
import SelectedAccount from "@/components/myWallet/selectedAccount";
import ConfirmTransferModal from "@/components/myWallet/transfer/confirmTransferModal";
import { useFinalizeTransaction } from "@/hooks/useFinalizeTransaction";
import { useGetRotationMemberId } from "@/hooks/useGetRotationMemberId";
import { useGetRotationPlan } from "@/hooks/useGetRotationPlan";
import { useMemberData } from "@/hooks/useMemberData";
import { ProviderFilters, useProviders } from "@/hooks/useProviders";
import { useProcessTransaction } from "@/hooks/useProcessTransaction";
import { useRecordRotationReservation } from "@/hooks/useRecordRotationReservation";
import { useUserWallet } from "@/hooks/useUserWallet";
import { TransactionInput } from "@/lib/types/transaction";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { TransferFundsScreenStyles } from "@/styles/wallet_styles/transfer_funds_screen.styles";
import { processKenyanPhone } from "@/utils/custom_functions";
import { useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import {
  ArrowBigUpDash,
  Banknote,
  BellIcon,
  ChevronLeft,
  Smartphone,
} from "lucide-react-native";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  findNodeHandle,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";

const TRANS_CATEGORY = "Rotation Reserve Contribution";
const MOBILE_MONEY_PROVIDER_FILTER: ProviderFilters = {
  provider_types: new Set(["mobile_money"]),
};

export default function DepositFunds() {
  const queryClient = useQueryClient();
  const router = useRouter();

  // ---- Stores ----
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const {
    isAdmin,
    rotationPlanId,
    groupMemberId,
    rotationMemberId,
  } = useGroupStorage();
  const { selectedAccount, setSelectedAccount } = useTransferFundsStorage();

  // ---- Remote data ----
  const { data: member } = useMemberData();
  const { data: wallet } = useUserWallet(member?.id);
  const { data: RotationPlan } = useGetRotationPlan(rotationPlanId);

  // Kept wired up exactly as in the original — used by other flows / future use
  const { data: memberRotationPlanId } = useGetRotationMemberId(
    groupMemberId,
    rotationPlanId,
  );

  const { data: providers = [] } = useProviders(MOBILE_MONEY_PROVIDER_FILTER);
  const mobileMoneyProvider = providers[0];

  // ---- Mutations ----
  const mutation = useProcessTransaction();
  const finalize = useFinalizeTransaction();
  const mutationReservation = useRecordRotationReservation();

  // ---- Local state ----
  const [amount, setAmount] = useState("");
  const [mpesaPhoneInput, setMpesaPhoneInput] = useState("");
  const [confirmDeposit, setConfirmDeposit] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionInput>();

  // ---- Refs ----
  const scrollRef = useRef<ScrollView>(null);
  const sourceAccountRef = useRef<View>(null);
  const amountRef = useRef<TextInput>(null);
  const mpesaPhoneInputRef = useRef<TextInput>(null);

  // ---- Styles ----
  const styles = useMemo(() => TransferFundsScreenStyles(theme), [theme]);

  /**
   * Claymorphism — soft tactile surfaces.
   * Applied subtly on this child screen; hero-level claymorphism lives on tab index pages.
   */
  const clay = useMemo(() => {
    const isDark = (theme as { mode?: string }).mode === "dark";
    const shadowBase = isDark ? "#000000" : "#94a3b8";
    return {
      card: {
        shadowColor: shadowBase,
        shadowOffset: { width: 6, height: 6 },
        shadowOpacity: isDark ? 0.45 : 0.22,
        shadowRadius: 14,
        elevation: 6,
      },
      input: {
        shadowColor: shadowBase,
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: isDark ? 0.35 : 0.18,
        shadowRadius: 10,
        elevation: 4,
      },
      button: {
        shadowColor: shadowBase,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: isDark ? 0.5 : 0.25,
        shadowRadius: 12,
        elevation: 5,
      },
    };
  }, [theme]);

  // ---- Derived ----
  const { isValid, formatted } = useMemo(
    () => processKenyanPhone(mpesaPhoneInput),
    [mpesaPhoneInput],
  );

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return Number.isFinite(n) ? n : 0;
  }, [amount]);

  const isProcessing =
    mutation.isPending || finalize.isPending || mutationReservation.isPending;
  const canInitiate = numericAmount > 0 && isValid && !isProcessing;

  // ---- Actions ----
  const leftAction = useCallback(() => router.back(), [router]);
  const rightAction = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen],
  );

  // ---- Seed destination account from the rotation plan ----
  useEffect(() => {
    if (!RotationPlan) return;
    setSelectedAccount({
      account_id: RotationPlan.account_id ?? "",
      account_name: RotationPlan.account_name ?? "",
      account_number: RotationPlan.account_name ?? "",
      account_status: "active",
      account_type: "escrow",
      available_balance: 0,
      color_tag: "",
      currency_code: RotationPlan.currency_code ?? "",
      currency_symbol: "",
      current_balance: 0,
      hold_balance: 0,
      currency_name: "",
    });
  }, [RotationPlan, setSelectedAccount]);

  // ---- Handlers ----
  const scrollToInput = useCallback(
    (ref: React.RefObject<TextInput | null>) => {
      const scrollNode = findNodeHandle(scrollRef.current);
      const inputNode = findNodeHandle(ref.current);
      if (!scrollNode || !inputNode) return;
      ref.current?.measure((_x, y) => {
        scrollRef.current?.scrollTo({
          y: Math.max(y - 24, 0),
          animated: true,
        });
      });
      ref.current?.focus();
    },
    [],
  );

  const handleAmount = useCallback((text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      const intPart = cleaned.slice(0, firstDot);
      const decPart = cleaned
        .slice(firstDot + 1)
        .replace(/\./g, "")
        .slice(0, 2);
      cleaned = `${intPart}.${decPart}`;
    }
    setAmount(cleaned);
  }, []);

  const handleInitiateDeposit = useCallback(() => {
    if (!numericAmount) {
      toast("Specify the amount you want to deposit via M-Pesa", {
        position: "top-center",
        icon: <Banknote color={theme.warning} size={20} />,
      });
      scrollToInput(amountRef);
      return;
    }

    if (!isValid || !formatted) {
      toast("Enter a valid M-Pesa phone number", {
        position: "top-center",
        icon: <Smartphone color={theme.warning} size={20} />,
      });
      scrollToInput(mpesaPhoneInputRef);
      return;
    }

    if (!mobileMoneyProvider || !RotationPlan || !member) {
      toast.error("Unable to start deposit. Please try again.");
      return;
    }

    setTransactionData({
      currency: RotationPlan.currency_code ?? "",
      idempotency_key: Crypto.randomUUID(),
      destination_acc: RotationPlan.account_id ?? "",
      initiator_id: member.id,
      providor_id: mobileMoneyProvider.id ?? "",
      source_acc: mobileMoneyProvider.provider_acc_id ?? "",
      source_wallet_id: wallet?.wallet_id ?? "",
      trans_amount: numericAmount,
      trans_category_id: TRANS_CATEGORY,
      trans_type: "deposit",
      trans_description: `Contribution to ${RotationPlan.rotation_name} from M-Pesa via ${formatted}`,
    });

    Keyboard.dismiss();
    setConfirmDeposit(true);
  }, [
    numericAmount,
    isValid,
    formatted,
    mobileMoneyProvider,
    RotationPlan,
    member,
    wallet,
    theme.warning,
    scrollToInput,
  ]);

  const handleDeposit = useCallback(async () => {
    if (!transactionData) {
      toast.error("Transaction details missing. Please try again.");
      return;
    }

    try {
      const result = await mutation.mutateAsync(transactionData);
      const txId = result.data?.transaction_id ?? "";
      const idemId = result.data?.idempotency_id ?? "";

      try {
        await finalize.mutateAsync({
          idempotency_id: idemId,
          transaction_id: txId,
          transaction_status: "completed",
        });
      } catch (finError: any) {
        console.error("Finalize failed, transaction processed:", finError);
        toast.warning("Transaction processed but confirmation pending.");
      }

      try {
        await mutationReservation.mutateAsync({
          rotation_plan_member_id: rotationMemberId ?? "",
          transaction_id: txId,
        });
        queryClient.invalidateQueries({
          queryKey: ["rotation_reserve_amounts", rotationMemberId],
        });
      } catch (e: any) {
        console.error("Reservation recording failed:", e);
        toast.warning("Deposit succeeded but reservation could not be recorded.");
      }

      toast.success("Deposit completed successfully!");
      router.back();
    } catch (error: any) {
      toast.error(error?.message ?? "Deposit failed. Please try again.");
    } finally {
      setSelectedAccount(undefined);
    }
  }, [
    transactionData,
    mutation,
    finalize,
    mutationReservation,
    rotationMemberId,
    queryClient,
    router,
    setSelectedAccount,
  ]);

  // ---- Render ----
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <CustomWalletHeader
        subTitle="Make a Contribution"
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{ icon: BellIcon, action: rightAction }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.scrollArea}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Destination */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <Text style={styles.sectionOptionsTitle}>Destination Account</Text>
          </View>

          {selectedAccount ? (
            <SelectedAccount
              account={selectedAccount}
              openBottomSheet={() => {}}
            />
          ) : (
            <View style={styles.emptyAccountContainer}>
              <View style={[styles.emptyAccountCard, clay.card]}>
                <Text style={styles.emptyAccountSectionTitle}>
                  No account selected
                </Text>
                <ArrowBigUpDash color={theme.textSecondary} size={48} />
              </View>
            </View>
          )}

          {/* Amount */}
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={[styles.sectionOptionsTitle, { marginTop: 24 }]}>
              Amount
            </Text>
            <View style={[clay.input, { marginTop: 8 }]}>
              <TextInput
                ref={amountRef}
                inputMode="decimal"
                value={amount}
                onChangeText={handleAmount}
                placeholder="0.00"
                placeholderTextColor={theme.textSecondary}
                style={[styles.amountInput, { marginBottom: 0 }]}
              />
            </View>

            {/* M-Pesa phone */}
            <Text style={[styles.sectionOptionsTitle, { marginTop: 24 }]}>
              M-Pesa Phone Number
            </Text>
            <View
              style={[
                clay.input,
                {
                  marginTop: 8,
                  borderWidth: 1.5,
                  borderRadius: 18,
                  borderColor:
                    mpesaPhoneInput.length === 0
                      ? theme.border
                      : isValid
                        ? theme.success
                        : theme.error,
                },
              ]}
            >
              <TextInput
                ref={mpesaPhoneInputRef}
                value={mpesaPhoneInput}
                onChangeText={setMpesaPhoneInput}
                keyboardType="phone-pad"
                placeholder="+254 7XX XXX XXX"
                placeholderTextColor={theme.textSecondary}
                style={{
                  color: theme.text,
                  fontSize: 20,
                  fontWeight: "700",
                  letterSpacing: 0.5,
                  paddingVertical: 6,
                }}
              />
            </View>

            {mpesaPhoneInput.length > 0 && (
              <Text
                style={{
                  color: isValid ? theme.success : theme.error,
                  fontSize: 12,
                  marginTop: 8,
                  fontWeight: "600",
                }}
              >
                {isValid
                  ? `STK push will be sent to ${formatted}`
                  : "Enter a valid Kenyan phone number"}
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.initiateButton,
              clay.button,
              {
                borderRadius: 18,
                backgroundColor: canInitiate ? theme.success : theme.surface,
                borderColor: canInitiate ? theme.success : theme.border,
                opacity: isProcessing ? 0.65 : 1,
              },
            ]}
            onPress={handleInitiateDeposit}
            disabled={isProcessing}
          >
            <Text
              style={[
                styles.buttonText,
                { color: canInitiate ? "#ffffff" : theme.textSecondary },
              ]}
            >
              {isProcessing ? "Processing…" : "Initiate Deposit"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <ConfirmTransferModal
        isOpen={confirmDeposit}
        setIsOpen={setConfirmDeposit}
        setIsPinModalOpen={setIsPinModalOpen}
        amount={amount}
        selectedAccount={selectedAccount}
        handleDescription={() => {}}
        handleAmount={handleAmount}
      />

      <PinEntryModal
        isOpen={isPinModalOpen}
        setIsOpen={setIsPinModalOpen}
        amount={numericAmount}
        handleSend={handleDeposit}
      />
    </SafeAreaView>
  );
}