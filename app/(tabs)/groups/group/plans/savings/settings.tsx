import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import {
  BellIcon,
  CalendarRange,
  ChevronLeft,
  Pause,
  Play,
  Trash2,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { useGlobalStorage } from "@/store/useGlobalStorage";
import {
  useSavingsStorage,
  type SavingsFrequency,
} from "@/store/useSavingsStorage";

/* ------------------------------------------------------------------ */
/*  Design tokens — claymorphism system                               */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: "#E8EDF5",
  surface: "#F3F6FB",
  surfaceRaised: "#F7FAFE",
  sunken: "#DFE6F0",
  highlight: "#FFFFFF",
  shade: "rgba(148, 163, 184, 0.55)",
  shadeSoft: "rgba(148, 163, 184, 0.32)",
  ink: "#1E293B",
  inkSoft: "#64748B",
  inkFaint: "#94A3B8",
  hairline: "rgba(100, 116, 139, 0.12)",
} as const;

/**
 * Savings-specific muted accent. Same hue as the savings sections
 * elsewhere in the app, desaturated to sit comfortably on the clay
 * canvas instead of glowing off it.
 */
const SAVINGS = {
  teal: "#3D9A92",
  tealSoft: "#DBEFED",
  tealInk: "#2E5C58",
  mint: "#A7E3DE",
  growth: "#3E9B62",
  growthSoft: "#DBEFE1",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
  red: "#CF6B6B",
  redSoft: "#FAE3E3",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const FREQ_OPTIONS: { id: SavingsFrequency; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

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
  style,
  bodyStyle,
}: {
  children: React.ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
  style?: any;
  bodyStyle?: any;
}) {
  const offset = 4 + depth * 2;
  const drop = offset + 2;

  return (
    <View
      style={[
        {
          backgroundColor: color,
          borderRadius: radius,
          shadowColor: shade,
          shadowOffset: { width: drop, height: drop },
          shadowOpacity: 1,
          shadowRadius: drop * 1.9,
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
            shadowRadius: offset * 1.5,
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

export default function SavingsSettingsScreen() {
  const router = useRouter();
  const { setIsNotificationOpen } = useGlobalStorage();
  const params = useLocalSearchParams<{
    plan_id: string;
    group_id: string;
    group_member_id: string;
  }>();

  const plan = useSavingsStorage((s) =>
    s.plans.find((p) => p.savings_plan_id === params.plan_id)
  );
  const updatePlan = useSavingsStorage((s) => s.updatePlan);
  const removePlan = useSavingsStorage((s) => s.removePlan);

  /* Editable fields */
  const [name, setName] = useState(plan?.savings_name ?? "");
  const [description, setDescription] = useState(
    plan?.savings_description ?? ""
  );
  const [target, setTarget] = useState(
    plan ? String(plan.target_amount) : ""
  );
  const [amount, setAmount] = useState(
    plan ? String(plan.amount_per_contribution) : ""
  );
  const [frequency, setFrequency] = useState<SavingsFrequency>(
    plan?.frequency ?? "monthly"
  );
  const [startDate, setStartDate] = useState<Date>(
    plan ? new Date(plan.start_date) : new Date()
  );
  const [showDate, setShowDate] = useState(false);

  useEffect(() => {
    if (plan) {
      setName(plan.savings_name);
      setDescription(plan.savings_description);
      setTarget(String(plan.target_amount));
      setAmount(String(plan.amount_per_contribution));
      setFrequency(plan.frequency);
      setStartDate(new Date(plan.start_date));
    }
  }, [plan?.savings_plan_id]);

  const handleBack = useCallback(() => router.back(), [router]);
  const handleNotifications = useCallback(
    () => setIsNotificationOpen(true),
    [setIsNotificationOpen]
  );

  const onDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setShowDate(false);
    if (selected) setStartDate(selected);
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const handleSave = () => {
    if (!plan) return;
    const targetNum = Number(target);
    const amountNum = Number(amount);
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter a plan name.");
      return;
    }
    if (isNaN(targetNum) || targetNum <= 0) {
      Alert.alert("Validation", "Target amount must be positive.");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Validation", "Contribution amount must be positive.");
      return;
    }

    updatePlan(plan.savings_plan_id, {
      savings_name: name.trim(),
      savings_description: description.trim(),
      target_amount: targetNum,
      amount_per_contribution: amountNum,
      frequency,
      start_date: startDate.toISOString(),
    });

    toast.success("Changes saved");
    router.back();
  };

  const handlePauseResume = () => {
    if (!plan) return;
    const isPaused = plan.savings_status === "paused";
    updatePlan(plan.savings_plan_id, {
      savings_status: isPaused ? "active" : "paused",
    });
    toast(isPaused ? "Plan resumed" : "Plan paused");
  };

  const handleDelete = () => {
    if (!plan) return;
    Alert.alert(
      "Delete plan",
      `This will permanently remove "${plan.savings_name}" and all its contributions. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removePlan(plan.savings_plan_id);
            toast("Plan deleted");
            router.replace({
              pathname: "/(tabs)/groups/group/plans/savings/mySavings",
              params: {
                group_id: params.group_id,
                group_member_id: params.group_member_id,
              },
            });
          },
        },
      ]
    );
  };

  if (!plan) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
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
        <View style={styles.missingWrap}>
          <Clay bodyStyle={styles.missingCard}>
            <Text style={styles.missingTitle}>Plan not found</Text>
            <Text style={styles.missingBody}>
              This savings plan is no longer available.
            </Text>
          </Clay>
        </View>
      </SafeAreaView>
    );
  }

  const isPaused = plan.savings_status === "paused";
  const isCompleted = plan.savings_status === "completed";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Floating back row ─────────────────────────── */}
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

        {/* ── Title block with floating bell ────────────── */}
        <View style={styles.titleBlock}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.eyebrow}>SETTINGS</Text>
            <Text style={styles.title} numberOfLines={2}>
              {plan.savings_name}
            </Text>
            <Text style={styles.subtitle}>
              Edit your plan, pause contributions, or delete it.
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleNotifications}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.bellWrap}
          >
            <Clay radius={18} depth={1} bodyStyle={styles.bellBody}>
              <BellIcon size={20} color={CLAY.ink} strokeWidth={2.4} />
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Section: Basics ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Basics</Text>
        </View>

        <Clay bodyStyle={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Plan name</Text>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.inputWell}
            >
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Plan name"
                placeholderTextColor={CLAY.inkFaint}
              />
            </Clay>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Description</Text>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={[styles.inputWell, styles.textAreaWell]}
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={[styles.input, styles.textArea]}
                placeholder="What's this savings for?"
                placeholderTextColor={CLAY.inkFaint}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Clay>
          </View>
        </Clay>

        {/* ── Section: Target & contribution ────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Target & contribution</Text>
        </View>

        <Clay bodyStyle={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Target amount</Text>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.inputWell}
            >
              <TextInput
                value={target}
                onChangeText={setTarget}
                style={styles.input}
                keyboardType="numeric"
                placeholder="100000"
                placeholderTextColor={CLAY.inkFaint}
              />
            </Clay>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Contribution per cycle</Text>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.inputWell}
            >
              <TextInput
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
                keyboardType="numeric"
                placeholder="2500"
                placeholderTextColor={CLAY.inkFaint}
              />
            </Clay>
          </View>
        </Clay>

        {/* ── Section: Schedule ─────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Schedule</Text>
        </View>

        <Clay bodyStyle={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Frequency</Text>
            <View style={styles.freqRow}>
              {FREQ_OPTIONS.map((opt) => {
                const selected = frequency === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setFrequency(opt.id)}
                    activeOpacity={0.9}
                    style={{ flex: 1 }}
                  >
                    <Clay
                      color={selected ? SAVINGS.teal : CLAY.sunken}
                      radius={RADIUS.md}
                      depth={selected ? 1 : 0}
                      highlight={
                        selected
                          ? "rgba(255,255,255,0.30)"
                          : CLAY.highlight
                      }
                      shade={
                        selected
                          ? "rgba(30, 70, 66, 0.38)"
                          : CLAY.shadeSoft
                      }
                      bodyStyle={styles.freqOption}
                    >
                      <Text
                        style={[
                          styles.freqOptionText,
                          selected && styles.freqOptionTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Clay>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Start date</Text>
            <TouchableOpacity
              onPress={() => setShowDate(true)}
              activeOpacity={0.9}
              style={styles.dropdown}
            >
              <CalendarRange
                size={16}
                color={SAVINGS.teal}
                strokeWidth={2.4}
              />
              <Text style={styles.dropdownText}>{formatDate(startDate)}</Text>
            </TouchableOpacity>
            {showDate ? (
              <DateTimePicker
                value={startDate}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={onDateChange}
              />
            ) : null}
          </View>
        </Clay>

        {/* ── Save ──────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.9}
          style={styles.saveWrap}
        >
          <Clay
            color={SAVINGS.teal}
            radius={RADIUS.lg}
            depth={2}
            highlight="rgba(255,255,255,0.34)"
            shade="rgba(30, 70, 66, 0.42)"
            bodyStyle={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Save changes</Text>
          </Clay>
        </TouchableOpacity>

        {/* ── Section: Status ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Status</Text>
        </View>

        {!isCompleted ? (
          <TouchableOpacity
            onPress={handlePauseResume}
            activeOpacity={0.9}
          >
            <Clay
              bodyStyle={[
                styles.rowAction,
                {
                  borderLeftWidth: 3,
                  borderLeftColor: isPaused
                    ? SAVINGS.growth
                    : SAVINGS.amber,
                },
              ]}
            >
              <View
                style={[
                  styles.rowIcon,
                  {
                    backgroundColor: isPaused
                      ? SAVINGS.growthSoft
                      : SAVINGS.amberSoft,
                  },
                ]}
              >
                {isPaused ? (
                  <Play
                    size={16}
                    color={SAVINGS.growth}
                    strokeWidth={2.6}
                  />
                ) : (
                  <Pause
                    size={16}
                    color={SAVINGS.amber}
                    strokeWidth={2.6}
                  />
                )}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.rowActionTitle}>
                  {isPaused ? "Resume contributions" : "Pause contributions"}
                </Text>
                <Text style={styles.rowActionHelper}>
                  {isPaused
                    ? "Members can contribute again immediately"
                    : "Members can view the plan, but cannot contribute"}
                </Text>
              </View>
            </Clay>
          </TouchableOpacity>
        ) : (
          <Clay
            color={SAVINGS.growthSoft}
            radius={RADIUS.lg}
            depth={0}
            shade={CLAY.shadeSoft}
            bodyStyle={styles.completedNote}
          >
            <Text style={styles.completedNoteText}>
              This plan has reached its target and is now completed.
            </Text>
          </Clay>
        )}

        {/* ── Section: Danger zone ──────────────────────── */}
        <View style={styles.sectionHeader}>
          <View
            style={[
              styles.sectionMarker,
              { backgroundColor: SAVINGS.red },
            ]}
          />
          <Text style={[styles.groupLabel, { color: SAVINGS.red }]}>
            Danger zone
          </Text>
        </View>

        <TouchableOpacity onPress={handleDelete} activeOpacity={0.9}>
          <Clay
            color={SAVINGS.redSoft}
            radius={RADIUS.lg}
            depth={0}
            highlight={CLAY.highlight}
            shade={CLAY.shadeSoft}
            bodyStyle={styles.rowAction}
          >
            <View
              style={[
                styles.rowIcon,
                { backgroundColor: "rgba(207, 107, 107, 0.18)" },
              ]}
            >
              <Trash2 size={16} color={SAVINGS.red} strokeWidth={2.6} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text
                style={[styles.rowActionTitle, { color: SAVINGS.red }]}
              >
                Delete plan
              </Text>
              <Text style={styles.rowActionHelper}>
                Permanently remove this plan and all contributions
              </Text>
            </View>
          </Clay>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
    gap: SPACING.md,
  },

  /* Floating back row */
  backRow: {
    paddingTop: SPACING.lg,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Title block with floating bell */
  titleBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  eyebrow: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: TYPE.h2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    marginTop: 4,
    fontWeight: "500",
    maxWidth: 320,
  },
  bellWrap: { position: "relative" },
  bellBody: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Section labels */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.xl,
    marginBottom: -SPACING.xs,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  /* Card wrapping fields */
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.lg,
  },

  /* Fields */
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  /* Recessed input wells */
  inputWell: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  textAreaWell: {
    paddingVertical: SPACING.md,
  },
  input: {
    fontSize: 14.5,
    color: CLAY.ink,
    fontWeight: "600",
    padding: 0,
    minHeight: 26,
  },
  textArea: {
    minHeight: 66,
    textAlignVertical: "top",
  },

  /* Dropdown */
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: CLAY.sunken,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  dropdownText: {
    fontSize: 14.5,
    color: CLAY.ink,
    fontWeight: "600",
    flex: 1,
  },

  /* Frequency chips */
  freqRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  freqOption: {
    paddingVertical: SPACING.md + 2,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  freqOptionText: {
    fontSize: 13,
    fontWeight: "700",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  freqOptionTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  /* Save */
  saveWrap: {
    marginTop: SPACING.lg,
  },
  primaryBtn: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },

  /* Row actions (pause / delete) */
  rowAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowActionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.2,
  },
  rowActionHelper: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    lineHeight: 16,
    fontWeight: "500",
  },

  /* Completed note */
  completedNote: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  completedNoteText: {
    fontSize: 13,
    color: SAVINGS.growth,
    lineHeight: 19,
    fontWeight: "700",
  },

  /* Missing state */
  missingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
});