import { useGlobalStorage } from "@/store/useGlobalStorage";
import { CustomWalletHeaderStyles } from "@/styles/wallet_styles/custom_header.styles";
import { NotificationBadge } from "@/components/myGroups/NotificationBadge";
import { ArrowLeft, HomeIcon, LucideIcon } from "lucide-react-native";
import { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
interface headerProps {
  title?: string;
  subTitle?: string;
  leftAction?: {
    icon: LucideIcon;
    action: () => void;
  };
  rightAction?: {
    icon: LucideIcon;
    action: () => void;
    badgeCount?: number; 
  };
}
export default function CustomWalletHeader({
  title,
  subTitle,
  leftAction,
  rightAction,
}: headerProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => CustomWalletHeaderStyles(theme), [theme]);
  const handleLeftAction = () => {
    leftAction ? leftAction.action() : console.log("left Action");
  };
  const handleRightAction = () => {
    rightAction ? rightAction.action() : console.log("right Action");
  };
  const LeftIcon = leftAction ? leftAction.icon : ArrowLeft;
  const RightIcon = rightAction ? rightAction.icon : HomeIcon;
  return (
    <View style={styles.container}>
      <View style={styles.leftContent}>
        <TouchableOpacity style={styles.iconView} onPress={handleLeftAction}>
          <LeftIcon size={27} color={theme.foreground} />
        </TouchableOpacity>
      </View>
      <View style={styles.midContent}>
        <Text style={styles.appTitle}>{title ?? "Trust Loop"}</Text>
        <Text style={styles.appSubTitle}>{subTitle ?? "F inance"}</Text>
      </View>
      <View style={styles.rightContent}>
        <TouchableOpacity style={styles.iconView} onPress={handleRightAction}>
          <NotificationBadge count={rightAction?.badgeCount ?? 0}>
            <RightIcon size={27} color={theme.foreground} />
          </NotificationBadge>
        </TouchableOpacity>
      </View>
    </View>
  );
}
