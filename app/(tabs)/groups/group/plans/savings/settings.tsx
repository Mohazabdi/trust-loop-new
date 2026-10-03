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

import CustomGroupHeader from "@/components/myGroups/customGroupHeader";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useSavingsStorage, type SavingsFrequency } from "@/store/useSavingsStorage";

const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;
const RADIUS = { sm: 8, md: 12, lg: 16, xl: 20 } as const;
const TYPE = { caption: 11, label: 12, body: 14, h3: 16, h2: 20, h1: 26 } as const;

const SAVINGS = {
  teal: "#0D9488",
  tealDark: "#115E59",
  mintSoft: "#CCFBF1",
} as const;

const FREQ_OPTIONS: { id: SavingsFrequency; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

export default function SavingsSettingsScreen() {
  const router = useRouter();
  const { theme, setIsNotificationOpen } = useGlobalStorage();
  const params = useLocalSearchParams<{
    plan_id: string;
    group_id: string;
    group_member_id: string;
  }>();

  const styles = useMemo(() => makeStyles(theme), [theme]);

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
        <CustomGroupHeader
          groupName="Plan settings"
          leftAction={{ icon: ChevronLeft, action: handleBack }}
          rightAction={{ icon: BellIcon, action: handleNotifications }}
        />
        <View style={{ padding: 40, alignItems: "center" }}>
          <Text style={{ color: theme.textSecondary, fontSize: 14 }}>
            Plan not found.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isPaused = plan.savings_status === "paused";
  const isCompleted = plan.savings_status === "completed";

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <CustomGroupHeader
        groupName="Plan settings"
        leftAction={{ icon: ChevronLeft, action: handleBack }}
        rightAction={{ icon: BellIcon, action: handleNotifications }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.eyebrow}>SETTINGS</Text>
          <Text style={styles.title}>{plan.savings_name}</Text>
          <Text style={styles.subtitle}>
            Edit your plan, pause contributions, or delete it.
          </Text>
        </View>

        {/* Basics */}
        <Text style={styles.groupLabel}>Basics</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Plan name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Plan name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.textArea]}
            placeholder="What's this savings for?"
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Target & contribution */}
        <Text style={styles.groupLabel}>Target & contribution</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Target amount</Text>
          <TextInput
            value={target}
            onChangeText={setTarget}
            style={styles.input}
            keyboardType="numeric"
            placeholder="100000"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Contribution per cycle</Text>
          <TextInput
            value={amount}
            onChangeText={setAmount}
            style={styles.input}
            keyboardType="numeric"
            placeholder="2500"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        {/* Frequency */}
        <Text style={styles.groupLabel}>Schedule</Text>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Frequency</Text>
          <View style={styles.freqRow}>
            {FREQ_OPTIONS.map((opt) => {
              const selected = frequency === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => setFrequency(opt.id)}
                  activeOpacity={0.85}
                  style={[
                    styles.freqOption,
                    selected && {
                      borderColor: SAVINGS.teal,
                      backgroundColor: SAVINGS.mintSoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.freqOptionText,
                      selected && {
                        color: SAVINGS.tealDark,
                        fontWeight: "800",
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Start date</Text>
          <TouchableOpacity
            onPress={() => setShowDate(true)}
            activeOpacity={0.85}
            style={styles.dropdown}
          >
            <CalendarRange size={16} color={SAVINGS.teal} />
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

        {/* Save */}
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.85}
          style={styles.primaryBtn}
        >
          <Text style={styles.primaryBtnText}>Save changes</Text>
        </TouchableOpacity>

        {/* Status actions */}
        <Text style={styles.groupLabel}>Status</Text>

        {!isCompleted ? (
          <TouchableOpacity
            onPress={handlePauseResume}
            activeOpacity={0.85}
            style={styles.rowAction}
          >
            <View
              style={[
                styles.rowIcon,
                {
                  backgroundColor: isPaused
                    ? "rgba(22,163,74,0.1)"
                    : "rgba(217,119,6,0.1)",
                },
              ]}
            >
              {isPaused ? (
                <Play size={16} color="#16A34A" strokeWidth={2.4} />
              ) : (
                <Pause size={16} color="#D97706" strokeWidth={2.4} />
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
          </TouchableOpacity>
        ) : (
          <View style={styles.completedNote}>
            <Text style={styles.completedNoteText}>
              This plan has reached its target and is now completed.
            </Text>
          </View>
        )}

        {/* Danger zone */}
        <Text style={[styles.groupLabel, { color: "#DC2626" }]}>
          Danger zone
        </Text>

        <TouchableOpacity
          onPress={handleDelete}
          activeOpacity={0.85}
          style={[styles.rowAction, styles.dangerAction]}
        >
          <View
            style={[
              styles.rowIcon,
              { backgroundColor: "rgba(220,38,38,0.1)" },
            ]}
          >
            <Trash2 size={16} color="#DC2626" strokeWidth={2.4} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.rowActionTitle, { color: "#DC2626" }]}>
              Delete plan
            </Text>
            <Text style={styles.rowActionHelper}>
              Permanently remove this plan and all contributions
            </Text>
          </View>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: SPACING.xl,
      paddingBottom: SPACING.xxl,
      gap: SPACING.md,
    },
    header: { paddingTop: SPACING.lg, paddingBottom: SPACING.md, gap: 4 },
    eyebrow: {
      fontSize: TYPE.caption,
      fontWeight: "800",
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
    freqRow: {
      flexDirection: "row",
      gap: SPACING.sm,
    },
    freqOption: {
      flex: 1,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: `${theme.text}12`,
      backgroundColor: theme.surface ?? theme.background,
      alignItems: "center",
    },
    freqOptionText: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.text,
    },
    primaryBtn: {
      marginTop: SPACING.lg,
      paddingVertical: 15,
      borderRadius: RADIUS.lg,
      alignItems: "center",
      backgroundColor: SAVINGS.teal,
    },
    primaryBtnText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#fff",
      letterSpacing: 0.2,
    },
    rowAction: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.md,
      padding: SPACING.md + 2,
      borderRadius: RADIUS.lg,
      backgroundColor: theme.surface ?? theme.background,
      borderWidth: 1,
      borderColor: `${theme.text}08`,
    },
    dangerAction: {
      borderColor: "rgba(220,38,38,0.25)",
      backgroundColor: "rgba(220,38,38,0.04)",
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
    },
    rowActionTitle: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.text,
      letterSpacing: -0.2,
    },
    rowActionHelper: {
      fontSize: 11.5,
      color: theme.textSecondary,
      lineHeight: 16,
    },
    completedNote: {
      padding: SPACING.md + 2,
      borderRadius: RADIUS.lg,
      backgroundColor: "rgba(22,163,74,0.06)",
      borderWidth: 1,
      borderColor: "rgba(22,163,74,0.2)",
    },
    completedNoteText: {
      fontSize: 13,
      color: "#166534",
      lineHeight: 19,
    },
  });
}