import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupMyTimeLineSectionStyles } from "@/styles/group_style/group_my_timeline_section.styles";
import { router } from "expo-router";
import {
    Calendar,
    PlusCircle,
    SquareArrowOutUpRight,
    User2,
} from "lucide-react-native";
import { useMemo } from "react";
import { Dimensions, Text, TouchableOpacity, View } from "react-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function GroupMyTimelineSection() {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => GroupMyTimeLineSectionStyles(theme), [theme]);

  return (
    // <ScrollView
    //   style={{
    //     maxHeight: SCREEN_HEIGHT * 0.3,
    //   }}
    //   nestedScrollEnabled={true}
    // >
    <View style={styles.userTimeLineContainer}>
      <View style={styles.userTimeLine}>
        <View style={styles.timeLineHeader}>
          <View style={styles.timeLineHeadingContainer}>
            <Text style={styles.timeLineHeadingText}>Next Payout</Text>
          </View>
          <View style={styles.timeLineQueueOptionContainer}>
            <Text style={styles.timelineFooterDueDateText}>Interval 2/13</Text>
            {/* <TouchableOpacity style={styles.timeLineQueueSnooze}>
              <ClockArrowDown size={14} />
              <Text style={styles.timeLineSnoozeText}>upcoming</Text>
            </TouchableOpacity> */}
          </View>
        </View>
        <Text style={styles.timelinePlanName}>Rotation one</Text>
        {/* <View style={styles.timelinePlanDescriptionContainer}>
          <Dot size={15} color={theme.textSecondary} />
          <Text style={styles.timelinePlanDescription}>
            Slowly contribute towards the rotation ones' rotation plan upcoming
            on 12-mar-2026
          </Text>
        </View> */}
        <View style={styles.timelineFooterDateContents}>
          <View
            style={{
              flexDirection: "row",
              gap: 5,
              alignItems: "center",
              // justifyContent: "flex",
            }}
          >
            <Calendar size={24} color={theme.text} />
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 13,
              }}
            >
              13-mar-2026
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
            }}
          >
            <User2 size={24} color={theme.text} />
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 13,
              }}
            >
              Alvin Indiazi
            </Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `20%`,
              },
            ]}
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 5,
            justifyContent: "space-between",
          }}
        >
          <Text style={styles.timelineFooterDueDateText}>
            my Contribution:100
          </Text>
          <Text style={styles.timelineFooterDueDateText}>Balance:200</Text>
          <Text style={styles.timelineFooterDueDateText}>20% complete</Text>
        </View>
      </View>
      <View style={styles.timelineFooter}>
        <TouchableOpacity
          style={[
            styles.timelineFooterActionContents,
            { backgroundColor: "#17690c" },
          ]}
        >
          <Text style={styles.timelineFooterActionText}>contribute</Text>
          <PlusCircle size={20} color={theme.surface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.timelineFooterActionContents,
            { backgroundColor: "#212520" },
          ]}
          onPress={() => router.push(`/(tabs)/myGroups/group/MyRotations`)}
        >
          <Text style={styles.timelineFooterActionText}>view plan</Text>
          <SquareArrowOutUpRight size={20} color={theme.surface} />
        </TouchableOpacity>
      </View>
    </View>
    // </ScrollView>
  );
}
