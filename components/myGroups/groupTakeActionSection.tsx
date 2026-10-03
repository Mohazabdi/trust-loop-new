import { useGetGroupMemberPlanInvites } from "@/hooks/useGetGroupMemberPlanInvites";
import { useGetPayoutRequests } from "@/hooks/useGetPayoutRequests";
import { useHandlePayoutRequestResponse } from "@/hooks/useHandlePayoutRequest";
import { useHandleRotationInviteResponse } from "@/hooks/useHandleRotationInviteResponse";
import { useProcessPayout } from "@/hooks/useProcessPayout";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { GroupTakeActionSectionStyles } from "@/styles/group_style/group_take_action_section.styles";
import { formatDate } from "@/utils/custom_functions";
import { QueryClient, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import {
    CheckCircle,
    ChevronDown,
    ChevronRight,
    CircleFadingPlus,
    CircleX,
    Clock,
    ClockFading,
    Dot,
    User2,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
    Dimensions,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { toast } from "sonner-native";
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GroupTakeActionProps{
  group_member_id?:string
}
export default function GroupTakeActionSection(
  {group_member_id}:GroupTakeActionProps
) {
  const { theme } = useGlobalStorage();
  const {data:RotationInvites,refetch:rotationInviteRefetch}=useGetGroupMemberPlanInvites(group_member_id);
   const {data:PayoutRequests,refetch:requestPayoutRefetch}=useGetPayoutRequests(group_member_id);
  const hasNoActions =
  (!RotationInvites || RotationInvites.length === 0) &&
  (!PayoutRequests || PayoutRequests.length === 0);

  //console.log('Your Rotation Invites:',RotationInvites);
  const styles = useMemo(() => GroupTakeActionSectionStyles(theme), [theme]);
  // const [isExpaned,setIsExpanded]=useState(false);
   const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
   const[isLoadingInvite,setIsLoadingInvite]=useState(false);
   const[isLoadingPayout,setIsLoadingPayout]=useState(false);
      const [expandedReqIds, setExpandedReqIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
    const toggleReqExpanded = (id: string) => {
    setExpandedReqIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
   const mutation =useHandleRotationInviteResponse();
   const processPayoutMutation=useProcessPayout();
  const queryClient=useQueryClient();
  const payoutRequestsMutation=useHandlePayoutRequestResponse();
  const handleInviteResponse =async(response:'accepted'|'declined',plan_invite_id:string)=>{
    setIsLoadingInvite(true);
    try{
      await mutation.mutateAsync({
        plan_invite_id:plan_invite_id,
        responce_type:response
      })
      queryClient.invalidateQueries({
      queryKey: ["member_rotation_invites", group_member_id],
    });
     queryClient.invalidateQueries({
      queryKey: ["group_member_rotation_plans", group_member_id],
    });
      toast.success(`Invite ${response} successfully , you can view the invite at the my rotations section`);
      setIsLoadingInvite(false);
    }catch(e:any){
    toast.error(`Something Went Wrong ${e.message} `)
    }finally{
      setIsLoadingInvite(false);
    }
  }

   const handlePayoutResponse =async(response:'approved'|'rejected',payout_request_id:string,reviewer_id:string,recipientName:string,amount:string)=>{
    try{
      await payoutRequestsMutation.mutateAsync({
        payout_request_id:payout_request_id,
        responce_type:response,
        reviewer_id:reviewer_id
      })
      queryClient.invalidateQueries({
      queryKey: ["payout_requests", group_member_id],
    });
     queryClient.invalidateQueries({
      queryKey: ["group_member_rotation_plans", group_member_id],
    });
      toast.success(`Payout  ${response} successfully`);
    if(response==='approved'){
      try{
        setIsLoadingPayout(true);
         await processPayoutMutation.mutateAsync({
          payout_request_id:payout_request_id
         })
         toast.success(`Payout of${amount} transfered successfully to ${recipientName}, you can view the History at the my rotations section`);
        }
        catch(e:any){
          toast.error(`Something Went Wrong during processing payout ${e.message} `)
        }
        finally{
      setIsLoadingPayout(false);
        }
    }
    }catch(e:any){
    toast.error(`Something Went Wrong ${e.message} `)
    }
  }
  const handleRefresh=async()=>{
      const{data:refetchData,error:refetchError}= await requestPayoutRefetch();
      const{data:refetchInviteData,error:refetchInviteError}= await rotationInviteRefetch();
             {refetchInviteData&&refetchData&& toast.success(`Your Timeline is up to date`)}
             {refetchInviteError&&refetchError&& toast.error(`Something went wrong ,could not refetch your timeline`)}
         
  }


  if (hasNoActions) {
  return (
    <View style={{ gap: 14 }}>
      <TouchableOpacity
        onPress={ handleRefresh}
        style={{
          borderWidth: 2,
          borderColor: theme.border,
          borderStyle: 'dashed',
          justifyContent: 'center',
          alignItems: 'center',
          height: SCREEN_HEIGHT * 0.3,
          width: '100%',
          borderRadius: 18,
          padding: 10,
        }}
      >
        <ClockFading size={40} color={theme.textSecondary} />
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.textSecondary, textAlign: 'center' }}>
          No pending invites or payout requests
        </Text>
      </TouchableOpacity>
    </View>
  );
}
  return (
    <View
    style={{
      gap:14
    }}
    >
      {
        RotationInvites && RotationInvites.length>0 &&(
        <>
        <Text
        style={{
          color:theme.textSecondary,
          fontWeight:"bold",
          fontSize:16
        }}
        >You have {RotationInvites.length} pending plan invites</Text>
        {
          RotationInvites.map((item)=>{
             const formattedItemDate = new Date(item.expires_at).toLocaleString('en-US', {
                  dateStyle: 'medium'
                });
              const isExpanded = expandedIds.has(item.id);
            return(
            <View style={styles.userTimeLineContainer} 
      key={item.id}
      >
        <View style={styles.userTimeLine}>
          <View style={styles.timeLineHeader}>
            <View style={styles.timeLineHeadingContainer}>
              <Text style={styles.timeLineHeadingText}>Review Plan Invite</Text>
            </View>
            <View style={styles.timeLineQueueOptionContainer}>
              <TouchableOpacity style={styles.timeLineQueuePrioritize}
              onPress={
                ()=>{
                  toggleExpanded(item.id)
                }
              }
              >
                <ChevronDown size={23} 
                style={{
    transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
  }}
                />
              </TouchableOpacity>
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 5,
            }}
          >
            <Text style={styles.timelinePlanName}>{item.plan_name}</Text>
          </View>
           {
            isExpanded  &&(
          <View style={styles.timelinePlanDescriptionContainer}>
            {/* <Dot size={15} color={theme.textSecondary} /> */}
            <Text style={styles.timelinePlanDescription}>
              You have been invited to join {item.plan_name} rotation plan by {item.invited_by} ,kindly
              find time to review this invite before it expires on {formattedItemDate}.The plan asks for 
              members to contribute upto {item.amount_collectable} KES at an 
              interval named {item.interval_name} set to take {item.days_in_interval} days per cycle.
            </Text>
          </View>
            )
           }
          <View style={styles.timelineFooter}>
            <View style={styles.timelineFooterDateContents}>
              <Clock size={15} color={theme.text} />
              <Text style={styles.timelineFooterDueDateText}>{formatDate( item.created_at,'medium_date')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.timelineFooterActionContents,
                // { borderColor: theme.error },

              ]}
              onPress={()=>handleInviteResponse('declined',item.id)}
            >
              <Text style={styles.timelineFooterActionText}>Cancel</Text>
              <CircleX size={21} color={theme.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timelineFooterActionContents,
                // { borderColor: theme.success },
              ]}
              onPress={()=>handleInviteResponse('accepted',item.id)}
            >
              <Text style={styles.timelineFooterActionText}>Approve</Text>
              <CheckCircle size={21} color={theme.success} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
            )
      
                })
        }
        </>
        )
      }
      {
        PayoutRequests && PayoutRequests.length>0 &&(
        <>
        <Text
        style={{
          color:theme.textSecondary,
          fontWeight:"bold",
          fontSize:16
        }}
        >You have {PayoutRequests.length} pending Payout Request</Text>
           {
          PayoutRequests.map((item)=>{
            //  const formattedItemDate = new Date(item.expires_at).toLocaleString('en-US', {
            //       dateStyle: 'medium'
            //     });
              const isExpanded = expandedReqIds.has(item.id);
            return(
           <View
           key={item.id}
        style={[styles.userTimeLineContainer, { backgroundColor: "#212520" }]}
      >
        <View style={styles.userTimeLine}>
          <View style={styles.timeLineHeader}>
            <View style={styles.timeLineHeadingContainer}>
              <Text
                style={[styles.timeLineHeadingText, { color: theme.surface }]}
              >
                Approve Funds Disbursement {item.requested_amount}
              </Text>
            </View>
            <View style={styles.timeLineQueueOptionContainer}>
              <TouchableOpacity style={styles.timeLineQueuePrioritize} 
              onPress={()=>toggleReqExpanded(item.id)}
              >
          <ChevronDown size={23} color={theme.surface} 
                style={{
    transform: [{ rotate: isExpanded ? '180deg' : '0deg' }],
  }}
                />
                     </TouchableOpacity>
           
            </View>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 5,
            }}
          >
            <Text style={[styles.timelinePlanName, { color: theme.surface }]}>
              {item.plan_name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 5,
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <User2 size={14} color={theme.surface} />
              <Text style={[styles.timelinePlanName, { color: theme.surface }]}>
                {item.member_name}
              </Text>
            </View>
          </View>
          {
            isExpanded &&(
          <View style={styles.timelinePlanDescriptionContainer}>
            <Dot size={15} color={theme.textSecondary} />
            <Text style={[styles.timelinePlanDescription,{color:theme.surface}]}>
              Kindly Respond to the rotation payout request for {item.member_name} 
              for total collected amount {item.requested_amount} on rotation names {item.plan_name}
            </Text>
          </View>
            )
          }
          <View style={styles.timelineFooter}>
            <View style={styles.timelineFooterDateContents}>
              <Clock size={15} color={theme.surface} />
              <Text
                style={[
                  styles.timelineFooterDueDateText,
                  { color: theme.surface },
                ]}
              >
                {formatDate(item.created_at,'medium_date')}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.timelineFooterActionContents,
                { backgroundColor: theme.background },
              ]}
              onPress={()=>handlePayoutResponse(
                'rejected',
                 item.id,
                group_member_id??'',
                item.member_name,
                item.requested_amount
              )}
            >
              <Text style={styles.timelineFooterActionText}>Cancel</Text>
              <CircleX size={21} color={theme.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.timelineFooterActionContents,
                { backgroundColor: theme.background },
              ]}
              onPress={()=>handlePayoutResponse(
                'approved',
                 item.id,
                group_member_id??'',
                item.member_name,
                item.requested_amount
              )}
            >
              <Text style={styles.timelineFooterActionText}>Approve</Text>
              <CheckCircle size={21} color={theme.success} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
            )
      
                })
        }
        </>
        )
  
      }
     
      
    </View>
  );
}
