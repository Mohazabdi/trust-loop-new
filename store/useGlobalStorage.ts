import { AppTheme, darkTheme, lightTheme } from "@/styles/theme/colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance } from "react-native";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type ThemeMode = "light" | "dark";

interface GlobalState {
  mode: ThemeMode;
  theme: AppTheme;
  toggleTheme: () => void;
  setSystemTheme: (mode: ThemeMode) => void;
  isPrivacyOn: boolean;
  togglePrivacy: () => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  isAccountSheetOpen: boolean;
  setIsAccountSheetOpen: (open: boolean) => void;
  isContributionSheetOpen: boolean;
  setIsContributionSheetOpen: (open: boolean) => void;
  isRecipientSheetOpen: boolean;
  setIsRecipientSheetOpen: (open: boolean) => void;
  isRotationSettingsSheetOpen: boolean;
  setIsRotationSettingsSheetOpen: (open: boolean) => void;
   isRotationInviteesSheetOpen: boolean;
  setIsRotationInviteesSheetOpen: (open: boolean) => void;
  isWalletSettingsSheetOpen: boolean;
  setIsWalletSettingsSheetOpen: (open: boolean) => void;
}

export const useGlobalStorage = create<GlobalState>()(
  persist(
    (set) => ({
      // Theme Initial State
      mode: Appearance.getColorScheme() === "dark" ? "dark" : "light",
      theme: Appearance.getColorScheme() === "dark" ? darkTheme : lightTheme,

      toggleTheme: () =>
        set((state) => {
          const newMode = state.mode === "dark" ? "light" : "dark";
          return {
            mode: newMode,
            theme: newMode === "dark" ? darkTheme : lightTheme,
          };
        }),

      setSystemTheme: (newMode) =>
        set({
          mode: newMode,
          theme: newMode === "dark" ? darkTheme : lightTheme,
        }),

      // Existing States
      isPrivacyOn: false,
      togglePrivacy: () =>
      set((state) => ({ isPrivacyOn: !state.isPrivacyOn })),
      isNotificationOpen: false,
      setIsNotificationOpen: (open) => set({ isNotificationOpen: open }),
      isRecipientSheetOpen: false,
      setIsRecipientSheetOpen: (open) => set({ isRecipientSheetOpen: open }),
      isAccountSheetOpen: false,
      setIsAccountSheetOpen: (open) => set({ isAccountSheetOpen: open }),
      isContributionSheetOpen:false,
      setIsContributionSheetOpen:(open)=>set({ isContributionSheetOpen: open }),
      isRotationSettingsSheetOpen: false,
      setIsRotationSettingsSheetOpen: (open) => set({ isRotationSettingsSheetOpen: open }),
      isRotationInviteesSheetOpen: false,
      setIsRotationInviteesSheetOpen: (open) => set({ isRotationInviteesSheetOpen: open }),
     isWalletSettingsSheetOpen: false,
      setIsWalletSettingsSheetOpen: (open) => set({ isWalletSettingsSheetOpen: open }),
    
    }),

    {
      name: "global-storage",
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
