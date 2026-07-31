import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupMyPlansSectionStyles } from "@/styles/group_style/group_my_plans_section.styles";
import { TruncatedText } from "@/utils/TruncateText";
import { useRouter } from "expo-router";
import { Calendar1, Dot, Inbox, RefreshCcw } from "lucide-react-native";
import { useMemo } from "react";
import {
    Dimensions,
    RefreshControl,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import CircularProgress from "./PieProgress";
import { useGetGroupMemberRotationPlans } from "@/hooks/useGetGroupMemberRotationPlans";
import { useGetRotationProgress } from "@/hooks/useGetRotationProgress";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GroupPlansProps {
    group_member_id: string;
}

// ✅ Child component – can safely call useGetRotationProgress at its top level
const RotationPlanItem = ({ 
    plan, 
    groupMemberId 
}: { 
    plan: any; 
    groupMemberId: string;
}) => {
    const { theme } = useGlobalStorage();
    const router = useRouter();
    const styles = useMemo(() => GroupMyPlansSectionStyles(theme), [theme]);
    
    const { data: rotationProgress } = useGetRotationProgress(plan.rotation_plan_id);
    const overallPercentage = rotationProgress?.progress_percentage ?? 0;
    
    const formattedItemDate = new Date(plan.start_date).toLocaleString('en-US', {
        dateStyle: 'medium'
    });

    return (
        <View style={styles.myPlansContainer}>
            <View style={styles.containerHeader}>
                <View style={styles.planStatusContainer}>
                    <Dot 
                        size={30} 
                        color={plan.rotation_status === 'active' ? theme.success : theme.secondary} 
                    />
                    <Text style={styles.planStatusText}>{plan.rotation_status}</Text>
                </View>
            </View>
            <Text style={styles.planName}>{plan.rotation_name}</Text>
            <TouchableOpacity
                style={styles.containerBody}
                onPress={() => router.push({
                    pathname: "/(tabs)/myGroups/group/rotation",
                    params: {
                        plan_id: plan.rotation_plan_id,
                        group_member_id: groupMemberId
                    }
                })}
            >
                <View style={styles.planDetailsContainer}>
                    <View style={styles.planProgressContainerLeft}>
                        <CircularProgress
                            percentage={plan.rotation_status === "dormant" ? 0 : overallPercentage}
                            size={90}
                            strokeWidth={2}
                            color={theme.success}
                            backgroundColor={theme.border}
                        />
                    </View>
                    <View style={styles.planProgressContainerRight}>
                        <TruncatedText
                            text={plan.rotation_description ?? ''}
                            maxLines={1}
                            style={styles.planDescriptionText}
                        />
                        <View style={styles.planDateContainer}>
                            <Calendar1 color={theme.text} size={14} />
                            <Text style={styles.planStartDate}>{formattedItemDate}</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
};

export default function GroupMyPlansSection({ group_member_id }: GroupPlansProps) {
    const { theme } = useGlobalStorage();
    const styles = useMemo(() => GroupMyPlansSectionStyles(theme), [theme]);
    
    const {
        data: MyRotationsData,
        refetch,
        isRefetching
    } = useGetGroupMemberRotationPlans(group_member_id);

    return (
        <ScrollView
            contentContainerStyle={{
                gap: 13,
                paddingHorizontal: 15,
                paddingVertical: 10,
            }}
            refreshControl={
                <RefreshControl
                    refreshing={isRefetching}
                    onRefresh={() => refetch()}
                    tintColor={theme.primary}
                    colors={[theme.primary]}
                />
            }
        >
            {MyRotationsData ? (
                MyRotationsData.length > 0 ? (
                    MyRotationsData.map((item) => (
                        <RotationPlanItem 
                            key={item.rotation_plan_id} 
                            plan={item} 
                            groupMemberId={group_member_id} 
                        />
                    ))
                ) : (
                    <TouchableOpacity
                        onPress={async () => await refetch()}
                        style={{
                            borderRadius: 21,
                            borderWidth: 2,
                            borderColor: theme.border,
                            minHeight: SCREEN_HEIGHT * 0.3,
                            justifyContent: "center",
                            alignItems: "center",
                            minWidth: "70%",
                            borderStyle: "dashed"
                        }}
                    >
                        <Inbox color={theme.textSecondary} size={50} />
                        <Text style={{
                            color: theme.textSecondary,
                            fontSize: 15,
                            fontWeight: "bold",
                            textAlign: "center"
                        }}>
                            You have no Rotations at the moment
                        </Text>
                    </TouchableOpacity>
                )
            ) : (
                <TouchableOpacity
                    onPress={async () => await refetch()}
                    style={{
                        padding: 10,
                        minHeight: SCREEN_HEIGHT * 0.3,
                        minWidth: '80%',
                        borderColor: theme.border,
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderRadius: 16,
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                >
                    <RefreshCcw size={35} color={theme.textSecondary} />
                    <Text style={{
                        color: theme.textSecondary,
                        textAlign: "center",
                        fontSize: 13,
                        fontWeight: "bold"
                    }}>
                        Your Rotations shall appear here. tap to refresh
                    </Text>
                </TouchableOpacity>
            )}
        </ScrollView>
    );
}