import React, { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mic, Send } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { beatPresence, CareMessage, fetchMessages, pollVoiceClip, sendMessage, sendVoiceClip } from '../services/careApi';

const chatKey = (patientId: string) => `cognia_chat_${patientId}`;

async function readLocal(patientId: string): Promise<CareMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(chatKey(patientId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function writeLocal(patientId: string, messages: CareMessage[]) {
  await AsyncStorage.setItem(chatKey(patientId), JSON.stringify(messages.slice(-80)));
}

type Role = 'patient' | 'caregiver';

function fileToBase64(uri: string) {
  return fetch(uri)
    .then((response) => response.blob())
    .then((blob) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }));
}

export function CareChat({ patientId, role, title }: { patientId: string; role: Role; title: string }) {
  const router = useRouter();
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [online, setOnline] = useState(false);
  const [recording, setRecording] = useState(false);
  const [note, setNote] = useState('');
  const heard = React.useRef(0);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      const local = await readLocal(patientId);
      if (!stop && local.length) setMessages(local);
      try {
        const presence = await beatPresence(patientId, role);
        if (!stop) setOnline(role === 'patient' ? presence.caregiverOnline : presence.patientOnline);
        const next = await fetchMessages(patientId);
        const merged = [...local];
        for (const message of next) {
          if (!merged.some((item) => item.id === message.id)) merged.push(message);
        }
        merged.sort((a, b) => a.createdAt - b.createdAt);
        if (!stop) setMessages(merged);
        await writeLocal(patientId, merged);
        if (!stop) setNote('');
      } catch {
        if (!stop) setNote('Showing messages saved on this phone.');
      }
      try {
        const voice = await pollVoiceClip(patientId, role);
        if (voice.clip?.audioBase64 && voice.clip.at !== heard.current) {
          heard.current = voice.clip.at;
          const { Audio } = await import('expo-av');
          const sound = new Audio.Sound();
          await sound.loadAsync({ uri: `data:audio/mp4;base64,${voice.clip.audioBase64}` });
          await sound.playAsync();
        }
      } catch {}
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [patientId, role]);

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    setDraft('');
    const saved: CareMessage = {
      id: `local_${Date.now()}`,
      patientId,
      sender: role,
      body,
      createdAt: Date.now(),
    };
    const next = [...messages, saved];
    setMessages(next);
    await writeLocal(patientId, next);
    try {
      const remote = await sendMessage(patientId, role, body);
      const withRemote = next.map((item) => (item.id === saved.id ? remote : item));
      setMessages(withRemote);
      await writeLocal(patientId, withRemote);
      setNote('');
    } catch {
      setNote('Saved on this phone. It will send when the home server answers.');
    }
  };

  const toggleMic = async () => {
    try {
      if (!online) {
        setNote('Voice opens when the other person is in the app.');
        return;
      }
      const { Audio } = await import('expo-av');
      if (!recording) {
        const permission = await Audio.requestPermissionsAsync();
        if (!permission.granted) {
          setNote('Microphone permission is needed for voice chat.');
          return;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const rec = new Audio.Recording();
        await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
        await rec.startAsync();
        (global as any).__cogniaRec = rec;
        setRecording(true);
        setNote('Listening… tap again to send.');
        return;
      }
      const rec = (global as any).__cogniaRec as { stopAndUnloadAsync: () => Promise<void>; getURI: () => string | null } | undefined;
      setRecording(false);
      if (!rec) return;
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      (global as any).__cogniaRec = null;
      if (!uri) return;
      const audioBase64 = await fileToBase64(uri);
      await sendVoiceClip(patientId, role, audioBase64);
      setNote('Voice note sent.');
    } catch {
      setRecording(false);
      setNote('Voice note could not be sent. Text chat still works.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FAF7F2' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: 54, paddingHorizontal: 20, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 10, backgroundColor: 'white', borderRadius: 999, marginRight: 12 }}>
          <ArrowLeft size={20} color="#2C503A" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'PatrickHand', fontSize: 32, color: '#2B3A30' }}>{title}</Text>
          <Text style={{ fontFamily: 'Nunito-Bold', fontSize: 16, color: online ? '#2C503A' : '#8C8274' }}>
            {online ? 'Online — voice chat is open' : 'Text chat is ready'}
          </Text>
        </View>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 12 }}
        renderItem={({ item }) => {
          const mine = item.sender === role;
          return (
            <View style={{ alignSelf: mine ? 'flex-end' : 'flex-start', backgroundColor: mine ? '#3D6C4E' : 'white', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 10, maxWidth: '82%' }}>
              <Text style={{ color: mine ? 'white' : '#2B3A30', fontFamily: 'Nunito-SemiBold', fontSize: 18 }}>{item.body}</Text>
            </View>
          );
        }}
      />
      {note ? <Text style={{ paddingHorizontal: 20, color: '#8A4226', fontFamily: 'Nunito-SemiBold', fontSize: 15 }}>{note}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 }}>
        <TouchableOpacity onPress={toggleMic} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: recording ? '#C87453' : '#EBF4EE', alignItems: 'center', justifyContent: 'center' }}>
          <Mic size={24} color={recording ? 'white' : '#2C503A'} />
        </TouchableOpacity>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a message"
          placeholderTextColor="#8C8274"
          style={{ flex: 1, minHeight: 56, backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 16, fontSize: 18, fontFamily: 'Nunito-SemiBold', color: '#2B3A30' }}
        />
        <TouchableOpacity onPress={submit} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#3D6C4E', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={22} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
