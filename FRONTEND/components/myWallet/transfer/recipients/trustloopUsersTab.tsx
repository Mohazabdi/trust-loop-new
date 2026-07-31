import { useMemberData } from "@/hooks/useMemberData";
import { useRecipients } from "@/hooks/useRecipients";
import { RECIPIENT_TYPE_UICONFIG_MAP } from "@/lib/configurations/financeMaps.config";
import { RecipientFilters } from "@/lib/mock_data/accounts_data.mock";
import { RecipientType } from "@/lib/types/account_layer.types";
import { Recipient } from "@/lib/types/recipients";
// import {
//   getRecipients,
//   RecipientFilters,
// } from "@/lib/mock_data/accounts_data.mock";
// import { Recipient } from "@/lib/types/account_layer.types";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { TrustLoopUsersTabStyles } from "@/styles/wallet_styles/trustloop_users_tab.styles";
import { BottomSheetFlatList, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { FolderX, XCircle } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import {
    ActivityIndicator,
    Image,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export function TrustLoopUsersTab() {
  const { theme } = useGlobalStorage();
  const { selectedRecipient, setSelectedRecipient,setTransactionCategory } = useTransferFundsStorage();
  const recipientFilter: RecipientFilters = {
    recipient_types: new Set(["user", "group", "organization"]),
  };
  const {
    data: member,
    isLoading: memberLoading,
    error: memberError,
  } = useMemberData();
  const {
    data: recipients,
    isLoading: recipientsLoading,
    error: recipientsError,
  } = useRecipients(member?.id);

  const styles = useMemo(() => TrustLoopUsersTabStyles(theme), [theme]);
  const handleSelectedRecipient = (recipient: Recipient) => {
    recipient.id === selectedRecipient?.id
      ? (setSelectedRecipient(undefined)
    
    )
      : (
        setSelectedRecipient(recipient),
        setTransactionCategory('P2P Transfer')
       
    );
    //console.log("RecipientSelected", recipient.account_number);
  };

 if (recipientsLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#0f1b0e" />
        <Text style={{ fontSize: 10, fontWeight: 'bold' }}>Getting available Recipients</Text>
      </View>
    );
  }

  if (recipientsError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <XCircle size={20} color={theme.error} />
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.error }}>
          {recipientsError.message}
        </Text>
      </View>
    );
  }

  if (!recipients || recipients.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <FolderX size={20} color="#0f1b0e" />
        <Text style={{ fontSize: 14, fontWeight: 'bold' }}>
          Looks like we have no recipients
        </Text>
      </View>
    );
  }

  // --- Actual scrollable list ---
  return (
    <BottomSheetScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 10 }}
    >
      {recipients.map((item) => {
        const isSelected = item.id === selectedRecipient?.id;
        const recipientConfig =
          RECIPIENT_TYPE_UICONFIG_MAP[item.recipient_type as RecipientType] ??
          RECIPIENT_TYPE_UICONFIG_MAP.user;
        const Icon = recipientConfig.icon;

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => handleSelectedRecipient(item)}
            style={[
              styles.recipientCardContainer,
              isSelected && { borderColor: theme.success },
              { marginBottom: 10 }, // replaces ItemSeparator
            ]}
          >
            <View style={styles.recipientDpContainer}>
              {item.display_photo ? (
                <Image
                  source={
                    typeof item.display_photo === 'string'
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
              <Text style={styles.recipientAccountIdText}>{item.account_number}</Text>
            </View>
            <View style={{ height: '100%' }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 4,
                  gap: 5,
                  borderRadius: 20,
                  backgroundColor: recipientConfig.color,
                }}
              >
                <Icon color="#fff" size={12} />
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 7,
                    fontWeight: 'bold',
                  }}
                >
                  {recipientConfig.label}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </BottomSheetScrollView>
  );
}

