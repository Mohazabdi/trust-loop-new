import { RECIPIENT_TYPE_UICONFIG_MAP } from "@/lib/configurations/financeMaps.config";
import {
  getRecipients,
  RecipientFilters,
} from "@/lib/mock_data/accounts_data.mock";
import { Recipient } from "@/lib/types/account_layer.types";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { TrustLoopUsersTabStyles } from "@/styles/wallet_styles/trustloop_users_tab.styles";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";

export function InternalAccountTab() {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => TrustLoopUsersTabStyles(theme), [theme]);
  const { selectedRecipient, setSelectedRecipient } = useTransferFundsStorage();
  const recipientFilter: RecipientFilters = {
    recipient_types: new Set(["internal_account"]),
  };
  const { data: recipients } = useQuery({
    queryKey: [
      "recipients",
      {
        ...recipientFilter,
        recipient_types: Array.from(recipientFilter.recipient_types || []),
      },
    ],
    queryFn: () => getRecipients(recipientFilter),
  });
  const handleSelectedRecipient = (recipient: Recipient) => {
    recipient.id === selectedRecipient?.id
      ? setSelectedRecipient(undefined)
      : setSelectedRecipient(recipient);
    console.log("RecipientSelected", recipient.account_number);
  };

  const renderRecipientItem = useCallback(
    ({ item }: { item: Recipient }) => {
      const isSelected = item.id === selectedRecipient?.id;
      const Icon = RECIPIENT_TYPE_UICONFIG_MAP[item.recipient_type].icon;
      return (
        <TouchableOpacity
          onPress={() => handleSelectedRecipient(item)}
          style={[
            styles.recipientCardContainer,
            isSelected && { borderColor: theme.success },
          ]}
        >
          <View style={styles.recipientDpContainer}>
            {item.display_photo ? (
              <Image
                source={
                  typeof item.display_photo === "string"
                    ? { uri: item.display_photo }
                    : item.display_photo
                }
                style={styles.recipientDp}
                resizeMode="cover"
                alt={item.recipient_name[0]}
              />
            ) : (
              <View style={styles.iconFallBack}>
                <Icon size={24} color={theme.text} />
              </View>
            )}
          </View>
          <View style={styles.recipientDetailsContainer}>
            <Text style={styles.recipientNameText}>{item.recipient_name}</Text>
            <Text style={styles.recipientAccountIdText}>
              {item.account_number}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme, selectedRecipient, styles],
  );
  const renderItemSeparator = useCallback(
    () => <View style={{ height: 10 }} />,
    [],
  );
  return (
    <BottomSheetFlatList
      data={recipients}
      keyExtractor={(item) => item.id}
      renderItem={renderRecipientItem}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      ItemSeparatorComponent={renderItemSeparator}
      windowSize={5}
      contentContainerStyle={{ paddingBottom: 1 }}
      style={{ flex: 1 }}
      removeClippedSubviews={true}
    />
  );
}
