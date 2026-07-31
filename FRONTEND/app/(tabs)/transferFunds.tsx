import CustomBottomSheet from "@/components/CustomBottomSheet";
import CustomWalletHeader from "@/components/myWallet/customHeader";
import ListOfAccounts from "@/components/myWallet/listOfAccounts";
import PinEntryModal from "@/components/myWallet/PinEntryModal";
import SelectedAccount from "@/components/myWallet/selectedAccount";
import ConfirmTransferModal from "@/components/myWallet/transfer/confirmTransferModal";
import ListOfRecipients from "@/components/myWallet/transfer/recipients/listOfRecipients";
import SelectedRecipient from "@/components/myWallet/transfer/recipients/selectedRecipient";
import { useFinalizeTransaction } from "@/hooks/useFinalizeTransaction";
import { useMemberData } from "@/hooks/useMemberData";
import { useProcessTransaction } from "@/hooks/useProcessTransaction";
import { ProviderFilters, useProviders } from "@/hooks/useProviders";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { TransactionInput } from "@/lib/types/transaction";

import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { TransferFundsScreenStyles } from "@/styles/wallet_styles/transfer_funds_screen.styles";
import BottomSheet from "@gorhom/bottom-sheet";
// import { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import {
    ArrowBigUpDash,
    Banknote,
    BellIcon,
    ChevronDown,
    ChevronLeft,
    CreditCard,
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
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import { toast } from "sonner-native";

