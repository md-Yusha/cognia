import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  query, 
  orderBy, 
  Unsubscribe 
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ReminderItem } from '../types';
import { scheduleLocalReminder } from './notificationService';
import { logPatientActivity } from './activityService';

const localRemindersKey = (patientId: string) => `cognia_reminders_${patientId}`;

/**
 * Parses time string (e.g. "08:30 AM", "2:15 PM", "14:00") into { hour, minute } in 24h
 */
export function parseTimeTo24H(timeStr: string): { hour: number; minute: number } {
  if (!timeStr) return { hour: 8, minute: 0 };
  const clean = timeStr.trim();
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const numOnly = clean.replace(/[^\d:]/g, '');
  const parts = numOnly.split(':');
  let hour = parseInt(parts[0] || '8', 10);
  const minute = parseInt(parts[1] || '0', 10);

  if (isPM && hour < 12) {
    hour += 12;
  } else if (isAM && hour === 12) {
    hour = 0;
  }
  return { hour, minute };
}

/**
 * Formats hour (1-12), minute, and ampm into standard string, e.g. "08:30 AM"
 */
export function formatDisplayTime(hour12: number, minute: number, ampm: 'AM' | 'PM'): string {
  const hStr = String(hour12).padStart(2, '0');
  const mStr = String(minute).padStart(2, '0');
  return `${hStr}:${mStr} ${ampm}`;
}

/**
 * Creates or updates a reminder in Firestore and schedules local notifications
 */
export async function saveReminderToFirestore(reminder: ReminderItem): Promise<void> {
  // Save locally in cache
  try {
    const raw = await AsyncStorage.getItem(localRemindersKey(reminder.patientId));
    const list: ReminderItem[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((r) => r.id !== reminder.id);
    filtered.unshift(reminder);
    await AsyncStorage.setItem(localRemindersKey(reminder.patientId), JSON.stringify(filtered));
  } catch (e) {
    console.warn('Local reminder cache write failed:', e);
  }

  // Schedule device local notification so alert pops up at that time
  try {
    await scheduleLocalReminder(reminder);
  } catch (e) {
    console.warn('Could not schedule local notification:', e);
  }

  // Write to Firestore for realtime cross-device sync
  try {
    const remRef = doc(db, 'patients', reminder.patientId, 'reminders', reminder.id);
    await setDoc(remRef, reminder);
  } catch (err) {
    console.warn('Firestore reminder sync queued:', err);
  }
}

/**
 * Delete a reminder from Firestore and local cache
 */
export async function removeReminderFromFirestore(patientId: string, reminderId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(localRemindersKey(patientId));
    if (raw) {
      const list: ReminderItem[] = JSON.parse(raw);
      const filtered = list.filter((r) => r.id !== reminderId);
      await AsyncStorage.setItem(localRemindersKey(patientId), JSON.stringify(filtered));
    }
  } catch {}

  try {
    const remRef = doc(db, 'patients', patientId, 'reminders', reminderId);
    await deleteDoc(remRef);
  } catch (err) {
    console.warn('Firestore reminder delete queued:', err);
  }
}

/**
 * Acknowledge a reminder as completed by patient:
 * Updates reminder lastAcknowledgedAt and records activity in Firestore
 */
export async function markReminderCompleted(reminder: ReminderItem): Promise<void> {
  const updated: ReminderItem = {
    ...reminder,
    lastAcknowledgedAt: Date.now(),
  };

  // Update reminder in Firestore
  await saveReminderToFirestore(updated);

  // Log activity in the daily habits & timeline log
  await logPatientActivity({
    patientId: reminder.patientId,
    type: 'reminder_done',
    title: `Completed: ${reminder.title}`,
    details: reminder.dosageOrDetails || 'Acknowledged on time',
    icon: reminder.type === 'medicine' ? '💊' : reminder.type === 'hydration' ? '💧' : reminder.type === 'appointment' ? '📅' : '⏰',
    whyClinical: `Daily routine adherence: Patient acknowledged scheduled ${reminder.type.replace('_', ' ')} on time.`,
    metadata: { reminderId: reminder.id, reminderType: reminder.type },
  });
}

/**
 * Realtime subscriber for patient reminders
 */
export function subscribeToPatientReminders(
  patientId: string,
  callback: (reminders: ReminderItem[]) => void
): Unsubscribe {
  // Emit local cache immediately for instantaneous rendering
  AsyncStorage.getItem(localRemindersKey(patientId)).then((raw) => {
    if (raw) {
      try {
        const list = JSON.parse(raw);
        if (list.length > 0) callback(list);
      } catch {}
    }
  });

  const remindersRef = collection(db, 'patients', patientId, 'reminders');
  const q = query(remindersRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ReminderItem[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as ReminderItem);
      });
      AsyncStorage.setItem(localRemindersKey(patientId), JSON.stringify(items)).catch(() => {});
      callback(items);
    },
    (error) => {
      console.warn('Reminders onSnapshot fallback to offline:', error);
    }
  );
}
