import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import { ListOfRecipientsStyles } from "@/styles/wallet_styles/list_of_recipients.styles";
import { BottomSheetScrollView, BottomSheetTextInput, SCREEN_HEIGHT, SCREEN_WIDTH } from "@gorhom/bottom-sheet";
import {
    CheckCircle,
    CreditCard,
    HelpCircle,
    InfinityIcon,
    Landmark,
    Search,
    Smartphone,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

import { BankTab } from "./bankTab";
import { InternalAccountTab } from "./internalAccountTab";
import { MobileMoneyTab } from "./mobileMoneyTab";
import { SearchScreen } from "./search";
import { TrustLoopUsersTab } from "./trustloopUsersTab";

interface ListOfAccountsProps {
  closeBottomSheet: () => void;
}

const TAB_MAP = {
  
  mobile_money: {
    label: "Mobile",
    icon: Smartphone,
    color: "#086279",
    tabComponent: MobileMoneyTab,
  },
  trust_loop_user: {
    label: "TrustLoop",
    icon: InfinityIcon,
    color: "#087908",
    tabComponent: TrustLoopUsersTab,
  },
  bank: {
    label: "Bank",
    icon: Landmark,
    color: "#964e0a",
    tabComponent: BankTab,
  },
  // internal_account: {
  //   label: "Internal",
  //   icon: CreditCard,
  //   color: "#b4aa4f",
  //   tabComponent: InternalAccountTab,
  // },
} as const;
export type TabType = keyof typeof TAB_MAP;
export default function ListOfRecipients({
  closeBottomSheet,
}: ListOfAccountsProps) {
  const { recipientDrawerAction: actionType, selectedRecipient } =
    useTransferFundsStorage();
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => ListOfRecipientsStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<TabType>("mobile_money");

  const [searchInput, setSearchInput] = useState("");
  const handleSearch = (text: string) => {
    setSearchInput(text);
  };
  const SelectedConfig = TAB_MAP[activeTab];
  const ActiveTabComponent = SelectedConfig.tabComponent;
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.containerHeader}>
        {actionType === "edit"
          ? "Edit a Recipient Entry"
          : actionType === "change"
            ? "Choose Another Recipient"
            : "Select or search for a recipient/providor"}
      </Text>
      <View style={styles.containerBody}>
        {/* search component */}

        <View style={styles.searchRecipientsContainer}>
          <View style={styles.searchInputContainer}>
            <BottomSheetTextInput
              inputMode="text"
              value={searchInput}
              onChangeText={handleSearch}
              placeholder="Search for any Recipients"
              placeholderTextColor={theme.textSecondary}
              style={styles.searchInput}
            />
          </View>
          <TouchableOpacity style={styles.searchInitiateContainer}>
            <Search color={theme.textSecondary} size={20} />
          </TouchableOpacity>
        </View>
        {searchInput ? (
          <SearchScreen
            searchQuery={searchInput}
            setSearchInput={setSearchInput}
            handleTabChange={handleTabChange}
          />
        ) : (
          <View style={styles.recipientTabsContainer}>
            <BottomSheetScrollView
              horizontal
              style={{maxWidth:SCREEN_WIDTH*0.9 ,maxHeight:70,minHeight:50}}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScrollContainer}
            >
              {Object.entries(TAB_MAP).map(([key, tab]) => {
                const isActive = activeTab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleTabChange(key as TabType)}
                    style={[
                      styles.tabButtonContainer,
                      isActive && {
                        backgroundColor: theme.background,
                        borderColor: tab.color,
                      },
                    ]}
                  >
                    <tab.icon size={15} color={tab.color} />
                    <Text
                      style={[
                        styles.tabButtonText,
                        isActive && {
                          color: theme.text,

                          // borderColor: theme.border,
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    
                  </TouchableOpacity>
                );
              })}
            </BottomSheetScrollView>
            <BottomSheetScrollView style={styles.tabRenderContainer}>
              {activeTab === "bank" && (
                <ActiveTabComponent actionType={actionType} />
              )}
              {activeTab === "mobile_money" && (
                <ActiveTabComponent actionType={actionType} />
              )}
              {activeTab === "trust_loop_user" && <ActiveTabComponent />}
            </BottomSheetScrollView>
          </View>
        )}
      </View>
      <View style={styles.recipientDrawerActions}>
        <TouchableOpacity style={styles.optionsIcons}>
          <HelpCircle size={20} color={theme.foreground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionsIcons,
            {
              backgroundColor:
                selectedRecipient?.id !== undefined
                  ? theme.success
                  : theme.surface,
              borderColor:
                selectedRecipient?.id !== undefined
                  ? theme.surface
                  : theme.border,
            },
          ]}
          onPress={closeBottomSheet}
        >
          <Text style={styles.optionsIconsText}>Done</Text>
          <CheckCircle size={20} color={theme.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
