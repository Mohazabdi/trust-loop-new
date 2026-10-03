// app/(tabs)/groups/group/chat.tsx
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type GroupMember = { id: string; name: string; color?: string };
type ChatMessage = {
  id: string;
  groupId: string;
  senderId: string;
  text: string;
  timestamp: number;
};

/* ------------------------------------------------------------------ */
/*  Dummy data (unchanged)                                            */
/* ------------------------------------------------------------------ */

const dummyMembers: Record<string, GroupMember[]> = {
  "1": [
    { id: "u1", name: "Juma", color: "#2563eb" },
    { id: "u2", name: "Amina", color: "#dc2626" },
    { id: "u3", name: "Wanjiku", color: "#059669" },
    { id: "u4", name: "Ochieng", color: "#ea580c" },
    { id: "u5", name: "Njeri", color: "#7c3aed" },
  ],
  "2": [
    { id: "u1", name: "Juma", color: "#2563eb" },
    { id: "u2", name: "Brian", color: "#0e7490" },
    { id: "u3", name: "Faith", color: "#be185d" },
    { id: "u4", name: "David", color: "#1d4ed8" },
    { id: "u5", name: "Grace", color: "#15803d" },
  ],
  "3": [
    { id: "u1", name: "Juma", color: "#2563eb" },
    { id: "u2", name: "Fatima", color: "#a21caf" },
    { id: "u3", name: "Mwende", color: "#0f766e" },
    { id: "u4", name: "Achieng", color: "#b45309" },
    { id: "u5", name: "Zuri", color: "#4338ca" },
  ],
  "4": [
    { id: "u1", name: "Juma", color: "#2563eb" },
    { id: "u2", name: "Kevin", color: "#075985" },
    { id: "u3", name: "Naomi", color: "#9d174d" },
    { id: "u4", name: "Peter", color: "#1e40af" },
    { id: "u5", name: "Catherine", color: "#166534" },
  ],
};

const dummyMessages: Record<string, ChatMessage[]> = {
  "1": [
    { id: "m1", groupId: "1", senderId: "u2", text: "Sasa Juma! Umeweka pesa ya wiki hii?", timestamp: Date.now() - 3600000 * 3 },
    { id: "m2", groupId: "1", senderId: "u1", text: "Ndio, nimetuma kwa mpesa ya chama jana jioni.", timestamp: Date.now() - 3600000 * 2 },
    { id: "m3", groupId: "1", senderId: "u3", text: "Nimeshafika kwa rotation list; nani anafuata baada ya Amina?", timestamp: Date.now() - 3600000 },
    { id: "m4", groupId: "1", senderId: "u4", text: "Mimi ndiye nafuata, nikipata pesa hii nitanunua mboga zaidi.", timestamp: Date.now() - 1800000 },
    { id: "m5", groupId: "1", senderId: "u5", text: "Sisi sote tupo rada. Pesa itakua kesho.", timestamp: Date.now() - 600000 },
  ],
  "2": [
    { id: "m1", groupId: "2", senderId: "u2", text: "Hey team, nimepush update ya app yetu kwenye GitHub.", timestamp: Date.now() - 86400000 },
    { id: "m2", groupId: "2", senderId: "u1", text: "Poa! Naona, nita-review usiku.", timestamp: Date.now() - 86400000 + 3600000 },
    { id: "m3", groupId: "2", senderId: "u3", text: "Mkumbuke mkutano wa Jumatano kuhusu savings tracker.", timestamp: Date.now() - 43200000 },
    { id: "m4", groupId: "2", senderId: "u4", text: "Nimepata investor anayetaka kujiunga. Atakuwa interested kwenye ASCA.", timestamp: Date.now() - 21600000 },
    { id: "m5", groupId: "2", senderId: "u5", text: "Fiti! Tuongee kesho.", timestamp: Date.now() - 3600000 },
  ],
  "3": [
    { id: "m1", groupId: "3", senderId: "u2", text: "Good morning, ladies! Mkumbuke uchangishaji wa kesho.", timestamp: Date.now() - 7200000 },
    { id: "m2", groupId: "3", senderId: "u1", text: "Asante Fatima. Nimeshachangia yangu jana.", timestamp: Date.now() - 5400000 },
    { id: "m3", groupId: "3", senderId: "u3", text: "Pia mimi, nakuja na rafiki yangu anataka kujoin.", timestamp: Date.now() - 3600000 },
    { id: "m4", groupId: "3", senderId: "u4", text: "Karibu sana! Tunawategemea.", timestamp: Date.now() - 1800000 },
    { id: "m5", groupId: "3", senderId: "u5", text: "Nina recipe mpya ya mandazi, tutafanya bake sale.", timestamp: Date.now() - 600000 },
  ],
  "4": [
    { id: "m1", groupId: "4", senderId: "u2", text: "Juma, loan yako imeidhinishwa, utapata pesa baada ya lunch.", timestamp: Date.now() - 10800000 },
    { id: "m2", groupId: "4", senderId: "u1", text: "Shukrani sana! Nitaongeza stock yangu ya bidhaa.", timestamp: Date.now() - 7200000 },
    { id: "m3", groupId: "4", senderId: "u3", text: "Naombeni muweke loan yangu pia; nimefill form jana.", timestamp: Date.now() - 3600000 },
    { id: "m4", groupId: "4", senderId: "u4", text: "Hakikisha umelipa installment ya mwezi uliopita kwanza.", timestamp: Date.now() - 1800000 },
    { id: "m5", groupId: "4", senderId: "u5", text: "Naweza kusaidia loan processing kwa online.", timestamp: Date.now() - 600000 },
  ],
};

