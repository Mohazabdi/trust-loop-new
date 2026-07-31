import { supabaseGroups } from "@/lib/mysupabase/supabase";
import { useQuery } from "@tanstack/react-query";

// 1. Fixed Interface: The RPC returns a raw string (UUID), not an object wrapper
export type RotationMemberIdResponse = string;

export function useGetRotationMemberId(
    group_member_id?: string,
    rotation_plan_id?: string
) {
  return useQuery<RotationMemberIdResponse>({
    // 2. Added query safety filters to prevent fetching with empty parameters
    queryKey: ["RotationMemberId", group_member_id, rotation_plan_id],
    queryFn: async () => {
      const { data, error } = await supabaseGroups.rpc("getrotationmemberid", {
        p_group_member_id: group_member_id,
        p_rotation_plan_id: rotation_plan_id
      });
      
      if (error) throw new Error(error.message);
      
      console.log("The Raw RPC Response:", data);
      
      // Return the string directly or fallback to an empty string safely
      return data ?? ''; 
    },
    // 3. Keep it disabled until both required IDs are loaded to prevent empty backend calls
    enabled: !!group_member_id && !!rotation_plan_id, 
    staleTime: 10 * 60 * 1000, 
  });
}
