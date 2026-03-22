
import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import API from '../api/baseAPI';
import { brand, background, text, border } from '../theme/colors';

export default function ChatBotScreen() {
  const { userId, username } = useAuth();

  const [userMessage, setUserMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef(null);

  const sendMessage = async () => {
    const msg = userMessage.trim();
    if (!msg) return;

    setChatHistory((prev) => [...prev, { sender: 'user', text: msg }]);
    setUserMessage('');
    setSending(true);

    try {
      const res = await API.post('/api/chat', {
        message: msg,
        username: username || 'Guest',
        userId: userId || null,
      });

      setChatHistory((prev) => [...prev, { sender: 'bot', text: res.data.reply || 'No response.' }]);
    } catch {
      setChatHistory((prev) => [
        ...prev,
        { sender: 'bot', text: 'Error contacting assistant. Please try again.' },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessage = ({ item, index }) => {
    const isUser = item.sender === 'user';
    return (
      <View
        key={index}
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble,
        ]}
      >
        {!isUser && (
          <Text style={styles.botLabel}>🤖 Assistant</Text>
        )}
        <Text style={[styles.messageText, isUser ? styles.userText : styles.botText]}>
          {item.text}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerIcon}>🏠</Text>
          <View>
            <Text style={styles.headerTitle}>Rental Assistant</Text>
            <Text style={styles.headerSubtitle}>Ask me anything about properties</Text>
          </View>
        </View>

        {/* Chat Window */}
        <FlatList
          ref={flatListRef}
          data={chatHistory}
          renderItem={renderMessage}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.chatContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>Start a Conversation</Text>
              <Text style={styles.emptyText}>
                Ask me about best locations, property types, pricing, or anything rental-related!
              </Text>
              <View style={styles.suggestionsContainer}>
                {[
                  'What are the best areas to rent?',
                  'How much does a 2-bedroom cost?',
                  'What should I look for in a rental?',
                ].map((s, i) => (
                  <TouchableOpacity
                    key={i}
                    style={styles.suggestionChip}
                    onPress={() => setUserMessage(s)}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          }
          onContentSizeChange={() => chatHistory.length > 0 && flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Typing indicator */}
        {sending && (
          <View style={styles.typingIndicator}>
            <ActivityIndicator size="small" color={brand.navyDark} />
            <Text style={styles.typingText}>Assistant is typing...</Text>
          </View>
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={userMessage}
            onChangeText={setUserMessage}
            placeholder="Ask about best locations..."
            placeholderTextColor={text.hint}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!userMessage.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!userMessage.trim() || sending}
          >
            <Text style={styles.sendBtnText}>→</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: background.page },
  flex: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: brand.navyDark,
    padding: 16,
  },
  headerIcon: { fontSize: 32 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: brand.white },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

  chatContainer: {
    flexGrow: 1,
    padding: 16,
    gap: 12,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: text.primary },
  emptyText: {
    fontSize: 14, color: text.muted, textAlign: 'center',
    lineHeight: 20, maxWidth: 280,
  },
  suggestionsContainer: { gap: 8, width: '100%', marginTop: 8 },
  suggestionChip: {
    backgroundColor: background.card,
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: border.DEFAULT,
  },
  suggestionText: { color: text.slate, fontSize: 13 },

  messageBubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 4,
  },
  userBubble: {
    backgroundColor: brand.navyDark,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: background.card,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: border.DEFAULT,
  },
  botLabel: { fontSize: 11, color: text.muted, marginBottom: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  userText: { color: brand.white, fontWeight: '600' },
  botText: { color: text.primary },

  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: { color: text.muted, fontSize: 13 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 4 : 12,
    backgroundColor: background.card,
    borderTopWidth: 1,
    borderTopColor: border.DEFAULT,
  },
  input: {
    flex: 1,
    backgroundColor: background.userInfo,
    borderWidth: 1, borderColor: border.DEFAULT, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: text.primary,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: brand.navyDark,
    width: 44, height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: brand.white, fontSize: 20, fontWeight: '700' },
});
