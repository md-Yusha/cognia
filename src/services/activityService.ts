import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  getDocs,
  Unsubscribe 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyActivityItem {
  id: string;
  patientId: string;
  type: 'hydration' | 'tea' | 'reminder_done' | 'game' | 'stress' | 'family_connected';
  title: string;
  details?: string;
  icon: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD for easy filtering
  timeStr: string; // e.g. "09:30 AM"
  whyClinical?: string;
  metadata?: Record<string, any>;
}

// Format local date YYYY-MM-DD
export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format AM/PM time
export function formatTimeAMPM(d: Date = new Date()): string {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

const localActivitiesKey = (patientId: string) => `cognia_activities_${patientId}`;

/**
 * Record a patient daily activity (Water, Tea, Reminder, Game, Stress)
 * Writes to Firestore for realtime caregiver sync and caches locally
 */
export async function logPatientActivity(activity: Omit<DailyActivityItem, 'id' | 'timestamp' | 'dateStr' | 'timeStr'> & { timestamp?: number }): Promise<DailyActivityItem> {
  const now = new Date(activity.timestamp || Date.now());
  const dateStr = getLocalDateString(now);
  const timeStr = formatTimeAMPM(now);

  const item: DailyActivityItem = {
    ...activity,
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: now.getTime(),
    dateStr,
    timeStr,
  };

  // Cache locally in AsyncStorage immediately
  try {
    const raw = await AsyncStorage.getItem(localActivitiesKey(item.patientId));
    const list: DailyActivityItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(item);
    await AsyncStorage.setItem(localActivitiesKey(item.patientId), JSON.stringify(list.slice(0, 100)));
  } catch (e) {
    console.warn('Local activity cache write failed:', e);
  }

  // Write to Firestore for instant realtime caregiver sync
  try {
    const actRef = doc(db, 'patients', item.patientId, 'activities', item.id);
    await setDoc(actRef, item);
  } catch (err) {
    console.warn('Firestore activity sync queued:', err);
  }

  return item;
}

/**
 * Realtime subscriber for patient activities
 */
export function subscribeToPatientActivities(
  patientId: string, 
  callback: (activities: DailyActivityItem[]) => void
): Unsubscribe {
  // First emit locally cached activities for instant rendering
  AsyncStorage.getItem(localActivitiesKey(patientId)).then((raw) => {
    if (raw) {
      try {
        const list = JSON.parse(raw);
        if (list.length > 0) callback(list);
      } catch {}
    }
  });

  const activitiesRef = collection(db, 'patients', patientId, 'activities');
  const q = query(activitiesRef, orderBy('timestamp', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: DailyActivityItem[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as DailyActivityItem);
      });
      // Update cache
      AsyncStorage.setItem(localActivitiesKey(patientId), JSON.stringify(items.slice(0, 100))).catch(() => {});
      callback(items);
    },
    (error) => {
      console.warn('Activities onSnapshot fallback to offline:', error);
    }
  );
}
