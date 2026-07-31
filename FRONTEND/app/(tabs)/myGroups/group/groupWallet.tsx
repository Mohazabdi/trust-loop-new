import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import GroupActivitySection from "@/components/myGroups/groupActivitySection";
import GroupFinanceSection from "@/components/myGroups/groupFinanceSection";
import RecentActivity from "@/components/myWallet/home/recentActivity";
import AccountsSection from "@/components/myWallet/home/userAccountsSection";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupPageStyles } from "@/styles/group_style/group_page.styles";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    ArrowDownCircle,
    BellIcon,
    ChevronLeft,
    Filter,
    RotateCcw,
    Search,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
    Dimensions,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = 280;
export default function GroupIndexPage() {
  const { theme, setIsNotificationOpen, isPrivacyOn, togglePrivacy } =
    useGlobalStorage();
     const params = useLocalSearchParams<{
    group_id:string
  }>();
  //console.log("GroupIdForWallets",params.group_id)
     const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch:walletRefetch
  } = useUserWallet(params.group_id);
  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
     refetch:accountsRefetch
  } = useWalletAccounts(wallet?.wallet_id);
  const [searchInput, setSearchInput] = useState("");
  const handleSearch = (text: string) => {
    setSearchInput(text);
  };
    const refresh=()=>{
    walletRefetch()
    accountsRefetch() 
     toast("Wallet up to date ", {
      position: "top-center",
      icon: <RotateCcw size={20} color={theme.success} />,
    });
  }
  const rightAction = useCallback(() => {
    console.log("RightAction");
    setIsNotificationOpen(true);
  }, [setIsNotificationOpen]);
  const router = useRouter();
  const leftAction = () => {
    router.back();
  };

  const styles = useMemo(() => GroupPageStyles(theme), [theme]);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <CustomGroupHeader
        groupName={wallet?.wallet_name}
        // groupDp={groupData?.group_display_photo_url}
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{
          icon: BellIcon,
          action: rightAction,
        }}
      />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        showsVerticalScrollIndicator={false}
      >
        {/* <View
          style={{
            minHeight: SCREEN_HEIGHT * 0.47,
            justifyContent: "center",
            alignItems: "center",
            gap: 21,
          }}
        > */}
        {/* </View> */}
        <View style={styles.groupContentContainer}>
          <GroupFinanceSection
          balances={accounts?.map((acc) => acc.available_balance) ?? []}
          //hold_balances={accounts?.map((acc) => acc.) ?? []}
          currency_symbol={accounts?.[0]?.currency_symbol ?? "ksh"}
          currency_code={accounts?.[0]?.currency_code ?? "KES"}
          walletColor={accounts?.[0]?.color_tag ?? "#406825"}
          onRefresh={() => refresh()}
          wallet_name={wallet?.wallet_name ?? "User's Personal Wallet"}
           />
           <AccountsSection
          accounts={accounts ?? []}
          isLoading={accountsLoading}
          error={accountsError}
        />
          <View style={{ padding: 20 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 10,

                gap: 10,
                borderWidth: 1,
                backgroundColor: theme.background,
                borderColor: theme.background,
                borderRadius: 30,
                shadowColor: theme.foreground,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 5,
              }}
            >
              <Search size={16} color={theme.textSecondary} />
              <TextInput
                inputMode="text"
                value={searchInput}
                onChangeText={handleSearch}
                placeholder="Let me find that transaction for you.."
                placeholderTextColor={theme.textSecondary}
                style={{ width: SCREEN_WIDTH * 0.7 }}
              />
            </View>
          </View>
          <View>
            {/* <View style={styles.groupContentHeaderContainer}>
              <Text style={styles.groupContentHeaderText}>Group Activity</Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity style={styles.filterAction}>
                  <Filter size={17} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.showAllAction}>
                  <Text style={styles.showAllActionText}>Download</Text>
                  <ArrowDownCircle size={17} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View> */}
            <RecentActivity
             entity_id={params.group_id}
             available_balances={accounts?.map((acc) => acc.available_balance) ?? []}
             hold_balances={accounts?.map((acc) => acc.hold_balance) ?? []}
             current_balances={accounts?.map((acc) => acc.current_balance) ?? []}
             wallet_number={wallet?.wallet_number ?? "User's Personal Wallet"}
             wallet_name={wallet?.wallet_name ?? "User's Personal Wallet"}
             currency_symbol={accounts?.[0]?.currency_symbol ?? "ksh"}
             currency_code={accounts?.[0]?.currency_code ?? "KES"}
             currency_name={accounts?.[0].currency_name??'kenyan Shiling'}
             />
            {/* <GroupActivitySection /> */}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
