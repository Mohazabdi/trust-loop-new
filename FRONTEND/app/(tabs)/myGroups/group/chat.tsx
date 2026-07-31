// app/(tabs)/myGroups/group/chat.tsx
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    Platform,
    StyleSheet,
    Animated,
    Keyboard,
  } from "react-native";
  import { useLocalSearchParams, useRouter } from "expo-router";
  import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
  import { ArrowLeft, Send } from "lucide-react-native";
  import { useSafeAreaInsets } from "react-native-safe-area-context";
  
  // Types
  type GroupMember = { id: string; name: string; color?: string };
  type ChatMessage = { id: string; groupId: string; senderId: string; text: string; timestamp: number };
  
  // Dummy data (unchanged)
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
  
  // Professional styling
  const HEADER_BG = "#ffffff";
  const SENT_BUBBLE_COLOR = "#007AFF";
  const RECEIVED_BUBBLE_COLOR = "#E5E5EA";
  const SENT_TEXT_COLOR = "#ffffff";
  const RECEIVED_TEXT_COLOR = "#000000";
  const TIMESTAMP_COLOR = "#8E8E93";
  
  export default function ChatScreen() {
    const { group_id } = useLocalSearchParams<{ group_id: string }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const flatListRef = useRef<FlatList>(null);
    const bottomPadding = useRef(new Animated.Value(0)).current;
  
    // Keyboard listeners to animate bottom padding
    useEffect(() => {
      const showListener = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
        (e) => {
          Animated.timing(bottomPadding, {
            toValue: e.endCoordinates.height,
            duration: e.duration || 250,
            useNativeDriver: false,
          }).start();
          // Scroll to bottom when keyboard opens
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      );
      const hideListener = Keyboard.addListener(
        Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
        (e) => {
          Animated.timing(bottomPadding, {
            toValue: 0,
            duration: e.duration || 200,
            useNativeDriver: false,
          }).start();
        }
      );
      return () => {
        showListener.remove();
        hideListener.remove();
      };
    }, []);
  
    const dummyKey = getDummyGroupKey(group_id);
    const members = dummyMembers[dummyKey] ?? dummyMembers["1"];
    const initialMessages = dummyMessages[dummyKey] ?? dummyMessages["1"];
  
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [inputText, setInputText] = useState("");
    const currentUserId = "u1";
  
    const groupName = useMemo(() => {
      const names: Record<string, string> = {
        "1": "Mama Mboga ROSCA",
        "2": "Tech Savings ASCA",
        "3": "Women Welfare Group",
        "4": "Small Business Loans",
      };
      return names[dummyKey] ?? "Group Chat";
    }, [dummyKey]);
  
    const getSender = (senderId: string) =>
      members.find((m) => m.id === senderId) ?? {
        id: "unknown",
        name: "Unknown",
        color: "#888",
      };
  
    const handleSend = () => {
      if (!inputText.trim()) return;
      const newMsg: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        groupId: group_id,
        senderId: currentUserId,
        text: inputText.trim(),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, newMsg]);
      setInputText("");
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    };
  
    const renderMessage = ({ item }: { item: ChatMessage }) => {
      const isMine = item.senderId === currentUserId;
      const sender = getSender(item.senderId);
      const timeStr = new Date(item.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
  
      return (
        <View
          style={[
            styles.messageRow,
            isMine ? styles.myMessageRow : styles.theirMessageRow,
          ]}
        >
          {!isMine && (
            <View style={[styles.avatar, { backgroundColor: sender.color }]}>
              <Text style={styles.avatarText}>
                {sender.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.bubble,
              isMine ? styles.sentBubble : styles.receivedBubble,
            ]}
          >
            {!isMine && <Text style={styles.senderName}>{sender.name}</Text>}
            <Text
              style={[
                styles.messageText,
                isMine ? styles.sentMessageText : styles.receivedMessageText,
              ]}
            >
              {item.text}
            </Text>
            <Text style={styles.timestamp}>{timeStr}</Text>
          </View>
        </View>
      );
    };
  
    return (
      <Animated.View style={[styles.container, { paddingBottom: bottomPadding }]}>
        {/* Fixed header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <ArrowLeft size={22} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{groupName}</Text>
            <Text style={styles.headerSubtitle}>{members.length} members</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
  
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesContainer}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        />
  
        {/* Input bar - raised slightly with extra bottom margin for industry standard */}
        <View style={[styles.inputBar, { marginBottom: insets.bottom > 0 ? insets.bottom + 4 : 8 }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, !inputText.trim() && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Send size={20} color={inputText.trim() ? "#007AFF" : "#C6C6C8"} />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#FFFFFF",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: HEADER_BG,
      paddingHorizontal: 16,
      paddingBottom: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "#C6C6C8",
    },
    headerBtn: {
      padding: 8,
    },
    headerCenter: {
      flex: 1,
      alignItems: "center",
    },
    headerTitle: {
      fontSize: 17,
      fontWeight: "600",
      color: "#000000",
    },
    headerSubtitle: {
      fontSize: 13,
      color: "#666666",
      marginTop: 2,
    },
    headerRight: {
      width: 38,
    },
    messagesContainer: {
      paddingHorizontal: 12,
      paddingVertical: 16,
      flexGrow: 1,
    },
    messageRow: {
      flexDirection: "row",
      marginBottom: 12,
      alignItems: "flex-end",
    },
    myMessageRow: {
      justifyContent: "flex-end",
    },
    theirMessageRow: {
      justifyContent: "flex-start",
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 8,
    },
    avatarText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600",
    },
    bubble: {
      maxWidth: "80%",
      borderRadius: 20,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    sentBubble: {
      backgroundColor: SENT_BUBBLE_COLOR,
    },
    receivedBubble: {
      backgroundColor: RECEIVED_BUBBLE_COLOR,
    },
    senderName: {
      fontWeight: "600",
      fontSize: 13,
      marginBottom: 2,
      color: "#007AFF",
    },
    messageText: {
      fontSize: 16,
      lineHeight: 20,
    },
    sentMessageText: {
      color: SENT_TEXT_COLOR,
    },
    receivedMessageText: {
      color: RECEIVED_TEXT_COLOR,
    },
    timestamp: {
      alignSelf: "flex-end",
      fontSize: 11,
      color: TIMESTAMP_COLOR,
      marginTop: 4,
    },
    inputBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: "#F8F8F8",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "#C6C6C8",
    },
    input: {
      flex: 1,
      backgroundColor: "#FFFFFF",
      borderRadius: 24,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 16,
      marginRight: 8,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: "#C6C6C8",
    },
    sendBtn: {
      padding: 8,
      borderRadius: 24,
      justifyContent: "center",
      alignItems: "center",
      width: 40,
      height: 40,
    },
  });