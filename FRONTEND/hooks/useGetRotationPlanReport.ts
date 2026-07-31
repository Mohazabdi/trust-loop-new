import { useQuery } from "@tanstack/react-query";
import { supabaseGroups } from "@/lib/mysupabase/supabase";

interface PlanReport {
  plan_info: {
    rotation_name: string;
    rotation_description: string;
    amount_collectable: number;
    start_date: string;
    end_date: string;
    rotation_status: string;
    currency_code: string;
    total_members: number;
  };
  members: Array<{
    member_name: string;
    rotation_plan_member_id: string;
    total_contributed: number;
    total_collected: number;
    total_disbursed: number;
    net_balance: number;
  }>;
  overall_totals: {
    total_contributed_all: number;
    total_collected_all: number;
    total_disbursed_all: number;
    
  };
}

export function useGetRotationPlanReport(rotationPlanId?: string) {
  return useQuery<PlanReport>({
    queryKey: ["rotation_plan_report", rotationPlanId],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc(
        "get_rotation_plan_report",
        { p_rotation_plan_id: rotationPlanId }
      );
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      return data.data.plan_report;
    },
    enabled: !!rotationPlanId,
  });
}