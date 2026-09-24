import { create } from 'zustand';
import { CaregiverProfile, PatientProfile, CaregiverAlert, ReminderItem } from '../types';
import { fetchCaregiverPatientsFromFirestore } from '../services/authService';

interface CaregiverState {
  caregiver: CaregiverProfile | null;
  patients: PatientProfile[];
  alerts: CaregiverAlert[];
  selectedPatient: PatientProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setCaregiver: (caregiver: CaregiverProfile | null) => void;
  loadCaregiverPatients: (caregiverId: string) => Promise<void>;
  setPatients: (patients: PatientProfile[]) => void;
  addPatient: (patient: PatientProfile) => void;
  setSelectedPatient: (patient: PatientProfile | null) => void;
  setAlerts: (alerts: CaregiverAlert[]) => void;
  markAlertRead: (alertId: string) => void;
  loadSamplePatientsDemo: () => void;
  clearAllPatients: () => void;
  logoutCaregiver: () => void;
}

export const useCaregiverStore = create<CaregiverState>((set, get) => ({
  caregiver: null,
  patients: [],
  alerts: [],
  selectedPatient: null,
  isAuthenticated: false,
  isLoading: false,

  setCaregiver: (caregiver) => {
    set({ caregiver, isAuthenticated: !!caregiver });
    if (caregiver?.uid) {
      get().loadCaregiverPatients(caregiver.uid);
    }
  },

  loadCaregiverPatients: async (caregiverId: string) => {
    set({ isLoading: true });
    try {
      const realPatients = await fetchCaregiverPatientsFromFirestore(caregiverId);
      if (realPatients && realPatients.length > 0) {
        set({ patients: realPatients });
      }
    } catch (e) {
      console.warn('Error loading caregiver patients:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setPatients: (patients) => {
    set({ patients });
  },

  addPatient: (patient) => {
    const existing = get().patients.filter((p) => p.id !== patient.id);
    set({ patients: [patient, ...existing] });
  },

  setSelectedPatient: (patient) => {
    set({ selectedPatient: patient });
  },

  setAlerts: (alerts) => {
    set({ alerts });
  },

  markAlertRead: (alertId) => {
    const updated = get().alerts.map((a) => 
      a.id === alertId ? { ...a, isRead: true } : a
    );
    set({ alerts: updated });
  },

  loadSamplePatientsDemo: () => {
    const samplePatients: PatientProfile[] = [
      {
        id: 'patient_sample_01',
        caregiverId: get().caregiver?.uid || 'caregiver_active',
        name: 'Rupali Barua',
        age: 72,
        gender: 'female',
        preferredLanguage: 'as',
        accessCode: 'ASSAM-102',
        dementiaStage: 'early',
        createdAt: Date.now() - 86400000 * 10,
        difficultyLevels: {
          memory_match: 'medium',
          daily_routine_recall: 'easy',
          pattern_recognition: 'easy',
          focus_tap: 'medium',
        }
      },
      {
        id: 'patient_sample_02',
        caregiverId: get().caregiver?.uid || 'caregiver_active',
        name: 'Khrawbor Khongwir',
        age: 68,
        gender: 'male',
        preferredLanguage: 'kha',
        accessCode: 'KHASI-404',
        dementiaStage: 'moderate',
        createdAt: Date.now() - 86400000 * 5,
        difficultyLevels: {
          memory_match: 'easy',
          daily_routine_recall: 'easy',
          pattern_recognition: 'easy',
          focus_tap: 'easy',
        }
      }
    ];

    const sampleAlerts: CaregiverAlert[] = [
      {
        id: 'alt_1',
        caregiverId: get().caregiver?.uid || 'caregiver_active',
        patientId: 'patient_sample_01',
        patientName: 'Rupali Barua',
        type: 'milestone',
        severity: 'info',
        message: 'Completed morning Rhino Memory Match with 92% accuracy!',
        timestamp: Date.now() - 3600000 * 2,
        isRead: false,
      }
    ];

    set({ patients: samplePatients, alerts: sampleAlerts });
  },

  clearAllPatients: () => {
    set({ patients: [], alerts: [] });
  },

  logoutCaregiver: () => {
    set({ caregiver: null, isAuthenticated: false, selectedPatient: null, patients: [], alerts: [] });
  },
}));
