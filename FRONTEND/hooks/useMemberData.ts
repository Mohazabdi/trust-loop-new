import { supabase } from "@/lib/mysupabase/supabase";
import { MemberProfile } from "@/lib/types/member";
import { useQuery } from "@tanstack/react-query";
import { useAuthContext } from "./use-auth-context";

export function useMemberData() {
  const { claims } = useAuthContext(); // get claims instead of profile
  const auth_id = claims?.sub;
  return useQuery<MemberProfile>({
    // <MemberProfile> gives type safety
    queryKey: ["member", auth_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_member_entity", {
        p_auth_id: auth_id!,
      });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      //console.log("dataFromDB", data);
      return data.data as MemberProfile; // match the shape defined above
    },
    enabled: !!auth_id, // only run when we have an auth ID
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
