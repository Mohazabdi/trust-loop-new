import { LoadingScreen } from "@/components/loadingScreen";
import ListOfMemberSelector from "@/components/myGroups/ListOfMemberSelector";
import RotationPlanSettings from "@/components/myGroups/PlanSettings";
import MyWalletSettings from "@/components/myWallet/home/MyWalletSeetings";
import ListOfAccounts from "@/components/myWallet/listOfAccounts";
import ListOfRecipients from "@/components/myWallet/transfer/recipients/listOfRecipients";
import { SplashScreenController } from "@/components/splash-screen-controller";
import { useAuthContext } from "@/hooks/use-auth-context";
import AuthProvider from "@/providers/auth-provider";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useTransferFundsStorage } from "@/store/useTransferFundsStorage";
import  {
    BottomSheetModal,
    BottomSheetBackdrop,
    BottomSheetModalProvider,
    BottomSheetView,
    BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Appearance, Keyboard, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from "sonner-native";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "OFFLINE_CACHE",
});
function RootNavigation() {
  const { isLoggedIn, isLoading } = useAuthContext();
  if (isLoading) {
    return (
      <LoadingScreen message="Subiri kidogo!, getting your account ready" />
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Screen name="index" />
      <Stack.Screen name="loginOTP" />
      <Stack.Screen name="signUp" />
      <Stack.Screen name="resetPassword" />
      <Stack.Screen name="checkEmail" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
export default function RootLayout() {
  const {
    theme,
    setSystemTheme,
    isNotificationOpen,
    setIsNotificationOpen,
    setIsRotationInviteesSheetOpen,
    isRotationInviteesSheetOpen,
    
  } = useGlobalStorage();
  const notificationSnapPoints = useMemo(() => ["60%"], []); 
   const bottomRecipientSheetSnapPoints = useMemo(() => ["60%"], []);
  const bottomRecipientSheetRef = useRef<BottomSheetModal>(null);
  const bottomNotificationSheetRef = useRef<BottomSheetModal>(null);
  
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => subscription.remove();
  }, []);

   
     useEffect(() => {
    if (!bottomNotificationSheetRef.current) return;
    if (isNotificationOpen) {
      
        bottomNotificationSheetRef.current?.present()
      
    } else {
    bottomNotificationSheetRef.current?.dismiss()
    }
  }, [isNotificationOpen]);
   useEffect(() => {
    if (!bottomRecipientSheetRef.current) return;
    if (isRotationInviteesSheetOpen) {
      
        bottomRecipientSheetRef.current?.present()
      
    } else {
    bottomRecipientSheetRef.current?.dismiss()
    }
  }, [isRotationInviteesSheetOpen]);
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
      />
    ),
    [],
  );

const snappyConfig = useMemo(
  () => ({
    stiffness: 300,
    damping: 30,
    mass: 0.5,
    overshootClamping: true,   // prevents bounce overshoot
  }),
  [],
);

  return (
    <AuthProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister: asyncStoragePersister }}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <SplashScreenController />
              <RootNavigation />
              <BottomSheetModal
                ref={bottomNotificationSheetRef}
                //index={-1}
                snapPoints={notificationSnapPoints}
                enablePanDownToClose={true}
                animationConfigs={snappyConfig}
                enableDynamicSizing={false}
                backdropComponent={renderBackdrop}
                backgroundStyle={{
                  borderRadius: 16,
                  backgroundColor: theme.surface,
                }}
                animateOnMount={false}
                //onClose={() => setIsNotificationOpen(false)}
                onDismiss={() => setIsNotificationOpen(false)}
              >
                <BottomSheetView>
                  <Text style={{ color: theme.text }}>
                    The notifications shall display here
                  </Text>
                </BottomSheetView>
              </BottomSheetModal>
               <BottomSheetModal
                ref={ bottomRecipientSheetRef}
                //index={-1}
                snapPoints={bottomRecipientSheetSnapPoints}
                enablePanDownToClose={true}
                animationConfigs={snappyConfig}
                enableDynamicSizing={false}
                backdropComponent={renderBackdrop}
                backgroundStyle={{
                  borderRadius: 16,
                  backgroundColor: theme.surface,
                }}
                animateOnMount={false}
                //onClose={() => setIsNotificationOpen(false)}
                onDismiss={() => setIsRotationInviteesSheetOpen(false)}
              >
                <BottomSheetView>
                   <ListOfMemberSelector
                  onClose={() => {
        setIsRotationInviteesSheetOpen(false)
        bottomRecipientSheetRef.current?.dismiss()
        }}
        />
                </BottomSheetView>
              </BottomSheetModal>
            </BottomSheetModalProvider>
            <Toaster />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistQueryClientProvider>
    </AuthProvider>
  );
}
