import { useQuery } from "@tanstack/react-query";
import { supabaseGroups } from "@/lib/mysupabase/supabase";

interface MemberReport {
  member_info: {
    rotation_plan_member_id: string;
    member_name: string;
    rotation_name: string;
    rotation_description: string;
    amount_collectable: number;
    start_date: string;
    end_date: string;
    rotation_status: string;
    currency_code: string;
  };
  contributions: Array<{
    transaction_id: string;
    trans_amount: number;
    trans_type: string;
    transaction_date: string;
    type: string;
  }>;
  collections: Array<{
    collection_id: string;
    amount_recorded: number;
    date_collected: string;
    date_scheduled: string;
    rotation_schedule_index: number;
    transaction_id: string;
  }>;
  disbursements: Array<{
    disbursement_id: string;
    amount_recorded: number;
    date_collected: string;
    date_scheduled: string;
    rotation_schedule_index: number;
    transaction_id: string;
  }>;
  totals: {
    total_contributed: number;
    total_collected: number;
    total_disbursed: number;
  };
  cycles: Array<{
    date_scheduled: string;
    rotation_schedule_index: number;
    collected: number;
    disbursed: number;
  }>;
}

export function useGetMemberRotationReport(memberRotationPlanId?: string) {
  return useQuery<MemberReport>({
    queryKey: ["member_rotation_report", memberRotationPlanId],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc(
        "get_member_rotation_report",
        { p_rotation_plan_member_id: memberRotationPlanId }
      );
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      return data.data.member_report;
    },
    enabled: !!memberRotationPlanId,
  });
}