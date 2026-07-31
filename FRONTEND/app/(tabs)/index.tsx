import { ErrorScreen } from "@/components/errorScreen";
import { LoadingScreen } from "@/components/loadingScreen";
import CustomWalletHeader from "@/components/myWallet/customHeader";
import BalanceHeroSection from "@/components/myWallet/home/balanceHeroSection";
import RecentActivity from "@/components/myWallet/home/recentActivity";
import AccountsSection from "@/components/myWallet/home/userAccountsSection";
import WalletActions from "@/components/myWallet/home/walletActions";
import { useMemberData } from "@/hooks/useMemberData";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useWalletAccounts } from "@/hooks/useWalletAccounts";
import { useWalletRealtime } from "@/hooks/useWalletRealTime";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { MywalletScreenStyles } from "@/styles/wallet_styles/wallet_screen.styles";
import { onSignOutButtonPress } from "@/utils/signOut";
import { SCREEN_HEIGHT } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { BellIcon, LogIn, RotateCcw } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
export default function MyWalletScreen() {
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const queryClient=useQueryClient();
  const {
    data: member,
    isLoading: memberLoading,
    error: memberError,
    refetch:memberRefetch
  } = useMemberData();
  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch:walletRefetch
  } = useUserWallet(member?.id);
  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
    refetch:accountsRefetch
  } = useWalletAccounts(wallet?.wallet_id);
  const refresh=async()=>{
    queryClient.invalidateQueries({
  queryKey: ["transaction_history"],
  exact: true
});
    await walletRefetch()
    await accountsRefetch()
    await memberRefetch()
    await toast("Wallet up to date ", {
      position: "top-center",
      icon: <RotateCcw size={20} color={theme.success} />,
    });

  }
  const router = useRouter();
  const rightAction = useCallback(() => {
    console.log("RightAction");
    setIsNotificationOpen(true);
  }, [setIsNotificationOpen]);

  const leftAction = async () => {
    try {
      await onSignOutButtonPress();
      //router.replace("/login");
    } catch (e) {
      console.log(`Error Signing out ${e}`);
    }
  };
  // console.log(`data Wallet`, wallet);
  // console.log(`data Accounts`, accounts);
  useWalletRealtime(wallet?.wallet_id);

  const styles = useMemo(() => MywalletScreenStyles(theme), [theme]);
  if (memberLoading)
    return <LoadingScreen message="You made it! securing your profile" />;
  if (memberError) return <ErrorScreen message={memberError.message} />;
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <CustomWalletHeader
        subTitle="My Wallet"
        leftAction={{ icon: LogIn, action: leftAction }}
        rightAction={{
          icon: BellIcon,
          action: rightAction,
        }}
      />
      <ScrollView
        // stickyHeaderIndices={[0]} // 2. Index 0 makes the first child (Header) sticky
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
      >
        <View style={[styles.greetings, { minHeight: SCREEN_HEIGHT * 0.1 }]}>
          <Text
            style={styles.greetingsText}
          >{`Glad to have you ${member?.first_name} !`}</Text>
        </View>

        {/* then the hero section component over here */}
        <BalanceHeroSection
          balances={accounts?.map((acc) => acc.available_balance) ?? []}
          currency_symbol={accounts?.[0]?.currency_symbol ?? "ksh"}
          currency_code={accounts?.[0]?.currency_code ?? "KES"}
          walletColor={accounts?.[0]?.color_tag ?? "#406825"}
          onRefresh={() => refresh()}
          wallet_name={wallet?.wallet_name ?? "User's Personal Wallet"}
        />
        {/* then the next component over here */}
        <WalletActions />
        <AccountsSection
          accounts={accounts ?? []}
          isLoading={accountsLoading}
          error={accountsError}
        />
        <RecentActivity 
        
        entity_id={member?.id}
        available_balances={accounts?.map((acc) => acc.available_balance) ?? []}
             hold_balances={accounts?.map((acc) => acc.hold_balance) ?? []}
             current_balances={accounts?.map((acc) => acc.current_balance) ?? []}
             wallet_number={wallet?.wallet_number ?? "User's Personal Wallet"}
             wallet_name={wallet?.wallet_name ?? "User's Personal Wallet"}
             currency_symbol={accounts?.[0]?.currency_symbol ?? "ksh"}
             currency_code={accounts?.[0]?.currency_code ?? "KES"}
             currency_name={accounts?.[0].currency_name??'kenyan Shiling'}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
