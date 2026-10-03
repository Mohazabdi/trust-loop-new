import { ProviderFilters, useProviders } from "@/hooks/useProviders";
import { ActionType } from "@/lib/types/account_layer.types";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { TrustLoopUsersTabStyles } from "@/styles/wallet_styles/trustloop_users_tab.styles";
import { processKenyanPhone } from "@/utils/custom_functions";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { ProvidorSelector } from "../../providorSelector";
interface TrustLoopUserTabProps {
  actionType?: ActionType | "choose";
}
export function MobileMoneyTab({ actionType }: TrustLoopUserTabProps) {
  const { theme } = useGlobalStorage();
  const {
    selectedMobileProvider,
    setSelectedMobileProvider,
    setSelectedRecipient,
    setTransactionCategory,
  } = useTransferFundsStorage();
  const styles = useMemo(() => TrustLoopUsersTabStyles(theme), [theme]);
  const [input, setInput] = useState("");

  // useEffect(() => {}, []);
  useEffect(() => {
    if (actionType === "delete") {
      setInput("");
      setSelectedMobileProvider(undefined);
      setSelectedRecipient(undefined);
    }
    console.log("Action Type", actionType);
  }, [actionType]);
  const { isValid, formatted } = useMemo(
    () => processKenyanPhone(input),
    [input],
  );
  useEffect(() => {
    if (input.length > 5 && selectedMobileProvider) {
      // We "build" the recipient object on the fly
      setSelectedRecipient({
        id: selectedMobileProvider.id, // unique ID for manual entry
        account_id: selectedMobileProvider.provider_acc_id || "N/A",
        account_number: input, // The typed account number
        recipient_name: selectedMobileProvider.provider_name,
        recipient_type: "mobile_money",
        display_photo: selectedMobileProvider.provider_photo_url,
      });
      setTransactionCategory('Mobile Money Transfer');
    } else {
      // Clear recipient if input is too short
      setSelectedRecipient(undefined);
    }
  }, [input, selectedMobileProvider]);
  const mobileMoneyFilter: ProviderFilters = {
    provider_types: new Set(["mobile_money"]),
  };

  const { data: providers } = useProviders(mobileMoneyFilter);

  useEffect(() => {
    providers
      ? setSelectedMobileProvider(providers[0])
      : setSelectedMobileProvider(undefined);
  }, [providers]);
  return (
    <View style={{ flex: 1 }}>
      <ProvidorSelector
        providers={providers ?? []}
        providorFilter={mobileMoneyFilter}
        selectedProvidor={selectedMobileProvider}
        setSelectedProvidor={setSelectedMobileProvider}
      />
      <View style={{ padding: 16 }}>
        <Text style={{ color: theme.text, marginBottom: 8, fontWeight: "600" }}>
          Enter Phone Number
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
          <Text style={{ color: theme.success, fontSize: 12, marginTop: 4 }}>
            Sending to: {formatted}
          </Text>
        )}
      </View>
    </View>
  );
}