function getDummyGroupKey(groupId: string): string {
  if (["1", "2", "3", "4"].includes(groupId)) return groupId;
  let hash = 0;
  for (let i = 0; i < groupId.length; i++) {
    hash = (hash << 5) - hash + groupId.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % 4;
  return (index + 1).toString();
}

/* ------------------------------------------------------------------ */
/*  Design tokens — balanced claymorphism                             */
/* ------------------------------------------------------------------ */

const CLAY = {
  canvas: "#D9E0EC",
  surface: "#F0F4FA",
  surfaceRaised: "#F7FAFE",
  sunken: "#C8D1DF",
  highlight: "#FFFFFF",
  shade: "rgba(71, 85, 105, 0.42)",
  shadeSoft: "rgba(71, 85, 105, 0.26)",
  ink: "#1A2438",
  inkSoft: "#4A566B",
  inkFaint: "#8A94A8",
  hairline: "rgba(71, 85, 105, 0.14)",
} as const;

const ACCENT = {
  navy: "#2F4F8A",
  navySoft: "#CBD7EE",
  green: "#2F7A4E",
  greenSoft: "#CFE6D8",
  red: "#A64A4A",
  purple: "#5B4B9E",
  purpleSoft: "#DCD5F0",
} as const;

const RADIUS = { sm: 10, md: 14, lg: 20, xl: 26 } as const;
const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 } as const;

/* ------------------------------------------------------------------ */
/*  Screen                                                            */
/* ------------------------------------------------------------------ */

