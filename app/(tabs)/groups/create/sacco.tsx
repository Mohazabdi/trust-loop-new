import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
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
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  ExternalLink,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react-native";
import { toast } from "sonner-native";

import { useMemberData } from "@/hooks/useMemberData";
import { useGlobalStorage } from "@/store/useGlobalStorage";
import { useSaccoStorage } from "@/store/useSaccoStorage";
import {
  KENYAN_COUNTIES,
  SACCO_DEFAULTS,
  SASRA,
  SASRA_LICENSE_CATEGORIES,
} from "@/lib/config/sacco.config";
import type {
  SasraLicenseCategory,
  SaccoGroupVisibility,
} from "@/lib/types/sacco";

/* ------------------------------------------------------------------ */
/*  Design tokens — claymorphism system (matches Home/Groups/Create)  */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: "#E8EDF5",
  surface: "#F3F6FB",
  surfaceRaised: "#F7FAFE",
  sunken: "#DFE6F0",
  highlight: "#FFFFFF",
  shade: "rgba(148, 163, 184, 0.55)",
  ink: "#1E293B",
  inkSoft: "#64748B",
  inkFaint: "#94A3B8",
  hairline: "rgba(100, 116, 139, 0.12)",
} as const;

/**
 * SACCO-specific muted accents. These are the same hues used on the SACCO
 * screens elsewhere in the app, desaturated to sit comfortably on the clay
 * canvas instead of glowing off it.
 */
