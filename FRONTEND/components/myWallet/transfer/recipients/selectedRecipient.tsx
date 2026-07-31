import {
    RECIPIENT_STATUS_UICONFIG_MAP,
    RECIPIENT_TYPE_UICONFIG_MAP,
} from "@/lib/configurations/financeMaps.config";
import {
    ActionType,
    RecipientType,
    // Recipient
} from "@/lib/types/account_layer.types";
import { Recipient } from "@/lib/types/recipients";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { SelectedRecipientStyles } from "@/styles/wallet_styles/selected_recipient.styles";
import { getProviderImage } from "@/utils/getProviderImage";
import { Dot, Edit, Info, Trash } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
interface SelectedRecipientProps {
  selectedRecipient?: Recipient;
  openRecipientsDrawer?: () => void;
  removeRecipient: () => void;
  drawerAction: ActionType;
  setDrawerAction: (value: ActionType) => void;
}
export default function SelectedRecipient({
  selectedRecipient,
  openRecipientsDrawer,
  drawerAction,
  setDrawerAction,
  removeRecipient,
}: SelectedRecipientProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => SelectedRecipientStyles(theme), [theme]);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const recipientStatus = selectedRecipient?.status ?? "dormant";
  const recipientConfig =
    RECIPIENT_TYPE_UICONFIG_MAP[
      selectedRecipient?.recipient_type as RecipientType
    ] ?? RECIPIENT_TYPE_UICONFIG_MAP.user;
  const Icon = recipientConfig.icon;
  const displayImage = getProviderImage(selectedRecipient?.display_photo);
  // const recipientType = selectedRecipient?.recipient_type ?? "user";
  // const Icon = RECIPIENT_TYPE_UICONFIG_MAP[recipientType].icon;
  return (
    <View style={styles.container}>
      <View style={styles.accountCardContainter}>
        <View style={styles.accountCardBody}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Selected Recipient</Text>
            <View style={styles.accountStatusContainer}>
              <Dot
                size={30}
                color={RECIPIENT_STATUS_UICONFIG_MAP[recipientStatus].color}
              />
              <Text style={styles.accountStatusText}>
                {RECIPIENT_STATUS_UICONFIG_MAP[recipientStatus].label}
              </Text>
            </View>
          </View>
          <View style={styles.cardBody}>
            <TouchableOpacity
              style={styles.accountDetailsContainer}
              onPress={openRecipientsDrawer}
            >
              <View style={styles.recipientDpContainer}>
                {displayImage ? (
                  <Image
                    source={displayImage}
                    style={styles.recipientDp}
                    resizeMode="cover"
                    alt={selectedRecipient?.recipient_name[0]}
                  />
                ) : (
                  <View style={styles.iconFallBack}>
                    <Icon size={24} color={theme.text} />
                  </View>
                )}
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>
                  {selectedRecipient?.recipient_name}
                </Text>
                <Text style={styles.accountNumber}>
                  {selectedRecipient?.account_number}
                </Text>
              </View>
            </TouchableOpacity>
            <View style={styles.accountBalanceContainer}>
              <Text style={styles.accountCurrency}>
                {recipientConfig.label}
              </Text>
            </View>
          </View>
          <View style={styles.accountCardActions}>
            <TouchableOpacity
              style={styles.optionsIcons}
              onPress={openRecipientsDrawer}
            >
              <Text
                style={{ color: theme.text, fontSize: 12, fontWeight: "bold" }}
              >
                {drawerAction}
              </Text>
              <Edit size={17} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsIcons}
              onPress={() => setIsInfoModalOpen(true)}
            >
              <Info size={17} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionsIcons}
              onPress={removeRecipient}
            >
              <Trash size={17} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
