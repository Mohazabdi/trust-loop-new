import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";


export interface PayoutRequests{
     id:string;
            schedule_id:string;  
            requested_amount:string; 
            status:string;  
            description:string;  
            created_at:string;  
            member_name:string;  
            member_id:string;  
            plan_name:string;  
            plan_id:string;  
            date_scheduled:string; 
            schedule_index:number;
}


export function useGetPayoutRequests(group_member_id?: string) {
  return useQuery<PayoutRequests[]|[]>({
    queryKey: ["payout_requests", group_member_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc("get_payout_requests", {
        p_group_member_id: group_member_id,
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      return data.data?.payout_requests ?? [];
    },
    enabled: !!group_member_id,
  });
}