const SACCO = {
  navy: "#4B6FA6",
  navySoft: "#E1E9F5",
  navyTint: "#EDF2FA",
  navyInk: "#2E4A73",
  amber: "#C08A3E",
  amberSoft: "#F7EAD8",
  red: "#CF6B6B",
  redSoft: "#FAE3E3",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

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
  children: ReactNode;
  color?: string;
  radius?: number;
  highlight?: string;
  shade?: string;
  depth?: number;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
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

type FieldErrors = {
  group_name?: string;
  description?: string;
  ministry_registration_number?: string;
  sasra_registration_number?: string;
  share_value?: string;
  minimum_shares_per_member?: string;
  monthly_contribution?: string;
  county?: string;
  min_members?: string;
  max_members?: string;
};

export default function CreateSaccoScreen() {
  const router = useRouter();
  const { theme } = useGlobalStorage();
  const params = useLocalSearchParams<{
    group_member_id?: string;
    group_id?: string;
  }>();

  const { data: member } = useMemberData();
  const createSacco = useSaccoStorage((s) => s.createSacco);

  /* ── Form state ────────────────────────────────────────── */
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");

  const [sasraCategory, setSasraCategory] =
    useState<SasraLicenseCategory>("not_regulated");
  const [sasraNumber, setSasraNumber] = useState("");
  const [ministryNumber, setMinistryNumber] = useState("");

  const [shareValue, setShareValue] = useState(
    String(SACCO_DEFAULTS.SHARE_VALUE)
  );
  const [minShares, setMinShares] = useState(
    String(SACCO_DEFAULTS.MINIMUM_SHARES)
  );
  const [monthlyContribution, setMonthlyContribution] = useState("");

  const [county, setCounty] = useState<string | null>(null);

  const [minMembers, setMinMembers] = useState(
    String(SACCO_DEFAULTS.MIN_MEMBERS)
  );
  const [maxMembers, setMaxMembers] = useState(
    String(SACCO_DEFAULTS.MAX_MEMBERS)
  );
  const [visibility, setVisibility] = useState<SaccoGroupVisibility>("private");

  /* ── Modal state ──────────────────────────────────────── */
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [countyOpen, setCountyOpen] = useState(false);
  const [visibilityOpen, setVisibilityOpen] = useState(false);
  const [countySearch, setCountySearch] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  /* ── Derived ──────────────────────────────────────────── */
  const requiresSasraNumber =
    sasraCategory === "dt_sacco" || sasraCategory === "non_dt_sacco";

  const selectedCategory = useMemo(
    () => SASRA_LICENSE_CATEGORIES.find((c) => c.id === sasraCategory),
    [sasraCategory]
  );

  const filteredCounties = useMemo(() => {
    if (!countySearch.trim()) return KENYAN_COUNTIES;
    const q = countySearch.toLowerCase();
    return KENYAN_COUNTIES.filter((c) => c.toLowerCase().includes(q));
  }, [countySearch]);

  /* ── Handlers ─────────────────────────────────────────── */
  const handleBack = useCallback(() => router.back(), [router]);

  const openSasraPage = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(
        SASRA.LICENSED_SACCOS_PAGE_URL
      );
      if (!supported) {
        toast.error("Could not open SASRA's website");
        return;
      }
      await Linking.openURL(SASRA.LICENSED_SACCOS_PAGE_URL);
    } catch {
      toast.error("Could not open SASRA's website");
    }
  }, []);

  const validate = useCallback((): FieldErrors => {
    const e: FieldErrors = {};

    if (!groupName.trim()) e.group_name = "SACCO name is required.";
    else if (groupName.trim().length < 3)
      e.group_name = "Name must be at least 3 characters.";

    const sv = Number(shareValue);
    if (!shareValue.trim() || isNaN(sv) || sv <= 0)
      e.share_value = "Enter a positive share value.";

    const ms = Number(minShares);
    if (!minShares.trim() || isNaN(ms) || ms <= 0)
      e.minimum_shares_per_member = "Enter a positive number of shares.";

    if (monthlyContribution.trim()) {
      const mc = Number(monthlyContribution);
      if (isNaN(mc) || mc < 0)
        e.monthly_contribution = "Enter a valid amount or leave blank.";
    }

    const minM = Number(minMembers);
    const maxM = Number(maxMembers);
    if (!minMembers.trim() || isNaN(minM) || minM < 3)
      e.min_members = "Minimum members must be at least 3.";
    if (!maxMembers.trim() || isNaN(maxM) || maxM < minM)
      e.max_members = "Maximum members must be greater than the minimum.";

    if (requiresSasraNumber && !sasraNumber.trim()) {
      e.sasra_registration_number = "SASRA registration number is required.";
    }

    return e;
  }, [
    groupName,
    shareValue,
    minShares,
    monthlyContribution,
    minMembers,
    maxMembers,
    requiresSasraNumber,
    sasraNumber,
  ]);

  const handleCreate = useCallback(() => {
    const e = validate();
    setErrors(e);

    if (Object.keys(e).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    if (!member?.id) {
      toast.error("Please sign in to create a SACCO");
      return;
    }

    setSubmitting(true);
    try {
      const sacco = createSacco(
        {
          group_name: groupName.trim(),
          description: description.trim(),
          ministry_registration_number: ministryNumber.trim() || undefined,
          sasra_license_category: sasraCategory,
          sasra_registration_number: requiresSasraNumber
            ? sasraNumber.trim()
            : undefined,
          share_value: Number(shareValue),
          minimum_shares_per_member: Number(minShares),
          monthly_contribution: monthlyContribution.trim()
            ? Number(monthlyContribution)
            : undefined,
          county: county ?? undefined,
          currency_code: SACCO_DEFAULTS.CURRENCY,
          min_members: Number(minMembers),
          max_members: Number(maxMembers),
          visibility,
          loan_approval_quorum: SACCO_DEFAULTS.LOAN_APPROVAL_QUORUM,
        },
        {
          member_id: member.id,
          first_name: member.first_name ?? "",
          last_name: member.last_name ?? "",
        }
      );

      toast.success(`${sacco.group_name} created`);
      router.replace("/(tabs)/groups");
    } catch (err: any) {
      toast.error(err?.message ?? "Could not create SACCO");
    } finally {
      setSubmitting(false);
    }
  }, [
    validate,
    member,
    createSacco,
    groupName,
    description,
    ministryNumber,
    sasraCategory,
    requiresSasraNumber,
    sasraNumber,
    shareValue,
    minShares,
    monthlyContribution,
    county,
    minMembers,
    maxMembers,
    visibility,
    router,
  ]);

  const handleCancel = useCallback(() => {
    Alert.alert("Discard", "Discard this SACCO draft?", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }, [router]);

  /* ── Small helper: section header ─────────────────────── */
  const SectionLabel = ({ children }: { children: ReactNode }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionMarker} />
      <Text style={styles.sectionLabel}>{children}</Text>
    </View>
  );

  /* ── Small helper: field label ────────────────────────── */
  const FieldLabel = ({
    children,
    required,
  }: {
    children: ReactNode;
    required?: boolean;
  }) => (
    <Text style={styles.fieldLabel}>
      {children}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
  );

  /* ── Render ───────────────────────────────────────────── */
  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
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
            <Text style={styles.eyebrow}>NEW SACCO</Text>
            <Text style={styles.title}>Set up a SACCO</Text>
            <Text style={styles.subtitle}>
              Register your cooperative with shares, a member base, and
              multi-signature governance for loans and withdrawals.
            </Text>
          </View>

          {/* ── Section: Basics ───────────────────────────── */}
          <SectionLabel>Basics</SectionLabel>

          <Clay style={styles.block} bodyStyle={styles.card}>
            <View style={styles.fieldGroup}>
              <FieldLabel required>SACCO name</FieldLabel>
              <TextInput
                value={groupName}
                onChangeText={(v) => {
                  setGroupName(v);
                  if (errors.group_name)
                    setErrors((p) => ({ ...p, group_name: undefined }));
                }}
                editable={!submitting}
                placeholder="e.g. Umoja Traders SACCO"
                placeholderTextColor={CLAY.inkFaint}
                style={[
                  styles.input,
                  errors.group_name && styles.inputError,
                ]}
                maxLength={80}
              />
              {errors.group_name ? (
                <Text style={styles.fieldError}>{errors.group_name}</Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel>Description</FieldLabel>
              <TextInput
                value={description}
                onChangeText={setDescription}
                editable={!submitting}
                placeholder="What does this SACCO do?"
                placeholderTextColor={CLAY.inkFaint}
                style={[styles.input, styles.textArea]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={240}
              />
            </View>
          </Clay>

          {/* ── Section: SASRA registration ───────────────── */}
          <SectionLabel>SASRA registration</SectionLabel>

          <Clay
            radius={RADIUS.md}
            depth={0}
            style={styles.infoShell}
            bodyStyle={styles.sasraInfoBox}
          >
            <ShieldCheck size={16} color={SACCO.navy} strokeWidth={2.4} />
            <Text style={styles.sasraInfoText}>
              SASRA does not offer a public API. TrustLoop shows what your
              admin declares and links out to the official register for
              verification.
            </Text>
          </Clay>

          <Clay style={styles.block} bodyStyle={styles.card}>
            <View style={styles.fieldGroup}>
              <FieldLabel>License category</FieldLabel>
              <TouchableOpacity
                onPress={() => setCategoryOpen(true)}
                activeOpacity={0.9}
                style={styles.dropdown}
              >
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {selectedCategory?.label ?? "Select category"}
                </Text>
                <ChevronDown size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
              </TouchableOpacity>
              {selectedCategory ? (
                <Text style={styles.helperText}>
                  {selectedCategory.description}
                </Text>
              ) : null}
            </View>

            {requiresSasraNumber ? (
              <View style={styles.fieldGroup}>
                <FieldLabel required>SASRA registration number</FieldLabel>
                <TextInput
                  value={sasraNumber}
                  onChangeText={(v) => {
                    setSasraNumber(v);
                    if (errors.sasra_registration_number)
                      setErrors((p) => ({
                        ...p,
                        sasra_registration_number: undefined,
                      }));
                  }}
                  editable={!submitting}
                  placeholder="e.g. CS/12345"
                  placeholderTextColor={CLAY.inkFaint}
                  autoCapitalize="characters"
                  style={[
                    styles.input,
                    errors.sasra_registration_number && styles.inputError,
                  ]}
                  maxLength={40}
                />
                {errors.sasra_registration_number ? (
                  <Text style={styles.fieldError}>
                    {errors.sasra_registration_number}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <FieldLabel>Ministry of Cooperatives registration</FieldLabel>
              <TextInput
                value={ministryNumber}
                onChangeText={setMinistryNumber}
                editable={!submitting}
                placeholder="e.g. CS/9876 (optional)"
                placeholderTextColor={CLAY.inkFaint}
                autoCapitalize="characters"
                style={styles.input}
                maxLength={40}
              />
              <Text style={styles.helperText}>
                The registration number issued by the Ministry of Cooperatives.
                This is separate from SASRA authorisation.
              </Text>
            </View>
          </Clay>

          <View style={styles.verifyBlock}>
            <TouchableOpacity
              onPress={openSasraPage}
              activeOpacity={0.9}
              style={styles.verifyLink}
            >
              <ExternalLink size={14} color={SACCO.navy} strokeWidth={2.4} />
              <Text style={styles.verifyLinkText}>
                Verify on SASRA's website
              </Text>
            </TouchableOpacity>
            <Text style={styles.verifyHint}>
              Last checked against SASRA: {SASRA.LAST_VERIFIED}
            </Text>
          </View>

          {/* ── Section: Share structure ──────────────────── */}
          <SectionLabel>Share structure</SectionLabel>

          <Clay style={styles.block} bodyStyle={styles.card}>
            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <FieldLabel required>
                  Share value ({SACCO_DEFAULTS.CURRENCY})
                </FieldLabel>
                <TextInput
                  value={shareValue}
                  onChangeText={(v) => {
                    setShareValue(v.replace(/[^0-9.]/g, ""));
                    if (errors.share_value)
                      setErrors((p) => ({ ...p, share_value: undefined }));
                  }}
                  editable={!submitting}
                  keyboardType="numeric"
                  placeholder="1000"
                  placeholderTextColor={CLAY.inkFaint}
                  style={[
                    styles.input,
                    errors.share_value && styles.inputError,
                  ]}
                />
                {errors.share_value ? (
                  <Text style={styles.fieldError}>{errors.share_value}</Text>
                ) : null}
              </View>

              <View style={{ flex: 1 }}>
                <FieldLabel required>Min shares/member</FieldLabel>
                <TextInput
                  value={minShares}
                  onChangeText={(v) => {
                    setMinShares(v.replace(/[^0-9]/g, ""));
                    if (errors.minimum_shares_per_member)
                      setErrors((p) => ({
                        ...p,
                        minimum_shares_per_member: undefined,
                      }));
                  }}
                  editable={!submitting}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={CLAY.inkFaint}
                  style={[
                    styles.input,
                    errors.minimum_shares_per_member && styles.inputError,
                  ]}
                />
                {errors.minimum_shares_per_member ? (
                  <Text style={styles.fieldError}>
                    {errors.minimum_shares_per_member}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel>
                Monthly contribution ({SACCO_DEFAULTS.CURRENCY})
              </FieldLabel>
              <TextInput
                value={monthlyContribution}
                onChangeText={(v) => {
                  setMonthlyContribution(v.replace(/[^0-9.]/g, ""));
                  if (errors.monthly_contribution)
                    setErrors((p) => ({
                      ...p,
                      monthly_contribution: undefined,
                    }));
                }}
                editable={!submitting}
                keyboardType="numeric"
                placeholder="Optional — leave blank if not applicable"
                placeholderTextColor={CLAY.inkFaint}
                style={[
                  styles.input,
                  errors.monthly_contribution && styles.inputError,
                ]}
              />
              {errors.monthly_contribution ? (
                <Text style={styles.fieldError}>
                  {errors.monthly_contribution}
                </Text>
              ) : null}
            </View>
          </Clay>

          {/* ── Section: Location & capacity ──────────────── */}
          <SectionLabel>Location & capacity</SectionLabel>

          <Clay style={styles.block} bodyStyle={styles.card}>
            <View style={styles.fieldGroup}>
              <FieldLabel>County</FieldLabel>
              <TouchableOpacity
                onPress={() => {
                  setCountySearch("");
                  setCountyOpen(true);
                }}
                activeOpacity={0.9}
                style={styles.dropdown}
              >
                <MapPin size={14} color={CLAY.inkSoft} strokeWidth={2.4} />
                <Text
                  style={[
                    styles.dropdownText,
                    !county && { color: CLAY.inkFaint, fontWeight: "500" },
                  ]}
                  numberOfLines={1}
                >
                  {county ?? "Select county"}
                </Text>
                <ChevronDown size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldRow}>
              <View style={{ flex: 1 }}>
                <FieldLabel required>Min members</FieldLabel>
                <TextInput
                  value={minMembers}
                  onChangeText={(v) => {
                    setMinMembers(v.replace(/[^0-9]/g, ""));
                    if (errors.min_members)
                      setErrors((p) => ({ ...p, min_members: undefined }));
                  }}
                  editable={!submitting}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={CLAY.inkFaint}
                  style={[
                    styles.input,
                    errors.min_members && styles.inputError,
                  ]}
                />
                {errors.min_members ? (
                  <Text style={styles.fieldError}>{errors.min_members}</Text>
                ) : null}
              </View>

              <View style={{ flex: 1 }}>
                <FieldLabel required>Max members</FieldLabel>
                <TextInput
                  value={maxMembers}
                  onChangeText={(v) => {
                    setMaxMembers(v.replace(/[^0-9]/g, ""));
                    if (errors.max_members)
                      setErrors((p) => ({ ...p, max_members: undefined }));
                  }}
                  editable={!submitting}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={CLAY.inkFaint}
                  style={[
                    styles.input,
                    errors.max_members && styles.inputError,
                  ]}
                />
                {errors.max_members ? (
                  <Text style={styles.fieldError}>{errors.max_members}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <FieldLabel>Visibility</FieldLabel>
              <TouchableOpacity
                onPress={() => setVisibilityOpen(true)}
                activeOpacity={0.9}
                style={styles.dropdown}
              >
                <Users size={14} color={CLAY.inkSoft} strokeWidth={2.4} />
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {visibility === "private"
                    ? "Private — invite only"
                    : "Public — discoverable"}
                </Text>
                <ChevronDown size={16} color={CLAY.inkSoft} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>
          </Clay>

          {/* ── Governance note ───────────────────────────── */}
          <View style={styles.govNote}>
            <Text style={styles.govNoteText}>
              Loans and withdrawals will require{" "}
              <Text style={styles.govNoteStrong}>
                {SACCO_DEFAULTS.LOAN_APPROVAL_QUORUM} member approvals
              </Text>
              . You can change this later in SACCO settings.
            </Text>
          </View>

          {/* ── Actions ───────────────────────────────────── */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={submitting}
              activeOpacity={0.9}
              style={{ flex: 1 }}
            >
              <Clay
                color={SACCO.navy}
                radius={RADIUS.lg}
                depth={2}
                highlight="rgba(255,255,255,0.34)"
                shade="rgba(30, 58, 138, 0.38)"
                bodyStyle={[
                  styles.primaryBtn,
                  submitting && { opacity: 0.7 },
                ]}
              >
                <Building2 size={17} color="#fff" strokeWidth={2.4} />
                <Text style={styles.primaryBtnText}>
                  {submitting ? "Creating…" : "Create SACCO"}
                </Text>
              </Clay>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleCancel}
              disabled={submitting}
              activeOpacity={0.9}
              style={[
                styles.secondaryBtn,
                submitting && { opacity: 0.6 },
              ]}
            >
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Category picker modal ─────────────────────────── */}
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
            <View style={styles.modalHandle} />
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
                      if (
                        cat.id !== "dt_sacco" &&
                        cat.id !== "non_dt_sacco"
                      ) {
                        setSasraNumber("");
                        setErrors((p) => ({
                          ...p,
                          sasra_registration_number: undefined,
                        }));
                      }
                    }}
                    activeOpacity={0.9}
                    style={[
                      styles.modalRow,
                      selected && styles.modalRowSelected,
                    ]}
                  >
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text
                        style={[
                          styles.modalRowTitle,
                          selected && { color: SACCO.navyInk },
                        ]}
                      >
                        {cat.label}
                      </Text>
                      <Text style={styles.modalRowDesc}>
                        {cat.description}
                      </Text>
                    </View>
                    {selected ? (
                      <View style={styles.optionCheck}>
                        <Check size={13} color="#fff" strokeWidth={3} />
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Clay>
        </View>
      </Modal>

      {/* ── County picker modal ──────────────────────────── */}
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
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select county</Text>
              <TouchableOpacity
                onPress={() => setCountyOpen(false)}
                hitSlop={10}
              >
                <X size={20} color={CLAY.ink} strokeWidth={2.4} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchWrap}>
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
            </View>

            <FlatList
              data={filteredCounties}
              keyExtractor={(item) => item}
              contentContainerStyle={{ paddingBottom: SPACING.md }}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item === county;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setCounty(item);
                      setCountyOpen(false);
                    }}
                    activeOpacity={0.9}
                    style={[
                      styles.modalRow,
                      selected && styles.modalRowSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalRowTitle,
                        selected && { color: SACCO.navyInk },
                      ]}
                    >
                      {item}
                    </Text>
                    {selected ? (
                      <View style={styles.optionCheck}>
                        <Check size={13} color="#fff" strokeWidth={3} />
                      </View>
                    ) : null}
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

      {/* ── Visibility picker modal ───────────────────────── */}
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
            <View style={styles.modalHandle} />
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
                  style={[
                    styles.modalRow,
                    selected && styles.modalRowSelected,
                  ]}
                >
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text
                      style={[
                        styles.modalRowTitle,
                        selected && { color: SACCO.navyInk },
                      ]}
                    >
                      {opt.title}
                    </Text>
                    <Text style={styles.modalRowDesc}>{opt.desc}</Text>
                  </View>
                  {selected ? (
                    <View style={styles.optionCheck}>
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </Clay>
        </View>
      </Modal>
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

  /* Floating back button row */
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
  header: { paddingTop: SPACING.sm, paddingBottom: SPACING.sm, gap: 4 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: CLAY.inkFaint,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 13,
    color: CLAY.inkSoft,
    lineHeight: 19,
    fontWeight: "500",
    marginTop: 2,
    maxWidth: 340,
  },

  /* Sections */
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: SPACING.xl,
    marginBottom: SPACING.xs,
  },
  sectionMarker: {
    width: 4,
    height: 14,
    borderRadius: 2,
    backgroundColor: CLAY.ink,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: CLAY.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  block: {},
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
  required: { color: SACCO.red, fontWeight: "800" },
  helperText: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    lineHeight: 16,
    fontWeight: "500",
  },
  fieldError: {
    fontSize: 11.5,
    fontWeight: "700",
    color: SACCO.red,
    marginTop: 2,
  },

  /* Inputs — recessed wells inside the raised clay card */
  input: {
    backgroundColor: CLAY.sunken,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md + 2,
    paddingVertical: Platform.OS === "ios" ? 14 : 11,
    color: CLAY.ink,
    fontSize: 14.5,
    fontWeight: "600",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  inputError: {
    borderColor: SACCO.red,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 84,
    paddingTop: Platform.OS === "ios" ? 14 : 12,
    lineHeight: 20,
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
    flex: 1,
    fontSize: 14.5,
    color: CLAY.ink,
    fontWeight: "600",
  },

  /* SASRA info shell — soft tinted clay */
  infoShell: {
    borderRadius: RADIUS.md,
  },
  sasraInfoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: SACCO.navyTint,
  },
  sasraInfoText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    color: SACCO.navyInk,
    lineHeight: 17,
  },

  /* Verify block */
  verifyBlock: { marginTop: SPACING.sm, gap: 6 },
  verifyLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    backgroundColor: CLAY.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  verifyLinkText: {
    fontSize: 13,
    fontWeight: "700",
    color: SACCO.navy,
    letterSpacing: 0.1,
  },
  verifyHint: {
    fontSize: 10.5,
    color: CLAY.inkFaint,
    textAlign: "center",
    fontWeight: "500",
  },

  /* Governance note */
  govNote: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: SACCO.amberSoft,
  },
  govNoteText: {
    fontSize: 12,
    color: SACCO.amber,
    lineHeight: 17,
    fontWeight: "500",
  },
  govNoteStrong: { fontWeight: "800" },

  /* Actions */
  actions: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginTop: SPACING.xxl,
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
    letterSpacing: -0.2,
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
    fontSize: 14.5,
    fontWeight: "700",
    color: CLAY.ink,
  },

  /* Modals */
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: 32,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: CLAY.sunken,
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
  },

  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    backgroundColor: CLAY.sunken,
  },
  modalRowSelected: {
    backgroundColor: SACCO.navyTint,
  },
  modalRowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: CLAY.ink,
    letterSpacing: -0.1,
  },
  modalRowDesc: {
    fontSize: 11.5,
    color: CLAY.inkSoft,
    lineHeight: 16,
    fontWeight: "500",
  },
  optionCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: SACCO.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  modalEmpty: {
    textAlign: "center",
    color: CLAY.inkSoft,
    fontSize: 13,
    paddingVertical: 24,
    fontWeight: "500",
  },

  /* Search — recessed well inside clay sheet */
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: SPACING.md + 2,
    borderRadius: RADIUS.md,
    backgroundColor: CLAY.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
    marginBottom: SPACING.md,
  },
  searchInput: {
    flex: 1,
    color: CLAY.ink,
    paddingVertical: 11,
    fontSize: 14.5,
    fontWeight: "600",
  },
});