export default function ChatScreen() {
  const { group_id } = useLocalSearchParams<{ group_id: string }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const dummyKey = getDummyGroupKey(group_id);
  const members = dummyMembers[dummyKey] ?? dummyMembers["1"];
  const initialMessages = dummyMessages[dummyKey] ?? dummyMessages["1"];
  const currentUserId = "u1";

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState("");

  const groupName = useMemo(() => {
    const names: Record<string, string> = {
      "1": "Mama Mboga ROSCA",
      "2": "Tech Savings ASCA",
      "3": "Women Welfare Group",
      "4": "Small Business Loans",
    };
    return names[dummyKey] ?? "Group Chat";
  }, [dummyKey]);

  const memberMap = useMemo(() => {
    const map: Record<string, GroupMember> = {};
    for (const m of members) map[m.id] = m;
    return map;
  }, [members]);

  const getSender = useCallback(
    (senderId: string): GroupMember =>
      memberMap[senderId] ?? {
        id: "unknown",
        name: "Unknown",
        color: ACCENT.navySoft,
      },
    [memberMap],
  );

  const scrollToEnd = useCallback((animated = true) => {
    // Defer one frame so FlatList measures the newly added row
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      groupId: group_id,
      senderId: currentUserId,
      text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
    scrollToEnd(true);
  }, [inputText, group_id, scrollToEnd]);

  const canSend = inputText.trim().length > 0;

  /* ---------------- Renderers ---------------- */

  const renderMessage = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const isMine = item.senderId === currentUserId;
      const sender = getSender(item.senderId);

      const prev = messages[index - 1];
      const next = messages[index + 1];
      const sameAsPrev = prev?.senderId === item.senderId;
      const sameAsNext = next?.senderId === item.senderId;

      // Group consecutive messages: hide name when same as prev, hide avatar when same as next
      const showName = !isMine && !sameAsPrev;
      const showAvatar = !isMine && !sameAsNext;
      const isGroupStart = !sameAsPrev;
      const isGroupEnd = !sameAsNext;

      const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      return (
        <View
          style={[
            styles.messageRow,
            isMine ? styles.myMessageRow : styles.theirMessageRow,
            isGroupStart && styles.rowGroupStart,
          ]}
        >
          {!isMine ? (
            <View style={styles.avatarSlot}>
              {showAvatar ? (
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: sender.color ?? ACCENT.navy },
                  ]}
                >
                  <Text style={styles.avatarText}>
                    {sender.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <View
            style={[
              styles.bubble,
              isMine ? styles.sentBubble : styles.receivedBubble,
              isMine && isGroupStart && styles.sentBubbleGroupStart,
              isMine && isGroupEnd && styles.sentBubbleGroupEnd,
              !isMine && isGroupStart && styles.receivedBubbleGroupStart,
              !isMine && isGroupEnd && styles.receivedBubbleGroupEnd,
            ]}
          >
            {showName ? (
              <Text style={[styles.senderName, { color: sender.color ?? ACCENT.navy }]}>
                {sender.name}
              </Text>
            ) : null}

            <Text
              style={[
                styles.messageText,
                isMine ? styles.sentMessageText : styles.receivedMessageText,
              ]}
            >
              {item.text}
            </Text>

            {isGroupEnd ? (
              <Text style={[styles.timestamp, isMine && styles.timestampMine]}>
                {timeStr}
              </Text>
            ) : null}
          </View>
        </View>
      );
    },
    [messages, getSender, currentUserId],
  );

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      {/* Chat header — kept because chat context is essential */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.85}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={CLAY.ink} strokeWidth={2.6} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupName}
          </Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {members.length} member{members.length === 1 ? "" : "s"}
          </Text>
        </View>

        <View style={styles.headerBtnSpacer} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollToEnd(false)}
        />

        {/* Composer */}
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message…"
            placeholderTextColor={CLAY.inkFaint}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            blurOnSubmit={false}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: !canSend }}
          >
            <Send
              size={18}
              color={canSend ? "#FFFFFF" : CLAY.inkFaint}
              strokeWidth={2.6}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/*  Styles                                                            */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: CLAY.canvas },

  /* Header — clay bar */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    backgroundColor: CLAY.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CLAY.hairline,
    shadowColor: CLAY.shadeSoft,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: CLAY.sunken,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBtnSpacer: { width: 40, height: 40 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: CLAY.ink,
    letterSpacing: -0.3,
    maxWidth: "100%",
  },
  headerSubtitle: {
    fontSize: 12,
    color: CLAY.inkSoft,
    fontWeight: "600",
    marginTop: 1,
  },

  /* Messages */
  messagesContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 3,
  },
  rowGroupStart: { marginTop: SPACING.sm },
  myMessageRow: { justifyContent: "flex-end" },
  theirMessageRow: { justifyContent: "flex-start" },

  avatarSlot: { width: 34, marginRight: 6, alignItems: "flex-start" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },

  /* Bubbles */
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: RADIUS.lg,
    gap: 2,
  },
  sentBubble: {
    backgroundColor: ACCENT.navy,
    shadowColor: "rgba(15, 30, 60, 0.35)",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  sentBubbleGroupStart: { borderTopRightRadius: RADIUS.lg },
  sentBubbleGroupEnd: { borderBottomRightRadius: 6 },

  receivedBubble: {
    backgroundColor: CLAY.surface,
    shadowColor: CLAY.shadeSoft,
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 2,
  },
  receivedBubbleGroupStart: { borderTopLeftRadius: RADIUS.lg },
  receivedBubbleGroupEnd: { borderBottomLeftRadius: 6 },

  senderName: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 2,
    letterSpacing: -0.1,
  },
  messageText: { fontSize: 15, lineHeight: 20, fontWeight: "500" },
  sentMessageText: { color: "#FFFFFF" },
  receivedMessageText: { color: CLAY.ink },

  timestamp: {
    alignSelf: "flex-end",
    fontSize: 10,
    color: CLAY.inkFaint,
    fontWeight: "600",
    marginTop: 2,
  },
  timestampMine: { color: "rgba(255,255,255,0.72)" },

  /* Composer */
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: Platform.OS === "ios" ? SPACING.sm : SPACING.md,
    backgroundColor: CLAY.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CLAY.hairline,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: CLAY.canvas,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === "ios" ? 11 : 9,
    paddingBottom: Platform.OS === "ios" ? 11 : 9,
    fontSize: 15,
    fontWeight: "500",
    color: CLAY.ink,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: CLAY.hairline,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: ACCENT.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(15, 30, 60, 0.4)",
    shadowOffset: { width: 2, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnDisabled: {
    backgroundColor: CLAY.sunken,
    shadowOpacity: 0,
    elevation: 0,
  },
});