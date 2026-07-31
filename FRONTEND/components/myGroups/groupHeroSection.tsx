import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupHeroSectionStyles } from "@/styles/group_style/group_hero_section.styles";
import { TruncatedText } from "@/utils/TruncateText";
import { CircleGauge, Users, Users2 } from "lucide-react-native";
import { useMemo } from "react";
import {
    Dimensions,
    Image,
    ImageSourcePropType,
    Text,
    View,
} from "react-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
interface GroupInfoParams {
  groupName?: string;
  groupDisplayPhoto?: ImageSourcePropType | string;
  groupDescription?: string;
  groupType?: string;
  noOfMembers?: number;
}
export default function GroupHeroSection({
  groupName,
  groupDescription,
  groupDisplayPhoto,
  groupType,
  noOfMembers,
}: GroupInfoParams) {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => GroupHeroSectionStyles(theme), [theme]);
  return (
    <View style={styles.groupInfoContainer}>
      <View style={styles.groupInfoUpper}>
        {/* <View style={styles.profileUpperLeft}> */}
        <View style={styles.groupDpContainer}>
          {groupDisplayPhoto ? (
            <Image
              source={
                typeof groupDisplayPhoto === "string"
                  ? { uri: groupDisplayPhoto }
                  : groupDisplayPhoto
              }
              style={styles.groupDp}
              resizeMode="cover"
              alt={groupName?.[0] || "GRP"}
            />
          ) : (
            <View style={styles.iconFallBack}>
              <Users2 size={50} color={theme.text} />
            </View>
          )}
        </View>
        {/* </View> */}
        <View style={styles.profileUpperRight}>
          <Text style={styles.groupNameText}>{groupName}</Text>
          <View style={styles.groupTypeContainer}>
            <CircleGauge size={15} color={theme.text} />
            <Text style={styles.groupTypeText}>{groupType}</Text>
          </View>
          <View style={styles.groupCountContainer}>
            <Users size={15} color={theme.text} />
            <Text
              style={styles.groupCountText}
            >{`${noOfMembers} members`}</Text>
          </View>
        </View>
      </View>
      <View style={styles.groupInfoMid}>
        <TruncatedText
          text={groupDescription ?? ""}
          style={styles.groupDescriptionText}
          maxLines={3}
          // showMore
        />
      </View>
      {/* <View style={styles.groupInfoLower}>
        
        <View style={styles.groupCreatedByContainer}>
          <Text style={styles.groupCreatedByText}>created by : alvin</Text>
        </View>
        <View style={styles.groupCreatedAtContainer}>
          <Text style={styles.groupCreatedAtText}>created at : 12/13/2026</Text>
        </View>
      </View> */}
    </View>
  );
}
