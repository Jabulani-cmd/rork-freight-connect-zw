import React, { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, TextInput as RNTextInput } from "react-native";
import { Text, Avatar, Button, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore } from "@/lib/store";
import { Colors } from "@/constants/colors";
import {
  ChevronLeft,
  Phone,
  Send,
  DollarSign,
  MapPin,
} from "lucide-react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface ChatMessage {
  _id: string;
  text: string;
  createdAt: Date;
  user: {
    _id: string;
    name: string;
    avatar?: string | null;
  };
  type?: "text" | "quote" | "system";
}

const mockMessages: ChatMessage[] = [
  {
    _id: "1",
    text: "Hi, I can deliver your cargo tomorrow morning",
    createdAt: new Date(Date.now() - 3600000),
    user: { _id: "driver-1", name: "John Mutasa", avatar: null },
  },
  {
    _id: "2",
    text: "That sounds good. What's your best price?",
    createdAt: new Date(Date.now() - 3000000),
    user: { _id: "user", name: "Me", avatar: null },
  },
];

function formatTime(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = m < 10 ? `0${m}` : `${m}`;
  const ap = h >= 12 ? "PM" : "AM";
  return `${hh}:${mm} ${ap}`;
}

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string; driverId?: string }>();
  const { profile, user } = useStore();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>("");
  const [showQuoteInput, setShowQuoteInput] = useState<boolean>(false);
  const [quotePrice, setQuotePrice] = useState<string>("");
  const [otherUser, setOtherUser] = useState<{ id?: string; full_name?: string; avatar_url?: string | null; phone?: string } | null>(null);
  const isDriver = profile?.role === "driver";
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const { data: chatData } = useQuery({
    queryKey: ["chat", id],
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data: messagesData, error } = await supabase
        .from("messages")
        .select(`*, sender:profiles(id, full_name, avatar_url)`)
        .eq("job_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Chat fetch error:", error);
        return mockMessages;
      }

      const { data: jobData } = await supabase
        .from("jobs")
        .select(`*, driver:profiles(id, full_name, avatar_url, phone), cargo_owner:profiles(id, full_name, avatar_url, phone)`)
        .eq("id", id)
        .single();

      if (jobData) {
        const other = isDriver ? jobData.cargo_owner : jobData.driver;
        setOtherUser(other);
      }

      const mapped: ChatMessage[] = (messagesData || []).map((msg: any) => ({
        _id: msg.id,
        text: msg.content,
        createdAt: new Date(msg.created_at),
        user: {
          _id: msg.sender_id,
          name: msg.sender_id === user?.id ? "Me" : msg.sender?.full_name || "User",
          avatar: msg.sender?.avatar_url,
        },
        type: msg.type,
      }));

      return mapped.length > 0 ? mapped : mockMessages;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (chatData) {
      setMessages(chatData);
    }
  }, [chatData]);

  useEffect(() => {
    if (!id) return;

    const subscription = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `job_id=eq.${id}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          const { data: sender } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", newMessage.sender_id)
            .single();

          const formatted: ChatMessage = {
            _id: newMessage.id,
            text: newMessage.content,
            createdAt: new Date(newMessage.created_at),
            user: {
              _id: newMessage.sender_id,
              name: newMessage.sender_id === user?.id ? "Me" : sender?.full_name || "User",
              avatar: sender?.avatar_url,
            },
            type: newMessage.type,
          };

          setMessages((prev) => {
            if (prev.some((m) => m._id === formatted._id)) return prev;
            return [...prev, formatted];
          });
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [id, user?.id]);

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const { error } = await supabase.from("messages").insert({
        job_id: id,
        sender_id: user?.id,
        content: messageText,
        type: "text",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", id] });
    },
  });

  const sendQuoteFromChatMutation = useMutation({
    mutationFn: async () => {
      if (!quotePrice || !user?.id) return;

      await supabase.from("quotes").insert({
        job_id: id,
        driver_id: user.id,
        price: parseFloat(quotePrice),
        deposit_percentage: 50,
        message: `Quote from chat: $${quotePrice}`,
        status: "pending",
      });

      await supabase.from("messages").insert({
        job_id: id,
        sender_id: user.id,
        content: `I've sent a quote: $${quotePrice} (50% deposit required)`,
        type: "system",
      });
    },
    onSuccess: () => {
      setShowQuoteInput(false);
      setQuotePrice("");
      queryClient.invalidateQueries({ queryKey: ["chat", id] });
      queryClient.invalidateQueries({ queryKey: ["job", id] });
    },
  });

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    const local: ChatMessage = {
      _id: `local-${Date.now()}`,
      text,
      createdAt: new Date(),
      user: { _id: user?.id || "user", name: "Me" },
      type: "text",
    };
    setMessages((prev) => [...prev, local]);
    setInputText("");
    sendMessageMutation.mutate(text);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [inputText, sendMessageMutation, user?.id]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      if (item.type === "system") {
        return (
          <View style={styles.systemMessageContainer} testID={`msg-${item._id}`}>
            <Text style={styles.systemMessageText}>{item.text}</Text>
          </View>
        );
      }
      const isMine = item.user._id === (user?.id || "user");
      return (
        <View
          style={[
            styles.bubbleRow,
            isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
          ]}
          testID={`msg-${item._id}`}
        >
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleRight : styles.bubbleLeft,
            ]}
          >
            <Text style={[styles.bubbleText, isMine ? styles.bubbleTextRight : styles.bubbleTextLeft]}>
              {item.text}
            </Text>
            <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    },
    [user?.id],
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} testID="chat-back">
          <ChevronLeft size={24} color={Colors.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Avatar.Text
            size={40}
            label={(otherUser?.full_name || "U").charAt(0).toUpperCase()}
            style={{ backgroundColor: Colors.primary }}
          />
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{otherUser?.full_name || "User"}</Text>
            <Text style={styles.headerStatus}>{otherUser?.phone || "Online"}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton}>
            <Phone size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {showQuoteInput && (
        <View style={styles.quoteBar}>
          <TextInput
            label="Price (USD)"
            value={quotePrice}
            onChangeText={setQuotePrice}
            keyboardType="numeric"
            style={styles.quoteInput}
            mode="outlined"
            dense
            left={<TextInput.Affix text="$" />}
          />
          <Button
            mode="contained"
            onPress={() => sendQuoteFromChatMutation.mutate()}
            loading={sendQuoteFromChatMutation.isPending}
            disabled={!quotePrice || sendQuoteFromChatMutation.isPending}
            style={styles.quoteButton}
          >
            Send
          </Button>
          <TouchableOpacity onPress={() => setShowQuoteInput(false)} style={styles.closeQuoteButton}>
            <Text style={styles.closeQuoteText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {isDriver && (
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowQuoteInput(!showQuoteInput)}
            testID="send-quote-toggle"
          >
            <DollarSign size={18} color={Colors.primary} />
            <Text style={styles.quickActionText}>Send Quote</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction} onPress={() => router.push(`/job/${id}`)}>
            <MapPin size={18} color={Colors.secondary} />
            <Text style={styles.quickActionText}>View Job</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          testID="chat-messages"
        />

        <View style={styles.inputBar}>
          <RNTextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor={Colors.textMuted}
            style={styles.textInput}
            multiline
            testID="chat-input"
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
            disabled={!inputText.trim()}
            testID="chat-send"
          >
            <Send size={22} color={inputText.trim() ? Colors.primary : Colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 8,
  },
  headerInfo: {
    marginLeft: 12,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  headerStatus: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  quickAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary + "10",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  quickActionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500",
  },
  quoteBar: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  quoteInput: {
    flex: 1,
    backgroundColor: Colors.background,
    height: 40,
  },
  quoteButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  closeQuoteButton: {
    paddingHorizontal: 8,
  },
  closeQuoteText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  chatArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bubbleRow: {
    flexDirection: "row",
    marginVertical: 4,
  },
  bubbleRowRight: {
    justifyContent: "flex-end",
  },
  bubbleRowLeft: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bubbleRight: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  bubbleLeft: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: {
    fontSize: 15,
  },
  bubbleTextRight: {
    color: "#fff",
  },
  bubbleTextLeft: {
    color: Colors.text,
  },
  bubbleTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  bubbleTimeRight: {
    color: "rgba(255,255,255,0.7)",
  },
  bubbleTimeLeft: {
    color: Colors.textMuted,
  },
  systemMessageContainer: {
    backgroundColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "center",
    marginVertical: 8,
  },
  systemMessageText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 8,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.background,
    borderRadius: 20,
    color: Colors.text,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: Colors.primary + "15",
  },
  sendButtonDisabled: {
    backgroundColor: "transparent",
  },
});
