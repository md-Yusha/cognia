import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  Unsubscribe 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CareMessage {
  id: string;
  patientId: string;
  sender: 'patient' | 'caregiver';
  body: string;
  createdAt: number;
}

const localChatKey = (patientId: string) => `cognia_chat_${patientId}`;

/**
 * Realtime subscriber for chat messages between patient and caregiver
 */
export function subscribeToChatMessages(
  patientId: string,
  callback: (messages: CareMessage[]) => void
): Unsubscribe {
  // First load from local storage cache for instant rendering
  AsyncStorage.getItem(localChatKey(patientId)).then((raw) => {
    if (raw) {
      try {
        const list = JSON.parse(raw);
        if (list.length > 0) callback(list);
      } catch {}
    }
  });

  const messagesRef = collection(db, 'patients', patientId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: CareMessage[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as CareMessage);
      });
      AsyncStorage.setItem(localChatKey(patientId), JSON.stringify(items.slice(-100))).catch(() => {});
      callback(items);
    },
    (error) => {
      console.warn('Chat onSnapshot fallback to offline cache:', error);
    }
  );
}

/**
 * Send a chat message with Firestore realtime sync and local caching
 */
export async function sendChatMessage(
  patientId: string,
  sender: 'patient' | 'caregiver',
  body: string
): Promise<CareMessage> {
  const msg: CareMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    patientId,
    sender,
    body: body.trim(),
    createdAt: Date.now(),
  };

  // Cache locally
  try {
    const raw = await AsyncStorage.getItem(localChatKey(patientId));
    const list: CareMessage[] = raw ? JSON.parse(raw) : [];
    list.push(msg);
    await AsyncStorage.setItem(localChatKey(patientId), JSON.stringify(list.slice(-100)));
  } catch {}

  // Write to Firestore for instant delivery
  try {
    const msgRef = doc(db, 'patients', patientId, 'messages', msg.id);
    await setDoc(msgRef, msg);
  } catch (err) {
    console.warn('Firestore message queued in offline cache:', err);
  }

  return msg;
}
