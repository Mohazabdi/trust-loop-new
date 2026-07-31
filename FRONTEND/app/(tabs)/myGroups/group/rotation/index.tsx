import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import CircularProgress from "@/components/myGroups/PieProgress";
import { useDeleteRotationInvite } from "@/hooks/useDeleteRotationInvite";
import { useGetRotationMemberId } from "@/hooks/useGetRotationMemberId";
import { useGetRotationPlan } from "@/hooks/useGetRotationPlan";
import { RotationPlanMembers, useGetRotationPlanMemberInvites } from "@/hooks/useGetRotationPlanMembers";
import { Rotationcycles, useGetRotationPlanSchedules } from "@/hooks/useGetRotationPlanSchedules";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";
import { SingleRotationPageStyles } from "@/styles/group_style/single_rotation_page.styles";
import { TruncatedText } from "@/utils/TruncateText";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
    Banknote,
    BellIcon,
    Calendar,
    Calendar1,
    Check,
    CheckCircle,
    ChevronDownCircle,
    ChevronLeft,
    ChevronUp,
    ChevronUpCircle,
    CircleGauge,
    Clock,
    Dot,
    EqualIcon,
    LogOut,
    PlusCircle,
    Settings2,
    TrashIcon,
    User,
    UserPlus,
    Users,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { toast } from "sonner-native";
import { useGetReserveContributions } from '@/hooks/useGetReserveContribution';
import { useGetMemberCycleProgress } from "@/hooks/useGetMemberCycleProgress";
import { useGetRotationProgress } from "@/hooks/useGetRotationProgress";
import CustomBottomSheet from "@/components/CustomBottomSheet";
import RotationPlanSettings from "@/components/myGroups/PlanSettings";
import BottomSheet from "@gorhom/bottom-sheet";
import ListOfMemberSelector from "@/components/myGroups/ListOfMemberSelector";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = 280;

type RotationStatus = "active" | "dormant" | "paused" | "complete";

