import { ImageSourcePropType } from "react-native";

export type GroupMemberRole = "admin" | "member";
export type GroupMemberStatus = "active" | "suspended" | "banned" | "deleted";
export type GroupRotationStatus =
  | "active"
  | "dormant"
  | "completed"
  | "deleted";
export type GroupDisbursementType = "auto" | "approval";
export type GroupLowFundsOption = "distribute" | "hold" | "approval";
export type GroupRotationPenaltyAppliedStatus = "paid" | "pending";
export type GroupIntervalStatus = "active" | "dormant" | "deleted";
export type GroupIntervalType = "system" | "custom";
export type GroupRotationPlanMemberStatus = "pending" | "completed";
export type GroupRotationCollectionScheduleStatus =
  | "upcoming"
  | "completed"
  | "due";
export type GroupStatus = "active" | "dormant" | "deleted";
export type GroupVisibility = "private" | "public";
export type memberStatus = "active" | "dormant" | "deleted";
export interface Group {
  id: string;
  group_name: string;
  group_ref: string;
  group_description?: string;
  group_visibility: GroupVisibility;
  group_status: GroupStatus;
  group_type: string;
  created_by: string;
  group_display_photo_url?: ImageSourcePropType | string;
  max_capacity: number;
  min_capacity: number;
  created_at: string;
  group_currency: string;
  group_capacity: number;
}
export interface GroupInvites {
  id: string;
  group_id: string;
  group: Group;
  member_id: string;
}
export interface Member {
  id: string;
  member_ref: string;
  first_name: string;
  last_name: string;
  email: string;
  primary_phone: string;
  member_status: memberStatus;
  display_photo_url: ImageSourcePropType | string;
}
export interface GroupMembers {
  id: string;
  group_id: string;
  group: Group;
  member_id: string;
  member: Member;
  member_status: memberStatus;
  created_at: string;
  role: GroupMemberRole;
}
export interface NextPayout {
  // rotation_plan_id: string;
  rotation_plan: RotationPlan;
  disbursement_date: string;
  // rotation_member_id: string;
  rotation_member: RotationPlanMember;
  total_contribution_collected: number;
  // amount_collectable: number;
}
export interface RotationPlan {
  id: string;
  group_id: string;
  group: Group;
  rotation_name: string;
  rotation_description?: string;
  start_date: string;
  rotation_status: GroupRotationStatus;
  penalty_amount?: number;
  grace_period?: number;
  amount_distributable?: number;
  disbursement_type: GroupDisbursementType;
  low_funds_options: GroupLowFundsOption;
  rotation_plan_code: string;
  amount_collectable: number;
}
export interface Interval {
  id: string;
  interval_name: string;
  interval_description?: string;
  no_of_days: number;
  interval_status: GroupIntervalStatus;
  interval_type: GroupIntervalType;
  interval_code: string;
}
export interface RotationPlanMember {
  id: string;
  group_member_id: string;
  member: Member;
  rotation_plan_id: string;
  rotationPlan: RotationPlan;
  amount_recievable: number;
  rotation_plan_members_status: GroupRotationPlanMemberStatus;
  rotation_plan_members_code: string;
}
export interface RotationInterval {
  id: string;
  rotation_plan_id: string;
  rotation_plan: RotationPlan;
  interval_id: string;
  interval: Interval;
  rotation_interval_code: string;
}
export interface MemberScheduleSetting {
  id: string;
  rotation_interval_id: string;
  rotation_interval: RotationInterval;
  rotation_plan_member_id: string;
  rotation_plan_member: RotationPlanMember;
  amount_payable: string;
  schedule_index: string;
  member_schedule_settings_code: string;
}
// export interface RotationDisbursed{
//     id:string
// }
export interface RotationCollectionSchedule {
  id: string;
  member_schedule_settings_id: string;
  member_schedule_settings: MemberScheduleSetting;
  due_date: string;
  amount_collected: number;
  rotation_collection_schedule_status: GroupRotationCollectionScheduleStatus;
  rotation_collection_schedule_code: string;
}
/////EXTRAS
export interface GroupBalances {
  group_id: string;
  available_balance: number;
}
