import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";
export interface RotationPlan{
rotation_plan_id:string;
created_by:string;
rotation_name:string;
rotation_description?:string;
start_date:string;
rotation_status:"active" | "dormant" | "paused" | "complete";
amount_collectable:number;
account_id:string;
account_number:string;
account_name:string;
account_type:string;
currency_code:string;
current_balance:string;
available_balance:string;
account_status:string;
hold_balance:string;
}

export function useGetRotationPlan(rotation_plan_id?:string) {
  return useQuery<RotationPlan>({
    queryKey: ["rotation_plan", rotation_plan_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc("get_rotation_plan", {
        p_rotation_plan_id: rotation_plan_id!,
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      return data.data.rotation_plan; 
    },
    enabled: true, 
    staleTime: 10 * 60 * 1000, 
  });
}
