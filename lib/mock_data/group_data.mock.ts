import {
    Group,
    GroupBalances,
    GroupInvites,
    GroupMembers,
    Interval,
    Member,
    MemberScheduleSetting,
    NextPayout,
    RotationCollectionSchedule,
    RotationInterval,
    RotationPlan,
    RotationPlanMember,
} from "../types/group_types";

// ============= GROUPS =============
export const groups: Group[] = [
  {
    id: "grp_001",
    group_name: "Sawazisha Group Funding",
    group_ref: "GRP_01_0000a",
    group_description: "The group meant to help mama mboga raise funds",
    group_visibility: "public",
    group_status: "active",
    group_type: "ROSCA",
    created_by: "Alvin Indiazi",
    group_display_photo_url: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
    max_capacity: 20,
    min_capacity: 1,
    created_at: "2025-03-01",
    group_currency: "KES",
    group_capacity: 10,
  },
  {
    id: "grp_002",
    group_name: "Wezesha Youth Group",
    group_ref: "GRP_01_0000b",
    group_description: "Empowering youth through savings",
    group_visibility: "public",
    group_status: "active",
    group_type: "ROSCA",
    created_by: "Sarah Johnson",
    group_display_photo_url: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
    max_capacity: 30,
    min_capacity: 5,
    created_at: "2025-03-15",
    group_currency: "KES",
    group_capacity: 10,
  },
  {
    id: "grp_003",
    group_name: "Women Entrepreneurs Hub",
    group_ref: "GRP_01_0000c",
    group_description: "Supporting women in business",
    group_visibility: "private",
    group_status: "dormant",
    group_type: "ROSCA",
    created_by: "Mary Wanjiku",
    group_display_photo_url: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
    max_capacity: 15,
    min_capacity: 3,
    created_at: "2025-02-10",
    group_currency: "KES",
    group_capacity: 10,
  },
];

// ============= MEMBERS =============
export const members: Member[] = [
  {
    id: "mbr_001",
    member_ref: "MBR_00000a",
    first_name: "Alvin",
    last_name: "Indiazi",
    email: "alvin@gmail.com",
    primary_phone: "0721212121",
    member_status: "active",
    display_photo_url: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
  },
  {
    id: "mbr_002",
    member_ref: "MBR_00000b",
    first_name: "Tom",
    last_name: "Doe",
    email: "tomdoe@gmail.com",
    primary_phone: "0721222222",
    member_status: "active",
    display_photo_url: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
  },
  {
    id: "mbr_003",
    member_ref: "MBR_00000c",
    first_name: "Jane",
    last_name: "Joe",
    email: "janejoe@gmail.com",
    primary_phone: "0721233333",
    member_status: "active",
    display_photo_url: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
  },
  {
    id: "mbr_004",
    member_ref: "MBR_00000d",
    first_name: "Peter",
    last_name: "Omondi",
    email: "peter.omondi@gmail.com",
    primary_phone: "0721244444",
    member_status: "active",
    display_photo_url: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
  },
  {
    id: "mbr_005",
    member_ref: "MBR_00000e",
    first_name: "Grace",
    last_name: "Muthoni",
    email: "grace.muthoni@gmail.com",
    primary_phone: "0721255555",
    member_status: "dormant",
    display_photo_url: require("../../assets/images/recipientImages/AlvinProfilePic.jpg"),
  },
];

// ============= GROUP MEMBERS =============
export const groupMembers: GroupMembers[] = [
  {
    id: "gm_001",
    group_id: "grp_001",
    group: groups[0],
    member_id: "mbr_001",
    member: members[0],
    member_status: "active",
    created_at: "12-mar-2026",
    role: "admin",
  },
  {
    id: "gm_002",
    group_id: "grp_001",
    group: groups[0],
    member_id: "mbr_002",
    member: members[1],
    member_status: "active",
    created_at: "12-mar-2026",
    role: "admin",
  },
  {
    id: "gm_003",
    group_id: "grp_001",
    group: groups[0],
    member_id: "mbr_003",
    member: members[2],
    member_status: "active",
    created_at: "12-mar-2026",
    role: "admin",
  },
  {
    id: "gm_004",
    group_id: "grp_002",
    group: groups[1],
    member_id: "mbr_002",
    member: members[1],
    member_status: "active",
    created_at: "12-mar-2026",
    role: "admin",
  },
  {
    id: "gm_005",
    group_id: "grp_002",
    group: groups[1],
    member_id: "mbr_004",
    member: members[3],
    member_status: "active",
    created_at: "12-mar-2026",
    role: "admin",
  },
  {
    id: "gm_006",
    group_id: "grp_002",
    group: groups[1],
    member_id: "mbr_005",
    member: members[4],
    member_status: "dormant",
    created_at: "12-mar-2026",
    role: "admin",
  },
];

