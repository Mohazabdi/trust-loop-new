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
import { SCREEN_HEIGHT } from "@gorhom/bottom-sheet";
import { useQueryClient } from "@tanstack/react-query";
import { BellIcon, RotateCcw } from "lucide-react-native";
import { useCallback, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { useTabBarBottomInset } from "@/lib/layout/tabBar";

export default function MyWalletScreen() {
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const queryClient = useQueryClient();
  const tabBarInset = useTabBarBottomInset();

  // Data Hooks
  const {
    data: member,
    isLoading: memberLoading,
    error: memberError,
    refetch: memberRefetch,
  } = useMemberData();

  const {
    data: wallet,
    isLoading: walletLoading,
    error: walletError,
    refetch: walletRefetch,
  } = useUserWallet(member?.id);

  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: accountsRefetch,
  } = useWalletAccounts(wallet?.wallet_id);

  // Realtime Hook
  useWalletRealtime(wallet?.wallet_id);

  const styles = useMemo(() => MywalletScreenStyles(theme), [theme]);

  // Refresh Handler
  const refresh = async () => {
    queryClient.invalidateQueries({
      queryKey: ["transaction_history"],
      exact: true,
    });
    await walletRefetch();
    await accountsRefetch();
    await memberRefetch();
    
    toast("Wallet up to date", {
      position: "top-center",
      icon: <RotateCcw size={20} color={theme.success} />,
    });
  };

  const rightAction = useCallback(() => {
    setIsNotificationOpen(true);
  }, [setIsNotificationOpen]);

  // Loading & Error States (Now covers all major data points)
  if (memberLoading || walletLoading) {
    return <LoadingScreen message="securing your profile" />;
  }
  
  const hasError = memberError || walletError || accountsError;
  if (hasError) {
    return <ErrorScreen message={hasError.message || "Failed to load wallet details."} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <CustomWalletHeader
        subTitle="My Wallet"
        rightAction={{
          icon: BellIcon,
          action: rightAction,
        }}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: tabBarInset + 16 }}
      >
        <View style={[styles.greetings, { minHeight: SCREEN_HEIGHT * 0.1 }]}>
          <Text style={styles.greetingsText}>
            {`Transactions for ${member?.first_name}!`}
          </Text>
        </View>

        <BalanceHeroSection
          balances={accounts?.map((acc) => acc.available_balance) ?? []}
          currency_symbol={accounts?.[0]?.currency_symbol ?? "Ksh"}
          currency_code={accounts?.[0]?.currency_code ?? "KES"}
          walletColor={accounts?.[0]?.color_tag ?? "#406825"}
          onRefresh={() => refresh()}
          wallet_name={wallet?.wallet_name ?? "Personal Wallet"}
        />
        
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
          wallet_number={wallet?.wallet_number ?? "---"}
          wallet_name={wallet?.wallet_name ?? "Personal Wallet"}
          currency_symbol={accounts?.[0]?.currency_symbol ?? "Ksh"}
          currency_code={accounts?.[0]?.currency_code ?? "KES"}
          currency_name={accounts?.[0]?.currency_name ?? "Kenyan Shilling"}
        />
      </ScrollView>
    </SafeAreaView>
  );
}