import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";
export interface RotationPlanMembers{
            id:string;
            transaction_id:string;
            trans_amount:number;
            date_of_transaction:string;
}
export function useGetReserveContributions(rotation_plan_member_id?:string) {
  return useQuery<RotationPlanMembers[]|[]>({
    queryKey: ["rotation_reserve_amounts", rotation_plan_member_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc("get_reserve_contributions", {
        p_rotation_plan_member_id: rotation_plan_member_id,
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      //console.log("The Backend",data.data.group_member_rotation_invites)
      const reserveAmounts=data.data.rotation_reserve_amounts??[]; 
      return reserveAmounts;
    },
    enabled: true, 
    staleTime: 10 * 60 * 1000, 
  });
}