// ============= ROTATION PLANS =============
export const rotationPlans: RotationPlan[] = [
  {
    id: "rp_001",
    group_id: "grp_001",
    group: groups[0],
    rotation_name: "Monthly Savings Round 1",
    rotation_description: "First rotation cycle for Sawazisha Group",
    start_date: "2025-03-01",
    rotation_status: "active",
    penalty_amount: 500,
    grace_period: 3,
    amount_distributable: 150000,
    disbursement_type: "auto",
    low_funds_options: "distribute",
    rotation_plan_code: "RP_001_2025",
    amount_collectable: 1000,
  },
  {
    id: "rp_002",
    group_id: "grp_001",
    group: groups[0],
    rotation_name: "Weekly Savings Round 2",
    rotation_description: "Second rotation cycle with weekly contributions",
    start_date: "2025-04-15",
    rotation_status: "active",
    penalty_amount: 200,
    grace_period: 2,
    amount_distributable: 75000,
    disbursement_type: "approval",
    low_funds_options: "hold",
    rotation_plan_code: "RP_002_2025",
    amount_collectable: 1000,
  },
  {
    id: "rp_003",
    group_id: "grp_002",
    group: groups[1],
    rotation_name: "Youth Empowerment Round",
    rotation_description: "Quarterly savings for youth projects",
    start_date: "2025-05-01",
    rotation_status: "dormant",
    penalty_amount: 1000,
    grace_period: 5,
    amount_distributable: 200000,
    disbursement_type: "auto",
    low_funds_options: "approval",
    rotation_plan_code: "RP_003_2025",
    amount_collectable: 1000,
  },
];

// ============= INTERVALS =============
export const intervals: Interval[] = [
  {
    id: "int_001",
    interval_name: "Daily",
    interval_description: "Daily contribution interval",
    no_of_days: 1,
    interval_status: "active",
    interval_type: "system",
    interval_code: "INT_DAILY",
  },
  {
    id: "int_002",
    interval_name: "Weekly",
    interval_description: "Weekly contribution interval",
    no_of_days: 7,
    interval_status: "active",
    interval_type: "system",
    interval_code: "INT_WEEKLY",
  },
  {
    id: "int_003",
    interval_name: "Monthly",
    interval_description: "Monthly contribution interval",
    no_of_days: 30,
    interval_status: "active",
    interval_type: "system",
    interval_code: "INT_MONTHLY",
  },
  {
    id: "int_004",
    interval_name: "Bi-Weekly",
    interval_description: "Every two weeks",
    no_of_days: 14,
    interval_status: "active",
    interval_type: "custom",
    interval_code: "INT_BIWEEKLY",
  },
];

// ============= ROTATION PLAN MEMBERS =============
export const rotationPlanMembers: RotationPlanMember[] = [
  {
    id: "rpm_001",
    group_member_id: "gm_001",
    member: members[0],
    rotation_plan_id: "rp_001",
    rotationPlan: rotationPlans[0],
    amount_recievable: 50000,
    rotation_plan_members_status: "pending",
    rotation_plan_members_code: "RPM_001",
  },
  {
    id: "rpm_002",
    group_member_id: "gm_002",
    member: members[1],
    rotation_plan_id: "rp_001",
    rotationPlan: rotationPlans[0],
    amount_recievable: 50000,
    rotation_plan_members_status: "pending",
    rotation_plan_members_code: "RPM_002",
  },
  {
    id: "rpm_003",
    group_member_id: "gm_003",
    member: members[2],
    rotation_plan_id: "rp_001",
    rotationPlan: rotationPlans[0],
    amount_recievable: 50000,
    rotation_plan_members_status: "completed",
    rotation_plan_members_code: "RPM_003",
  },
  {
    id: "rpm_004",
    group_member_id: "gm_004",
    member: members[1],
    rotation_plan_id: "rp_002",
    rotationPlan: rotationPlans[1],
    amount_recievable: 25000,
    rotation_plan_members_status: "pending",
    rotation_plan_members_code: "RPM_004",
  },
];

// ============= ROTATION INTERVALS =============
// Note: Fixed the circular reference in RotationInterval interface
// The 'interval' property should likely be 'Interval' type, not 'RotationInterval'
export const rotationIntervals: RotationInterval[] = [
  {
    id: "ri_001",
    rotation_plan_id: "rp_001",
    rotation_plan: rotationPlans[0],
    interval_id: "int_003",
    interval: intervals[0], // This needs to be fixed in the type definition
    rotation_interval_code: "RI_001",
  },
  {
    id: "ri_002",
    rotation_plan_id: "rp_002",
    rotation_plan: rotationPlans[1],
    interval_id: "int_002",
    interval: intervals[0], // This needs to be fixed in the type definition
    rotation_interval_code: "RI_002",
  },
];

