import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupActivitySectionStyles } from "@/styles/group_style/group_activity_section.styles";
import { BanknoteArrowUp, CircleCheckBig, User } from "lucide-react-native";
import { useMemo } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
export default function GroupActivitySection() {
  const { theme, isPrivacyOn } = useGlobalStorage();
  const styles = useMemo(() => GroupActivitySectionStyles(theme), [theme]);
  return (
    <View style={styles.groupActivityContainer}>
      <TouchableOpacity style={styles.activityContainer}>
        <View style={styles.activityIcon}>
          <BanknoteArrowUp size={27} color={theme.text} />
        </View>
        <View style={styles.activityTextContainer}>
          <View style={styles.activityTitle}>
            <Text style={styles.activityTitleText}>Deposit</Text>
          </View>
          <View style={styles.activitySubTitle}>
            <User size={17} color={theme.text} />
            <Text style={styles.activitySubTitleText}>John Kellly</Text>
          </View>
        </View>
        <View style={styles.activityStatusContainer}>
          <CircleCheckBig size={13} color={theme.success} />
        </View>
        <View style={styles.activityMetaContainer}>
          <View style={styles.activityAmount}>
            <Text style={[styles.activityAmountText, { color: theme.success }]}>
              {isPrivacyOn ? "+5000" : "----"}
            </Text>
          </View>
          <View style={styles.activityDateTime}>
            <Text style={styles.activityDateTimeText}>just now</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.activityContainer}>
        <View style={styles.activityIcon}>
          <BanknoteArrowUp size={27} color={theme.text} />
        </View>
        <View style={styles.activityTextContainer}>
          <View style={styles.activityTitle}>
            <Text style={styles.activityTitleText}>Deposit</Text>
          </View>
          <View style={styles.activitySubTitle}>
            <User size={17} color={theme.text} />
            <Text style={styles.activitySubTitleText}>John Kellly</Text>
          </View>
        </View>
        <View style={styles.activityStatusContainer}>
          <CircleCheckBig size={13} color={theme.success} />
        </View>
        <View style={styles.activityMetaContainer}>
          <View style={styles.activityAmount}>
            <Text style={[styles.activityAmountText, { color: theme.success }]}>
              {isPrivacyOn ? "+5000" : "----"}
            </Text>
          </View>
          <View style={styles.activityDateTime}>
            <Text style={styles.activityDateTimeText}>just now</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.activityContainer}>
        <View style={styles.activityIcon}>
          <BanknoteArrowUp size={27} color={theme.text} />
        </View>
        <View style={styles.activityTextContainer}>
          <View style={styles.activityTitle}>
            <Text style={styles.activityTitleText}>Deposit</Text>
          </View>
          <View style={styles.activitySubTitle}>
            <User size={17} color={theme.text} />
            <Text style={styles.activitySubTitleText}>John Kellly</Text>
          </View>
        </View>
        <View style={styles.activityStatusContainer}>
          <CircleCheckBig size={13} color={theme.success} />
        </View>
        <View style={styles.activityMetaContainer}>
          <View style={styles.activityAmount}>
            <Text style={[styles.activityAmountText, { color: theme.success }]}>
              {isPrivacyOn ? "+5000" : "----"}
            </Text>
          </View>
          <View style={styles.activityDateTime}>
            <Text style={styles.activityDateTimeText}>just now</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.activityContainer}>
        <View style={styles.activityIcon}>
          <BanknoteArrowUp size={27} color={theme.text} />
        </View>
        <View style={styles.activityTextContainer}>
          <View style={styles.activityTitle}>
            <Text style={styles.activityTitleText}>Deposit</Text>
          </View>
          <View style={styles.activitySubTitle}>
            <User size={17} color={theme.text} />
            <Text style={styles.activitySubTitleText}>John Kellly</Text>
          </View>
        </View>
        <View style={styles.activityStatusContainer}>
          <CircleCheckBig size={13} color={theme.success} />
        </View>
        <View style={styles.activityMetaContainer}>
          <View style={styles.activityAmount}>
            <Text style={[styles.activityAmountText, { color: theme.success }]}>
              {isPrivacyOn ? "+5000" : "----"}
            </Text>
          </View>
          <View style={styles.activityDateTime}>
            <Text style={styles.activityDateTimeText}>just now</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.activityContainer}>
        <View style={styles.activityIcon}>
          <BanknoteArrowUp size={27} color={theme.text} />
        </View>
        <View style={styles.activityTextContainer}>
          <View style={styles.activityTitle}>
            <Text style={styles.activityTitleText}>Deposit</Text>
          </View>
          <View style={styles.activitySubTitle}>
            <User size={17} color={theme.text} />
            <Text style={styles.activitySubTitleText}>John Kellly</Text>
          </View>
        </View>
        <View style={styles.activityStatusContainer}>
          <CircleCheckBig size={13} color={theme.success} />
        </View>
        <View style={styles.activityMetaContainer}>
          <View style={styles.activityAmount}>
            <Text style={[styles.activityAmountText, { color: theme.success }]}>
              {isPrivacyOn ? "+5000" : "----"}
            </Text>
          </View>
          <View style={styles.activityDateTime}>
            <Text style={styles.activityDateTimeText}>just now</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