export default function RotationPage() {
  const { theme, setIsNotificationOpen,
    // setIsRotationSettingsSheetOpen,
    setIsRotationInviteesSheetOpen
  } =
  useGlobalStorage();
    const bottomPlanSettingsSheetRef = useRef<BottomSheet>(null);
    const openBottomPlanSettingsSheet = () => bottomPlanSettingsSheetRef.current?.snapToIndex(0);
  const closeBottomPlanSettingsSheet = () => bottomPlanSettingsSheetRef.current?.close();
   const bottomPlanInviteSheetRef = useRef<BottomSheet>(null);
    const openInviteSheet = () => bottomPlanInviteSheetRef.current?.snapToIndex(0);
  const closeInviteSheet = () => bottomPlanInviteSheetRef.current?.close();
  
  const params = useLocalSearchParams<{
    plan_id:string;
    group_member_id:string;
  }>();
  const queryClient=useQueryClient();
  const{setRotationPlanId,setIsAdmin,setPlanIsActive,setGroupMemberId,setRotationMemberId,setRotationCycles}=useGroupStorage();
  
  
  const styles = useMemo(() => SingleRotationPageStyles(theme), [theme]);
  const [searchInput, setSearchInput] = useState("");
  const handleSearch = (text: string) => {
    setSearchInput(text);
  };
  const mutation=useDeleteRotationInvite();
  const {data:RotationPlan  ,refetch:refetchRotationPlan}=useGetRotationPlan(params.plan_id)
  const{data:memberRotationPlanId ,refetch:refetchRotationMember}=useGetRotationMemberId(
   params.group_member_id,
   RotationPlan?.rotation_plan_id
  );
  const {data:RotationPlanSchedules ,refetch:refetchPlanSchedules}=useGetRotationPlanSchedules(params.plan_id); 
  const {data:InvitedMember ,refetch:refetchInvitedMembers}=useGetRotationPlanMemberInvites(params.plan_id)
  const acceptedCount = InvitedMember?.filter(member => member.invitation_status === 'accepted').length;
  
  const {data:RotationPlanContributionRecords,refetch:refetchReserveContributions}=useGetReserveContributions(memberRotationPlanId);
   const [rotationStatus, setRotationStatus] =
    useState<RotationStatus>(RotationPlan?.rotation_status??'dormant');
   const { data: cycleProgress ,refetch:cycleProgressRefetch} = useGetMemberCycleProgress(memberRotationPlanId);
    const { data: rotationProgress,refetch:rotationProgressRefetch } = useGetRotationProgress(params.plan_id);
const overallPercentage = rotationProgress?.progress_percentage ?? 0;
   const {
  net_balance = 0,
  amount_collectable = 1,
  total_cycles = 0,
  current_cycle = 0,
  progress_percentage = 0,
  cycles = [],
} = cycleProgress ?? {};
   useEffect(() => {
    setPlanIsActive(rotationStatus === 'active');
  }, [rotationStatus]);

  useEffect(() => {
    const created_by = RotationPlan?.created_by;
    const user_is_creator = params.group_member_id === created_by;
    setIsAdmin(user_is_creator);
    setGroupMemberId(params.group_member_id);
    console.log("Setting the member Id",params.group_member_id)
  }, [RotationPlan?.created_by, params.group_member_id]);

  useEffect(() => {
    if (RotationPlan?.rotation_status) {
      setRotationStatus(RotationPlan.rotation_status);
    }
  }, [RotationPlan?.rotation_status]);


  

const totalContributed = RotationPlanContributionRecords?.reduce((sum, record) => sum + (record.trans_amount || 0), 0);
    // setPlanIsActive(rotationStatus==='active'?true:false)
  const rightAction = useCallback(() => {
    console.log("RightAction");
    setIsNotificationOpen(true);
  }, [setIsNotificationOpen]);
  const router = useRouter();
  const leftAction = () => {
    router.back();
  };
  const [refreshing, setRefreshing] = useState(false);
const onRefresh = useCallback(async () => {
  setRefreshing(true);

  try {
    await Promise.all([
      refetchRotationPlan(),
      cycleProgressRefetch(),
      refetchRotationMember(),
      refetchPlanSchedules(),
      refetchInvitedMembers(),
      rotationProgressRefetch(),
      refetchReserveContributions(),
    ]);
  } finally {
    setRefreshing(false);
  }
}, [refetchRotationPlan, refetchRotationMember, refetchPlanSchedules,refetchInvitedMembers,refetchReserveContributions]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
 const formattedItemDate = new Date(RotationPlan?.start_date??'').toLocaleString('en-US', {
                  dateStyle: 'medium'
                });

  const handleInviteDelete=async( rotation_invite_id:string,rotation_plan_id:string)=>{
    try{
     await mutation.mutateAsync(
      {rotation_plan_invite_id:rotation_invite_id}
      
     )
     queryClient.invalidateQueries({
        queryKey: ["group_member_rotation_invites", rotation_plan_id],
      });
     toast.success("Member Was Successfully deleted from plan");

    }catch(e:any){
      toast.error(`Invite could not be deleted ${e.message}`)
    }
  }
  const created_by=RotationPlan?.created_by;
  const user_is_creator=params.group_member_id===created_by;
  // setIsAdmin(user_is_creator)
  const renderRotationPending = useCallback(
    ({ item }: { item: RotationPlanMembers }) => {
      const is_creator=item.group_member_id===created_by;
      const is_you=params.group_member_id===item.group_member_id;
      //console.log("Member_id",item.group_member_id);
      return (
        <View style={[styles.pendingMemberContainer,{borderColor:is_you?theme.primary:theme.border}]}>
          <View style={styles.pendingMemberInfo}>
            <User size={17} color={theme.text} />
            <Text style={styles.memberName}>
              {`${item.member_first_name} ${item.member_last_name} ${is_you ?`(you)`:``}`}

            </Text>
          </View>

          <View style={styles.pendingInviteStatus}>
            {item.invitation_status === "pending" ? (
              <Clock size={16} color={theme.warning} />
            ) : (
              <Check size={16} color={theme.success} />
            )}
            <Text style={styles.inviteStatusText}>{item.invitation_status}</Text>
          </View>
          {
            is_creator &&(
              <Text 
              style={{
                borderWidth:1,
                padding:4,
                borderColor:theme.border,
                borderRadius:12,
                fontSize:9,
                color:theme.textSecondary

              }}
              >
                creator
              </Text>
            )
          }
          {
          user_is_creator &&
          !is_creator &&
          (
          <TouchableOpacity 
          style={{
            padding:5,
            borderRadius:7,
            borderWidth:1,
            borderColor:theme.border
          }}
            onPress={()=>handleInviteDelete(item.id,item.rotation_plan_id)}
          >
            <TrashIcon size={16} color={theme.error} />
          </TouchableOpacity>
          )
          }
        </View>
      );
    },
    [theme],
  );
  const renderItemSeparator = useCallback(
    () => <View style={{ height: 10 }} />,
    [],
  );
  const renderRotationcycleSchedules = useCallback(
    ({ item }: { item: Rotationcycles }) => {
      const isExpanded = !expandedIds.has(item.id);
      return (
        <View style={styles.cycleContainer}>
          <TouchableOpacity style={styles.cycleHeader} onPress={() => toggleExpanded(item.id)}>
            <EqualIcon size={23} color={theme.textSecondary} />
            <Text style={styles.cycleTitle}>{item.cycleName}</Text>
            <View style={styles.cycleDatecontainer}>
              <Calendar size={12} color={theme.text} />
              <Text style={styles.cycleDate}>{item.date_scheduled}</Text>
            </View>
            <View style={styles.cycleStatuscontainer}>
              {item.cycle_status==='upcoming'?
              
              <Clock size={12} color={theme.text} />:
              <CheckCircle size={17} color={theme.success}/>
            }
              <Text style={styles.cycleStatus}>{item.cycle_status}</Text>
            </View>
            <View 
            style={{
              padding:5,
              justifyContent:"center",
              alignItems:"center",
              borderRadius:10,
              backgroundColor:theme.surface

            }}
            >
              {isExpanded ? (
                <ChevronUp size={24} color={theme.text} />
              ) : (
                <ChevronUp size={24} color={theme.text} />
              )}
            </View>
          </TouchableOpacity>
          {isExpanded && (
            <View style={styles.cycleEventsList}>
              {item.members.map((member) => {
                 const is_you=params.group_member_id===member.member_id;
                return(
                <View style={[styles.cycleEventContainer,{backgroundColor:member.status!=='upcoming'?theme.background:theme.surface}]} key={member.id}>
                  <View style={styles.eventMember}>
                    <View style={[styles.eventMemberAvator,{borderColor: is_you?theme.primary:theme.border,backgroundColor:is_you?theme.primary:``}]}>
                      <User size={17} color={is_you?theme.surface:theme.text} />
                    </View>
                    <Text style={styles.memberName}>{member.names} {is_you?`(you)`:``}</Text>
                  </View>
                  <View style={styles.eventAction}>
                    <Text
                      style={[
                        styles.actionAmount,
                        {
                          color:
                            member.amountType === "debit"
                              ? theme.warning
                              : theme.success,
                        },
                      ]}
                    >
                      {member.amountType === "debit" ? "- " : "+ "}
                      KES {member.amount}
                    </Text>
                  </View>
                  <View style={styles.eventActionStatus}>
                    <Clock size={10} color={theme.text} />
                    <Text style={styles.actionStatus}>{member.status}</Text>
                  </View>
                </View>
                )
    })}
            </View>
          )}
        </View>
      );
    },
    [expandedIds, toggleExpanded],
  );
  
  const data: (RotationPlanMembers | Rotationcycles)[] =
    rotationStatus === "dormant" ? InvitedMember??[] : RotationPlanSchedules??[];
    
  const renderItem = useCallback(
    ({ item }: { item: RotationPlanMembers | Rotationcycles }) => {
      if (rotationStatus === "dormant") {
        return renderRotationPending({ item: item as RotationPlanMembers });
      }
      return renderRotationcycleSchedules({
        item: item as Rotationcycles,
      });
    },
    [rotationStatus, renderRotationPending, renderRotationcycleSchedules],
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top"]}
    >
      <CustomGroupHeader
        groupName={RotationPlan?.rotation_name}
        leftAction={{ icon: ChevronLeft, action: leftAction }}
        rightAction={{
          icon: BellIcon,
          action: rightAction,
        }}
      />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={theme.primary}
    />
  }
        initialNumToRender={10}
        ListHeaderComponent={
          <View style={{ backgroundColor: theme.background }}>
            <View style={styles.groupContentContainer}>
              <View>
                <View style={styles.myPlansContainer}>
                  <View style={styles.containerHeader}>
                    <View style={styles.planStatusContainer}>
                      <Dot size={30} color={theme.success} />
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "bold",
                        }}
                      >
                        {rotationStatus}
                      </Text>
                    </View>
                    <View style={styles.planTypeContainer}>
                      <CircleGauge size={15} color={theme.text} />
                      <Text style={styles.planTypeText}>
                        {rotationStatus === "dormant"
                          ? `N/A`
                          : `${RotationPlanSchedules?.length} cycles`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.containerBody}>
                    <View style={styles.planDetailsContainer}>
                      <View style={styles.planProgressContainerLeft}>
                        <CircularProgress
                          percentage={rotationStatus === "dormant" ? 0: overallPercentage}
                          size={130}
                          strokeWidth={15}
                          color={theme.success}
                          backgroundColor={theme.surface}
                        />
                      </View>
                      <View style={styles.planProgressContainerRight}>
                        <View style={styles.planDateContainer}>
                          <Calendar1 color={theme.text} size={14} />
                          <Text style={styles.planStartDate}>{`Starts on ${formattedItemDate}`}</Text>
                        </View>
                        <View style={styles.planMembersContainer}>
                          <Users color={theme.text} size={14} />
                          <Text style={styles.planMemberCount}>
                            {rotationStatus === "dormant"
                              ? `${acceptedCount} member accepted`
                              : `${acceptedCount} active members`}
                          </Text>
                        </View>
                        <View style={styles.planDateContainer}>
                          <Banknote color={theme.text} size={14} />
                          <Text style={styles.planStartDate}>{`Contribution ${RotationPlan?.amount_collectable??0} ${RotationPlan?.currency_code} /=`}</Text>
                        </View>
                        <TruncatedText
                          text={RotationPlan?.rotation_description??''}
                          maxLines={2}
                          style={styles.planDescriptionText}
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.containerFooter}>
                    <Text style={styles.nextEventText}>
                      {rotationStatus!=='active'?`Not yet Active`:`Next Event in 20 days`}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.bodySection}>
                <View style={styles.scheduleContainer}>
                 
     <View style={styles.rotationActionsGroup}>
  {rotationStatus === "dormant" ? (
    // 1. DORMANT STATE CONDITIONS
    user_is_creator ? (
      /* If Dormant AND Creator: Add Members */
      <TouchableOpacity
        style={[styles.rotationAction, { backgroundColor: "#17690c" }]}
        onPress={() => {
          setIsRotationInviteesSheetOpen(true)
          //openInviteSheet();
          setRotationPlanId(RotationPlan?.rotation_plan_id ?? '');
          setRotationMemberId(memberRotationPlanId??'');
        }}
      >
        <Text style={styles.buttonLabel}> Add More Members</Text>
        <UserPlus size={25} color={theme.surface} />
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        style={[styles.rotationAction, { backgroundColor: "#ba1a1a" }]} 
        onPress={() => {
        }}
      >
        <Text style={styles.buttonLabel}> Opt Out of Rotation</Text>
        <LogOut size={20} color={theme.surface} />
      </TouchableOpacity>
    )
  ) : rotationStatus === "active" ? (
    // 2. ACTIVE STATE CONDITIONS (Shows for everyone)
    <TouchableOpacity
      style={[styles.rotationAction, { backgroundColor: "#17690c" }]}
      onPress={() => {
        setRotationPlanId(RotationPlan?.rotation_plan_id??'')
        setRotationMemberId(memberRotationPlanId??'')
        router.push(`/(tabs)/myGroups/group/depositFunds`)}
      }
    >
      <Text style={styles.buttonLabel}> Contribute for cycle {current_cycle}/{total_cycles}</Text>
      <PlusCircle size={20} color={theme.surface} />
    </TouchableOpacity>
  ) : null }

  <TouchableOpacity
    style={{
      padding: 13,
      borderWidth: 1,
      width: 70,
      borderColor: theme.border,
      borderRadius: 20,
      justifyContent: "center",
      alignItems: "center",
    }}
    onPress={() => {
      //setIsRotationSettingsSheetOpen(true);
      openBottomPlanSettingsSheet()
      setRotationMemberId(memberRotationPlanId??'');
      setRotationCycles(RotationPlanSchedules?.length??0);
      setRotationPlanId(RotationPlan?.rotation_plan_id ?? '');
    }}
  >
    <Settings2 color={theme.text} size={20} />
  </TouchableOpacity>
