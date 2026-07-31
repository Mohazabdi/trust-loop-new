import { providerImages } from "@/lib/constants/providorImages";

export const getProviderImage = (key?: string) => {
  if (!key) return null;
  return providerImages[key as keyof typeof providerImages] ?? null;
};
