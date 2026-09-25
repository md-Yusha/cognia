import { create } from 'zustand';
import { 
  PatientProfile, 
  GameSessionTelemetry, 
  ReminderItem, 
  CognitiveGameType, 
  DifficultyTier 
} from '../types';
import { savePatientSession, clearPatientSession } from '../services/codeService';
import { doc, setDoc, updateDoc, collection, onSnapshot, query, orderBy, Unsubscribe } from 'firebase/firestore';
import { db } from '../services/firebase';
import { markReminderCompleted, subscribeToPatientReminders } from '../services/reminderService';
import { logPatientActivity } from '../services/activityService';
import AsyncStorage from '@react-native-async-storage/async-storage';

let sessionUnsub: Unsubscribe | null = null;
let reminderUnsub: Unsubscribe | null = null;
let patientDocUnsub: Unsubscribe | null = null;

const localSessionsKey = (id: string) => `cognia_sessions_${id}`;

interface PatientState {
  patient: PatientProfile | null;
  isLoading: boolean;
  activeLanguage: string;
  reminders: ReminderItem[];
  recentSessions: GameSessionTelemetry[];
  
  // Actions
  setPatient: (patient: PatientProfile | null) => Promise<void>;
  updateLanguage: (lang: string) => void;
  setReminders: (reminders: ReminderItem[]) => void;
  acknowledgeReminder: (reminderId: string) => Promise<void>;
  recordGameSession: (session: Omit<GameSessionTelemetry, 'id' | 'patientId' | 'timestamp'>) => Promise<void>;
  updateDifficultyTier: (gameType: CognitiveGameType, newTier: DifficultyTier) => void;
  logoutPatient: () => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patient: null,
  isLoading: true,
  activeLanguage: 'en',
  reminders: [],
  recentSessions: [],

