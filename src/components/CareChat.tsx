import React, { useEffect, useState, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Send, MessageCircle } from 'lucide-react-native';
import { CareMessage, subscribeToChatMessages, sendChatMessage } from '../services/chatService';
import { ResponsiveContainer } from './ui/ResponsiveContainer';
import * as Haptics from 'expo-haptics';

type Role = 'patient' | 'caregiver';

export function CareChat({ patientId, role, title }: { patientId: string; role: Role; title: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!patientId) return;

    // Realtime Firestore subscription
    const unsubscribe = subscribeToChatMessages(patientId, (incoming) => {
      setMessages(incoming);
      // Auto-scroll to bottom on new messages
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => unsubscribe();
  }, [patientId]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || isSending) return;

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}
    setDraft('');
    setIsSending(true);

    try {
      await sendChatMessage(patientId, role, body);
    } catch (e) {
      console.warn('Message send error:', e);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#FAF7F2' }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ResponsiveContainer maxWidth="md" className="flex-1">
        {/* Header */}
        <View className="pt-12 px-5 pb-3 flex-row items-center border-b border-[#E2DDD5] bg-white">
          <TouchableOpacity 
            onPress={() => router.back()} 
            className="w-10 h-10 bg-white border border-[#CBD5E1] rounded-full items-center justify-center mr-3"
            style={{
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <ArrowLeft size={18} color="#1E293B" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-xl text-[#1E293B] font-bold" style={{ fontFamily: 'Nunito-Bold' }}>
              {title}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <View className="w-2 h-2 rounded-full mr-1.5 bg-[#1F8A5D]" />
              <Text 
                className="text-xs font-bold text-[#16704A]"
                style={{ fontFamily: 'Nunito-Bold' }}
              >
                Direct Realtime Connection
              </Text>
            </View>
          </View>
        </View>

        {/* Message Feed */}
        {messages.length === 0 ? (
          <View className="flex-1 justify-center items-center p-6">
            <View className="w-16 h-16 rounded-3xl bg-[#EAF7EE] border border-[#BDE5CB] items-center justify-center mb-3">
              <MessageCircle size={30} color="#16704A" />
            </View>
            <Text className="text-lg font-bold text-[#1E293B] text-center" style={{ fontFamily: 'Nunito-Bold' }}>
              {role === 'caregiver' ? 'Message your loved one' : 'Message your family'}
            </Text>
            <Text className="text-xs text-[#64748B] text-center mt-1 font-semibold max-w-xs leading-relaxed" style={{ fontFamily: 'Nunito-SemiBold' }}>
              Send short comforting notes, voice prompts, and daily updates. Messages arrive in real-time.
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 18, paddingBottom: 16 }}
            renderItem={({ item }) => {
              const mine = item.sender === role;
              return (
                <View 
                  className={`mb-2.5 max-w-[82%] p-4 rounded-3xl ${
                    mine 
                      ? 'self-end bg-[#16704A] rounded-br-sm' 
                      : 'self-start bg-white border border-[#E2DDD5] rounded-bl-sm'
                  }`}
                  style={{
                    shadowColor: mine ? '#16704A' : '#473E35',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: mine ? 0.15 : 0.04,
                    shadowRadius: 6,
                    elevation: 1,
                  }}
                >
                  <Text 
                    className={`text-base leading-relaxed font-semibold ${mine ? 'text-white' : 'text-[#1E293B]'}`}
                    style={{ fontFamily: 'Nunito-SemiBold' }}
                  >
                    {item.body}
                  </Text>
                  <Text 
                    className={`text-[10px] mt-1 text-right font-medium ${mine ? 'text-white/70' : 'text-[#94A3B8]'}`}
                  >
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              );
            }}
          />
        )}

        {/* Chat Input Bar */}
        <View className="flex-row items-center p-3.5 gap-2.5 bg-white border-t border-[#E2DDD5]">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={role === 'caregiver' ? 'Send a comforting message to patient…' : 'Type a message to your family…'}
            placeholderTextColor="#94A3B8"
            className="flex-1 min-h-[48px] bg-[#FAF8F5] border border-[#CBD5E1] rounded-2xl px-4 text-base text-[#1E293B]"
            style={{ fontFamily: 'Nunito-SemiBold' }}
            returnKeyType="send"
            onSubmitEditing={submit}
          />

          <TouchableOpacity 
            onPress={submit} 
            activeOpacity={0.85}
            disabled={!draft.trim() || isSending}
            className="w-12 h-12 rounded-2xl bg-[#16704A] items-center justify-center"
            style={{
              opacity: draft.trim() ? 1 : 0.5,
              shadowColor: '#16704A',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.15,
              shadowRadius: 3,
              elevation: 1,
            }}
          >
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </ResponsiveContainer>
    </KeyboardAvoidingView>
  );
}
