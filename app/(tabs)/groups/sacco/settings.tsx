import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
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
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  Lock,
  MapPin,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { SaccoBadge } from "@/components/sacco/SaccoBadge";
import { useMemberData } from "@/hooks/useMemberData";
import { useSaccoStorage } from "@/store/useSaccoStorage";
import { KENYAN_COUNTIES, SASRA_LICENSE_CATEGORIES } from "@/lib/config/sacco.config";
import type { SasraLicenseCategory, SaccoGroupVisibility } from "@/lib/types/sacco";

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

export default function SaccoSettingsScreen() {
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
  const updateSacco = useSaccoStorage((s) => s.updateSacco);
  const removeSacco = useSaccoStorage((s) => s.removeSacco);

  /* ── Form state ─────────────────────────────────────────── */
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shareValue, setShareValue] = useState("");
  const [minShares, setMinShares] = useState("");
  const [monthlyContribution, setMonthlyContribution] = useState("");
  const [county, setCounty] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<SaccoGroupVisibility>("private");
  const [sasraCategory, setSasraCategory] =
    useState<SasraLicenseCategory>("not_regulated");
  const [sasraNumber, setSasraNumber] = useState("");
  const [ministryNumber, setMinistryNumber] = useState("");
  const [quorum, setQuorum] = useState("3");

  const [countyOpen, setCountyOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [countySearch, setCountySearch] = useState("");

  const [saving, setSaving] = useState(false);

  /* ── Access guard ───────────────────────────────────────── */
  const myMemberRow = useMemo(
    () => sacco?.members.find((m) => m.group_member_id === currentMemberId),
    [sacco?.members, currentMemberId]
  );

  const isAdmin = useMemo(() => {
    const role = myMemberRow?.role;
    return role === "admin" || sacco?.created_by_id === currentMemberId;
  }, [myMemberRow?.role, sacco?.created_by_id, currentMemberId]);

  /* ── Hydrate form when SACCO loads ─────────────────────── */
  useEffect(() => {
    if (!sacco) return;
    setName(sacco.group_name);
    setDescription(sacco.description);
    setShareValue(String(sacco.share_value));
    setMinShares(String(sacco.minimum_shares_per_member));
    setMonthlyContribution(
      sacco.monthly_contribution ? String(sacco.monthly_contribution) : ""
    );
    setCounty(sacco.county ?? null);
    setVisibility(sacco.visibility);
    setSasraCategory(sacco.sasra_license_category);
    setSasraNumber(sacco.sasra_registration_number ?? "");
    setMinistryNumber(sacco.ministry_registration_number ?? "");
    setQuorum(String(sacco.loan_approval_quorum));
  }, [sacco?.sacco_id]);

  const handleBack = useCallback(() => router.back(), [router]);

  /* ── Derived ────────────────────────────────────────────── */
  const filteredCounties = useMemo(() => {
    if (!countySearch.trim()) return KENYAN_COUNTIES;
    const q = countySearch.toLowerCase();
    return KENYAN_COUNTIES.filter((c) => c.toLowerCase().includes(q));
  }, [countySearch]);

  const selectedCategory = useMemo(
    () => SASRA_LICENSE_CATEGORIES.find((c) => c.id === sasraCategory),
    [sasraCategory]
  );

  /* ── Handlers ───────────────────────────────────────────── */
  const handleSave = () => {
    if (!sacco) return;

    if (!name.trim()) {
      toast.error("SACCO name is required");
      return;
    }
    const sv = Number(shareValue);
    const ms = Number(minShares);
    const q = Number(quorum);

    if (isNaN(sv) || sv <= 0) {
      toast.error("Share value must be positive");
      return;
    }
    if (isNaN(ms) || ms <= 0) {
      toast.error("Minimum shares must be positive");
      return;
    }
    if (isNaN(q) || q < 2 || q > 10) {
      toast.error("Quorum must be between 2 and 10");
      return;
    }

    const activeCount = sacco.members.filter((m) => m.status === "active").length;
    if (q > activeCount) {
      Alert.alert(
        "Quorum too high",
        `The SACCO only has ${activeCount} active member${
          activeCount === 1 ? "" : "s"
        }. Set quorum to ${activeCount} or fewer.`
      );
      return;
    }

    setSaving(true);
    try {
      updateSacco(sacco.sacco_id, {
        group_name: name.trim(),
        description: description.trim(),
        share_value: sv,
        minimum_shares_per_member: ms,
        monthly_contribution: monthlyContribution.trim()
          ? Number(monthlyContribution)
          : undefined,
        county: county ?? undefined,
        visibility,
        sasra_license_category: sasraCategory,
        sasra_registration_number: sasraNumber.trim() || undefined,
        ministry_registration_number: ministryNumber.trim() || undefined,
        loan_approval_quorum: q,
      });
      toast.success("Settings saved");
      router.back();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!sacco) return;
    Alert.alert(
      "Delete SACCO",
      `This will permanently remove "${sacco.group_name}" and all its shares, loans, and dividends. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeSacco(sacco.sacco_id);
            toast("SACCO deleted");
            router.replace("/(tabs)/groups");
          },
        },
      ]
    );
  };

  /* ── Guards ────────────────────────────────────────────── */

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

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.missingWrap}>
          <Clay bodyStyle={styles.missingCard}>
            <View
              style={[
                styles.missingIcon,
                { backgroundColor: ACCENT.redSoft },
              ]}
            >
              <Lock size={24} color={ACCENT.red} strokeWidth={2.2} />
            </View>
            <Text style={styles.missingTitle}>Admins only</Text>
            <Text style={styles.missingBody}>
              Only SACCO admins can change these settings.
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

  /* ── Render ────────────────────────────────────────────── */

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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

          {/* ── Header ───────────────────────────────────── */}
          <View style={styles.header}>
            <SaccoBadge
              category={sacco.sasra_license_category}
              verified={!!sacco.sasra_verified_at}
              size="sm"
            />
            <Text style={styles.title}>SACCO settings</Text>
            <Text style={styles.subtitle}>
              Edit how the SACCO operates. Changes are visible to all members
              immediately.
            </Text>
          </View>

          {/* ── Basics ───────────────────────────────────── */}
          <SectionLabel>Basics</SectionLabel>

          <Clay bodyStyle={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SACCO name</Text>
              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={styles.inputWell}
              >
                <TextInput
                  value={name}
                  onChangeText={setName}
                  editable={!saving}
                  style={styles.input}
                  maxLength={80}
                />
              </Clay>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Description</Text>
              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={[styles.inputWell, styles.textAreaWell]}
              >
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  editable={!saving}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  style={[styles.input, styles.textArea]}
                  maxLength={240}
                />
              </Clay>
            </View>
          </Clay>

          {/* ── SASRA ────────────────────────────────────── */}
          <SectionLabel>SASRA registration</SectionLabel>

          <Clay bodyStyle={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>License category</Text>
              <TouchableOpacity
                onPress={() => setCategoryOpen(true)}
                activeOpacity={0.9}
              >
                <Clay
                  inset
                  radius={RADIUS.md}
                  color={CLAY.sunken}
                  bodyStyle={styles.dropdown}
                >
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {selectedCategory?.label ?? "Select category"}
                  </Text>
                  <ChevronDown
                    size={16}
                    color={CLAY.inkSoft}
                    strokeWidth={2.4}
                  />
                </Clay>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>SASRA registration number</Text>
              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={styles.inputWell}
              >
                <TextInput
                  value={sasraNumber}
                  onChangeText={setSasraNumber}
                  editable={!saving}
                  autoCapitalize="characters"
                  placeholder="e.g. CS/12345"
                  placeholderTextColor={CLAY.inkFaint}
                  style={styles.input}
                  maxLength={40}
                />
              </Clay>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                Ministry of Cooperatives registration
              </Text>
              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={styles.inputWell}
              >
                <TextInput
                  value={ministryNumber}
                  onChangeText={setMinistryNumber}
                  editable={!saving}
                  autoCapitalize="characters"
                  placeholder="e.g. CS/9876"
                  placeholderTextColor={CLAY.inkFaint}
                  style={styles.input}
                  maxLength={40}
                />
              </Clay>
            </View>

            {sacco.sasra_verified_at ? (
              <Clay
                inset
                radius={RADIUS.md}
                color={ACCENT.greenSoft}
                shade="rgba(20, 60, 30, 0.28)"
                bodyStyle={styles.verifiedBox}
              >
                <ShieldCheck
                  size={14}
                  color={ACCENT.green}
                  strokeWidth={2.6}
                />
                <Text style={styles.verifiedText}>
                  Verified by TrustLoop on{" "}
                  {new Date(sacco.sasra_verified_at).toLocaleDateString()}
                </Text>
              </Clay>
            ) : null}
          </Clay>

          {/* ── Share structure ──────────────────────────── */}
          <SectionLabel>Share structure</SectionLabel>

          <Clay bodyStyle={styles.card}>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Share value</Text>
                <Clay
                  inset
                  radius={RADIUS.md}
                  color={CLAY.sunken}
                  bodyStyle={styles.inputWell}
                >
                  <TextInput
                    value={shareValue}
                    onChangeText={(v) =>
                      setShareValue(v.replace(/[^0-9.]/g, ""))
                    }
                    editable={!saving}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </Clay>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Min shares/member</Text>
                <Clay
                  inset
                  radius={RADIUS.md}
                  color={CLAY.sunken}
                  bodyStyle={styles.inputWell}
                >
                  <TextInput
                    value={minShares}
                    onChangeText={(v) =>
                      setMinShares(v.replace(/[^0-9]/g, ""))
                    }
                    editable={!saving}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </Clay>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Monthly contribution</Text>
              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={styles.inputWell}
              >
                <TextInput
                  value={monthlyContribution}
                  onChangeText={(v) =>
                    setMonthlyContribution(v.replace(/[^0-9.]/g, ""))
                  }
                  editable={!saving}
                  keyboardType="numeric"
                  placeholder="Optional"
                  placeholderTextColor={CLAY.inkFaint}
                  style={styles.input}
                />
              </Clay>
            </View>
          </Clay>

          {/* ── Governance ───────────────────────────────── */}
          <SectionLabel>Governance</SectionLabel>

          <Clay bodyStyle={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Loan approval quorum</Text>
              <Clay
                inset
                radius={RADIUS.md}
                color={CLAY.sunken}
                bodyStyle={styles.inputWell}
              >
                <TextInput
                  value={quorum}
                  onChangeText={(v) => setQuorum(v.replace(/[^0-9]/g, ""))}
                  editable={!saving}
                  keyboardType="numeric"
                  style={styles.input}
                />
              </Clay>
              <Text style={styles.helperText}>
                Number of member approvals required before a loan is
                disbursed. Between 2 and 10.
              </Text>
            </View>
          </Clay>

          {/* ── Location & visibility ────────────────────── */}
          <SectionLabel>Location & visibility</SectionLabel>

          <Clay bodyStyle={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>County</Text>
              <TouchableOpacity
                onPress={() => {
                  setCountySearch("");
                  setCountyOpen(true);
                }}
                activeOpacity={0.9}
              >
                <Clay
                  inset
                  radius={RADIUS.md}
                  color={CLAY.sunken}
                  bodyStyle={styles.dropdown}
                >
                  <MapPin size={14} color={CLAY.inkSoft} strokeWidth={2.4} />
                  <Text
                    style={[
                      styles.dropdownText,
                      !county && styles.dropdownPlaceholder,
                    ]}
                    numberOfLines={1}
                  >
                    {county ?? "Select county"}
                  </Text>
                  <ChevronDown
                    size={16}
                    color={CLAY.inkSoft}
                    strokeWidth={2.4}
                  />
                </Clay>
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Visibility</Text>
              <TouchableOpacity
                onPress={() => setVisibilityOpen(true)}
                activeOpacity={0.9}
              >
                <Clay
                  inset
                  radius={RADIUS.md}
                  color={CLAY.sunken}
                  bodyStyle={styles.dropdown}
                >
                  <Users size={14} color={CLAY.inkSoft} strokeWidth={2.4} />
                  <Text style={styles.dropdownText} numberOfLines={1}>
                    {visibility === "private"
                      ? "Private — invite only"
                      : "Public — discoverable"}
                  </Text>
                  <ChevronDown
                    size={16}
                    color={CLAY.inkSoft}
                    strokeWidth={2.4}
                  />
                </Clay>
              </TouchableOpacity>
            </View>
          </Clay>

          {/* ── Save / Cancel ────────────────────────────── */}
          <View style={styles.actionsWrap}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.9}
              style={{ flex: 1 }}
            >
              <Clay
                color={ACCENT.navy}
                radius={RADIUS.lg}
                depth={1}
                highlight="rgba(255,255,255,0.30)"
                shade="rgba(15, 30, 60, 0.42)"
                bodyStyle={[
                  styles.primaryBtn,
                  saving && { opacity: 0.7 },
                ]}
              >
                <Save size={17} color="#fff" strokeWidth={2.6} />
                <Text style={styles.primaryBtnText}>
                  {saving ? "Saving…" : "Save changes"}
                </Text>
              </Clay>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleBack}
              disabled={saving}
              activeOpacity={0.9}
              style={[
                styles.secondaryBtn,
                saving && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* ── Danger zone ──────────────────────────────── */}
          <View style={styles.dangerLabelRow}>
            <View
              style={[
                styles.sectionMarker,
                { backgroundColor: ACCENT.red },
              ]}
            />
            <Text style={[styles.sectionLabelText, { color: ACCENT.red }]}>
              Danger zone
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleDelete}
            disabled={saving}
            activeOpacity={0.9}
          >
            <Clay
              color={ACCENT.redSoft}
              radius={RADIUS.lg}
              depth={0}
              highlight={CLAY.highlight}
              shade={CLAY.shadeSoft}
              bodyStyle={styles.dangerBtn}
            >
              <Trash2 size={16} color={ACCENT.red} strokeWidth={2.6} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.dangerTitle}>Delete this SACCO</Text>
                <Text style={styles.dangerMeta}>
                  Permanently remove the SACCO and all its data
                </Text>
              </View>
            </Clay>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── County picker modal ────────────────────────────── */}
      <Modal
        visible={countyOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCountyOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCountyOpen(false)}
        />
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[styles.modalHandle, { backgroundColor: ACCENT.navy }]}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select county</Text>
              <TouchableOpacity
                onPress={() => setCountyOpen(false)}
                hitSlop={10}
              >
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <Clay
              inset
              radius={RADIUS.md}
              color={CLAY.sunken}
              bodyStyle={styles.searchBody}
            >
              <Search size={15} color={CLAY.inkSoft} strokeWidth={2.4} />
              <TextInput
                value={countySearch}
                onChangeText={setCountySearch}
                placeholder="Search county"
                placeholderTextColor={CLAY.inkFaint}
                style={styles.searchInput}
                autoFocus
              />
              {countySearch.length > 0 ? (
                <TouchableOpacity
                  onPress={() => setCountySearch("")}
                  hitSlop={8}
                >
                  <X size={14} color={CLAY.inkSoft} strokeWidth={2.4} />
                </TouchableOpacity>
              ) : null}
            </Clay>

            <FlatList
              data={filteredCounties}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: SPACING.md }}
              renderItem={({ item }) => {
                const selected = item === county;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setCounty(item);
                      setCountyOpen(false);
                    }}
                    activeOpacity={0.9}
                    style={styles.modalRowWrap}
                  >
                    <Clay
                      radius={RADIUS.md}
                      depth={0}
                      color={selected ? ACCENT.navyTint : CLAY.sunken}
                      bodyStyle={styles.modalRow}
                    >
                      <Text
                        style={[
                          styles.modalRowTitle,
                          selected && { color: ACCENT.navy },
                        ]}
                      >
                        {item}
                      </Text>
                      {selected ? (
                        <View style={styles.checkCircle}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </View>
                      ) : null}
                    </Clay>
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={styles.modalEmpty}>
                  No county matches "{countySearch}"
                </Text>
              }
            />
          </Clay>
        </View>
      </Modal>

      {/* ── Visibility modal ───────────────────────────────── */}
      <Modal
        visible={visibilityOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVisibilityOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setVisibilityOpen(false)}
        />
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[styles.modalHandle, { backgroundColor: ACCENT.navy }]}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Visibility</Text>
              <TouchableOpacity
                onPress={() => setVisibilityOpen(false)}
                hitSlop={10}
              >
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            {[
              {
                id: "private" as const,
                title: "Private",
                desc: "Members join only by invitation from an admin.",
              },
              {
                id: "public" as const,
                title: "Public",
                desc: "Anyone can discover and request to join this SACCO.",
              },
            ].map((opt) => {
              const selected = visibility === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  onPress={() => {
                    setVisibility(opt.id);
                    setVisibilityOpen(false);
                  }}
                  activeOpacity={0.9}
                  style={styles.modalRowWrap}
                >
                  <Clay
                    radius={RADIUS.md}
                    depth={0}
                    color={selected ? ACCENT.navyTint : CLAY.sunken}
                    bodyStyle={styles.modalRow}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text
                        style={[
                          styles.modalRowTitle,
                          selected && { color: ACCENT.navy },
                        ]}
                      >
                        {opt.title}
                      </Text>
                      <Text style={styles.modalRowDesc}>{opt.desc}</Text>
                    </View>
                    {selected ? (
                      <View style={styles.checkCircle}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </View>
                    ) : null}
                  </Clay>
                </TouchableOpacity>
              );
            })}
          </Clay>
        </View>
      </Modal>

      {/* ── Category modal ─────────────────────────────────── */}
      <Modal
        visible={categoryOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCategoryOpen(false)}
        />
        <View style={styles.modalSheetWrap}>
          <Clay radius={RADIUS.xl} depth={2} bodyStyle={styles.modalSheet}>
            <View
              style={[styles.modalHandle, { backgroundColor: ACCENT.navy }]}
            />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SASRA license category</Text>
              <TouchableOpacity
                onPress={() => setCategoryOpen(false)}
                hitSlop={10}
              >
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: SPACING.md }}>
              {SASRA_LICENSE_CATEGORIES.map((cat) => {
                const selected = cat.id === sasraCategory;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      setSasraCategory(cat.id);
                      setCategoryOpen(false);
                    }}
                    activeOpacity={0.9}
                    style={styles.modalRowWrap}
                  >
                    <Clay
                      radius={RADIUS.md}
                      depth={0}
                      color={selected ? ACCENT.navyTint : CLAY.sunken}
                      bodyStyle={styles.modalRow}
                    >
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text
                          style={[
                            styles.modalRowTitle,
                            selected && { color: ACCENT.navy },
                          ]}
                        >
                          {cat.label}
                        </Text>
                        <Text style={styles.modalRowDesc}>
                          {cat.description}
                        </Text>
                      </View>
                      {selected ? (
                        <View style={styles.checkCircle}>
                          <Check size={12} color="#fff" strokeWidth={3} />
                        </View>
                      ) : null}
                    </Clay>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Clay>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Section helpers                                                   */
/* ------------------------------------------------------------------ */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <View style={styles.sectionLabelRow}>
      <View style={styles.sectionMarker} />
      <Text style={styles.sectionLabelText}>{children}</Text>
    </View>
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

  /* Back row */
  backRow: { paddingTop: SPACING.lg },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Header */
  header: {
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: 6,
    alignItems: "flex-start",
  },
  title: {
    fontSize: TYPE.h2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    fontWeight: "500",
  },

  /* Section headers */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  dangerLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.sm,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionLabelText: {
    fontSize: TYPE.caption,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  /* Cards */
  card: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },

  /* Fields */
  fieldGroup: { gap: SPACING.sm },
  fieldRow: { flexDirection: "row", gap: SPACING.md },
  fieldLabel: {
    fontSize: TYPE.label,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  helperText: {
    fontSize: TYPE.caption,
    color: CLAY.inkSoft,
    lineHeight: 16,
    fontWeight: "500",
  },

  /* Recessed wells */
  inputWell: {
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.sm,
  },
  textAreaWell: { paddingVertical: SPACING.md },
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

  /* Dropdown (recessed) */
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14.5,
    color: CLAY.ink,
    fontWeight: "600",
  },
  dropdownPlaceholder: {
    color: CLAY.inkFaint,
    fontWeight: "500",
  },

  /* Verified banner (recessed green) */
  verifiedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  verifiedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: ACCENT.green,
  },

  /* Actions */
  actionsWrap: {
    flexDirection: "row",
    gap: SPACING.sm,
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
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 15,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CLAY.sunken,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
  },

  /* Danger */
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.lg,
  },
  dangerTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: ACCENT.red,
    letterSpacing: -0.1,
  },
  dangerMeta: {
    fontSize: 11.5,
    color: ACCENT.red,
    opacity: 0.85,
    fontWeight: "600",
  },

  /* Modals */
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
    maxHeight: "85%",
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: 32,
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
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: TYPE.h3 + 2,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.4,
  },

  modalRowWrap: { marginBottom: SPACING.sm },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.md,
  },
  modalRowTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  modalRowDesc: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    lineHeight: 16,
    fontWeight: "500",
  },
  modalEmpty: {
    textAlign: "center",
    color: CLAY.inkSoft,
    fontSize: 13,
    paddingVertical: 24,
    fontWeight: "500",
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: ACCENT.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Search well inside modal */
  searchBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    color: CLAY.ink,
    paddingVertical: 12,
    fontSize: 14.5,
    fontWeight: "600",
  },

  /* Missing / access states */
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