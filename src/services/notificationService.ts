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
} catch (e) {
  console.warn('Notifications handler fallback in Expo Go:', e);
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

  const [hoursStr, minutesStr] = reminder.time.split(':');
  const hour = parseInt(hoursStr, 10);
  const minute = parseInt(minutesStr, 10);

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
