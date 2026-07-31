import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import GroupMyPlansSection from "@/components/myGroups/groupMyPlansSection";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupPageStyles } from "@/styles/group_style/group_page.styles";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    BellIcon,
    ChevronLeft,
    PlusCircle,
    Search
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
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = 280;
export default function MyRotationsPage() {
  const { theme, setIsNotificationOpen, isPrivacyOn, togglePrivacy } =
    useGlobalStorage();
  const [searchInput, setSearchInput] = useState("");
  const handleSearch = (text: string) => {
    setSearchInput(text);
  };
  const rightAction = useCallback(() => {
    console.log("RightAction");
    setIsNotificationOpen(true);
  }, [setIsNotificationOpen]);
  const router = useRouter();
  const leftAction = () => {
    router.back();
  };
 const params = useLocalSearchParams<{
    group_member_id:string
    group_id:string
    member_role:string
  }>();
  const styles = useMemo(() => GroupPageStyles(theme), [theme]);
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <CustomGroupHeader
        groupName="My Rotation Plans"
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
        <View
          style={{
            // minHeight: SCREEN_HEIGHT * 0.47,
            padding: 20,
            flexDirection: "row",
            justifyContent: "space-around",
            alignItems: "center",
            //gap: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 10,
              gap: 10,
              borderWidth: 1,
              maxWidth: SCREEN_WIDTH * 0.65,
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
              placeholder="Get that rotation ASAP "
              placeholderTextColor={theme.textSecondary}
              style={{ 
                flex:1
                //width: SCREEN_WIDTH * 0.45
               }}
            />
          </View>
          {
            params.member_role==='admin'&&(
          <TouchableOpacity
            style={[
              styles.groupContentActionContainer,
              { backgroundColor: "#212520" },
            ]}
            onPress={() =>
              router.push({
                    pathname: "/(tabs)/myGroups/group/createRotation",
                    params: {
                      group_member_id:params.group_member_id,
                      group_id:params.group_id
                    },
                      })
              // router.push("/(tabs)/myGroups/group/createRotation")
            }
          >
            <PlusCircle size={19} color={theme.surface} />
            <Text style={styles.groupContentActionText}>Create</Text>
          </TouchableOpacity>
            )
          }
        </View>
        <View style={styles.groupContentContainer}>
          <View>
            <View style={styles.groupContentHeaderContainer}>
              {/* <Text style={styles.groupContentHeaderText}>My plans (2)</Text> */}
            </View>
            <GroupMyPlansSection 
            group_member_id={
             params.group_member_id
            }
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
