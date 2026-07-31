import { useGlobalStorage } from "@/store/useGlobalStorage";
import { CustomGroupHeaderStyles } from "@/styles/group_style/custom_group_header.styles";
import { TruncatedText } from "@/utils/TruncateText";
// import { CustomWalletHeaderStyles } from "@/styles/wallet_styles/custom_header.styles";
import { NotificationBadge } from "@/components/myGroups/NotificationBadge";
import { ArrowLeft, HomeIcon, LucideIcon, Users2 } from "lucide-react-native";
import { useMemo } from "react";
import {
    Image,
    ImageSourcePropType,
    TouchableOpacity,
    View,
} from "react-native";

interface headerProps {
  groupName?: string;
  groupDp?: ImageSourcePropType | string;
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
export default function CustomGroupHeader({
  groupDp,
  groupName,
  leftAction,
  rightAction,
}: headerProps) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => CustomGroupHeaderStyles(theme), [theme]);
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
        <TouchableOpacity style={styles.iconLeft} onPress={handleLeftAction}>
          <LeftIcon size={27} color={theme.foreground} />
        </TouchableOpacity>
        {/* <TouchableOpacity style={styles.iconView} onPress={handleLeftAction}>
          <LeftIcon size={27} color={theme.foreground} />
        </TouchableOpacity> */}
        <View style={styles.groupDpContainer}>
          {groupDp ? (
            <Image
              source={typeof groupDp === "string" ? { uri: groupDp } : groupDp}
              style={styles.groupDp}
              resizeMode="cover"
              alt={groupName?.[0] || "GN"}
            />
          ) : (
            <View style={styles.iconFallBack}>
              <Users2 size={28} color={theme.text} />
            </View>
          )}
        </View>
      </View>
      <View style={styles.midContent}>
        <TruncatedText
          style={styles.groupName}
          text={groupName ?? "Group Name"}
          maxLines={2}
        />
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
