import { useGlobalStorage } from "@/store/useGlobalStorage";
import { RotationPlanSettingsStyles } from "@/styles/group_style/rotation_plan_settings.styles";
//import { BottomSheetScrollView, SCREEN_HEIGHT } from "@gorhom/bottom-sheet";
import { ArrowDownCircle, ArrowRight, ArrowUpRight, ChartBarIncreasing, Check, Clock, Cylinder, Infinity, Info, PauseCircle, Pencil, PlayCircle, Share, Share2, Smartphone, Trash2, User, Users, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomSheetFlatList, BottomSheetScrollView, BottomSheetTextInput, SCREEN_WIDTH } from "@gorhom/bottom-sheet";
import { useGroupStorage } from "@/store/useGroupStorage";
import { toast } from "sonner-native";
import { useGetRotationPlan } from "@/hooks/useGetRotationPlan";

import { SingleRotationPageStyles } from "@/styles/group_style/single_rotation_page.styles";
import { RotationPlanMembers, useGetRotationPlanMemberInvites } from "@/hooks/useGetRotationPlanMembers";
import { useGetReserveContributions } from "@/hooks/useGetReserveContribution";
import { useGenerateRotationSchedule } from "@/hooks/useGenerateRotationSchedules";
import { useQueryClient } from "@tanstack/react-query";
import { useDeletePlan } from "@/hooks/useDeletePlan";
import { router } from "expo-router";
import { useUpdateRotationPlan } from '../../hooks/useUpdateRotationPlan';
import { generatePlanReportHTML, generateMemberReportHTML } from '../../utils/generateRotationReport';
import { useGetMemberRotationReport } from "@/hooks/useGetMemberRotationReport";
import { useGetRotationPlanReport } from '../../hooks/useGetRotationPlanReport';
import { downloadReport } from "@/utils/downloadReport";
interface ProgressCheckCircleProps {
  cycleNumber: number;
  isComplete: boolean;
  isReserved: boolean;
}

