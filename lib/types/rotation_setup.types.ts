export type intervalType = "daily" | "weekly" | "biweekly" | "monthly" | "custom";

export interface RotationSetup {
  rotationName: string;
  rotationDescription: string;
  contributionAmount: number;
  interval: intervalType | null;
  startDate: Date | null;
  endDate: Date | null;
}

export type lowFundsOptions = "skip" | "notify" | "auto-pay";
export type disbursementType = "equal" | "proportional" | "custom";
export interface penaltyAmount{
    amount: number;
}
export interface gracePeriod{
    days: number;
}