</View>



                  {rotationStatus !== "dormant" && (
                    
                    <>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${progress_percentage}%` }
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
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.textSecondary,
                            fontWeight: "bold",
                          }}
                        >
                          my Contribution:{net_balance}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "bold",
                            color: theme.textSecondary,
                          }}
                        >
                          Balance:{amount_collectable * total_cycles - net_balance}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: theme.textSecondary,
                            fontWeight: "bold",
                          }}
                        >
                          {progress_percentage}%  complete
                        </Text>
                      </View>
                    </>
                  )}
                  <View
                    style={{
                      paddingTop: 10,
                    }}
                  >
                    <Text style={styles.scheduleTitle}>
                      {rotationStatus === "dormant"
                        ? `Rotation one Invites`
                        : `Rotation one schedule`}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        }
        maxToRenderPerBatch={10}
        ItemSeparatorComponent={renderItemSeparator}
        windowSize={5}
        contentContainerStyle={[
          styles.groupContentContainer,
          { minHeight: undefined, flex: undefined, paddingBottom: 20 },
        ]}
        style={{ flex: 1 }}
        ListEmptyComponent={
          <View>
            <Text>There are no rotations to show at the moment</Text>
          </View>
        }
      />

      <CustomBottomSheet
        ref={bottomPlanSettingsSheetRef}
        title="Plan Settings"
        snapPoints={["70%"]}
      >
        <RotationPlanSettings
        closeBottomSheet={() =>{
                      closeBottomPlanSettingsSheet()
                      }
                      }
        />
      </CustomBottomSheet>
      {/* <CustomBottomSheet
        ref={bottomPlanInviteSheetRef}
        title="List Of Members"
        snapPoints={["70%"]}
      >
  
      </CustomBottomSheet> */}
    </SafeAreaView>
  );
}
