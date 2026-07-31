import { ProviderFilters, useProviders } from "@/hooks/useProviders";
import { ActionType } from "@/lib/types/account_layer.types";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { TrustLoopUsersTabStyles } from "@/styles/wallet_styles/trustloop_users_tab.styles";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { ProvidorSelector } from "../../providorSelector";
interface TrustLoopUserTabProps {
  actionType?: ActionType | "choose";
}
export function BankTab({ actionType }: TrustLoopUserTabProps) {
  const { theme } = useGlobalStorage();
  const {
    selectedBankProvider,
    setSelectedBankProvider,
    setSelectedRecipient,
    setTransactionCategory
  } = useTransferFundsStorage();
  const styles = useMemo(() => TrustLoopUsersTabStyles(theme), [theme]);
  const bankFilter: ProviderFilters = {
    provider_types: new Set(["bank"]),
  };

  const { data: providers } = useProviders(bankFilter);

  useEffect(() => {
    providers
      ? setSelectedBankProvider(providers[0])
      : setSelectedBankProvider(undefined);
  }, [providers]);
  const [input, setInput] = useState("");
  useEffect(() => {
    if (actionType === "delete") {
      setInput("");
      setSelectedBankProvider(undefined);
      setSelectedRecipient(undefined);
    }
    // console.log("Action Type", actionType);
  }, [actionType]);
  useEffect(() => {
    if (input.length > 5 && selectedBankProvider) {
      setSelectedRecipient({
        id: selectedBankProvider.id,
        account_id: selectedBankProvider.provider_acc_id || "N/A",
        account_number: input,
        recipient_name: selectedBankProvider.provider_name,
        recipient_type: "bank",
        display_photo: selectedBankProvider.provider_photo_url,
      });
      setTransactionCategory('Bank Transfer')
    } else {
      setSelectedRecipient(undefined);
    }
  }, [input, selectedBankProvider]);
  return (
    <View>
      <ProvidorSelector
        providers={providers ?? []}
        providorFilter={bankFilter}
        selectedProvidor={selectedBankProvider}
        setSelectedProvidor={setSelectedBankProvider}
      />
      <View style={{ padding: 16 }}>
        <Text style={{ color: theme.text, marginBottom: 8, fontWeight: "600" }}>
          Enter Account Number
        </Text>
        <BottomSheetTextInput
          value={input}
          onChangeText={setInput}
          keyboardType="phone-pad"
          style={{
            backgroundColor: theme.background, // Contrast against the surface
            color: theme.text,
            padding: 12,
            fontSize: 20,
            fontWeight: "bold",
            borderRadius: 8,
            borderWidth: 1,
            borderColor:
              input.length > 0
                ? input.length > 1
                  ? theme.success
                  : theme.error
                : theme.border,
          }}
          placeholder="xxxx xxxx xxx"
          placeholderTextColor={theme.textSecondary}
        />
        {input && (
          <Text style={{ color: theme.success, fontSize: 14, marginTop: 4 }}>
            Sending to: {input}
          </Text>
        )}
      </View>
    </View>
  );
}
