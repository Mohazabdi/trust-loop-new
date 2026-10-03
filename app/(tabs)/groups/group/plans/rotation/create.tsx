import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
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
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { useCreateRotation, RotationData } from "@/hooks/useCreateRotation";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";

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

const ACCENT = {
  green: "#3E9B62",
  greenSoft: "#DBEFE1",
  red: "#CF6B6B",
  redSoft: "#FAE3E3",
  navy: "#4B6FA6",
  navySoft: "#E1E9F5",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

type Interval = { id: string; label: string; value: string };
type OptionItem = { id: string; label: string; value: string };

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

export default function CreateRotationScreen() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const { groupMemberId: storedGroupMemberId } = useGroupStorage();
  const params = useLocalSearchParams<{
    group_member_id: string;
    group_id: string;
  }>();

  /* ── Resolve group_member_id from 3 sources, in order ────────── */
  /* 1. Route param                                                */
  /* 2. Global store                                               */
  /* 3. Fetched from the group detail hook                         */
  /*                                                               */
  /* Using `||` (not `??`) so empty strings fall through.          */
  const { data: member } = useMemberData();
  const { data: groupMemberDetail } = useGroupMemberDetail(
    params.group_id,
    member?.id,
  );

  const resolvedGroupMemberId =
    params.group_member_id ||
    storedGroupMemberId ||
    groupMemberDetail?.id ||
    undefined;

  const resolvedGroupId = params.group_id;

  const { data: wallet } = useUserWallet(resolvedGroupId);
  const mutation = useCreateRotation();

  /* ── Form state ─────────────────────────────────────────────── */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contribution, setContribution] = useState("");
  const [interval, setInterval] = useState<Interval | null>(null);
  const [lowFunds, setLowFunds] = useState<OptionItem | null>(null);
  const [disbursement, setDisbursement] = useState<OptionItem | null>(null);
  const [penalty, setPenalty] = useState("");
  const [gracePeriod, setGracePeriod] = useState("");
  const [startDate, setStartDate] = useState(new Date());

  /* ── Picker visibility ──────────────────────────────────────── */
  const [showDate, setShowDate] = useState(false);
  const [showInterval, setShowInterval] = useState(false);
  const [showLowFunds, setShowLowFunds] = useState(false);
  const [showDisbursement, setShowDisbursement] = useState(false);

  /* ── Static options ─────────────────────────────────────────── */
  const intervalOptions: Interval[] = [
    { id: "1", label: "Monthly", value: "monthly" },
  ];
  const lowFundsOptions: OptionItem[] = [
    { id: "1", label: "Allow partial contributions", value: "partial" },
    { id: "2", label: "Skip turn if funds are low", value: "skip" },
    { id: "3", label: "Notify and allow manual override", value: "notify" },
  ];
  const disbursementOptions: OptionItem[] = [
    { id: "1", label: "Equal shares", value: "equal" },
    { id: "2", label: "Random", value: "random" },
    { id: "3", label: "By contribution order", value: "order" },
  ];

  /* ── Handlers ───────────────────────────────────────────────── */
  const handleBack = () => router.back();

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

  const handleCreate = async () => {
    console.log(">>> CREATE ROTATION PRESSED >>>", {
      name: name.trim(),
      interval: interval?.value,
      contribution,
      resolvedGroupMemberId,
      resolvedGroupId,
      wallet_id: wallet?.wallet_id,
      params,
      storedGroupMemberId,
      groupMemberDetail_id: groupMemberDetail?.id,
    });

    if (!name.trim()) {
      Alert.alert("Validation", "Please enter a rotation name.");
      return;
    }
    if (!interval) {
      Alert.alert("Validation", "Please select an interval.");
      return;
    }
    if (!contribution.trim() || isNaN(Number(contribution))) {
      Alert.alert("Validation", "Please enter a valid contribution amount.");
      return;
    }
    if (!resolvedGroupId) {
      Alert.alert(
        "Session error",
        "We couldn't identify the group. Go back and open the group again.",
      );
      return;
    }
    if (!resolvedGroupMemberId) {
      Alert.alert(
        "Session error",
        "We couldn't identify your group membership. Wait a moment for the group to load, then try again.",
      );
      return;
    }
    if (!wallet?.wallet_id) {
      Alert.alert(
        "Wallet not ready",
        "The group wallet is still loading. Please wait a moment and try again.",
      );
      return;
    }

    const formData: RotationData = {
      amount_collectable: Number(contribution),
      created_by_id: resolvedGroupMemberId,
      group_id: resolvedGroupId,
      plan_name: name.trim(),
      rotation_description: description.trim(),
      wallet_id: wallet.wallet_id,
    };

    console.log(">>> CREATE ROTATION >>>", formData);

    try {
      await mutation.mutateAsync(formData);
      toast.success("Rotation created");
      router.push({
        pathname: "/(tabs)/groups/group/plans/rotation/myRotations",
      });
    } catch (err: any) {
      toast.error(err?.message ?? "Creation failed");
    }
  };

  const handleCancel = () => {
    Alert.alert("Discard", "Are you sure you want to discard changes?", [
      { text: "No", style: "cancel" },
      { text: "Yes", style: "destructive", onPress: () => router.back() },
    ]);
  };

  /* ── Field components ───────────────────────────────────────── */
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

  const DropdownField = ({
    value,
    placeholder,
    onPress,
  }: {
    value?: string;
    placeholder: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.dropdown}
    >
      <Text
        style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}
        numberOfLines={1}
      >
        {value ?? placeholder}
      </Text>
      <ChevronDown size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
    </TouchableOpacity>
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

        {/* ── Intro ─────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>NEW PLAN</Text>
          <Text style={styles.title}>Set up a rotation</Text>
          <Text style={styles.subtitle}>
            Members contribute each cycle and take turns receiving the pooled
            payout.
          </Text>
        </View>

        {/* ── Section: Basics ───────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Basics</Text>
        </View>

        <Clay bodyStyle={styles.card}>
          <View style={styles.fieldGroup}>
            <FieldLabel required>Rotation name</FieldLabel>
            <Clay
              radius={RADIUS.md}
              depth={0}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.inputWell}
            >
              <TextInput
                style={styles.input}
                placeholder="e.g. Umoja monthly"
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
                placeholder="What's this rotation for?"
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

        {/* ── Section: Schedule ─────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Schedule</Text>
        </View>

        <Clay bodyStyle={styles.card}>
          <View style={styles.fieldGroup}>
            <FieldLabel required>Interval</FieldLabel>
            <DropdownField
              value={interval?.label}
              placeholder="Select interval"
              onPress={() => setShowInterval(true)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel required>Start date</FieldLabel>
            <TouchableOpacity
              onPress={() => setShowDate(true)}
              activeOpacity={0.85}
              style={styles.dropdown}
            >
              <CalendarRange size={16} color={theme.primary} strokeWidth={2.4} />
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
                placeholder="1000"
                placeholderTextColor={CLAY.inkFaint}
                value={contribution}
                onChangeText={setContribution}
                keyboardType="numeric"
              />
            </Clay>
            <Text style={styles.helperText}>
              Amount each member contributes per cycle
            </Text>
          </View>
        </Clay>

        {/* ── Section: Rules ────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionMarker} />
          <Text style={styles.groupLabel}>Rules</Text>
        </View>

        <Clay bodyStyle={styles.card}>
          <View style={styles.fieldGroup}>
            <FieldLabel>Low funds handling</FieldLabel>
            <DropdownField
              value={lowFunds?.label}
              placeholder="Select an option"
              onPress={() => setShowLowFunds(true)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <FieldLabel>Disbursement</FieldLabel>
            <DropdownField
              value={disbursement?.label}
              placeholder="Select a method"
              onPress={() => setShowDisbursement(true)}
            />
          </View>

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <FieldLabel>Penalty amount</FieldLabel>
              <Clay
                radius={RADIUS.md}
                depth={0}
                shade={CLAY.shadeSoft}
                bodyStyle={styles.inputWell}
              >
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  placeholderTextColor={CLAY.inkFaint}
                  value={penalty}
                  onChangeText={setPenalty}
                  keyboardType="numeric"
                />
              </Clay>
            </View>
            <View style={{ flex: 1 }}>
              <FieldLabel>Grace period (days)</FieldLabel>
              <Clay
                radius={RADIUS.md}
                depth={0}
                shade={CLAY.shadeSoft}
                bodyStyle={styles.inputWell}
              >
                <TextInput
                  style={styles.input}
                  placeholder="3"
                  placeholderTextColor={CLAY.inkFaint}
                  value={gracePeriod}
                  onChangeText={setGracePeriod}
                  keyboardType="numeric"
                />
              </Clay>
            </View>
          </View>
        </Clay>

        {/* ── Actions ───────────────────────────────────── */}
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={mutation.isPending}
            activeOpacity={0.9}
          >
            <Clay
              color={theme.primary}
              radius={RADIUS.lg}
              depth={2}
              highlight="rgba(255,255,255,0.34)"
              shade="rgba(12, 45, 22, 0.42)"
              bodyStyle={[
                styles.primaryBtn,
                mutation.isPending && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.primaryBtnText}>
                {mutation.isPending ? "Creating…" : "Create rotation"}
              </Text>
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

      <PickerModal
        visible={showInterval}
        onClose={() => setShowInterval(false)}
        title="Select interval"
        data={intervalOptions}
        onSelect={(item) => {
          setInterval(item);
          setShowInterval(false);
        }}
        isSelected={(item) => interval?.id === item.id}
      />
      <PickerModal
        visible={showLowFunds}
        onClose={() => setShowLowFunds(false)}
        title="Low funds handling"
        data={lowFundsOptions}
        onSelect={(item) => {
          setLowFunds(item);
          setShowLowFunds(false);
        }}
        isSelected={(item) => lowFunds?.id === item.id}
      />
      <PickerModal
        visible={showDisbursement}
        onClose={() => setShowDisbursement(false)}
        title="Disbursement method"
        data={disbursementOptions}
        onSelect={(item) => {
          setDisbursement(item);
          setShowDisbursement(false);
        }}
        isSelected={(item) => disbursement?.id === item.id}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  PickerModal — module scope so identity is stable across renders   */
/* ------------------------------------------------------------------ */

interface PickerModalProps<T extends { id: string; label: string }> {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: T[];
  onSelect: (item: T) => void;
  isSelected: (item: T) => boolean;
}

function PickerModal<T extends { id: string; label: string }>({
  visible,
  onClose,
  title,
  data,
  onSelect,
  isSelected,
}: PickerModalProps<T>) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={pickerStyles.overlay} onPress={onClose}>
        <Pressable style={pickerStyles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={pickerStyles.title}>{title}</Text>
          <FlatList
            data={data}
            keyExtractor={(item) => item.id}
            ItemSeparatorComponent={() => (
              <View style={pickerStyles.separator} />
            )}
            renderItem={({ item }) => {
              const selected = isSelected(item);
              return (
                <TouchableOpacity
                  onPress={() => onSelect(item)}
                  activeOpacity={0.7}
                  style={pickerStyles.row}
                >
                  <Text
                    style={[
                      pickerStyles.rowText,
                      selected && pickerStyles.rowTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {selected ? (
                    <View style={pickerStyles.optionCheck}>
                      <Check size={12} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "70%",
    backgroundColor: CLAY.surface,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(71, 85, 105, 0.14)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: CLAY.ink,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    letterSpacing: -0.3,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CLAY.hairline,
    marginHorizontal: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowText: { fontSize: 14.5, fontWeight: "600", color: CLAY.ink },
  rowTextSelected: { color: ACCENT.green, fontWeight: "800" },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT.green,
    alignItems: "center",
    justifyContent: "center",
  },
});

/* ------------------------------------------------------------------ */
/*  Screen styles                                                     */
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
  fieldRow: { flexDirection: "row", gap: SPACING.md },
  fieldLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  required: { color: ACCENT.red, fontWeight: "800" },
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
    justifyContent: "space-between",
    gap: 8,
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
  dropdownPlaceholder: {
    color: CLAY.inkFaint,
    fontWeight: "500",
  },

  /* Actions */
  actions: { marginTop: SPACING.xxl, gap: SPACING.sm },
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