const rotationInfoTab = () => {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => RotationPlanSettingsStyles(theme), [theme]);
 const { isAdmin ,rotationPlanId} = useGroupStorage();
 const mutation=useUpdateRotationPlan();
 const {data:RotationPlan}=useGetRotationPlan(rotationPlanId)
  // State for form fields
  const [rotationName, setRotationName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [interval, setInterval] = useState<'daily' | 'monthly'>('monthly');
  const [showIntervalPicker, setShowIntervalPicker] = useState(false);
  const [amountCollectable, setAmountCollectable] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('0');
  const [gracePeriod, setGracePeriod] = useState('0');
  const [disbursementType, setDisbursementType] = useState<'auto' | 'approval'>('auto');
  const [lowFundsOption, setLowFundsOption] = useState<'distribute' | 'hold' | 'approval'>('distribute');
  const queryClient=useQueryClient();
  const [isUpdating,setIsUpdating]=useState(false)
  useEffect(() => {
    if (RotationPlan) {
      setRotationName(RotationPlan.rotation_name ?? '');
      setDescription(RotationPlan.rotation_description ?? '');
      setStartDate(RotationPlan.start_date ? new Date(RotationPlan.start_date) : new Date());
      setAmountCollectable(String(RotationPlan.amount_collectable ?? ''));
      // setPenaltyAmount(String(RotationPlan.penalty_amount ?? '0'));
      // setGracePeriod(String(RotationPlan.grace_period ?? '0'));
      // setDisbursementType(RotationPlan.disbursement_type ?? 'auto');
      // setLowFundsOption(RotationPlan.low_funds_options ?? 'distribute');
       }
  }, [RotationPlan]);
const handleUpdatePlan=async()=>{
  setIsUpdating(true);
 try{
   const result=await mutation.mutateAsync({
    plan_id:rotationPlanId,
    amount_collectable:parseFloat(amountCollectable),
    rotation_description:description??null,
    rotation_name:rotationName,
    start_date:startDate
   })
   if (!result.success) {
      toast.error(result.message || "Failed to update plan.");
      return;
    }
   toast.success(result.message || "Plan Updated Successfully");
    queryClient.invalidateQueries({
        queryKey: ["rotation_plan", rotationPlanId],
      });
 }catch(e:any){
  toast.error(`Error: ${e.message || "Something went wrong"}`);
   setIsUpdating(false);
 }finally{
setIsUpdating(false);
 }
}
  const effectiveLowFundsOption = disbursementType === 'approval' ? 'approval' : lowFundsOption;

  return (
    <View style={styles.infoTabContainer}>
      {/* Rotation Name */}
      <Text style={styles.infoLabel}>Rotation Name</Text>
      <BottomSheetTextInput
        editable={isAdmin}
        value={rotationName}
        onChangeText={setRotationName}
        style={styles.infoInput}
        placeholder="Enter rotation name"
        placeholderTextColor={theme.textSecondary}
      />

      {/* Description */}
      <Text style={styles.infoLabel}>Description</Text>
      <BottomSheetTextInput
      editable={isAdmin}
        value={description}
        onChangeText={setDescription}
        style={[styles.infoInput, { height: 80 }]}
        multiline
        placeholder="Enter description"
        placeholderTextColor={theme.textSecondary}
      />

      {/* Start Date */}
      <Text style={styles.infoLabel}>Start Date</Text>
      <TouchableOpacity
        style={styles.infoInput}
        onPress={() => setShowDatePicker(true)}
      >
        <Text>{startDate.toLocaleDateString()}</Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          disabled={isAdmin}
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}

      {/* Interval */}
      <Text style={styles.infoLabel}>Interval</Text>
      <TouchableOpacity
        style={styles.infoInput}
        onPress={() => setShowIntervalPicker(true)}
      >
        <Text>{interval}</Text>
      </TouchableOpacity>
      {/* You can replace with a modal or dropdown */}
      {showIntervalPicker && isAdmin &&(
        <View style={styles.intervalPickerContainer}>
          {(['daily', 'monthly'] as const).map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.intervalOption, interval === option && styles.intervalOptionSelected]}
              onPress={() => {
                setInterval(option);
                setShowIntervalPicker(false);
              }}
            >
              <Text style={{ color: interval === option ? theme.surface : theme.text }}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Amount Collectable */}
      <Text style={styles.infoLabel}>Amount Collectable (KES)</Text>
      <BottomSheetTextInput
        value={amountCollectable}
        editable={isAdmin}
        onChangeText={setAmountCollectable}
        style={styles.infoInput}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
      />

      {/* Penalty Amount */}
      <Text style={styles.infoLabel}>Penalty Amount (KES)</Text>
      <BottomSheetTextInput
        value={penaltyAmount}
        editable={isAdmin}
        onChangeText={setPenaltyAmount}
        style={styles.infoInput}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
      />

      {/* Grace Period */}
      <Text style={styles.infoLabel}>Grace Period (days)</Text>
      <BottomSheetTextInput
      editable={isAdmin}
        value={gracePeriod}
        onChangeText={setGracePeriod}
        style={styles.infoInput}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={theme.textSecondary}
      />

      {/* Disbursement Type   */}
      <Text style={styles.infoLabel}>Disbursement Type</Text>
      <View style={styles.radioGroup}>
        {(['auto', 'approval'] as const).map((type) => (
          <TouchableOpacity
            disabled={isAdmin}
            key={type}
            style={styles.radioButton}
            onPress={() => isAdmin?setDisbursementType(type):toast.info("Only editable by admin")}
          >
            <View style={[styles.radioOuter, disbursementType === type && styles.radioOuterSelected]}>
              {disbursementType === type && <View style={styles.radioInner} />}
            </View>
            <Text style={styles.radioLabel}>{type === 'auto' ? 'Auto' : 'Approval'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Low Funds Option */}
      <Text style={styles.infoLabel}>Low Funds Option</Text>
      <View style={styles.radioGroup}>
        {(['distribute', 'hold', 'approval'] as const).map((option) => {
          const disabled = disbursementType === 'approval' && option !== 'approval';
          return (
            <TouchableOpacity
              key={option}
              
              style={[styles.radioButton, disabled && { opacity: 0.5 }]}
              onPress={() => {
                if (!disabled && isAdmin) {
                  setLowFundsOption(option);
                }else{
                  toast.info("Only editable by admin")
                }
              }}
              disabled={disabled}
            >
              <View style={[styles.radioOuter, effectiveLowFundsOption === option && styles.radioOuterSelected]}>
                {effectiveLowFundsOption === option && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save / Update button */}
      {isAdmin &&
      
      <TouchableOpacity style={styles.saveButton}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
      }
    </View>
  );
};


const ProgressCheckCircle = ({
  cycleNumber,
  isComplete,
  isReserved,
}: ProgressCheckCircleProps) => {
  const { theme } = useGlobalStorage();

  // Determine styles dynamically based on current status state
  const containerStyle = useMemo(() => {
    if (isComplete) {
      return {
        backgroundColor: theme.primary,
        borderColor: theme.primary,
      };
    }
    if (isReserved) {
      return {
        backgroundColor: `${theme.primary}15`, // Translucent theme color for the current/reserved cycle
        borderColor: theme.primary,
      };
    }
    return {
      backgroundColor: theme.surface,
      borderColor: theme.border,
    };
  }, [isComplete, isReserved, theme]);

  return (
    <View
      style={[
        {
          height: 42,
          width: 42,
          borderRadius: 21,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          // Subtle soft shadow to give standard depth
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        },
        containerStyle,
      ]}
    >
      {isComplete ? (
        <Check size={18} color="#ffffff" strokeWidth={3} />
      ) : (
        <Text
          style={{
            color: isReserved ? theme.primary : theme.textSecondary,
            fontSize: 14,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {cycleNumber}
        </Text>
      )}
    </View>
  );
};

export const MyProgressTab = () => {
  const { theme } = useGlobalStorage();
  const styles = useMemo(() => RotationPlanSettingsStyles(theme), [theme]);
  const [contributionMedium, setContributionMedium] = useState<'mpesa' | 'trustloop'>('trustloop');
  const { rotationMemberId,rotationPlanId,rotationCycles} = useGroupStorage();
    const {data:RotationPlanContributionRecords}=useGetReserveContributions(rotationMemberId);
  const {data:RotationPlan}=useGetRotationPlan(rotationPlanId);

const totalContributed = RotationPlanContributionRecords?.reduce((sum, record) => sum + (record.trans_amount || 0), 0);
  const cycles = Array.from({ length: rotationCycles }, (_, i) => ({
    cycleNumber: i + 1,
    isComplete: i < 2,
    isReserved: i === 2,
  }));

  return (
    <View style={{ gap: 24, paddingHorizontal: 4 }}>
      {/* 1. PROGRESS TRACKER SECTION */}
      <View style={{ gap: 12 }}>
        <Text style={[styles.headingText, { fontSize: 16, fontWeight: '700', color: theme.text }]}>
          My Contribution Progress
        </Text>
        <View 
          style={{ 
            flexDirection: 'row', 
            flexWrap: 'wrap', 
            gap: 12, 
            padding: 16, 
            backgroundColor: theme.surface, 
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.border 
          }}
        >
          {cycles.map((cycle) => (
            <ProgressCheckCircle
              key={cycle.cycleNumber}
              cycleNumber={cycle.cycleNumber}
              isComplete={cycle.isComplete}
              isReserved={cycle.isReserved}
            />
          ))}
        </View>
      </View>

      {/* 2. CONTRIBUTION MEDIUM SELECTOR */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontWeight: '700', fontSize: 14, color: theme.text }}>
          Primary Contribution Medium
        </Text>
        <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
          {/* Mpesa Option Card */}
          <TouchableOpacity
            style={{
              flex: 1,
              gap: 8,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
              borderRadius: 16,
              borderWidth: 2,
              backgroundColor: contributionMedium === 'mpesa' ? `${theme.primary}08` : theme.surface,
              borderColor: contributionMedium === 'mpesa' ? theme.primary : theme.border,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: contributionMedium === 'mpesa' ? 4 : 0 },
              shadowOpacity: contributionMedium === 'mpesa' ? 0.12 : 0,
              shadowRadius: 6,
              elevation: contributionMedium === 'mpesa' ? 3 : 0,
            }}
            onPress={() => setContributionMedium('mpesa')}
            activeOpacity={0.8}
          >
            <Smartphone size={22} color={contributionMedium === 'mpesa' ? theme.primary : theme.textSecondary} />
            <Text style={{ fontWeight: '700', color: contributionMedium === 'mpesa' ? theme.primary : theme.text, fontSize: 14 }}>
              M-Pesa Deposit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              gap: 8,
              elevation: 0,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 16,
              borderRadius: 16,
              borderWidth: 2,
              backgroundColor: contributionMedium === 'trustloop' ? `${theme.primary}08` : theme.surface,
              borderColor: contributionMedium === 'trustloop' ? theme.primary : theme.border,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: contributionMedium === 'trustloop' ? 4 : 0 },
              shadowOpacity: contributionMedium === 'trustloop' ? 0.12 : 0,
              shadowRadius: 6,
              //elevation: 0,
            }}
            onPress={() => setContributionMedium('trustloop')}
            activeOpacity={0.8}
          >
            <Infinity size={22} color={contributionMedium === 'trustloop' ? theme.primary : theme.textSecondary} />
            <Text style={{ fontWeight: '700', color: contributionMedium === 'trustloop' ? theme.primary : theme.text, fontSize: 14 }}>
              Trustloop
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. PLAN FINANCES COMPONENT GRID */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
          Plan Finances
        </Text>
        
        {/* Core breakdown table card */}
        <View style={{ backgroundColor: theme.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>Total Contributions Made</Text>
            <Text style={{ color: '#17690c', fontSize: 14, fontWeight: '700' }}>{RotationPlan?.currency_code} {totalContributed}</Text>
          </View>
          
          <View style={{ height: 1, backgroundColor: theme.border }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>Total Amount Reserved</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{RotationPlan?.currency_code} {totalContributed}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: theme.border }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '500' }}>Total Amount Expected</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{RotationPlan?.currency_code} {(RotationPlan?.amount_collectable??0)*rotationCycles} </Text>
          </View>
        </View>

        {/* Highlighted Callout Card for Withdrawable Balance */}
        <View 
          style={{ 
             
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: `${theme.primary}08`, 
            borderRadius: 16, 
            gap:10,
            borderWidth: 1, 
            borderColor: `${theme.primary}30`, 
            padding: 16 
          }}
        >
          <View style={{ gap: 4 , alignItems:"center"}}>
            <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: '600' }}>
              WITHDRAWABLE BALANCE
            </Text>
            <Text style={{ color: theme.text, fontSize: 20, fontWeight: '800' }}>
              {RotationPlan?.currency_code} {(totalContributed??0)-(RotationPlan?.amount_collectable??0)>0?(totalContributed??0)-(RotationPlan?.amount_collectable??0):0} 
            </Text>
          </View>
           {
            (totalContributed??0)-(RotationPlan?.amount_collectable??0)>0&&(
          <TouchableOpacity 
            style={{ 
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              minWidth:"70%",
              backgroundColor: theme.primary, 
              paddingVertical: 15, 
              paddingHorizontal: 16, 
              borderRadius: 24,
              shadowColor: theme.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 2,
              justifyContent:"center"
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 ,textAlign:"center"}}>Transfer</Text>
            <ArrowUpRight size={16} color="#ffffff" />
          </TouchableOpacity>
            )
           }
        </View>
      </View>
    </View>
  );
};

const rotationActionsTab=()=>{
       const { theme,setIsRotationSettingsSheetOpen } = useGlobalStorage();
       const { isAdmin ,rotationPlanId,planIsActive,rotationMemberId} = useGroupStorage();
       const[isDeletePlanLoading,setIsDeletePlanLoading]=useState(false);
       const[isStartPlanLoading,setIsStartPlanLoading]=useState(false);
       const queryClient=useQueryClient()
        const mutationGenerateSchedule = useGenerateRotationSchedule();
const { data: memberReport } = useGetMemberRotationReport(rotationMemberId);
const { data: planReport } = useGetRotationPlanReport(rotationPlanId);
// console.log('MemberRotation Id',rotationMemberId);

// console.log('MemberReport',memberReport);
const handleDownloadMemberReport = () => {
  if (!memberReport) {
    toast.error("Report data not yet loaded");
    return;
  }
  const html = generateMemberReportHTML(memberReport);
  downloadReport(html, "Member Rotation Report");
};

const handleDownloadPlanReport = () => {
  if (!planReport) {
    toast.error("Plan report data not yet loaded");
    return;
  }
  const html = generatePlanReportHTML(planReport);
  downloadReport(html, "Rotation Plan Report");
};


        const mutationPlanDelete = useDeletePlan();
const handleActivatePlan = async () => {
  setIsStartPlanLoading(true);
    try {
      await mutationGenerateSchedule.mutateAsync({
        rotation_plan_id:rotationPlanId
      })
      toast.success("Rotation has been activated successfully!");
        queryClient.invalidateQueries({
        queryKey: ["rotation_plan", rotationPlanId],
      });
       queryClient.invalidateQueries({
        queryKey: ["rotation_plan_schedules", rotationPlanId],
      });
      
    } catch (error: any) {
      //console.error("Transaction failed:", error.message);
      setIsStartPlanLoading(false);
      toast.error(error.message || "Activation failed.");
    }finally{
      setIsStartPlanLoading(false);
    }
  };

const handleDeletePlan = async () => {
  setIsDeletePlanLoading(true);
  try {
      await mutationPlanDelete.mutateAsync({
        plan_id:rotationPlanId
      })
      toast.success("Rotation has been Deleted successfully!");
        queryClient.invalidateQueries({
        queryKey: ["rotation_plan", rotationPlanId],
      });
       queryClient.invalidateQueries({
        queryKey: ["rotation_plan_schedules", rotationPlanId],
      });
      router.push('/(tabs)/myGroups/group/MyRotations');
      
    } catch (error: any) {
      //console.error("Transaction failed:", error.message);
      toast.error(error.message || "Activation failed.");
      setIsDeletePlanLoading(false);
    }finally{
      setIsDeletePlanLoading(false);
    }
  };
  const styles = useMemo(() => RotationPlanSettingsStyles(theme), [theme]);
    return(
        
       <View 
            style={styles.rotationActionsContainer}
            >
                <Text 
                style={styles.rotationActionsHeading}
                >Rotation Actions</Text>
                <View 
                style={styles.rotationActionsModifiers}
                >
                   <TouchableOpacity style={[styles.actionModifierButton,{flex:1}]}>
                    <Text style={styles.actionModifierButtonText}>Opt Out</Text>
                    <ArrowRight color={theme.surface} size={20}/>
                </TouchableOpacity>
                      {
                        isAdmin &&(
                          <>
                          {planIsActive?
                          <>
                <TouchableOpacity style={styles.actionModifierButton}>
                    <Text style={styles.actionModifierButtonText}>Pause</Text>
                    <PauseCircle color={theme.surface} size={21}/>
                </TouchableOpacity>
                          </>:
                          <>
                       <TouchableOpacity style={[styles.actionModifierButton,{backgroundColor:theme.primary}]}
                       onPress={handleActivatePlan}
                       disabled={isStartPlanLoading}
                       >

                         <Text style={[styles.actionModifierButtonText]}>Start</Text>
                        {
                          isStartPlanLoading ?
                          <ActivityIndicator color={theme.surface}/>
                          :
                      <PlayCircle color={theme.surface} size={21}/>
                        }
                      </TouchableOpacity>
                          </>
                            
                          }
                      
                 <TouchableOpacity style={[styles.actionModifierButton,{backgroundColor:theme.error}]}
                 onPress={handleDeletePlan}
                 disabled={isDeletePlanLoading}
                 >
                    <Text style={styles.actionModifierButtonText}>Delete</Text>
                    {isDeletePlanLoading ?

                    <ActivityIndicator color={theme.error}/>
                    :
                    <Trash2 color={theme.surface} size={20}/>
                  }
                </TouchableOpacity>
                          </>
                        )
                      }
                  
                </View>
                
                 <TouchableOpacity style={styles.actionReportButton}
                  onPress={handleDownloadMemberReport} 
                 >
                    <Text style={styles.actionModifierButtonText}>Personal Financial Report</Text>
                    <ArrowDownCircle color={theme.surface} size={20}/>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionReportButton} 
               onPress={handleDownloadPlanReport} 
                >
                    <Text style={styles.actionModifierButtonText}>Download Plan Report</Text>
                    <ArrowDownCircle color={theme.surface} size={20}/>
                </TouchableOpacity>

            </View>
    )
}
const listOfMembersTab = () => {
  const { theme, setIsRotationSettingsSheetOpen } = useGlobalStorage();
  const { isAdmin, rotationPlanId, groupMemberId } = useGroupStorage();
  const { data: RotationPlan } = useGetRotationPlan(rotationPlanId);
  const { data: InvitedMember } = useGetRotationPlanMemberInvites(rotationPlanId);
  const created_by = RotationPlan?.created_by;
  const styles = useMemo(() => SingleRotationPageStyles(theme), [theme]);

  return (
    <BottomSheetScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 10 }}
    >
      {InvitedMember?.map((item) => {
        const is_creator = item.group_member_id === created_by;
        const is_you = groupMemberId === item.group_member_id;

        return (
          <View
            key={item.id}
            style={[
              styles.pendingMemberContainer,
              { borderColor: is_you ? theme.primary : theme.border },
              { marginBottom: 10 }, // replaces ItemSeparator
            ]}
          >
            <View style={styles.pendingMemberInfo}>
              <User size={17} color={theme.text} />
              <Text style={[styles.memberName, { color: theme.text }]}>
                {`${item.member_first_name} ${item.member_last_name} ${
                  is_you ? `(you)` : ``
                }`}
              </Text>
            </View>

            {is_creator && (
              <Text
                style={{
                  borderWidth: 1,
                  padding: 4,
                  borderColor: theme.border,
                  borderRadius: 12,
                  fontSize: 9,
                  color: theme.textSecondary,
                }}
              >
                creator
              </Text>
            )}
          </View>
        );
      })}

      {/* Optional: show a message when there are no members */}
      {(!InvitedMember || InvitedMember.length === 0) && (
        <Text style={{ color: theme.textSecondary, textAlign: "center", marginTop: 20 }}>
          No members have been invited yet.
        </Text>
      )}
    </BottomSheetScrollView>
  );
};

 
const TAB_MAP = {
  my_rotation: {
    label: "myRotation",
    icon: ChartBarIncreasing,
    color: "#087908",
    tabComponent: MyProgressTab,
  },
edit_rotation: {
    label: "Edit Plan",
    icon: Pencil,
    color: "#a436c0",
    tabComponent: rotationInfoTab,
  },
  
  rotation_info: {
    label: "Actions",
    icon: Info,
    color: "#086279",
    tabComponent: rotationActionsTab,
  },
   rotation_members: {
    label: "Members",
    icon: Users,
    color: "#b40c82",
    tabComponent:listOfMembersTab,
  },
   
 
} as const;
export type TabType = keyof typeof TAB_MAP;
interface SettingProps{
  closeBottomSheet:()=>void;
}
export default function RotationPlanSettings(
  {closeBottomSheet}:SettingProps
){
const { theme,setIsRotationSettingsSheetOpen } = useGlobalStorage();
const { isAdmin ,rotationPlanId,planIsActive} = useGroupStorage();

  const styles = useMemo(() => RotationPlanSettingsStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<TabType>(planIsActive?'my_rotation':'rotation_info');
  console.log('check is plan active',planIsActive)
   const SelectedConfig = TAB_MAP[activeTab];
  const ActiveTabComponent = SelectedConfig.tabComponent;  
    const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };
  return(
        <View
        style={styles.container}
        >
            
            <BottomSheetScrollView
              horizontal
              style={{maxWidth:SCREEN_WIDTH*0.9 ,maxHeight:70,minHeight:50 }}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScrollContainer}
            >
              {Object.entries(TAB_MAP).map(([key, tab]) => {
                const isActive = activeTab === key;
                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => handleTabChange(key as TabType)}
                    style={[
                      styles.tabButtonContainer,
                      isActive && {
                        backgroundColor: theme.background,
                        borderColor: tab.color,
                      },
                    ]}
                  >
                    <tab.icon size={15} color={tab.color} />
                    <Text
                      style={[
                        styles.tabButtonText,
                        isActive && {
                          color: theme.text,
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </BottomSheetScrollView>
            <BottomSheetScrollView style={styles.tabRenderContainer} overScrollMode="always"
            contentContainerStyle={{
                padding:13
            }}
            >
              {activeTab === "my_rotation" && <ActiveTabComponent />}
              {activeTab === "edit_rotation"  &&  <ActiveTabComponent />}
              {activeTab === "rotation_info" && <ActiveTabComponent />}
            {activeTab === "rotation_members" && <ActiveTabComponent />}
            </BottomSheetScrollView>
          
        </View>
     
    )
}