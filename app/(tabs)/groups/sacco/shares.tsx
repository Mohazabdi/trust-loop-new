import { useCallback, useMemo, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  AlertTriangle,
  ArrowUpCircle,
  CheckCircle,
  ChevronLeft,
  Coins,
  Info,
  TrendingUp,
  X,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import { useMemberData } from "@/hooks/useMemberData";
import {
  useSaccoStorage,
  netShareCapitalForMember,
  totalSharesForMember,
} from "@/store/useSaccoStorage";

/* ------------------------------------------------------------------ */
/*  Design tokens — balanced claymorphism                             */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: "#D9E0EC",
  surface: "#F0F4FA",
  surfaceRaised: "#F7FAFE",
  sunken: "#C8D1DF",
  highlight: "#FFFFFF",
  shade: "rgba(71, 85, 105, 0.44)",
  shadeSoft: "rgba(71, 85, 105, 0.28)",
  ink: "#1A2438",
  inkSoft: "#4A566B",
  inkFaint: "#8A94A8",
  hairline: "rgba(71, 85, 105, 0.14)",
} as const;

const ACCENT = {
  green: "#2F7A4E",
  greenSoft: "#CFE6D8",
  red: "#A64A4A",
  redSoft: "#EDCECE",
  purple: "#5B4B9E",
  purpleSoft: "#DCD5F0",
  navy: "#2F4F8A",
  navySoft: "#CBD7EE",
  navyTint: "#DDE4F0",
  amber: "#96632A",
  amberSoft: "#EBD8B8",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const formatMoney = (n: number) =>
  Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });

const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/* ------------------------------------------------------------------ */
/*  Clay primitive                                                    */
/* ------------------------------------------------------------------ */

