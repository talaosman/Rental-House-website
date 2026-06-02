import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { chatService } from '../services/chat.service';
import { FONTS } from '../constants/fonts';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
}

export default function ChatbotScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      text: `Hi ${user?.username?.split(' ')[0] || 'there'}! I'm your RentHouse AI assistant. I can help you find properties, check availability, compare prices, and more. What are you looking for?`,
      isUser: false,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), text, isUser: true };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await chatService.send(text, user?.username, user?.id);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: res.data?.reply || res.data || 'Sorry, I could not understand that.',
        isUser: false,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: 'Connection error. Please try again.', isUser: false },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageRow, item.isUser ? styles.userRow : styles.botRow]}>
      {!item.isUser && (
        <View style={styles.botAvatar}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
        </View>
      )}
      <View style={[styles.bubble, item.isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.bubbleText, item.isUser ? styles.userBubbleText : styles.botBubbleText]}>
          {item.text}
        </Text>
      </View>
    </View>
  );

  const quickReplies = ['Find apartments', 'Budget under $1000', 'Most popular homes', '2 bedroom houses'];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

      {messages.length === 1 && (
        <View style={styles.quickReplies}>
          {quickReplies.map((reply) => (
            <TouchableOpacity
              key={reply}
              style={styles.quickReply}
              onPress={() => { setInput(reply); }}
            >
              <Text style={styles.quickReplyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#2C3E50" />
          <Text style={styles.typingText}>AI is thinking...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask me anything..."
          placeholderTextColor="#999999"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f6fa' },
  messageList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  userRow: { justifyContent: 'flex-end' },
  botRow: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#2C3E50',
    justifyContent: 'center', alignItems: 'center', marginRight: 8,
  },
  bubble: {
    maxWidth: '75%', borderRadius: 16, padding: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3, elevation: 1,
  },
  userBubble: { backgroundColor: '#2C3E50', borderBottomRightRadius: 4 },
  botBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 21, fontFamily: FONTS.body },
  userBubbleText: { color: '#fff' },
  botBubbleText: { color: '#2C3E50' },
  quickReplies: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  quickReply: {
    borderWidth: 1, borderColor: '#2C3E50', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  quickReplyText: { color: '#2C3E50', fontSize: 13, fontFamily: FONTS.body },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  typingText: { color: '#7f8c8d', fontSize: 13, fontFamily: FONTS.body },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', padding: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ecf0f1', gap: 10,
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#dfe6e9', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    backgroundColor: '#f8f9fa', maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#2C3E50', borderRadius: 22,
    width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#bdc3c7' },
});
