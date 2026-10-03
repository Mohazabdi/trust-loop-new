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
import { ArrowLeft, BellIcon, CalendarRange } from "lucide-react-native";
import { toast } from "sonner-native";

import CustomWalletHeader from "@/components/myWallet/customHeader";
import { useUserWallet } from "@/hooks/useUserWallet";
import { useGroupMemberDetail } from "@/hooks/custom/useGroupMemberDetail";
import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useGroupStorage } from "@/store/useGroupStorage";
import {
  useSavingsStorage,
  type SavingsFrequency,
} from "@/store/useSavingsStorage";

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const SAVINGS_TEAL = "#0D9488";

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

export default function CreateSavingsScreen() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const { groupMemberId: storedGroupMemberId } = useGroupStorage();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
          first_name: groupMemberDetail?.first_name ?? member?.first_name ?? "You",
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
      {required ? <Text style={{ color: SAVINGS_TEAL }}> *</Text> : null}
    </Text>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomWalletHeader
        subTitle="Create savings"
        leftAction={{ icon: ArrowLeft, action: () => router.back() }}
        rightAction={{ icon: BellIcon, action: () => {} }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.eyebrow}>NEW PLAN</Text>
          <Text style={styles.title}>Set up savings</Text>
          <Text style={styles.subtitle}>
            Define a target and how often members contribute.
          </Text>
        </View>

        <Text style={styles.groupLabel}>Basics</Text>

        <View style={styles.fieldGroup}>
          <FieldLabel required>Plan name</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder="e.g. School fees fund"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel>Description</FieldLabel>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this savings for?"
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <Text style={styles.groupLabel}>Target & contribution</Text>

        <View style={styles.fieldGroup}>
          <FieldLabel required>Target amount</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder="100000"
            placeholderTextColor={theme.textSecondary}
            value={target}
            onChangeText={setTarget}
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            Total the group is saving towards
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <FieldLabel required>Contribution per cycle</FieldLabel>
          <TextInput
            style={styles.input}
            placeholder="2500"
            placeholderTextColor={theme.textSecondary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <Text style={styles.helperText}>
            Amount each member contributes each cycle
          </Text>
        </View>

        <Text style={styles.groupLabel}>Schedule</Text>

        <View style={styles.fieldGroup}>
          <FieldLabel required>Frequency</FieldLabel>
          <View style={styles.frequencyRow}>
            {FREQUENCY_OPTIONS.map((opt) => {
              const selected = frequency === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setFrequency(opt.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.frequencyOption,
                    selected && {
                      borderColor: SAVINGS_TEAL,
                      backgroundColor: `${SAVINGS_TEAL}0D`,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.frequencyLabel,
                      selected && { color: SAVINGS_TEAL, fontWeight: "700" },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.frequencyHelper}>{opt.helper}</Text>
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
            <CalendarRange size={16} color={SAVINGS_TEAL} />
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

        <View style={styles.actions}>
          <TouchableOpacity
            onPress={handleCreate}
            activeOpacity={0.85}
            style={[styles.primaryBtn, { backgroundColor: SAVINGS_TEAL }]}
          >
            <Text style={styles.primaryBtnText}>Create plan</Text>
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
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xxl,
      gap: SPACING.md,
    },
    header: { paddingTop: SPACING.lg, paddingBottom: SPACING.md, gap: 4 },
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
      gap: 10,
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
    frequencyRow: { flexDirection: "row", gap: SPACING.sm },
    frequencyOption: {
      flex: 1,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      backgroundColor: theme.surface ?? theme.background,
      alignItems: "center",
      gap: 2,
    },
    frequencyLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.text,
    },
    frequencyHelper: {
      fontSize: 10,
      color: theme.textSecondary,
    },
    actions: { marginTop: SPACING.xxl, gap: SPACING.sm },
    primaryBtn: {
      paddingVertical: 15,
      borderRadius: RADIUS.lg,
      alignItems: "center",
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