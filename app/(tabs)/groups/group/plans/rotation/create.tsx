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
  ArrowLeft,
  BellIcon,
  CalendarRange,
  ChevronDown,
  Check,
} from "lucide-react-native";
import { toast } from "sonner-native";

import CustomWalletHeader from "@/components/myWallet/customHeader";
import { useCreateRotation, RotationData } from "@/hooks/useCreateRotation";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

type Interval = { id: string; label: string; value: string };
type OptionItem = { id: string; label: string; value: string };

export default function CreateRotationScreen() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const { groupMemberId: storedGroupMemberId } = useGroupStorage();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
      {required ? <Text style={{ color: theme.primary }}> *</Text> : null}
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
        style={[styles.dropdownText, !value && { color: theme.textSecondary }]}
      >
        {value ?? placeholder}
      </Text>
      <ChevronDown size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomWalletHeader
        subTitle="Create rotation"
        leftAction={{ icon: ArrowLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: () => {} }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>NEW PLAN</Text>
          <Text style={styles.title}>Set up a rotation</Text>
          <Text style={styles.subtitle}>
            Members contribute each cycle and take turns receiving the pooled
            payout.
          </Text>
        </View>

        <Text style={styles.groupLabel}>Basics</Text>

        <View style={styles.fieldGroup}>
          <FieldLabel required>Rotation name</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder="e.g. Umoja monthly"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>Description</FieldLabel>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this rotation for?"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.groupLabel}>Schedule</Text>

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
            <CalendarRange size={16} color={theme.primary} />
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
          <TextInput
            style={styles.input}
            placeholder="1000"
            placeholderTextColor={theme.textSecondary}
            value={contribution}
            onChangeText={setContribution}
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            Amount each member contributes per cycle
          </Text>
        </View>

        <Text style={styles.groupLabel}>Rules</Text>

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
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor={theme.textSecondary}
              value={penalty}
              onChangeText={setPenalty}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FieldLabel>Grace period (days)</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="3"
              placeholderTextColor={theme.textSecondary}
              value={gracePeriod}
              onChangeText={setGracePeriod}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={mutation.isPending}
            activeOpacity={0.85}
            style={[
              styles.primaryBtn,
              { opacity: mutation.isPending ? 0.6 : 1 },
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {mutation.isPending ? "Creating..." : "Create rotation"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCancel}
            activeOpacity={0.85}
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
        <View style={pickerStyles.card}>
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
                    <Check size={16} color="#17690c" strokeWidth={3} />
                  ) : null}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    letterSpacing: -0.3,
  },
  separator: { height: 1, backgroundColor: "rgba(0,0,0,0.06)" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowText: { fontSize: 14.5, fontWeight: "500", color: "#111" },
  rowTextSelected: { color: "#17690c", fontWeight: "700" },
});

/* ------------------------------------------------------------------ */
/*  Screen styles                                                     */
/* ------------------------------------------------------------------ */

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xxl,
      gap: SPACING.md,
    },

    header: {
      paddingTop: SPACING.lg,
      paddingBottom: SPACING.md,
      gap: 4,
    },
    eyebrow: {
      fontSize: TYPE.caption,
      fontWeight: "700",
      color: theme.textSecondary,
      letterSpacing: 1.2,
    },
    title: {
      fontSize: TYPE.h2,
      fontWeight: "800",
      color: theme.text,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 19,
      marginTop: 2,
    },

    groupLabel: {
      fontSize: TYPE.caption,
      fontWeight: "800",
      color: theme.textSecondary,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginTop: SPACING.lg,
      marginBottom: SPACING.xs,
    },

    fieldGroup: { gap: SPACING.sm },
    fieldRow: { flexDirection: "row", gap: SPACING.md },
    fieldLabel: {
      fontSize: TYPE.label,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: 0.2,
    },
    helperText: {
      fontSize: TYPE.caption,
      color: theme.textSecondary,
      marginTop: -2,
    },
    input: {
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14.5,
      color: theme.text,
      backgroundColor: theme.surface ?? theme.background,
    },
    textArea: { minHeight: 80, paddingTop: 12 },
    dropdown: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      borderRadius: RADIUS.md,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: theme.surface ?? theme.background,
    },
    dropdownText: {
      fontSize: 14.5,
      color: theme.text,
      fontWeight: "500",
      flex: 1,
    },

    actions: { marginTop: SPACING.xxl, gap: SPACING.sm },
    primaryBtn: {
      paddingVertical: 15,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      backgroundColor: theme.primary,
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },
    secondaryBtn: {
      paddingVertical: 14,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      borderWidth: 1,
      borderColor: `${theme.text}15`,
    },
    secondaryBtnText: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
    },
  });
}