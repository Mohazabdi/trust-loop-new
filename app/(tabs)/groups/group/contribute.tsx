import CustomWalletHeader from "@/components/myWallet/customHeader";
import SelectedAccount from "@/components/myWallet/selectedAccount";
import { useMemberData } from "@/hooks/useMemberData";
import { ProviderFilters, useProviders } from "@/hooks/useProviders";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { TransactionInput } from "@/lib/types/transaction";

import PinEntryModal from "@/components/myWallet/PinEntryModal";
import ConfirmTransferModal from "@/components/myWallet/transfer/confirmTransferModal";
import { useFinalizeTransaction } from "@/hooks/useFinalizeTransaction";
import { useProcessTransaction } from "@/hooks/useProcessTransaction";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { TransferFundsScreenStyles } from "@/styles/wallet_styles/transfer_funds_screen.styles";
import { processKenyanPhone } from "@/utils/custom_functions";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import {
    ArrowBigUpDash,
    Banknote,
    BellIcon,
    ChevronDown,
    ChevronLeft,
    CreditCard,
    Smartphone,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { useGetRotationPlan } from "@/hooks/useGetRotationPlan";
import { useGroupStorage } from "@/store/useGroupStorage";
import { useRecordRotationReservation } from "@/hooks/useRecordRotationReservation";
import { useGetRotationMemberId } from "@/hooks/useGetRotationMemberId";
import { useQueryClient } from "@tanstack/react-query";
export default function DepositFunds() {
  const queryClient = useQueryClient(); 
  const {
    data: member,
    isLoading: memberLoading,
    error: memberError,
  } = useMemberData();
  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
  } = useUserWallet(member?.id);
  const {
    theme,
    setIsNotificationOpen,
  } = useGlobalStorage();

  const mobileMoneyProvidorFilter: ProviderFilters = {
    provider_types: new Set(["mobile_money"]),
  };
  const { data: providers = [] } = useProviders(mobileMoneyProvidorFilter);
  const mutation = useProcessTransaction();
  const mutationReservation = useRecordRotationReservation();
  const finalize = useFinalizeTransaction();
  const idempotencyKey = Crypto.randomUUID();
  const styles = useMemo(() => TransferFundsScreenStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const sourceAccountRef = useRef<View>(null);
  const amountRef = useRef<TextInput>(null);
  const mpesaPhoneInputRef = useRef<TextInput>(null);

  const [confirmDeposit, setConfirmDeposit] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [transactionData, setTransactionData] = useState<TransactionInput>();
  const { selectedAccount, setSelectedAccount } =
    useTransferFundsStorage();
  const router = useRouter();

  const leftAction = () => {
    router.back();
  };
  const rightAction = useCallback(() => {
    console.log("RightAction");
    setIsNotificationOpen(true);
  }, [setIsNotificationOpen]);
   const { isAdmin ,rotationPlanId,groupMemberId,rotationMemberId} = useGroupStorage();
  const {data:RotationPlan}=useGetRotationPlan(rotationPlanId);
  // const{data:memberRotationPlanId}=useGetRotationMemberId(
  //   groupMemberId,
  //   rotationPlanId
  // );
   
  const [amount, setAmount] = useState("");
  const [mpesaPhoneInput, setMpesaPhoneInput] = useState("");
  const { isValid, formatted } = useMemo(
    () => processKenyanPhone(mpesaPhoneInput),
    [mpesaPhoneInput],
  );
  const handleAmount = (text: string) => {
    const cleanNumber = text.replace(/[^0-9.]/g, "");
    const parts = cleanNumber.split(".");
    if (parts.length > 2) return;
    setAmount(cleanNumber);
    const numericValue = parseFloat(cleanNumber);
  };
  // const handleMpesaPhoneInput = (text: string) => {
  //   setMpesaPhoneInput(text);
  // };
   useEffect(() => {
      setSelectedAccount({
        account_id:RotationPlan?.account_id??'',
        account_name:RotationPlan?.account_name??'',
        account_number:RotationPlan?.account_name??'',
        account_status:'active',
        account_type:'escrow',
        available_balance:0,
        color_tag:'',
        currency_code:RotationPlan?.currency_code??'',
        currency_symbol:'',
        current_balance:0,
        hold_balance:0,
        currency_name:'',
      })
     
  }, []);

  const handleInitiateDeposit = () => {
    const scrollNode = findNodeHandle(scrollRef.current);
    if (!amount) {
      toast("Specify the Amount you want to Deposit from Mpesa", {
        position: "top-center",
        icon: <Banknote color={theme.warning} size={20} />,
      });
      const sourceNode = findNodeHandle(amountRef.current);
      if (scrollNode && sourceNode) {
        amountRef.current?.measure((y) => {
          scrollRef.current?.scrollTo({ y: y - 20, animated: true });
          amountRef.current?.focus();
        });
      }
      return;
    }
    if (!mpesaPhoneInput) {
      toast("Enter mpesa phone Number to initiate stk push", {
        position: "top-center",
        icon: <Smartphone color={theme.warning} size={20} />,
      });
      const sourceNode = findNodeHandle(mpesaPhoneInputRef.current);
      if (scrollNode && sourceNode) {
        mpesaPhoneInputRef.current?.measure((y) => {
          scrollRef.current?.scrollTo({ y: y - 20, animated: true });
          mpesaPhoneInputRef.current?.focus();
        });
      }
      return;
      
    } else {
      const mobileMoneyProvidor = providers[0];
      setTransactionData({
        currency: RotationPlan?.currency_code||'',
        idempotency_key: idempotencyKey,
        destination_acc: RotationPlan?.account_id||'',
        initiator_id: member?.id || "",
        providor_id: mobileMoneyProvidor.id || "",
        source_acc: mobileMoneyProvidor.provider_acc_id || "",
        source_wallet_id: wallet?.wallet_id || "",
        trans_amount: parseFloat(amount) || 0,
        trans_category_id: "Rotation Reserve Contribution",
        trans_type: "deposit",
        trans_description: `Made a Contribution to ${RotationPlan?.rotation_name} from mpesa via phone ${mpesaPhoneInput} `,
      });
      setConfirmDeposit(true);
      Keyboard.dismiss();
    }
  };

  const handleDeposit = async () => {
    if (!transactionData) {
      toast.error("Transaction details missing. Please try again.");
      return;
    }

    try {
      const result = await mutation.mutateAsync(transactionData);
      console.log("Transaction completed:", result);
      try {
        await finalize.mutateAsync({
          idempotency_id: result.data?.idempotency_id ?? "",
          transaction_id: result.data?.transaction_id ?? "",
          transaction_status: "completed",
        });
        try{

          await mutationReservation.mutateAsync({
            rotation_plan_member_id: rotationMemberId??'',
            transaction_id: result.data?.transaction_id ?? ""
          })
          queryClient.invalidateQueries({
        queryKey: ["rotation_reserve_amounts", rotationMemberId],
        
      });
        }catch(e:any){
          console.error("Amount was not recorded successfully", e);
        toast.warning("Amount was not recorded successfully");
        }
      } catch (finError: any) {
        console.error("Finalize Failed ,transction proced", finError);
        toast.warning("Transaction processed but confirmation pending.");
      }
      toast.success("Money Deposited from Mpesa successfully!");
      router.back();
    } catch (error: any) {
      //console.error("Transaction failed:", error.message);
      toast.error(error.message || "Transfer failed. Please try again.");
    }finally{
      setSelectedAccount(undefined);
    }
  };
 
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <CustomWalletHeader
        subTitle="Make a Contribution"
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{
          icon: BellIcon,
          action: rightAction,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          style={styles.scrollArea}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          <View ref={sourceAccountRef}>
            <View style={styles.sectionOptions}>
              <Text style={styles.sectionOptionsTitle}>
                Destination Account *
              </Text>
            </View>
            {selectedAccount ? (
              <SelectedAccount
                account={selectedAccount}
                openBottomSheet={() => console.log('its closed')}
              />
            ) : (
              <View style={styles.emptyAccountContainer}>
                <TouchableOpacity
                  style={styles.emptyAccountCard}
                  onPress={() => console.log('Nothing to show here')}
                >
                  <Text style={styles.emptyAccountSectionTitle}>
                    No Account has been selected tap to select an account
                  </Text>
                  <ArrowBigUpDash color={theme.textSecondary} size={62} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ padding: 16 }}>
            <Text style={styles.sectionOptionsTitle}>Amount *</Text>
            <TextInput
              ref={amountRef}
              inputMode="decimal"
              value={amount?.toString() ?? ""}
              onChangeText={handleAmount}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              style={styles.amountInput}
            />
            <Text
              style={{
                color: theme.textSecondary,
                marginBottom: 8,
                fontWeight: "600",
                fontSize: 17,
              }}
            >
              Enter Mpesa Phone Number *
            </Text>
            <TextInput
              value={mpesaPhoneInput}
              ref={mpesaPhoneInputRef}
              onChangeText={setMpesaPhoneInput}
              keyboardType="phone-pad"
              style={{
                backgroundColor: theme.surface,
                color: theme.text,
                padding: 12,
                fontSize: 20,
                fontWeight: "bold",
                borderRadius: 20,
                borderWidth: 1,
                borderColor:
                  mpesaPhoneInput.length > 0
                    ? isValid
                      ? theme.success
                      : theme.error
                    : theme.border,
              }}
              placeholder="+254xx"
              placeholderTextColor={theme.textSecondary}
            />

            {/* Feedback for the user */}
            {isValid && (
              <Text
                style={{ color: theme.success, fontSize: 12, marginTop: 4 }}
              >
                initiate stk from: {formatted}
              </Text>
            )}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.initiateButton,
              { borderColor: amount ? theme.success : theme.border },
            ]}
            onPress={handleInitiateDeposit}
            // disabled={!amount ? true : false}
          >
            <Text style={styles.buttonText}>Initiate Deposit</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <ConfirmTransferModal
        isOpen={confirmDeposit}
        setIsOpen={setConfirmDeposit}
        setIsPinModalOpen={setIsPinModalOpen}
        amount={amount}
        selectedAccount={selectedAccount}
        //selectedRecipient={selectedRecipient}
        //description={description}
        handleDescription={() => console.log(`Nothing here`)}
        handleAmount={handleAmount}
      />
      <PinEntryModal
        isOpen={isPinModalOpen}
        setIsOpen={setIsPinModalOpen}
        amount={parseFloat(amount)}
        handleSend={handleDeposit}
        // onRetry={() => setIsPinModalOpen(true)}
      />
    </SafeAreaView>
  );
}
