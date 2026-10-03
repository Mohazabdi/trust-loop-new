import { useMemo, useState } from "react";
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
import { CalendarRange, ChevronLeft } from "lucide-react-native";
import { toast } from "sonner-native";

import { useUserWallet } from "@/hooks/useUserWallet";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";
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
  tealTint: "#EBF5F4",
  tealInk: "#2E5C58",
  red: "#CF6B6B",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

type FrequencyOption = {
  id: SavingsFrequency;
  label: string;
  helper: string;
};

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  { id: "daily", label: "Daily", helper: "Every day" },
  { id: "weekly", label: "Weekly", helper: "Once a week" },
  { id: "monthly", label: "Monthly", helper: "Once a month" },
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

export default function CreateSavingsScreen() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const { groupMemberId: storedGroupMemberId } = useGroupStorage();
  const params = useLocalSearchParams<{
    group_member_id: string;
    group_id: string;
  }>();

  /* Resolve group_member_id from 3 sources */
  const { data: member } = useMemberData();
  const { data: groupMemberDetail } = useGroupMemberDetail(
    params.group_id,
    member?.id
  );

  const resolvedGroupMemberId =
    params.group_member_id ||
    storedGroupMemberId ||
    groupMemberDetail?.id ||
    undefined;

  const resolvedGroupId = params.group_id;

  const { data: wallet } = useUserWallet(resolvedGroupId);
  const createPlan = useSavingsStorage((s) => s.createPlan);

  /* ── Form ───────────────────────────────────────────────────── */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<SavingsFrequency>("monthly");
  const [startDate, setStartDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);

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

  const handleCreate = () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Please enter a plan name.");
      return;
    }
    const targetNum = Number(target);
    const amountNum = Number(amount);
    if (!target.trim() || isNaN(targetNum) || targetNum <= 0) {
      Alert.alert("Validation", "Please enter a valid target amount.");
      return;
    }
    if (!amount.trim() || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert("Validation", "Please enter a valid contribution amount.");
      return;
    }
    if (!resolvedGroupMemberId || !resolvedGroupId) {
      Alert.alert("Session error", "Missing group information.");
      return;
    }

    try {
      createPlan(
        {
          group_id: resolvedGroupId,
          created_by_id: resolvedGroupMemberId,
          wallet_id: wallet?.wallet_id ?? "",
          savings_name: name.trim(),
          savings_description: description.trim(),
          target_amount: targetNum,
          amount_per_contribution: amountNum,
          frequency,
          start_date: startDate.toISOString(),
          currency_code: "KES",
        },
        {
          group_member_id: resolvedGroupMemberId,
          first_name:
            groupMemberDetail?.first_name ?? member?.first_name ?? "You",
          last_name: groupMemberDetail?.last_name ?? member?.last_name ?? "",
        }
      );

      toast.success("Savings plan created");
      router.replace({
        pathname: "/(tabs)/groups/group/plans/savings/mySavings",
        params: {
          group_member_id: resolvedGroupMemberId,
          group_id: resolvedGroupId,
        },
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create plan");
    }
  };

  const handleCancel = () => {
    Alert.alert("Discard", "Discard this savings plan?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const FieldLabel = ({
    children,
    required,
  }: {
    children: string;
    required?: boolean;
  }) => (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Floating back button row ──────────────────── */}
        <View style={styles.backRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Clay radius={18} depth={1} bodyStyle={styles.backBtn}>
              <ChevronLeft size={20} color={CLAY.ink} strokeWidth={2.6} />
            </Clay>
          </TouchableOpacity>
        </View>

        {/* ── Intro ─────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>NEW PLAN</Text>
          <Text style={styles.title}>Set up savings</Text>
          <Text style={styles.subtitle}>
            Define a target and how often members contribute.
          </Text>
        </View>

        {/* ── Section: Basics ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Basics</Text>
        </View>

        <Clay bodyStyle={styles.card}>
          <View style={styles.fieldGroup}>
            <FieldLabel required>Plan name</FieldLabel>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.inputWell}
            >
              <TextInput
                style={styles.input}
                placeholder="e.g. School fees fund"
                placeholderTextColor={CLAY.inkFaint}
                value={name}
                onChangeText={setName}
              />
            </Clay>
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>Description</FieldLabel>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={[styles.inputWell, styles.textAreaWell]}
            >
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What's this savings for?"
                placeholderTextColor={CLAY.inkFaint}
                value={description}
                onChangeText={setDescription}
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
            <FieldLabel required>Target amount</FieldLabel>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.inputWell}
            >
              <TextInput
                style={styles.input}
                placeholder="100000"
                placeholderTextColor={CLAY.inkFaint}
                value={target}
                onChangeText={setTarget}
                keyboardType="numeric"
              />
            </Clay>
            <Text style={styles.helperText}>
              Total the group is saving towards
            </Text>
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel required>Contribution per cycle</FieldLabel>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.inputWell}
            >
              <TextInput
                style={styles.input}
                placeholder="2500"
                placeholderTextColor={CLAY.inkFaint}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </Clay>
            <Text style={styles.helperText}>
              Amount each member contributes each cycle
            </Text>
          </View>
        </Clay>

        {/* ── Section: Schedule ─────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Schedule</Text>
        </View>

        <Clay bodyStyle={styles.card}>
          <View style={styles.fieldGroup}>
            <FieldLabel required>Frequency</FieldLabel>
            <View style={styles.frequencyRow}>
              {FREQUENCY_OPTIONS.map((opt) => {
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
                      bodyStyle={styles.frequencyOption}
                    >
                      <Text
                        style={[
                          styles.frequencyLabel,
                          selected && styles.frequencyLabelSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text
                        style={[
                          styles.frequencyHelper,
                          selected && styles.frequencyHelperSelected,
                        ]}
                      >
                        {opt.helper}
                      </Text>
                    </Clay>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel required>Start date</FieldLabel>
            <TouchableOpacity
              onPress={() => setShowDate(true)}
              activeOpacity={0.85}
              style={styles.dropdown}
            >
              <CalendarRange size={16} color={SAVINGS.teal} strokeWidth={2.4} />
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

        {/* ── Actions ───────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleCreate}
            activeOpacity={0.9}
          >
            <Clay
              color={SAVINGS.teal}
              radius={RADIUS.lg}
              depth={2}
              highlight="rgba(255,255,255,0.34)"
              shade="rgba(30, 70, 66, 0.42)"
              bodyStyle={styles.primaryBtn}
            >
              <Text style={styles.primaryBtnText}>Create plan</Text>
            </Clay>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            activeOpacity={0.9}
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },
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

  /* Intro */
  header: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    gap: 4,
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
    maxWidth: 340,
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

  /* Card wrapping all fields */
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
  required: { color: SAVINGS.red, fontWeight: "800" },
  helperText: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    lineHeight: 16,
    fontWeight: "500",
    marginTop: -2,
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
  frequencyRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  frequencyOption: {
    paddingVertical: SPACING.md + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: "center",
    gap: 2,
  },
  frequencyLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  frequencyLabelSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  frequencyHelper: {
    fontSize: 10,
    color: CLAY.inkFaint,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  frequencyHelperSelected: {
    color: "rgba(255,255,255,0.85)",
  },

  /* Actions */
  actions: {
    marginTop: SPACING.xxl,
    gap: SPACING.sm,
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
    color: "#fff",
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    backgroundColor: CLAY.sunken,
  },
  secondaryBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: CLAY.ink,
  },
});