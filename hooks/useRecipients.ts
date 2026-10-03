// hooks/useRecipients.ts
import { supabaseFinance } from "@/lib/mysupabase/supabase";
import { Recipient } from "@/lib/types/recipients";
import { useQuery } from "@tanstack/react-query";

export function useRecipients(excludeEntityId?: string) {
  return useQuery<Recipient[] | []>({
    queryKey: ["recipients", excludeEntityId],
    queryFn: async () => {
      const { data, error } = await supabaseFinance.rpc(
        "get_recipient_accounts",
        {
          p_exclude_entity_id: excludeEntityId || null,
        },
      );
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.message || "Unknown error");
      //console.log("recipientsDataFromDB", data.data.recipients);
      return data.data.recipients;
    },
    enabled: true, 
    staleTime: 5 * 60 * 1000,
  });
}
