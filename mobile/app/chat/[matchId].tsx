import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, KeyboardAvoidingView, Platform, Image,
  ActivityIndicator, Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { chatService, matchService } from '../../services/userService';
import { useAuthStore } from '../../store/authStore';
import socketService from '../../services/socketService';
import { Message, Match } from '../../types';
import { Colors, Typography, Spacing } from '../../constants';
import { formatDistanceToNow, format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const flatListRef = useRef<FlatList>(null);

  const [text, setText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch match info
  const { data: matchesData } = useQuery({
    queryKey: ['matches'],
    queryFn: () => matchService.getMatches(),
    select: (res) => res.data,
  });
  const match = matchesData?.find((m) => m._id === matchId);

  // Fetch messages (paginated)
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['messages', matchId],
    queryFn: ({ pageParam = 1 }) => chatService.getMessages(matchId!, pageParam as number),
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage.pagination?.pages ?? 1;
      return allPages.length < total ? allPages.length + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!matchId,
  });

  useEffect(() => {
    if (data) {
      const allMessages = data.pages.flatMap((p) => p.data).reverse();
      setMessages(allMessages);
    }
  }, [data]);

  // Socket setup
  useEffect(() => {
    if (!matchId) return;

    socketService.joinChat(matchId);
    chatService.markSeen(matchId).catch(() => {});

    socketService.on('new-message', (msg: Message) => {
      if (msg.matchId === matchId) {
        setMessages((prev) => [...prev, msg]);
        chatService.markSeen(matchId).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['matches'] });
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    });

    socketService.on('typing', (data: { matchId: string; userId: string; isTyping: boolean }) => {
      if (data.matchId === matchId && data.userId !== user?._id) {
        setPartnerTyping(data.isTyping);
      }
    });

    return () => {
      socketService.leaveChat(matchId);
      socketService.off('new-message', () => {});
      socketService.off('typing', () => {});
    };
  }, [matchId]);

  const sendMutation = useMutation({
    mutationFn: (content: string) => chatService.sendMessage(matchId!, content),
    onMutate: (content) => {
      // Optimistic update
      const optimistic: Message = {
        _id: `temp-${Date.now()}`,
        matchId: matchId!,
        sender: user!._id,
        content,
        type: 'text',
        seen: false,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      flatListRef.current?.scrollToEnd({ animated: true });
    },
    onSuccess: ({ data: newMsg }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id.startsWith('temp-') ? newMsg : m))
      );
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: () => {
      setMessages((prev) => prev.filter((m) => !m._id.startsWith('temp-')));
      Alert.alert('Error', 'Failed to send message');
    },
  });

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    stopTyping();
    sendMutation.mutate(trimmed);
  }, [text]);

  const handleTextChange = (value: string) => {
    setText(value);

    if (!isTyping && value.length > 0) {
      setIsTyping(true);
      socketService.sendTyping(matchId!, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(stopTyping, 2000);
  };

  const stopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      socketService.sendTyping(matchId!, false);
    }
  };

  const handleCall = (type: 'audio' | 'video') => {
    router.push(`/call/${matchId}?type=${type}`);
  };

  const handleUnmatch = () => {
    Alert.alert('Unmatch', `Are you sure you want to unmatch with ${match?.user.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unmatch',
        style: 'destructive',
        onPress: async () => {
          await matchService.unmatch(matchId!);
          queryClient.invalidateQueries({ queryKey: ['matches'] });
          router.back();
        },
      },
    ]);
  };

  const partnerPhoto = match?.user.photos[0] ||
    `https://ui-avatars.com/api/?name=${match?.user.name ?? 'U'}&background=FF3D6B&color=fff`;

  const renderMessage = useCallback(({ item, index }: { item: Message; index: number }) => {
    const isMine = item.sender === user?._id;
    const isOptimistic = item._id.startsWith('temp-');
    const showTime = index === 0 ||
      new Date(item.createdAt).getTime() - new Date(messages[index - 1]?.createdAt).getTime() > 5 * 60 * 1000;

    return (
      <View>
        {showTime && (
          <Text style={styles.timeLabel}>
            {format(new Date(item.createdAt), 'h:mm a')}
          </Text>
        )}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
          <Text style={[styles.bubbleText, isMine ? styles.myBubbleText : styles.theirBubbleText]}>
            {item.content}
          </Text>
          {isMine && (
            <Text style={styles.seenIndicator}>
              {isOptimistic ? '⏳' : item.seen ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    );
  }, [user?._id, messages]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUser}
          onPress={() => router.push(`/profile/${match?.user._id}`)}
        >
          <Image source={{ uri: partnerPhoto }} style={styles.headerAvatar} />
          <View>
            <Text style={styles.headerName}>{match?.user.name ?? 'Match'}</Text>
            <Text style={styles.headerStatus}>
              {partnerTyping ? '✍️ typing...' : 'Active recently'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => handleCall('audio')}>
            <Text style={styles.headerBtnIcon}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => handleCall('video')}>
            <Text style={styles.headerBtnIcon}>📹</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleUnmatch}>
            <Text style={styles.headerBtnIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.1}
        inverted={false}
        ListHeaderComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={Colors.primary} style={{ padding: 10 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Image source={{ uri: partnerPhoto }} style={styles.emptyChatAvatar} />
            <Text style={styles.emptyChatName}>{match?.user.name}</Text>
            <Text style={styles.emptyChatText}>You matched! 🎉 Say hello!</Text>
          </View>
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Typing indicator */}
      {partnerTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>✍️ {match?.user.name} is typing...</Text>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!text.trim() || sendMutation.isPending}
        >
          <Text style={styles.sendBtnIcon}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: { padding: 4 },
  backIcon: { fontSize: 22, color: Colors.textPrimary },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerAvatar: { width: 40, height: 40, borderRadius: 20 },
  headerName: {
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.textPrimary,
  },
  headerStatus: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerBtn: { padding: 8 },
  headerBtnIcon: { fontSize: 20 },
  messagesList: { padding: Spacing.base, paddingBottom: 12 },
  timeLabel: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginVertical: 8,
  },
  bubble: {
    maxWidth: '75%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  myBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bgCard,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: Typography.sizes.base, lineHeight: 22, flex: 1 },
  myBubbleText: { color: '#fff' },
  theirBubbleText: { color: Colors.textPrimary },
  seenIndicator: { fontSize: 10, color: 'rgba(255,255,255,0.7)', alignSelf: 'flex-end' },
  typingIndicator: { paddingHorizontal: Spacing.base, paddingVertical: 6 },
  typingText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bgElevated,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: Typography.sizes.base,
    color: Colors.textPrimary,
    maxHeight: 120,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.bgElevated },
  sendBtnIcon: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  emptyChat: { alignItems: 'center', paddingTop: 60 },
  emptyChatAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: Spacing.md },
  emptyChatName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  emptyChatText: { color: Colors.textSecondary, fontSize: Typography.sizes.base },
});
