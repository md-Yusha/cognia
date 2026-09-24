import { create } from 'zustand';
import { 
  PatientProfile, 
  GameSessionTelemetry, 
  ReminderItem, 
  CognitiveGameType, 
  DifficultyTier 
} from '../types';
import { savePatientSession, clearPatientSession } from '../services/codeService';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

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
  acknowledgeReminder: (reminderId: string) => void;
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
    set({ patient, isLoading: false });
    if (patient) {
      await savePatientSession(patient);
    } else {
      await clearPatientSession();
    }
  },

  updateLanguage: (lang) => {
    set({ activeLanguage: lang });
  },

  setReminders: (reminders) => {
    set({ reminders });
  },

  acknowledgeReminder: (reminderId) => {
    const updated = get().reminders.map((r) => 
      r.id === reminderId ? { ...r, lastAcknowledgedAt: Date.now() } : r
    );
    set({ reminders: updated });
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
    set({ recentSessions: [...recentSessions, newSession] });

    // Queue in Firestore persistent cache
    try {
      if (patient) {
        const sessionRef = doc(collection(db, 'patients', patient.id, 'sessions'));
        await setDoc(sessionRef, newSession);
      }
    } catch (err) {
      console.warn('Game session queued in Firestore offline cache:', err);
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
  },

  logoutPatient: async () => {
    await clearPatientSession();
    set({ patient: null });
  },
}));
