import { Platform } from 'react-native';
import { ReminderItem } from '../types';
import Constants from 'expo-constants';

let Notifications: typeof import('expo-notifications') | null = null;

try {
  // Safe load for Expo Go on Android SDK 53+
  Notifications = require('expo-notifications');
  if (Notifications && typeof Notifications.setNotificationHandler === 'function') {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
} catch (e: any) {
  // Silently handle Expo Go SDK 53 remote notifications deprecation
  if (!e?.message?.includes('removed from Expo Go') && !e?.message?.includes('SDK 53')) {
    console.warn('Notifications handler fallback in Expo Go:', e);
  }
}

/**
 * Requests permissions for scheduled alerts
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web' || !Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('Notification permission request bypassed in Expo Go:', err);
    return false;
  }
}

/**
 * Schedules a local recurring or one-time reminder that fires even when offline
 */
export async function scheduleLocalReminder(reminder: ReminderItem): Promise<string[]> {
  if (Platform.OS === 'web' || !Notifications) return [];

  // Parse time supporting both 24h ('14:30') and 12h AM/PM ('02:30 PM')
  const clean = (reminder.time || '08:00').trim();
  const isPM = /pm/i.test(clean);
  const isAM = /am/i.test(clean);
  const parts = clean.replace(/[^\d:]/g, '').split(':');
  let hour = parseInt(parts[0] || '8', 10);
  const minute = parseInt(parts[1] || '0', 10);

  if (isPM && hour < 12) {
    hour += 12;
  } else if (isAM && hour === 12) {
    hour = 0;
  }

  const scheduledIds: string[] = [];

  try {
    if (reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
      for (const weekday of reminder.daysOfWeek) {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `⏰ ${reminder.title}`,
            body: reminder.dosageOrDetails || `Time for your scheduled ${reminder.type.replace('_', ' ')}.`,
            data: { reminderId: reminder.id, type: reminder.type },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: weekday + 1,
            hour,
            minute,
          },
        });
        scheduledIds.push(id);
      }
    } else {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${reminder.title}`,
          body: reminder.dosageOrDetails || `Time for your scheduled ${reminder.type.replace('_', ' ')}.`,
          data: { reminderId: reminder.id, type: reminder.type },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
      scheduledIds.push(id);
    }
  } catch (error) {
    console.warn('Local notification scheduling in offline/Expo Go mode:', error);
  }

  return scheduledIds;
}

/**
 * Cancels all scheduled local notifications
 */
export async function cancelAllScheduledReminders(): Promise<void> {
  if (Platform.OS === 'web' || !Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {}
}