function Clay({
  children,
  color = CLAY.surface,
  radius = RADIUS.lg,
  highlight = CLAY.highlight,
  shade = CLAY.shade,
  depth = 1,
  inset = false,
  style,
  bodyStyle,
}: {
  children: ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
  inset?: boolean;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
}) {
  const offset = 4 + depth * 2;
  const drop = offset + 2;

  if (inset) {
    return (
      <View
        style={[
          {
            backgroundColor: color,
            borderRadius: radius,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: CLAY.hairline,
            shadowColor: highlight,
            shadowOffset: { width: -2, height: -2 },
            shadowOpacity: 0.6,
            shadowRadius: 4,
          },
          style,
        ]}
      >
        <View
          style={[
            {
              backgroundColor: color,
              borderRadius: radius,
              shadowColor: CLAY.shadeSoft,
              shadowOffset: { width: 3, height: 3 },
              shadowOpacity: 0.85,
              shadowRadius: 6,
            },
            bodyStyle,
          ]}
        >
          {children}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: radius,
          shadowColor: shade,
          shadowOffset: { width: drop, height: drop },
          shadowOpacity: 1,
          shadowRadius: drop * 1.65,
          elevation: 3 + depth * 3,
        },
        style,
      ]}
    >
      <View
        style={[
          {
            backgroundColor: color,
            borderRadius: radius,
            shadowColor: highlight,
            shadowOffset: { width: -offset, height: -offset },
            shadowOpacity: 1,
            shadowRadius: offset * 1.25,
          },
          bodyStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function SaccoSharesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sacco_id?: string;
    group_member_id?: string;
  }>();

  const { data: member } = useMemberData();
  const currentMemberId = params.group_member_id ?? member?.id ?? "";

  const sacco = useSaccoStorage((s) =>
    s.saccos.find((x) => x.sacco_id === params.sacco_id)
  );
  const purchaseShares = useSaccoStorage((s) => s.purchaseShares);

  const [refreshing, setRefreshing] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [buyError, setBuyError] = useState("");

  const handleBack = useCallback(() => router.back(), [router]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 350);
  }, []);

  /* ── Derived ────────────────────────────────────────────────── */

  const myMemberRow = useMemo(
    () => sacco?.members.find((m) => m.group_member_id === currentMemberId),
    [sacco?.members, currentMemberId]
  );

  const myShares = useMemo(
    () =>
      sacco && myMemberRow ? totalSharesForMember(sacco, myMemberRow.id) : 0,
    [sacco, myMemberRow]
  );

  const myCapital = useMemo(
    () =>
      sacco && myMemberRow
        ? netShareCapitalForMember(sacco, myMemberRow.id)
        : 0,
    [sacco, myMemberRow]
  );

  const myPurchases = useMemo(
    () =>
      [...(sacco?.share_purchases ?? [])]
        .filter((p) => myMemberRow && p.member_row_id === myMemberRow.id)
        .sort(
          (a, b) =>
            new Date(b.purchased_at).getTime() -
            new Date(a.purchased_at).getTime()
        ),
    [sacco?.share_purchases, myMemberRow]
  );

  const totalShareCapital = useMemo(
    () =>
      (sacco?.share_purchases ?? []).reduce((s, p) => s + p.total_value, 0),
    [sacco?.share_purchases]
  );

  const parsedQty = Number(quantity) || 0;
  const purchaseValue = sacco ? parsedQty * sacco.share_value : 0;
  const isValidQty =
    parsedQty > 0 && Number.isInteger(parsedQty) && parsedQty <= 10_000;

  const quickAmounts = useMemo(() => {
    if (!sacco) return [];
    const min = sacco.minimum_shares_per_member;
    return [min, min * 2, min * 5].filter((v, i, arr) => arr.indexOf(v) === i);
  }, [sacco]);

  /* ── Handlers ─────────────────────────────────────────────── */

  const handleOpenBuy = () => {
    setQuantity(String(sacco?.minimum_shares_per_member ?? 10));
    setBuyError("");
    setBuyOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (!sacco || !myMemberRow) return;

    if (!quantity.trim() || isNaN(parsedQty)) {
      setBuyError("Enter a valid number of shares.");
      return;
    }
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setBuyError("Shares must be a whole number.");
      return;
    }

    Alert.alert(
      "Confirm purchase",
      `${parsedQty} shares × ${sacco.currency_code} ${formatMoney(
        sacco.share_value
      )}\nTotal: ${sacco.currency_code} ${formatMoney(purchaseValue)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: () => {
            purchaseShares(sacco.sacco_id, {
              sacco_id: sacco.sacco_id,
              member_row_id: myMemberRow.id,
              member_name: `${myMemberRow.first_name} ${myMemberRow.last_name}`.trim(),
              quantity: parsedQty,
              value_per_share: sacco.share_value,
            });
            toast.success(
              `${parsedQty} share${parsedQty === 1 ? "" : "s"} purchased`
            );
            setBuyOpen(false);
          },
        },
      ]
    );
  };

  /* ── Guards ──────────────────────────────────────────────── */

  if (!sacco) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.missingWrap}>
          <Clay bodyStyle={styles.missingCard}>
            <View style={styles.missingIcon}>
              <AlertTriangle
                size={24}
                color={ACCENT.navy}
                strokeWidth={2.2}
              />
            </View>
            <Text style={styles.missingTitle}>SACCO not found</Text>
            <Text style={styles.missingBody}>
              This SACCO is no longer available, or you don't have access to
              it.
            </Text>
            <TouchableOpacity
              onPress={handleBack}
              activeOpacity={0.9}
              style={{ marginTop: SPACING.md }}
            >
              <Clay
                color={ACCENT.navy}
                radius={RADIUS.md}
                depth={1}
                highlight="rgba(255,255,255,0.32)"
                shade="rgba(15, 30, 60, 0.44)"
                bodyStyle={styles.missingCta}
              >
                <Text style={styles.missingCtaText}>Go back</Text>
              </Clay>
            </TouchableOpacity>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  const isMember = !!myMemberRow;

  /* ── Render ──────────────────────────────────────────────── */

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={ACCENT.navy}
            colors={[ACCENT.navy]}
          />
        }
      >
        {/* ── Back row ─────────────────────────────────── */}
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={handleBack}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Clay radius={18} depth={1} bodyStyle={styles.backBtn}>
              <ChevronLeft size={20} color={CLAY.ink} strokeWidth={2.6} />
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Identity ─────────────────────────────────── */}
        <View style={styles.identity}>
          <SaccoBadge
            category={sacco.sasra_license_category}
            verified={!!sacco.sasra_verified_at}
            size="sm"
          />
          <Text style={styles.groupName} numberOfLines={2}>
            {sacco.group_name}
          </Text>
        </View>

        {/* ── My holdings hero ─────────────────────────── */}
        <Clay
          color={ACCENT.navy}
          radius={RADIUS.xl}
          depth={2}
          highlight="rgba(255,255,255,0.32)"
          shade="rgba(15, 30, 60, 0.44)"
          style={styles.heroWrap}
          bodyStyle={styles.hero}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroEyebrowRow}>
              <Coins size={12} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.heroEyebrow}>MY SHARE CAPITAL</Text>
            </View>
          </View>

          <Text style={styles.heroAmount} numberOfLines={1}>
            {sacco.currency_code} {formatMoney(myCapital)}
          </Text>

          <View style={styles.heroMetaRow}>
            <Text style={styles.heroMeta}>
              {myShares} {myShares === 1 ? "share" : "shares"} owned
            </Text>
            <View style={styles.heroMetaDot} />
            <Text style={styles.heroMeta}>
              {sacco.currency_code} {formatMoney(sacco.share_value)} / share
            </Text>
          </View>
        </Clay>

        {/* ── CTA / non-member note ────────────────────── */}
        {isMember ? (
          <TouchableOpacity
            onPress={handleOpenBuy}
            activeOpacity={0.9}
            style={styles.ctaWrap}
          >
            <Clay
              color={ACCENT.navy}
              radius={RADIUS.lg}
              depth={1}
              highlight="rgba(255,255,255,0.30)"
              shade="rgba(15, 30, 60, 0.42)"
              bodyStyle={styles.primaryBtn}
            >
              <ArrowUpCircle size={18} color="#fff" strokeWidth={2.6} />
              <Text style={styles.primaryBtnText}>
                Buy {sacco.minimum_shares_per_member} shares
              </Text>
            </Clay>
          </TouchableOpacity>
        ) : (
          <View style={styles.nonMemberWrap}>
            <Clay bodyStyle={styles.nonMemberNote}>
              <Text style={styles.nonMemberText}>
                You are not a member of this SACCO. Contact an admin to
                request access before purchasing shares.
              </Text>
            </Clay>
          </View>
        )}

        {/* ── Stats strip ──────────────────────────────── */}
        <View style={styles.statsRow}>
          <StatBlock
            icon={TrendingUp}
            label="My shares"
            value={String(myShares)}
            accent={ACCENT.navy}
          />
          <StatBlock
            icon={Coins}
            label="Total SACCO"
            value={`${formatMoney(totalShareCapital)}`}
          />
          <StatBlock
            icon={CheckCircle}
            label="Min required"
            value={String(sacco.minimum_shares_per_member)}
          />
        </View>

        {/* ── Below-minimum warning ────────────────────── */}
        {isMember && myShares < sacco.minimum_shares_per_member ? (
          <View style={styles.warnWrap}>
            <Clay
              inset
              radius={RADIUS.md}
              color={ACCENT.amberSoft}
              shade="rgba(120, 80, 20, 0.28)"
              bodyStyle={styles.warnBox}
            >
              <Info size={14} color={ACCENT.amber} strokeWidth={2.6} />
              <Text style={styles.warnText}>
                You need{" "}
                {sacco.minimum_shares_per_member - myShares} more{" "}
                share
                {sacco.minimum_shares_per_member - myShares === 1
                  ? ""
                  : "s"}{" "}
                to reach the SACCO's minimum membership requirement.
              </Text>
            </Clay>
          </View>
        ) : null}

        {/* ── Section header ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionMarker} />
            <Text style={styles.sectionTitle}>Purchase history</Text>
          </View>
          <View
            style={[
              styles.sectionCountPill,
              { backgroundColor: ACCENT.navySoft },
            ]}
          >
            <Text
              style={[styles.sectionCountText, { color: ACCENT.navy }]}
            >
              {myPurchases.length}
            </Text>
          </View>
        </View>

        {/* ── Purchase history list ────────────────────── */}
        {myPurchases.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Clay bodyStyle={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Coins size={22} color={ACCENT.navy} strokeWidth={2.2} />
              </View>
              <Text style={styles.emptyCardText}>
                You haven't purchased any shares yet.
                {isMember ? " Tap Buy shares above to start." : ""}
              </Text>
            </Clay>
          </View>
        ) : (
          <Clay style={styles.listWrap} bodyStyle={styles.list}>
            {myPurchases.map((p, i) => {
              const isLast = i === myPurchases.length - 1;
              return (
                <View
                  key={p.id}
                  style={[styles.row, !isLast && styles.rowDivider]}
                >
                  <View style={styles.rowIcon}>
                    <Coins size={14} color={ACCENT.navy} strokeWidth={2.6} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rowTitle}>
                      {p.quantity} {p.quantity === 1 ? "share" : "shares"}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {sacco.currency_code} {formatMoney(p.value_per_share)} /
                      share · {formatRelative(p.purchased_at)}
                    </Text>
                  </View>
                  <Text style={styles.rowAmount}>
                    +{sacco.currency_code} {formatMoney(p.total_value)}
                  </Text>
                </View>
              );
            })}
          </Clay>
        )}
      </ScrollView>

      {/* ── Buy modal ──────────────────────────────────────── */}
      <Modal
        visible={buyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setBuyOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setBuyOpen(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.modalSheetWrap}>
            <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
              <View
                style={[
                  styles.modalHandle,
                  { backgroundColor: ACCENT.navy },
                ]}
              />

              <View style={styles.modalHeader}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.modalEyebrow}>BUY SHARES</Text>
                  <Text style={styles.modalTitle}>Add to your holdings</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setBuyOpen(false)}
                  hitSlop={10}
                >
                  <X size={20} color={CLAY.ink} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>

              <Text style={styles.modalHelper}>
                Each share is worth {sacco.currency_code}{" "}
                {formatMoney(sacco.share_value)}. Minimum{" "}
                {sacco.minimum_shares_per_member} shares for membership.
              </Text>

              <Text style={styles.fieldLabel}>Quantity</Text>
              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={[
                  styles.qtyWrap,
                  buyError && { borderColor: ACCENT.red },
                ]}
              >
                <TextInput
                  style={styles.qtyInput}
                  value={quantity}
                  onChangeText={(v) => {
                    setQuantity(v.replace(/[^0-9]/g, ""));
                    setBuyError("");
                  }}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={CLAY.inkFaint}
                  autoFocus
                />
                <Text style={styles.qtySuffix}>shares</Text>
              </Clay>
              {buyError ? (
                <Text style={styles.fieldError}>{buyError}</Text>
              ) : null}

              {quickAmounts.length > 0 ? (
                <View style={styles.quickRow}>
                  {quickAmounts.map((v) => (
                    <TouchableOpacity
                      key={v}
                      onPress={() => {
                        setQuantity(String(v));
                        setBuyError("");
                      }}
                      activeOpacity={0.9}
                      style={{ flex: 1 }}
                    >
                      <Clay
                        radius={RADIUS.md}
                        depth={0}
                        shade={CLAY.shadeSoft}
                        bodyStyle={styles.quickChip}
                      >
                        <Text style={styles.quickChipText}>{v}</Text>
                      </Clay>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              {isValidQty ? (
                <Clay
                  inset
                  radius={RADIUS.md}
                  color={CLAY.sunken}
                  bodyStyle={styles.previewRow}
                >
                  <Text style={styles.previewLabel}>Total cost</Text>
                  <Text style={styles.previewValue}>
                    {sacco.currency_code} {formatMoney(purchaseValue)}
                  </Text>
                </Clay>
              ) : null}

              <TouchableOpacity
                onPress={handleConfirmPurchase}
                activeOpacity={0.9}
                disabled={!isValidQty}
                style={{ marginTop: SPACING.sm }}
              >
                <Clay
                  color={ACCENT.navy}
                  radius={RADIUS.lg}
                  depth={1}
                  highlight="rgba(255,255,255,0.30)"
                  shade="rgba(15, 30, 60, 0.42)"
                  bodyStyle={[
                    styles.modalPrimary,
                    !isValidQty && { opacity: 0.55 },
                  ]}
                >
                  <Text style={styles.modalPrimaryText}>
                    Confirm purchase
                  </Text>
                </Clay>
              </TouchableOpacity>
            </Clay>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  StatBlock                                                         */
/* ------------------------------------------------------------------ */

function StatBlock({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
  }>;
  label: string;
  value: string;
  accent?: string;
}) {
  const color = accent ?? CLAY.ink;

  return (
    <Clay radius={RADIUS.lg} depth={1} style={{ flex: 1 }} bodyStyle={styles.statBlock}>
      <View
        style={[
          styles.statIconWrap,
          {
            backgroundColor: accent ? ACCENT.navySoft : CLAY.sunken,
          },
        ]}
      >
        <Icon size={13} color={color} strokeWidth={2.6} />
      </View>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Clay>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: SPACING.xxl },

  /* Back row */
  backRow: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Identity */
  identity: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    alignItems: "flex-start",
  },
  groupName: {
    fontSize: TYPE.h1,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
  },

  /* Hero — my capital */
  heroWrap: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.sm,
  },
  hero: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    gap: 6,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroEyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#FFFFFF",
    opacity: 0.85,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    marginTop: 4,
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  heroMeta: {
    fontSize: 12,
    color: "#FFFFFF",
    opacity: 0.78,
    fontWeight: "600",
  },
  heroMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
    opacity: 0.5,
  },

  /* CTA */
  ctaWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
  },
  primaryBtnText: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },

  /* Non-member note */
  nonMemberWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  nonMemberNote: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: ACCENT.redSoft,
  },
  nonMemberText: {
    fontSize: 12.5,
    color: ACCENT.red,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 18,
  },

  /* Stats strip */
  statsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  statBlock: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: 3,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"],
  },
  statLabel: {
    fontSize: 9.5,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  /* Below-minimum warning */
  warnWrap: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT.amber,
    lineHeight: 17,
  },

  /* Section header */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionMarker: {
    width: 4,
    height: 15,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionTitle: {
    fontSize: TYPE.h3,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  sectionCountPill: {
    minWidth: 26,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: "center",
  },
  sectionCountText: {
    fontSize: 11,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },

  /* Purchase list */
  listWrap: {
    marginHorizontal: SPACING.xl,
  },
  list: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT.navySoft,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  rowMeta: {
    fontSize: 11,
    color: CLAY.inkSoft,
    fontWeight: "600",
  },
  rowAmount: {
    fontSize: 13.5,
    fontWeight: "800",
    color: ACCENT.navy,
    fontVariant: ["tabular-nums"],
  },

  /* Empty state */
  emptyWrap: {
    paddingHorizontal: SPACING.xl,
  },
  emptyCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    gap: SPACING.sm,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    backgroundColor: ACCENT.navySoft,
  },
  emptyCardText: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 18,
    fontWeight: "500",
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
  },
  modalSheetWrap: {
    position: "absolute",
    left: SPACING.sm,
    right: SPACING.sm,
    bottom: 0,
  },
  modalSheet: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: 40,
    gap: SPACING.md,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalEyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: ACCENT.navy,
    letterSpacing: 1.2,
  },
  modalTitle: {
    fontSize: TYPE.h3 + 2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },
  modalHelper: {
    fontSize: 12.5,
    color: CLAY.inkSoft,
    lineHeight: 18,
    fontWeight: "500",
  },

  /* Quantity well */
  fieldLabel: {
    fontSize: TYPE.label,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  qtyWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.md,
  },
  qtyInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    padding: 0,
    letterSpacing: -0.6,
    fontVariant: ["tabular-nums"],
  },
  qtySuffix: {
    fontSize: 14,
    fontWeight: "700",
    color: CLAY.inkSoft,
  },
  fieldError: {
    color: ACCENT.red,
    fontSize: 12,
    fontWeight: "700",
    marginTop: -4,
  },

  /* Quick chips */
  quickRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  quickChip: {
    paddingVertical: SPACING.sm + 4,
    borderRadius: RADIUS.md,
    alignItems: "center",
    backgroundColor: ACCENT.navySoft,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "800",
    color: ACCENT.navy,
    fontVariant: ["tabular-nums"],
  },

  /* Preview row (inset well) */
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  previewLabel: {
    fontSize: 12.5,
    fontWeight: "700",
    color: CLAY.inkSoft,
  },
  previewValue: {
    fontSize: 15,
    fontWeight: "800",
    color: CLAY.ink,
    fontVariant: ["tabular-nums"],
  },
  modalPrimary: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },

  /* Missing state */
  missingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.xl,
  },
  missingCard: {
    padding: SPACING.xl,
    borderRadius: RADIUS.xl,
    alignItems: "center",
    gap: SPACING.sm,
    width: "100%",
    maxWidth: 320,
  },
  missingIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
    backgroundColor: ACCENT.navySoft,
  },
  missingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },
  missingBody: {
    fontSize: 13,
    color: CLAY.inkSoft,
    textAlign: "center",
    lineHeight: 19,
    fontWeight: "500",
  },
  missingCta: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  missingCtaText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});