// ============= MEMBER SCHEDULE SETTINGS =============
export const memberScheduleSettings: MemberScheduleSetting[] = [
  {
    id: "mss_001",
    rotation_interval_id: "ri_001",
    rotation_interval: rotationIntervals[0],
    rotation_plan_member_id: "rpm_001",
    rotation_plan_member: rotationPlanMembers[0],
    amount_payable: "5000",
    schedule_index: "1",
    member_schedule_settings_code: "MSS_001",
  },
  {
    id: "mss_002",
    rotation_interval_id: "ri_001",
    rotation_interval: rotationIntervals[0],
    rotation_plan_member_id: "rpm_002",
    rotation_plan_member: rotationPlanMembers[1],
    amount_payable: "5000",
    schedule_index: "2",
    member_schedule_settings_code: "MSS_002",
  },
  {
    id: "mss_003",
    rotation_interval_id: "ri_002",
    rotation_interval: rotationIntervals[1],
    rotation_plan_member_id: "rpm_004",
    rotation_plan_member: rotationPlanMembers[3],
    amount_payable: "2500",
    schedule_index: "1",
    member_schedule_settings_code: "MSS_003",
  },
];

// ============= ROTATION COLLECTION SCHEDULES =============
export const rotationCollectionSchedules: RotationCollectionSchedule[] = [
  {
    id: "rcs_001",
    member_schedule_settings_id: "mss_001",
    member_schedule_settings: memberScheduleSettings[0],
    due_date: "2025-03-08",
    amount_collected: 5000,
    rotation_collection_schedule_status: "completed",
    rotation_collection_schedule_code: "RCS_001",
  },
  {
    id: "rcs_002",
    member_schedule_settings_id: "mss_001",
    member_schedule_settings: memberScheduleSettings[0],
    due_date: "2025-03-15",
    amount_collected: 0,
    rotation_collection_schedule_status: "due",
    rotation_collection_schedule_code: "RCS_002",
  },
  {
    id: "rcs_003",
    member_schedule_settings_id: "mss_001",
    member_schedule_settings: memberScheduleSettings[0],
    due_date: "2025-03-22",
    amount_collected: 0,
    rotation_collection_schedule_status: "upcoming",
    rotation_collection_schedule_code: "RCS_003",
  },
  {
    id: "rcs_004",
    member_schedule_settings_id: "mss_002",
    member_schedule_settings: memberScheduleSettings[1],
    due_date: "2025-03-08",
    amount_collected: 5000,
    rotation_collection_schedule_status: "completed",
    rotation_collection_schedule_code: "RCS_004",
  },
  {
    id: "rcs_005",
    member_schedule_settings_id: "mss_003",
    member_schedule_settings: memberScheduleSettings[2],
    due_date: "2025-04-22",
    amount_collected: 0,
    rotation_collection_schedule_status: "upcoming",
    rotation_collection_schedule_code: "RCS_005",
  },
];

// ============= GROUP BALANCES =============
export const groupBalances: GroupBalances[] = [
  {
    group_id: "grp_001",
    available_balance: 150000,
  },
  {
    group_id: "grp_002",
    available_balance: 200000,
  },
  {
    group_id: "grp_003",
    available_balance: 0,
  },
];
const groupInvites: GroupInvites[] = [
  {
    id: "inv_01",
    group: groups[0],
    group_id: groups[1].id,
    member_id: "mbr_01",
  },
  {
    id: "inv_02",
    group: groups[1],
    group_id: groups[1].id,
    member_id: "mbr_01",
  },
  {
    id: "inv_03",
    group: groups[1],
    group_id: groups[1].id,
    member_id: "mbr_01",
  },
];
const nextPayouts: NextPayout[] = [
  {
    rotation_plan: rotationPlans[0],
    disbursement_date: "12-mar-2022",
    rotation_member: rotationPlanMembers[0],
    total_contribution_collected: 300,
    // amount_collectable:rotationPlans[0].
  },
  {
    rotation_plan: rotationPlans[1],
    disbursement_date: "12-mar-2022",
    rotation_member: rotationPlanMembers[0],
    total_contribution_collected: 300,
    // amount_collectable:rotationPlans[0].
  },
];

// ============= HELPER FUNCTIONS =============
export const getGroupById = (id: string): Group | undefined => {
  return groups.find((group) => group.id === id);
};
export const getGroups = (): Group[] => {
  return groups;
};
export const getRotationCollectionSchedules = (
  rotationId: string,
): RotationCollectionSchedule[] => {
  return rotationCollectionSchedules.filter(
    (rts) =>
      rts.member_schedule_settings.rotation_interval.rotation_plan_id ===
      rotationId,
  );
};

export const getMemberById = (id: string): Member | undefined => {
  return members.find((member) => member.id === id);
};

export const getRotationPlanById = (id: string): RotationPlan | undefined => {
  return rotationPlans.find((plan) => plan.id === id);
};

export const getGroupMembersByGroupId = (groupId: string): GroupMembers[] => {
  return groupMembers.filter((gm) => gm.group_id === groupId);
};
export const getNextPayout = (groupId: string): NextPayout | undefined => {
  return nextPayouts.find((g) => g.rotation_plan.group_id === groupId);
};
export const getRotationPlanMembersByPlanId = (
  planId: string,
): RotationPlanMember[] => {
  return rotationPlanMembers.filter((rpm) => rpm.rotation_plan_id === planId);
};