  setPatient: async (patient) => {
    // Clean up any existing subscriptions
    if (sessionUnsub) { sessionUnsub(); sessionUnsub = null; }
    if (reminderUnsub) { reminderUnsub(); reminderUnsub = null; }
    if (patientDocUnsub) { patientDocUnsub(); patientDocUnsub = null; }

    set({ patient, isLoading: false });

    if (patient) {
      await savePatientSession(patient);

      // Load cached sessions immediately
      try {
        const raw = await AsyncStorage.getItem(localSessionsKey(patient.id));
        if (raw) {
          const cached = JSON.parse(raw);
          if (cached.length) set({ recentSessions: cached });
        }
      } catch {}

      // 1. Realtime Firestore listener for sessions (persists across logout/login)
      try {
        const sessRef = collection(db, 'patients', patient.id, 'sessions');
        const qSess = query(sessRef, orderBy('timestamp', 'desc'));
        sessionUnsub = onSnapshot(qSess, (snap) => {
          const sessions: GameSessionTelemetry[] = [];
          snap.forEach((d) => {
            sessions.push(d.data() as GameSessionTelemetry);
          });
          set({ recentSessions: sessions });
          AsyncStorage.setItem(localSessionsKey(patient.id), JSON.stringify(sessions.slice(0, 100))).catch(() => {});
        }, (err) => {
          console.warn('Realtime sessions subscription error:', err);
        });
      } catch (err) {
        console.warn('Could not setup realtime sessions listener:', err);
      }

      // 2. Realtime Firestore listener for reminders
      reminderUnsub = subscribeToPatientReminders(patient.id, (incomingReminders) => {
        set({ reminders: incomingReminders });
      });

      // 3. Realtime listener for patient profile document (difficulty overrides from caregiver)
      try {
        const pRef = doc(db, 'patients', patient.id);
        patientDocUnsub = onSnapshot(pRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data() as PatientProfile;
            set({ patient: data });
            savePatientSession(data);
          }
        }, (err) => {
          console.warn('Patient doc listener error:', err);
        });
      } catch (err) {
        console.warn('Could not setup patient doc listener:', err);
      }
    } else {
      await clearPatientSession();
      set({ recentSessions: [], reminders: [] });
    }
  },

  updateLanguage: (lang) => {
    set({ activeLanguage: lang });
  },

  setReminders: (reminders) => {
    set({ reminders });
  },

  acknowledgeReminder: async (reminderId) => {
    const { reminders } = get();
    const target = reminders.find((r) => r.id === reminderId);
    if (!target) return;

    // Optimistic local update
    const updated = reminders.map((r) => 
      r.id === reminderId ? { ...r, lastAcknowledgedAt: Date.now() } : r
    );
    set({ reminders: updated });

    // Sync to Firestore & create activity
    await markReminderCompleted(target);
  },

  recordGameSession: async (sessionData) => {
    const { patient, recentSessions } = get();
    const patientId = patient ? patient.id : 'anonymous_offline';

    const newSession: GameSessionTelemetry = {
      ...sessionData,
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      patientId,
      timestamp: Date.now(),
      syncedAt: Date.now(),
    };

    // Update local state immediately
    const nextSessions = [newSession, ...recentSessions];
    set({ recentSessions: nextSessions });
    AsyncStorage.setItem(localSessionsKey(patientId), JSON.stringify(nextSessions.slice(0, 100))).catch(() => {});

    // Save session in Firestore
    try {
      if (patient) {
        const sessionRef = doc(db, 'patients', patient.id, 'sessions', newSession.id);
        await setDoc(sessionRef, newSession);
      }
    } catch (err) {
      console.warn('Game session queued in Firestore offline cache:', err);
    }

    // Log in patient daily activities timeline for caregiver dashboard
    if (patient) {
      const gameNames: Record<CognitiveGameType, { title: string; icon: string }> = {
        memory_match: { title: 'Rhino Memory Match Completed', icon: '🦏' },
        daily_routine_recall: { title: 'Daily Routine Recall Completed', icon: '☕' },
        pattern_recognition: { title: 'Bamboo Pattern Match Completed', icon: '🎋' },
        focus_tap: { title: 'Tea Garden Focus & Tap Completed', icon: '🍃' },
        reminiscence_match: { title: 'Family Memory Album Completed', icon: '🌸' },
      };
      const info = gameNames[sessionData.gameType] || { title: `${sessionData.gameType} Completed`, icon: '🧠' };

      logPatientActivity({
        patientId: patient.id,
        type: 'game',
        title: info.title,
        details: `Accuracy: ${sessionData.accuracy}% • Tier: ${sessionData.difficultyTier.toUpperCase()} • Time: ${sessionData.durationSeconds || 15}s`,
        icon: info.icon,
        whyClinical: `Cognitive exercise: Patient completed ${sessionData.difficultyTier.toUpperCase()} tier with ${sessionData.accuracy}% accuracy in ${sessionData.durationSeconds || 15}s (${(sessionData.averageReactionTimeMs / 1000).toFixed(1)}s avg response).`,
        metadata: {
          score: sessionData.score,
          accuracy: sessionData.accuracy,
          gameType: sessionData.gameType,
          tier: sessionData.difficultyTier,
        }
      }).catch(() => {});
    }
  },

  updateDifficultyTier: (gameType, newTier) => {
    const { patient } = get();
    if (!patient) return;

    const updatedPatient: PatientProfile = {
      ...patient,
      difficultyLevels: {
        ...patient.difficultyLevels,
        [gameType]: newTier,
      }
    };

    set({ patient: updatedPatient });
    savePatientSession(updatedPatient);

    // Sync to Firestore
    try {
      const pRef = doc(db, 'patients', patient.id);
      updateDoc(pRef, {
        [`difficultyLevels.${gameType}`]: newTier,
      }).catch(() => {});
    } catch {}
  },

  logoutPatient: async () => {
    if (sessionUnsub) { sessionUnsub(); sessionUnsub = null; }
    if (reminderUnsub) { reminderUnsub(); reminderUnsub = null; }
    if (patientDocUnsub) { patientDocUnsub(); patientDocUnsub = null; }

    await clearPatientSession();
    set({ patient: null, recentSessions: [], reminders: [] });
  },
}));
