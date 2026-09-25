import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from './firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, Unsubscribe } from 'firebase/firestore';
import { FamilyMemoryItem } from '../types';

const localMemoriesKey = (patientId: string) => `@cognia_family_memories_${patientId}`;

/**
 * Culturally grounded default memories for NER elders so the game works out of the box
 */
export const DEFAULT_NER_MEMORIES: Omit<FamilyMemoryItem, 'id' | 'patientId' | 'createdAt'>[] = [
  {
    title: 'Granddaughter Priya',
    relationship: 'Granddaughter',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    clue: 'She wore her beautiful golden Muga silk Mekhela Sador during Rongali Bihu.',
    dateYear: 'Festival Day',
  },
  {
    title: 'Ancestral Tea Garden Home',
    relationship: 'Family Home',
    imageUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=400&q=80',
    clue: 'Your peaceful wooden bungalow surrounded by green tea slopes in Upper Assam.',
    dateYear: 'Family Estate',
  },
  {
    title: 'Son Debajit',
    relationship: 'Eldest Son',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    clue: 'He brings fresh hot pitha and tea to your room every morning.',
    dateYear: 'Family',
  },
  {
    title: 'Kaziranga Family Picnic',
    relationship: 'Family Outing',
    imageUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=400&q=80',
    clue: 'The misty morning when all grandchildren gathered to see the majestic rhino.',
    dateYear: 'Spring Memories',
  },
];

export async function addFamilyMemory(patientId: string, memory: Omit<FamilyMemoryItem, 'id' | 'patientId' | 'createdAt'>): Promise<FamilyMemoryItem> {
  const newId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const item: FamilyMemoryItem = {
    ...memory,
    id: newId,
    patientId,
    createdAt: Date.now(),
  };

  try {
    const raw = await AsyncStorage.getItem(localMemoriesKey(patientId));
    const current: FamilyMemoryItem[] = raw ? JSON.parse(raw) : [];
    const updated = [item, ...current];
    await AsyncStorage.setItem(localMemoriesKey(patientId), JSON.stringify(updated));
  } catch {}

  try {
    const docRef = doc(db, 'patients', patientId, 'memories', newId);
    await setDoc(docRef, item);
  } catch (err) {
    console.warn('Firestore family memory save queued:', err);
  }

  return item;
}

export async function deleteFamilyMemory(patientId: string, memoryId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(localMemoriesKey(patientId));
    if (raw) {
      const current: FamilyMemoryItem[] = JSON.parse(raw);
      const filtered = current.filter((m) => m.id !== memoryId);
      await AsyncStorage.setItem(localMemoriesKey(patientId), JSON.stringify(filtered));
    }
  } catch {}

  try {
    const docRef = doc(db, 'patients', patientId, 'memories', memoryId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Firestore family memory delete queued:', err);
  }
}

export function subscribeToFamilyMemories(
  patientId: string,
  callback: (memories: FamilyMemoryItem[]) => void
): Unsubscribe {
  // Emit local cache immediately
  AsyncStorage.getItem(localMemoriesKey(patientId)).then((raw) => {
    if (raw) {
      try {
        const list = JSON.parse(raw);
        if (list.length > 0) callback(list);
      } catch {}
    }
  });

  const colRef = collection(db, 'patients', patientId, 'memories');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: FamilyMemoryItem[] = [];
      snapshot.forEach((d) => {
        list.push(d.data() as FamilyMemoryItem);
      });

      // If patient has custom memories, use them. Otherwise blend with defaults.
      if (list.length > 0) {
        AsyncStorage.setItem(localMemoriesKey(patientId), JSON.stringify(list)).catch(() => {});
        callback(list);
      } else {
        const fallback: FamilyMemoryItem[] = DEFAULT_NER_MEMORIES.map((def, idx) => ({
          ...def,
          id: `default_${idx}`,
          patientId,
          createdAt: Date.now() - idx * 86400000,
        }));
        callback(fallback);
      }
    },
    (err) => {
      console.warn('Family memories listener offline fallback:', err);
      // Fallback to defaults
      const fallback: FamilyMemoryItem[] = DEFAULT_NER_MEMORIES.map((def, idx) => ({
        ...def,
        id: `default_${idx}`,
        patientId,
        createdAt: Date.now() - idx * 86400000,
      }));
      callback(fallback);
    }
  );
}
