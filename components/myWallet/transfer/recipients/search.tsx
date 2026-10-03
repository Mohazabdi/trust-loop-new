import {
    PROVIDOR_TYPE_UICONFIG_MAP,
    RECIPIENT_TYPE_UICONFIG_MAP,
} from "@/lib/configurations/financeMaps.config";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { TrustLoopUsersTabStyles } from "@/styles/wallet_styles/trustloop_users_tab.styles";
import { BottomSheetSectionList } from "@gorhom/bottom-sheet";

import { useMemberData } from "@/hooks/useMemberData";
import { useProviders } from "@/hooks/useProviders";
import { useRecipients } from "@/hooks/useRecipients";
import { ProviderType } from "@/lib/types/account_layer.types";
import { Provider } from "@/lib/types/providers";
import { Recipient } from "@/lib/types/recipients";
import { getProviderImage } from "@/utils/getProviderImage";
import { useCallback, useMemo } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RecipientType } from "../../../../lib/types/account_layer.types";
import { TabType } from "./listOfRecipients";
interface SearchScreenProps {
  searchQuery: string;
  setSearchInput: (s: string | "") => void;
  handleTabChange: (t: TabType | "trust_loop_user") => void;
}
type SearchResultItem = Recipient | Provider;
type SearchSection = {
  title: string;
  data: SearchResultItem[];
};
export function SearchScreen({
  setSearchInput,
  searchQuery,
  handleTabChange,
}: SearchScreenProps) {
  const { theme } = useGlobalStorage();
  const insets = useSafeAreaInsets();
  const {
    selectedRecipient,
    selectedBankProvider,
    selectedMobileProvider,
    setSelectedBankProvider,
    setSelectedMobileProvider,
    setSelectedRecipient,
  } = useTransferFundsStorage();
  const styles = useMemo(() => TrustLoopUsersTabStyles(theme), [theme]);

  const { data: providers = [] } = useProviders();
  const {
    data: member,
    isLoading: memberLoading,
    error: memberError,
  } = useMemberData();
  const {
    data: recipients = [],
    isLoading: recipientsLoading,
    error: recipientsError,
  } = useRecipients(member?.id);
  const sections: SearchSection[] = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return [];
    const filteredRecipients = recipients?.filter(
      (r) =>
        r.recipient_name.toLowerCase().includes(query) ||
        r.account_number.toLowerCase().includes(query),
    );

    const filteredProvidors = providers?.filter(
      (p) =>
        p.provider_name.toLowerCase().includes(query) ||
        p.provider_type.toLowerCase().includes(query),
    );

    const data: SearchSection[] = [];
    if (filteredRecipients.length > 0)
      data.push({ title: "Recipients", data: filteredRecipients });
    if (filteredProvidors.length > 0)
      data.push({ title: "Providers", data: filteredProvidors });
    return data;
  }, [searchQuery]);

  const renderItem = useCallback(
    ({ item }: { item: Recipient | Provider }) => {
      const isRecipient = "recipient_name" in item;
      const name = isRecipient ? item.recipient_name : item.provider_name;
      const subText = isRecipient ? item.account_number : item.provider_type;
      const image = isRecipient
        ? item.display_photo
        : getProviderImage(item.provider_photo_url);
      // const providorConfig =
      //   PROVIDOR_TYPE_UICONFIG_MAP[item.provider_type as ProviderType] ??
      //   PROVIDOR_TYPE_UICONFIG_MAP.internal;
      //   const recipientConfig =
      //   PROVIDOR_TYPE_UICONFIG_MAP[item.recipientType as RecipientType] ??
      //   PROVIDOR_TYPE_UICONFIG_MAP.internal;
      let IconComponent;
      if (isRecipient) {
        const config =
          RECIPIENT_TYPE_UICONFIG_MAP[item.recipient_type as RecipientType] ??
          RECIPIENT_TYPE_UICONFIG_MAP.user;
        IconComponent = config.icon;
      } else {
        const config =
          PROVIDOR_TYPE_UICONFIG_MAP[item.provider_type as ProviderType] ??
          PROVIDOR_TYPE_UICONFIG_MAP.internal;
        IconComponent = config.icon;
      }

      // const isSelected = true;
      const isSelected = isRecipient
        ? item.id === selectedRecipient?.id
        : item.id === selectedBankProvider?.id ||
          item.id === selectedMobileProvider?.id;

      const handlePress = () => {
        if (isRecipient) {
          setSelectedRecipient(isSelected ? undefined : item);
          if (item.recipient_type === "internal_account")
            handleTabChange("internal_account");
          if (
            item.recipient_type === "user" ||
            item.recipient_type === "group" ||
            item.recipient_type === "organization"
          )
            handleTabChange("trust_loop_user");
        } else {
          if (item.provider_type === "bank") {
            setSelectedBankProvider(item);
            handleTabChange("bank");
          } else if (item.provider_type === "mobile_money") {
            setSelectedMobileProvider(item);
            handleTabChange("mobile_money");
          }
        }
        setSearchInput("");
      };

      return (
        <TouchableOpacity
          onPress={handlePress}
          style={[
            styles.recipientCardContainer,
            isSelected && { borderColor: theme.success, borderWidth: 1 },
          ]}
        >
          <View style={styles.recipientDpContainer}>
            {image ? (
              <Image
                source={typeof image === "string" ? { uri: image } : image}
                style={styles.recipientDp}
              />
            ) : (
              <View style={styles.iconFallBack}>
                <IconComponent size={24} color={theme.text} />
              </View>
            )}
          </View>
          <View style={styles.recipientDetailsContainer}>
            <Text style={styles.recipientNameText}>{name}</Text>
            <Text style={styles.recipientAccountIdText}>{subText}</Text>
          </View>
        </TouchableOpacity>
      );
    },
    [
      theme,
      selectedRecipient,
      selectedMobileProvider,
      selectedBankProvider,
      styles,
    ],
  );

  return (
    <BottomSheetSectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      stickySectionHeadersEnabled={true}
      renderSectionHeader={({ section: { title } }) => (
        <View style={{ backgroundColor: theme.surface, padding: 10 }}>
          <Text
            style={{
              color: theme.textSecondary,
              fontWeight: "bold",
              fontSize: 12,
            }}
          >
            {title.toUpperCase()}
          </Text>
        </View>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: insets.bottom + 20,
      }}
      ListEmptyComponent={
        <View style={{ padding: 40, alignItems: "center" }}>
          <Text style={{ color: theme.textSecondary }}>
            No results for "{searchQuery}"
          </Text>
        </View>
      }
    />
  );
}
