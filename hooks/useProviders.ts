// hooks/useRecipients.ts
import { supabaseFinance } from "@/lib/mysupabase/supabase";
import { ProviderType } from "@/lib/types/account_layer.types";
import { Provider } from "@/lib/types/providers";
import { useQuery } from "@tanstack/react-query";

export interface ProviderFilters {
  provider_types?: Set<ProviderType>;
}
const providerTypes = (provider: Provider, types?: Set<ProviderType>) =>
  !types?.size || types?.has(provider.provider_type);
export const getProviders = async (): Promise<Provider[]> => {
  //console.log("providorDataFromBackendCheck");
  const { data, error } = await supabaseFinance.rpc("get_providers");
  // console.log("providorDataFromBackend1", data.data);
  // console.log("RAW RPC RESPONSE", data);
  // console.log("RAW RPC ERROR", error);
  if (error) {
    throw new Error(error.message);
  }
  if (!data.success) {
    throw new Error(data?.message || "Something went wrong getting providers");
  }
  //console.log("providorDataFromBackend1", data.data);
  return data.data.providers as Provider[];
};

export const filterProviders = (
  providers: Provider[],
  filters?: ProviderFilters,
): Provider[] => {
  return providers.filter((provider) => {
    return providerTypes(provider, filters?.provider_types);
  });
};
export function useProviders(filters?: ProviderFilters) {
  return useQuery<Provider[] | []>({
    queryKey: ["providersData"],
    queryFn: getProviders,
    select: (data) => {
      return filterProviders(data, filters);
    },
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });
}
