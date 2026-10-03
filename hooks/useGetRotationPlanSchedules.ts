import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";
export interface cycleMembers {
  id: string;
  names: string;
  amount: number;
  amountType: "debit" | "credit";
  status: "upcoming" | "completed" | "pending" | "canceled";
  member_id:string;
}
export interface Rotationcycles {
  id: string;
  cycleName: string;
  date_scheduled: string;
  cycle_status: "upcoming" | "completed" | "pending" | "canceled";
  members: cycleMembers[];
}
export function useGetRotationPlanSchedules(rotation_plan_id?: string) {
  //console.log("Member Id from the Backend",group_member_id);
  return useQuery<Rotationcycles[] | []>({
    queryKey: ["rotation_plan_schedules", rotation_plan_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc(
        "get_rotation_plan_schedules",
        {
          p_rotation_plan_id: rotation_plan_id,
        },
      );
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
     const cycles = data.data?.rotation_plan_cycles ?? [];
      //console.log("rotation Cycles dataaa", cycles);
      return cycles;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}