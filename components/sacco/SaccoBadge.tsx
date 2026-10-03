import { StyleSheet, Text, View } from "react-native";
import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react-native";

import type { SasraLicenseCategory } from "@/lib/types/sacco";

/* ------------------------------------------------------------------ */
/*  Tokens                                                            */
/* ------------------------------------------------------------------ */

const PALETTE = {
  dt: { color: "#166534", soft: "#DCFCE7" },
  bosa: { color: "#0D9488", soft: "#CCFBF1" },
  notReg: { color: "#B45309", soft: "#FEF3C7" },
  undisclosed: { color: "#6B7280", soft: "#F3F4F6" },
} as const;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface SaccoBadgeProps {
  category: SasraLicenseCategory;
  verified?: boolean;
  size?: "sm" | "md";
  /** When true, drop the label and render icon only (for tight rows). */
  iconOnly?: boolean;
}

export function SaccoBadge({
  category,
  verified = false,
  size = "md",
  iconOnly = false,
}: SaccoBadgeProps) {
  const meta = getCategoryMeta(category);
  const Icon = meta.icon;

  const iconSize = size === "sm" ? 10 : 12;
  const fontSize = size === "sm" ? 9 : 10;
  const padH = size === "sm" ? 6 : 8;
  const padV = size === "sm" ? 2 : 3;

  if (iconOnly) {
    return (
      <View
        style={[
          styles.iconOnly,
          {
            backgroundColor: meta.palette.soft,
            width: iconSize * 2.2,
            height: iconSize * 2.2,
            borderRadius: iconSize * 0.7,
          },
        ]}
      >
        <Icon size={iconSize} color={meta.palette.color} strokeWidth={2.6} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: meta.palette.soft,
          paddingHorizontal: padH,
          paddingVertical: padV,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`SASRA status: ${meta.label}${
        verified ? ", verified by TrustLoop" : ""
      }`}
    >
      <Icon size={iconSize} color={meta.palette.color} strokeWidth={2.6} />
      <Text
        style={[styles.text, { color: meta.palette.color, fontSize }]}
        numberOfLines={1}
      >
        {meta.short}
      </Text>
      {verified ? (
        <View
          style={[
            styles.verifiedDot,
            { backgroundColor: meta.palette.color },
          ]}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Category → presentation                                           */
/* ------------------------------------------------------------------ */

function getCategoryMeta(category: SasraLicenseCategory) {
  switch (category) {
    case "dt_sacco":
      return {
        label: "Deposit-Taking SACCO",
        short: "DT-SACCO",
        icon: ShieldCheck,
        palette: PALETTE.dt,
      };
    case "non_dt_sacco":
      return {
        label: "Non-Deposit-Taking SACCO",
        short: "BOSA-only",
        icon: ShieldCheck,
        palette: PALETTE.bosa,
      };
    case "not_regulated":
      return {
        label: "Not SASRA-regulated",
        short: "Not regulated",
        icon: ShieldAlert,
        palette: PALETTE.notReg,
      };
    case "undisclosed":
      return {
        label: "Registration undisclosed",
        short: "Undisclosed",
        icon: ShieldQuestion,
        palette: PALETTE.undisclosed,
      };
  }
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  text: {
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  iconOnly: {
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginLeft: 2,
  },
});