export default function TransferFundsScreen() {


  const bottomRecipientsSheetRef = useRef<BottomSheet>(null);
  const openRecipientSheet = () => bottomRecipientsSheetRef.current?.snapToIndex(0);
  const closeRecipientSheet = () => bottomRecipientsSheetRef.current?.close();
  const bottomAccountsSheetRef = useRef<BottomSheet>(null);
    const openAccountsSheet = () => bottomAccountsSheetRef.current?.snapToIndex(0);
  const closeAccountsSheet = () => bottomAccountsSheetRef.current?.close();
  
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
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
  } = useWalletAccounts(wallet?.wallet_id);
  const internalProvidorFilter: ProviderFilters = {
    provider_types: new Set(["internal"]),
  };
  const { data: providers = [] } = useProviders(internalProvidorFilter);
  const idempotencyKey = Crypto.randomUUID();
  const {
    theme,
    setIsNotificationOpen,
    // setIsRecipientSheetOpen,
    // setIsAccountSheetOpen,
  } = useGlobalStorage();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => TransferFundsScreenStyles(theme), [theme]);
  const scrollRef = useRef<ScrollView>(null);
  const sourceAccountRef = useRef<View>(null);
  const recipientRef = useRef<View>(null);
  const amountRef = useRef<TextInput>(null);
  const [transactionData, setTransactionData] = useState<TransactionInput>();
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const {
    selectedRecipient,
    selectedAccount,
    setSelectedAccount,
    setSelectedRecipient,
    recipientDrawerAction,
    setRecipientDrawerAction,
    setNoOfUserAccounts,
    selectedBankProvider,
    selectedMobileProvider,
    transactionCategory,
    reset
  } = useTransferFundsStorage();
  const router = useRouter();

  const leftAction = () => {
    router.back();
  };
  const mutation = useProcessTransaction();
  const finalize = useFinalizeTransaction();
  const rightAction = useCallback(() => {
    console.log("RightAction");
    setIsNotificationOpen(true);
  }, [setIsNotificationOpen]);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const handleAmount = (text: string) => {
    const cleanNumber = text.replace(/[^0-9.]/g, "");
    const parts = cleanNumber.split(".");
    if (parts.length > 2) return;
    setAmount(cleanNumber);
    const numericValue = parseFloat(cleanNumber);
  };
  const handleDescription = (text: string) => {
    setDescription(text);
  };
  const handleAccountDrawerOpening = () => {
    Keyboard.dismiss();
    openAccountsSheet();
    // setIsAccountSheetOpen(true);
  };
  const handleRecipientDrawerOpening = () => {
    Keyboard.dismiss();
    openRecipientSheet();
    //setIsRecipientSheetOpen(true);
  };
  const handleInitiateTransfer = () => {
    const scrollNode = findNodeHandle(scrollRef.current);
    if (!selectedAccount) {
      toast("Please select a source Account ", {
        position: "top-center",
        icon: <CreditCard color={theme.warning} size={20} />,
      });
      const sourceNode = findNodeHandle(sourceAccountRef.current);

      if (scrollNode && sourceNode) {
        sourceAccountRef.current?.measure(
          (x, y, width, height, pageX, pageY) => {
            scrollRef.current?.scrollTo({ y: pageY - 100, animated: true });
            handleAccountDrawerOpening();
          },
        );
      }
      return;
    }
    if (!selectedRecipient) {
      toast("Please select a recipient ", {
        position: "top-center",
        icon: <CreditCard color={theme.warning} size={20} />,
      });
      const sourceNode = findNodeHandle(recipientRef.current);

      if (scrollNode && sourceNode) {
        recipientRef.current?.measure((x, y, width, height, pageX, pageY) => {
          scrollRef.current?.scrollTo({ y: pageY - 100, animated: true });
          handleRecipientDrawerOpening();
        });
      }
      return;
    }
    if (!amount) {
      toast("Specify the Amount you want to send", {
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
    } else {
      const providorId =
        selectedRecipient.recipient_type === "bank"
          ? selectedBankProvider?.id
          : selectedRecipient.recipient_type === "mobile_money"
            ? selectedMobileProvider?.id
            : providers[0].id;

      setTransactionData({
        currency: selectedAccount.currency_code,
        idempotency_key: idempotencyKey,
        destination_acc: selectedRecipient.account_id,
        initiator_id: member?.id || "",
        providor_id: providorId || "",
        source_acc: selectedAccount.account_id || "",
        source_wallet_id: wallet?.wallet_id || "",
        trans_amount: parseFloat(amount) || 0,
        trans_category_id: transactionCategory,
        trans_type: "transfer",
        trans_description: description,
      });
      setConfirmTransfer(true);
      Keyboard.dismiss();
    }
  };

  const handleSend = async () => {
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
      } catch (finError: any) {
        console.error("Finalize Failed ,transction proced", finError);
        toast.warning("Transaction processed but confirmation pending.");
      }
      toast.success("Money Transfered successfully!");
      router.push({
        pathname: "/(tabs)/transactionReceipt",
        params: { transaction_id: result.data?.transaction_id },
      });
    } catch (error: any) {
      //console.error("Transaction failed:", error.message);
      toast.error(error.message || "Transfer failed. Please try again.");
    }finally{
      reset()
    }
    
  };
  useEffect(() => {
    accounts
      ? (setSelectedAccount(accounts[0]), setNoOfUserAccounts(accounts?.length))
      : setSelectedAccount(undefined);
  }, [accounts]);
  useEffect(() => {
    if (selectedRecipient) {
      if (
        selectedRecipient?.recipient_type !== "user" &&
        selectedRecipient?.recipient_type !== "group"
      ) {
        setRecipientDrawerAction("edit");
      } else {
        setRecipientDrawerAction("change");
      }
    } else {
      setRecipientDrawerAction("choose");
    }
    // console.log("Action::::", recipientDrawerAction);
    // console.log("Selected Recipient::::", selectedRecipient?.id);
  }, [selectedRecipient]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <CustomWalletHeader
        subTitle="Send Money"
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
              <Text style={styles.sectionOptionsTitle}>Source Account *</Text>
              <TouchableOpacity
                style={styles.selectAction}
                onPress={() => handleAccountDrawerOpening()}
              >
                <Text style={styles.selectActionText}>Select Account</Text>
                <ChevronDown color={theme.surface} size={20} />
              </TouchableOpacity>
            </View>
            {selectedAccount ? (
              <SelectedAccount
                account={selectedAccount}
                openBottomSheet={() => handleAccountDrawerOpening()}
              />
            ) : (
              <View style={styles.emptyAccountContainer}>
                <TouchableOpacity
                  style={styles.emptyAccountCard}
                  onPress={() => handleAccountDrawerOpening()}
                >
                  <Text style={styles.emptyAccountSectionTitle}>
                    No Account has been selected tap to select an account
                  </Text>
                  <ArrowBigUpDash color={theme.textSecondary} size={62} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View ref={recipientRef}>
            <View style={styles.sectionOptions}>
              <Text style={styles.sectionOptionsTitle}>Recepient *</Text>
              <TouchableOpacity
                style={styles.selectAction}
                onPress={() => {
                  openRecipientSheet()
                }}
              >
                <Text style={styles.selectActionText}>Select Recipient</Text>
                <ChevronDown color={theme.surface} size={20} />
              </TouchableOpacity>
            </View>
            {selectedRecipient ? (
              <SelectedRecipient
                selectedRecipient={selectedRecipient}
                drawerAction={recipientDrawerAction}
                setDrawerAction={setRecipientDrawerAction}
                openRecipientsDrawer={() => handleRecipientDrawerOpening()}
                removeRecipient={() => {
                  (setSelectedRecipient(undefined),
                    setRecipientDrawerAction("delete"));
                }}
              />
            ) : (
              <View style={styles.emptyAccountContainer}>
                <TouchableOpacity
                  style={styles.emptyAccountCard}
                  onPress={() => handleRecipientDrawerOpening()}
                >
                  <Text style={styles.emptyAccountSectionTitle}>
                    No Recipient has been selected tap to select a recipient
                  </Text>
                  <ArrowBigUpDash color={theme.textSecondary} size={62} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={{ padding: 16 }}>
            <Text style={styles.sectionOptionsTitle}>
              Description (optional)
            </Text>
            <TextInput
              inputMode="text"
              value={description}
              onChangeText={handleDescription}
              autoCapitalize="sentences"
              multiline={true}
              placeholder="What is this for?"
              placeholderTextColor={theme.textSecondary}
              style={styles.descriptionInput}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <View
            style={{
              paddingHorizontal: 20,
              gap: 5,
            }}
          >
            <Text style={[styles.sectionOptionsTitle, { paddingLeft: 10 }]}>
              Amount *
            </Text>
            <TextInput
              ref={amountRef}
              inputMode="decimal"
              value={amount?.toString() ?? ""}
              onChangeText={handleAmount}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              style={styles.amountInput}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.initiateButton,
              { borderColor: amount ? theme.success : theme.border },
            ]}
            onPress={handleInitiateTransfer}
            // disabled={!amount ? true : false}
          >
            <Text style={styles.buttonText}>Initiate Transfer</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <ConfirmTransferModal
        isOpen={confirmTransfer}
        setIsOpen={setConfirmTransfer}
        setIsPinModalOpen={setIsPinModalOpen}
        //transactionData={transactionData}
        //handleDrawerOpening={handleDrawerOpening}
        amount={amount}
        selectedAccount={selectedAccount}
        selectedRecipient={selectedRecipient}
        description={description}
        handleDescription={handleDescription}
        handleAmount={handleAmount}
      />
      <PinEntryModal
        isOpen={isPinModalOpen}
        setIsOpen={setIsPinModalOpen}
        amount={parseFloat(amount)}
        handleSend={handleSend}
        // onRetry={() => setIsPinModalOpen(true)}
      />
      <CustomBottomSheet
        ref={bottomRecipientsSheetRef}
        title="My Sheet Title"
        snapPoints={["60%"]}
      >
     <ListOfRecipients
                      closeBottomSheet={() => {
                        closeRecipientSheet()
                      }}
                    />
      </CustomBottomSheet>
        <CustomBottomSheet
        ref={bottomAccountsSheetRef}
        title="My Sheet Title"
        snapPoints={["70%"]}
      >
     <ListOfAccounts
                      closeBottomSheet={() =>{
                        //bottomAccountSheetRef.current?.close()
                      closeAccountsSheet()
                      }
                      }
                    />
      </CustomBottomSheet>
    </SafeAreaView>
  );
}
