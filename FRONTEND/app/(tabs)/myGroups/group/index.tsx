import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import GroupTakeActionSection from "@/components/myGroups/groupTakeActionSection";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useGroupRealtime } from "@/hooks/useGroupRealTime";
import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupPageStyles } from "@/styles/group_style/group_page.styles";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    BellIcon,
    ChevronLeft,
    MessageCircle,
    PlusCircle,
    RefreshCcw,
    Search,
    Users2,
    Wallet2,
} from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import {
    Dimensions,
    Pressable,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function GroupHomePage() {
    const { theme, setIsNotificationOpen } = useGlobalStorage();
    const params = useLocalSearchParams<{ group_id: string }>();

    const { data: member, refetch, isRefetching } = useMemberData();
    const { data: groupMemberDetail } = useGroupMemberDetail(params.group_id, member?.id);
    useGroupRealtime(groupMemberDetail?.id);

    const [searchInput, setSearchInput] = useState("");
    const handleSearch = (text: string) => setSearchInput(text);

    const rightAction = useCallback(() => {
        setIsNotificationOpen(true);
    }, [setIsNotificationOpen]);

    const router = useRouter();
    const leftAction = () => router.back();

    const styles = useMemo(() => GroupPageStyles(theme), [theme]);

    // Reusable gradient action button
    const GradientActionButton = ({
        colors,
        onPress,
        children,
        style,
    }: {
        colors: readonly [string, string, ...string[]];
        onPress: () => void;
        children: React.ReactNode;
        style?: any;
    }) => (
        <Pressable onPress={onPress} style={style}>
            <LinearGradient
                colors={colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                    {
                        padding: 10,
                        borderRadius: 20,
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 5,
                        width: 70,
                    },
                    style,
                ]}
            >
                {children}
            </LinearGradient>
        </Pressable>
    );

    return (
        <View style={{ flex: 1 }}>
            {/* Subtle background gradient */}
            <LinearGradient
                colors={[theme.background, theme.background, `${theme.primary}26`]}
                locations={[0, 0.6, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <SafeAreaView style={{ flex: 1, backgroundColor: "transparent" }} edges={["top"]}>
                <CustomGroupHeader
                    groupName={groupMemberDetail?.group_name}
                    leftAction={{ icon: ChevronLeft, action: leftAction }}
                    rightAction={{ icon: BellIcon, action: rightAction }}
                />
                <ScrollView
                    style={{ backgroundColor: "transparent" }}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={() => refetch()}
                            tintColor={theme.primary}
                            colors={[theme.primary]}
                        />
                    }
                >
                    {/* Hero area */}
                    <View
                        style={{
                            minHeight: SCREEN_HEIGHT * 0.47,
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 21,
                        }}
                    >
                        <Text style={{ color: theme.textSecondary, fontWeight: "bold" }}>
                            Welcome to {groupMemberDetail?.group_name}! {groupMemberDetail?.first_name}
                        </Text>

                        {/* Search bar */}
                        <View
                            style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "center",
                                paddingHorizontal: 10,
                                gap: 10,
                                borderWidth: 1,
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
                                placeholder={` You can start from here ${groupMemberDetail?.first_name} `}
                                placeholderTextColor={theme.textSecondary}
                                style={{ width: SCREEN_WIDTH * 0.7 }}
                            />
                        </View>

                        {/* Quick action buttons – gradient versions */}
                        <View
                            style={{
                                flexDirection: "row",
                                gap: 20,
                                justifyContent: "flex-start",
                                alignItems: "center",
                                flexWrap: "wrap",
                                maxWidth: SCREEN_WIDTH * 0.7,
                            }}
                        >
                            {/* Rotation – green to primary */}
                            <GradientActionButton
                                colors={["#17690c", theme.primary]}
                                onPress={() =>
                                    router.push({
                                        pathname: `/(tabs)/myGroups/group/MyRotations`,
                                        params: {
                                            group_id: groupMemberDetail?.group_id,
                                            group_member_id: groupMemberDetail?.id,
                                            member_role: groupMemberDetail?.member_role,
                                        },
                                    })
                                }
                            >
                                <RefreshCcw size={22} color={theme.surface} />
                                <Text style={{ color: theme.surface, fontWeight: "bold", fontSize: 11 }}>
                                    Rotation
                                </Text>
                            </GradientActionButton>

                            {/* Wallet – gold to primary */}
                            <GradientActionButton
                                colors={["#4e3809", theme.primary]}
                                onPress={() =>
                                    router.push({
                                        pathname: `/(tabs)/myGroups/group/groupWallet`,
                                        params: { group_id: groupMemberDetail?.group_id },
                                    })
                                }
                            >
                                <Wallet2 size={22} color={theme.surface} />
                                <Text style={{ color: theme.surface, fontWeight: "bold", fontSize: 11 }}>
                                    Wallet
                                </Text>
                            </GradientActionButton>

                            {/* Members – dark to primary */}
                            <GradientActionButton
                                colors={["#212520", theme.primary]}
                                onPress={() =>
                                    router.push({
                                        pathname: `/(tabs)/myGroups/group/groupMembers`,
                                        params: {
                                            group_id: params.group_id,
                                            groupName: groupMemberDetail?.group_name,
                                        },
                                    })
                                }
                            >
                                <Users2 size={22} color={theme.surface} />
                                <Text style={{ color: theme.surface, fontWeight: "bold", fontSize: 11 }}>
                                    Members
                                </Text>
                            </GradientActionButton>

                            {/* Chat – blue to primary */}
                             <GradientActionButton
                                colors={["#152a3b", theme.primary]}
                                onPress={() =>
                                    router.push({
                                        pathname: "/(tabs)/myGroups/group/chat",
                                        params: { group_id: params.group_id },
                                    })
                                }
                            >
                                <MessageCircle size={22} color={theme.surface} />
                                <Text style={{ color: theme.surface, fontWeight: "bold", fontSize: 11 }}>
                                    Chat
                                </Text>
                            </GradientActionButton>

                            {/* New – kept dashed as a deliberate outlier */}
                            <Pressable
                                style={{
                                    padding: 9,
                                    borderRadius: 20,
                                    justifyContent: "center",
                                    alignItems: "center",
                                    gap: 5,
                                    backgroundColor: theme.background,
                                    borderStyle: "dashed",
                                    borderWidth: 2,
                                    borderColor: theme.textSecondary,
                                    width: 67,
                                }}
                            >
                                <PlusCircle size={22} color={theme.textSecondary} />
                                <Text style={{ color: theme.textSecondary, fontWeight: "bold", fontSize: 11 }}>
                                    New
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Bottom content */}
                    <View style={styles.groupContentContainer}>
                        <View>
                            <ScrollView
                                style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}
                                contentContainerStyle={{ gap: 5, paddingHorizontal: 20 }}
                                nestedScrollEnabled
                            >
                                <GroupTakeActionSection group_member_id={groupMemberDetail?.id} />
                            </ScrollView>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}